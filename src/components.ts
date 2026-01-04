import { App, MarkdownPostProcessorContext, TFile, MarkdownRenderChild, CachedMetadata, WorkspaceLeaf, MarkdownView, Notice } from "obsidian";
import { parseArguments, validateArguments, resolveSpecialVariables, parseArgsAliases, matchesQuery } from "utils";
import { applyCssFromArgs } from "utils";
import { evaluateArgs, isTruthy } from "expression";
import ComponentsPlugin from "main";
import { ComponentGroup } from "groups";
import { parseYaml } from "obsidian";

/**
 * Global instance registry for cleanup
 */
export const componentInstances = new Map<string, ComponentInstance>();

export interface ComponentInstance {
    id: string;
    element: HTMLElement;
    data: {
        intervals?: NodeJS.Timeout[];
        observers?: MutationObserver[];
        cleanup?: (() => void)[];
        [key: string]: any;
    };
    destroy: () => void;
}

export namespace ComponentInstance {
    /**
     * Simple djb2 hash for change detection
     */
    function hashData(data: unknown): string {
        const str = JSON.stringify(data);
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
        }
        return hash.toString(36);
    }

    /**
     * Check if data has changed since last call. Returns true on first call or when data differs.
     * Useful in renderRefresh to skip unnecessary re-renders.
     *
     * @param instance - The component instance
     * @param key - A unique key for this data (allows tracking multiple data sets)
     * @param data - The data to check for changes
     * @returns true if data changed (or first call), false if unchanged
     */
    export function hasDataChanged(instance: ComponentInstance, key: string, data: unknown): boolean {
        const hashKey = `_hash_${key}`;
        const newHash = hashData(data);
        const oldHash = instance.data[hashKey];

        if (newHash === oldHash) {
            return false;
        }

        instance.data[hashKey] = newHash;
        return true;
    }

    export function create(el: HTMLElement): ComponentInstance {
        const id = `component-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        const instance: ComponentInstance = {
            id,
            element: el,
            data: {
                watchedKeys: { fmKeys: [], fileKeys: [] },
                intervals: [],
                observers: [],
                cleanup: []
            },
            destroy: () => {
                // Clear all intervals
                instance.data.intervals?.forEach(interval => clearInterval(interval));

                // Disconnect all observers
                instance.data.observers?.forEach(observer => observer.disconnect());

                // Run all cleanup functions
                instance.data.cleanup?.forEach(cleanupFn => cleanupFn());

                // Remove from registry and clear element reference
                componentInstances.delete(id);
                delete el.dataset.componentId;
            }
        };

        // Store instance reference on element
        el.dataset.componentId = id;
        componentInstances.set(id, instance);
        // debug(`Component ${id} created. Total instances: ${componentInstances.size}`);

        return instance;
    }

    export function addInterval(instance: ComponentInstance, interval: NodeJS.Timeout): void {
        instance.data.intervals?.push(interval);
    }

    export function addObserver(instance: ComponentInstance, observer: MutationObserver): void {
        instance.data.observers?.push(observer);
    }

    export function addCleanup(instance: ComponentInstance, cleanupFn: () => void): void {
        instance.data.cleanup?.push(cleanupFn);
    }

    export function createUpdateLoop(
        instance: ComponentInstance,
        updateFn: () => void,
        intervalMs: number = 1000,
        syncToInterval: boolean = false
    ): void {
        updateFn();

        if (syncToInterval) {
            const scheduleNext = () => {
                const now = Date.now();
                const msUntilNext = intervalMs - (now % intervalMs);
                instance.data.pendingTimeout = setTimeout(() => {
                    updateFn();
                    scheduleNext();
                }, msUntilNext);
            };

            scheduleNext();

            addCleanup(instance, () => {
                if (instance.data.pendingTimeout) {
                    clearTimeout(instance.data.pendingTimeout);
                }
            });
        } else {
            const interval = setInterval(updateFn, intervalMs);
            addInterval(instance, interval);
        }
    }

    export interface RetryOptions {
        maxRetries?: number;
        baseDelay?: number;
        maxDelay?: number;
        onError?: (error: Error, attempt: number, nextRetryMs: number | null) => void;
        onSuccess?: () => void;
    }

    /**
     * Creates a retryable async operation with exponential backoff.
     * Automatically cleans up pending retries when the component is destroyed.
     *
     * @param instance - The component instance (for cleanup registration)
     * @param operation - The async operation to run
     * @param options - Retry configuration
     * @returns Object with retry() to manually trigger and cancel() to stop retries
     */
    export function createRetryableOperation<T>(
        instance: ComponentInstance,
        operation: () => Promise<T>,
        options: RetryOptions = {}
    ): { retry: () => Promise<T | null>; cancel: () => void } {
        const {
            maxRetries = 5,
            baseDelay = 5000,
            maxDelay = 60000,
            onError,
            onSuccess
        } = options;

        let retryTimeout: NodeJS.Timeout | null = null;
        let currentAttempt = 0;
        let cancelled = false;

        const cancel = () => {
            cancelled = true;
            if (retryTimeout) {
                clearTimeout(retryTimeout);
                retryTimeout = null;
            }
        };

        addCleanup(instance, cancel);

        const scheduleRetry = (attempt: number): Promise<T | null> => {
            return new Promise((resolve) => {
                if (cancelled) {
                    resolve(null);
                    return;
                }

                const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

                retryTimeout = setTimeout(async () => {
                    retryTimeout = null;
                    const result = await executeWithRetry();
                    resolve(result);
                }, delay);
            });
        };

        const executeWithRetry = async (): Promise<T | null> => {
            if (cancelled) return null;

            try {
                const result = await operation();
                currentAttempt = 0;
                onSuccess?.();
                return result;
            } catch (error) {
                currentAttempt++;
                const canRetry = currentAttempt < maxRetries;
                const nextDelay = canRetry
                    ? Math.min(baseDelay * Math.pow(2, currentAttempt - 1), maxDelay)
                    : null;

                onError?.(error as Error, currentAttempt, nextDelay);

                if (canRetry && !cancelled) {
                    return scheduleRetry(currentAttempt - 1);
                }
                return null;
            }
        };

        return {
            retry: executeWithRetry,
            cancel
        };
    }
}

export interface ComponentArg {
    description?: string;
    default?: string;
    required?: boolean;
    hidden?: boolean;
}

export interface ComponentSetting {
    name: string;
    desc?: string;
    type: 'text' | 'number' | 'toggle' | 'dropdown';
    default?: string | number | boolean;
    placeholder?: string;
    options?: { value: string; text: string }[];
}

export type ComponentSettingsData = Record<string, string | number | boolean>;

export enum ComponentAction {
    READ = 'READ',
    WRITE = 'WRITE',
    EXTERNAL = 'EXTERNAL'
}

export type RefreshStrategyOptions =
    | 'metadataChanged'
    | 'anyMetadataChanged'
    | 'queryMetadataChanged'
    | 'leafChanged'
    | 'daily'
    | 'hourly'
    | { type: 'timeElapsed'; interval: number }
    | null;

export type RefreshStrategy = RefreshStrategyOptions | RefreshStrategyOptions[] | null;

export type ComponentArgs<TArgs extends readonly string[] = readonly string[]> = 
Record<TArgs[number], string> & {
    original: Record<string, string>;
};

type RenderFunction<TArgs extends readonly string[]> = (args: ComponentArgs<TArgs>, el: HTMLElement, ctx: MarkdownPostProcessorContext, app: App, instance: ComponentInstance, componentSettings?: ComponentSettingsData) => Promise<void>;

export interface Component<TArgs extends readonly string[]> {
    keyName: string;
    name?: string;
    description?: string;
    icon?: string;
    enabled?: boolean; // Default true - set to false to exclude from COMPONENTS array
    args: Partial<Record<TArgs[number], ComponentArg>>;
    aliases?: string[];
    render: RenderFunction<TArgs>;
    renderRefresh?: RenderFunction<TArgs>;
    refresh?: RefreshStrategy;
    isMountable: boolean;
    settings?: {
        _render?: (containerEl: HTMLElement, app: App, plugin: ComponentsPlugin) => Promise<void> | void;
    } & {
        [key: string]: ComponentSetting | ((containerEl: HTMLElement, app: App, plugin: ComponentsPlugin) => Promise<void> | void);
    };
    does?: ComponentAction[];
    group?: ComponentGroup;
    styles: string | null;
}

function injectComponentStyles(component: Component<readonly string[]>): void {
    if (!component.styles) return;
    const styleId = `component-styles-${component.keyName}`;
    if (document.getElementById(styleId)) return;
    
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = component.styles;
    document.head.appendChild(styleEl);
}

export namespace Component {
    export function getArgKeys(component: Component<readonly string[]>): string[] {
        return Object.keys(component.args || {});
    }

    export function getRequiredArgs(component: Component<readonly string[]>): string[] {
        return Object.entries(component.args || {})
            .filter(([_, argConfig]) => argConfig?.required === true)
            .map(([argKey]) => argKey);
    }

    export function hasArgs(component: Component<readonly string[]>): boolean {
        return Object.values(component.args || {}).some(arg => arg && !arg.hidden);
    }

    export function mergeWithDefaults(component: Component<readonly string[]>, args: Record<string, string>): Record<string, string> {
        const result = { ...args };

        // Apply defaults for any missing or empty args
        Object.entries(component.args || {}).forEach(([argKey, argConfig]) => {
            if ((!(argKey in result) || result[argKey] === '') && argConfig?.default !== undefined) {
                result[argKey] = argConfig.default;
            }
        });

        return result;
    }

    /**
     * Refresh all instances of a specific component type.
     */
    export function refreshAllInstances(keyName: string): void {
        componentInstances.forEach((instance) => {
            if (instance.element.dataset.componentKey === keyName && instance.data.triggerRefresh) {
                instance.data.triggerRefresh();
            }
        });
    }

    function setupRefreshHandlers(
        component: Component<readonly string[]>,
        instance: ComponentInstance,
        refresh: RefreshStrategyOptions,
        ctx: MarkdownPostProcessorContext,
        app: App,
    ): void {
        if (!refresh) return;
        if (refresh === 'metadataChanged') {
            const handler = (file: TFile, data: string, cache: CachedMetadata) => {
                if (file.path !== instance.element.dataset.componentSource) return;

                const { fmKeys, fileKeys } = instance.data.watchedKeys;
                const allWatchedKeys = [...fmKeys, ...fileKeys];

                // Smart refresh: only trigger if watched keys actually changed
                if (allWatchedKeys.length > 0) {
                    const prevFmValues = instance.data._watchedFmValues || {};
                    const prevFileValues = instance.data._watchedFileValues || {};
                    let changed = false;

                    for (const key of fmKeys) {
                        const newVal = cache?.frontmatter?.[key];
                        if (JSON.stringify(newVal) !== JSON.stringify(prevFmValues[key])) {
                            changed = true;
                            break;
                        }
                    }

                    if (!changed) {
                        for (const key of fileKeys) {
                            const newVal = cache?.frontmatter?.[key];
                            if (JSON.stringify(newVal) !== JSON.stringify(prevFileValues[key])) {
                                changed = true;
                                break;
                            }
                        }
                    }

                    if (!changed) return;
                }

                instance.data.triggerRefresh();
            };
            app.metadataCache.on('changed', handler);
            ComponentInstance.addCleanup(instance, () => app.metadataCache.off('changed', handler));
        }
        else if (refresh === 'anyMetadataChanged') {
            const handler = (file: TFile, data: string, cache: CachedMetadata) => {
                instance.data.triggerRefresh();
            };
            app.metadataCache.on('changed', handler);
            ComponentInstance.addCleanup(instance, () => app.metadataCache.off('changed', handler));
        }
        else if (refresh === 'queryMetadataChanged') {
            const handler = (file: TFile, data: string, cache: CachedMetadata) => {
                const query = instance.data.watchedQuery;
                if (!query) return;
                if (!matchesQuery(file, cache, query)) return;
                instance.data.triggerRefresh();
            };
            app.metadataCache.on('changed', handler);
            ComponentInstance.addCleanup(instance, () => app.metadataCache.off('changed', handler));
        }
        else if (refresh === 'leafChanged') {
            const isInSidebar = instance.element.closest('.in-sidebar') !== null;
            if (isInSidebar) {
                const handler = (leaf: WorkspaceLeaf) => {
                    if (!(leaf.view instanceof MarkdownView)) return;

                    const fm = leaf.view.getViewData();
                    const regexMatch = fm.match(/^---\r?\n([\s\S]*?)\r?\n---/);
                    const fmData = regexMatch ? (parseYaml(regexMatch[1]) || {}) : {};

                    const { fmKeys, fileKeys } = instance.data.watchedKeys;
                    const allWatchedKeys = [...fmKeys, ...fileKeys];

                    if (allWatchedKeys.length > 0) {
                        const prevPath = instance.data._watchedFilePath;

                        const currentFile = leaf.view.file;
                        if (!(currentFile instanceof TFile)) return;
                        if (currentFile.path === prevPath) return;

                        const prevFmValues = instance.data._watchedFmValues || {};
                        const prevFileValues = instance.data._watchedFileValues || {};
                        let changed = false;

                        for (const key of fmKeys) {
                            const newVal = fmData?.[key];
                            if (JSON.stringify(newVal) !== JSON.stringify(prevFmValues[key])) {
                                changed = true;
                                break;
                            }
                        }

                        if (!changed) {
                            for (const key of fileKeys) {
                                const newVal = fmData?.[key];
                                if (JSON.stringify(newVal) !== JSON.stringify(prevFileValues[key])) {
                                    changed = true;
                                    break;
                                }
                            }
                        }

                        if (!changed) return;
                    }

                    instance.data.triggerRefresh();
                };
                app.workspace.on('active-leaf-change', handler);
                ComponentInstance.addCleanup(instance, () => app.workspace.off('active-leaf-change', handler));
            }
        }
        else if (refresh === 'daily' || refresh === 'hourly') {
            const schedule = () => {
                const now = new Date();
                const next = component.refresh === 'daily'
                    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
                    : new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1);
                const timeout = setTimeout(() => {
                    instance.data.triggerRefresh();
                    schedule();
                }, next.getTime() - now.getTime());
                instance.data.boundaryTimeout = timeout;
            };
            schedule();
            ComponentInstance.addCleanup(instance, () => clearTimeout(instance.data.boundaryTimeout));
        }
        else if (refresh.type === 'timeElapsed') {
            const interval = setInterval(() => instance.data.triggerRefresh(), refresh.interval);
            ComponentInstance.addInterval(instance, interval);
        }
    }

    function getOrCreateInstance(
        component: Component<readonly string[]>,
        el: HTMLElement,
        ctx: MarkdownPostProcessorContext,
        app: App,
        options: { usesFm: boolean; usesFile: boolean; usesSelf: boolean; isInSidebarContext: boolean; fmKeys: string[]; fileKeys: string[]; query?: string }
    ): { instance: ComponentInstance; isNew: boolean } {
        const existingId = el.dataset.componentId;

        if (existingId && componentInstances.has(existingId)) {
            const instance = componentInstances.get(existingId)!;
            return { instance, isNew: false };
        }

        const instance = ComponentInstance.create(el);

        // Register Obsidian cleanup
        if (ctx.addChild) {
            const cleanupComponent = new MarkdownRenderChild(el);
            cleanupComponent.register(() => instance.destroy());
            ctx.addChild(cleanupComponent);
        }

        const registeredStrategies = new Set<string>();
        instance.data.watchedKeys = { fmKeys: options.fmKeys, fileKeys: options.fileKeys };
        instance.data.watchedQuery = options.query;

        const registerStrategy = (refresh: RefreshStrategyOptions) => {
            if (!refresh) return;
            const key = typeof refresh === 'object' ? `timeElapsed:${refresh.interval}` : refresh;
            if (!registeredStrategies.has(key)) {
                registeredStrategies.add(key);
                setupRefreshHandlers(component, instance, refresh, ctx, app);
            }
        };

        if (component.refresh) {
            if (Array.isArray(component.refresh)) {
                component.refresh.forEach(registerStrategy);
            } else {
                registerStrategy(component.refresh);
            }
        }

        // special variables mandate strategies
        if (options.usesFm || options.usesFile) {
            registerStrategy('metadataChanged');
        }
        if ((options.usesFm || options.usesFile || options.usesSelf) && options.isInSidebarContext) {
            registerStrategy('leafChanged');
        }
        if (options.query) {
            registerStrategy('queryMetadataChanged');
        }

        return { instance, isNew: true };
    }

    export async function render(
        component: Component<readonly string[]>,
        source: string,
        el: HTMLElement,
        ctx: MarkdownPostProcessorContext,
        app: App,
        componentSettings?: ComponentSettingsData
    ): Promise<void> {
        const startTime = Date.now();
        
        // Dynamic context: use active file's path instead of source file's path
        // Always apply in sidebar/widget-space context (no docId)
        const isInSidebarContext = !ctx.docId;
        if (isInSidebarContext) {
            const activeFile = app.workspace.getActiveFile();
            if (activeFile) {
                ctx = { ...ctx, sourcePath: activeFile.path };
            }
        }

        injectComponentStyles(component);

        const originalArgs = parseArguments(source);
        let args = { ...originalArgs };

        const argValues = Object.values(originalArgs);
        const usesSelf = argValues.some(v => v?.includes('__SELF__'));

        const componentArgKeys = new Set(Component.getArgKeys(component));

        // Resolve special variables first (__TODAY__, __SELF__, etc.)
        args = resolveSpecialVariables(args, ctx);

        // Get frontmatter for expression evaluation
        const file = app.vault.getAbstractFileByPath(ctx.sourcePath);
        const frontmatter = file instanceof TFile
            ? app.metadataCache.getFileCache(file)?.frontmatter || {}
            : {};

        // Evaluate expressions (handles fm.*, file.*, if(), operators)
        const exprResult = evaluateArgs(args, { frontmatter });
        args = exprResult.args;
        const fmKeys = exprResult.fmKeys;
        const fileKeys = exprResult.fileKeys;
        const usesFm = fmKeys.length > 0;
        const usesFile = fileKeys.length > 0;

        // Check if any file.* keys were undefined (for recovery)
        const needsFileRecovery = fileKeys.some(key => {
            const value = frontmatter[key];
            return value === undefined;
        });

        args = parseArgsAliases(args, componentArgKeys);

        // Handle special KEYS
        const cssOverrides: Record<string, string> = {};
        const cleanArgs: Record<string, string> = {};
        let isEnabled = true;
        let isRef = false;

        Object.entries(args).forEach(([key, value]) => {
            // ! => force to CSS
            if (key.endsWith('!')) {
                const cleanKey = key.slice(0, -1);
                cssOverrides[cleanKey] = value;
                componentArgKeys.delete(cleanKey);
            // enabled => RESERVED KEYWORD for enabling/disabling components
            } else if (key === 'enabled') {
                isEnabled = isTruthy(value);
                componentArgKeys.delete(key);
            // all other keys => component args / CSS carryovers
            } else if (key === 'ref') {
                isRef = isTruthy(value);
                componentArgKeys.delete(key);
                return
            } else {
                cleanArgs[key] = value;
            }
        });

        // Create instance and register refresh handlers BEFORE checking enabled
        // This ensures disabled components can still react to changes (e.g. enabled=fm.showWidget)
        const { instance, isNew } = getOrCreateInstance(component, el, ctx, app, {
            usesFm,
            usesFile,
            usesSelf,
            isInSidebarContext,
            fmKeys,
            fileKeys,
            query: args.query
        });

        instance.data._watchedFmValues = Object.fromEntries(
            Object.entries(originalArgs)
                .filter(([_, v]) => typeof v === 'string' && v.startsWith('fm.'))
                .map(([k, v]) => [v.slice(3), args[k] === 'undefined' ? undefined : args[k]])
        );
        instance.data._watchedFileValues = Object.fromEntries(
            Object.entries(originalArgs)
                .filter(([_, v]) => typeof v === 'string' && v.startsWith('file.'))
                .map(([k, v]) => [v.slice(5), args[k] === 'undefined' ? undefined : args[k]])
        );
        instance.data._watchedFilePath = ctx.sourcePath;

        el.dataset.componentKey = component.keyName;
        if (Component.hasArgs(component)) {
            el.dataset.componentArgs = JSON.stringify(originalArgs);
        }
        el.dataset.componentSource = ctx.sourcePath;

        instance.data.triggerRefresh = async () => {
            // Guard against concurrent renders - queue refresh if already rendering
            if (instance.data._isRendering) {
                instance.data._pendingRefresh = true;
                return;
            }
            try {
                instance.data._isRendering = true;
                if (!component.renderRefresh) el.empty();
                await Component.render(component, source, el, ctx, app, componentSettings);
            } finally {
                instance.data._isRendering = false;
            }
        };

        // if(isRef) {
        //     const refId = args['ref'];
        //     const refSource = componentSettings?.componentReferences?.[refId];

        //     if (refSource) {
        //         const refArgs = parseArguments(refSource);
        //         const targetComponentKey = refArgs['component'];
        //         const targetComponent = COMPONENTS.find(c => c.keyName === targetComponentKey);
                
        //         if (targetComponent) {
        //             // Merge: Local args override Reference args, Reference args override Defaults
        //             const mergedArgs = { ...refArgs, ...args };
        //             delete mergedArgs['ref'];
        //             delete mergedArgs['component'];

        //             return this.render(targetComponent, el, mergedArgs, ctx, app, componentSettings);
        //         } else {
        //             new Notice(`Reference "${refId}" points to missing component: ${targetComponentKey}`);
        //         }
        //     } else {
        //         new Notice(`Component reference "${refId}" not found in settings.`);
        //     }
        // }
        if (!isEnabled) {
            el.empty();
            el.addClass('component-disabled');
            const container = el.closest('.widget-item.in-sidebar') as HTMLElement;
            if (container) {
                container.style.display = 'none';
                container.dispatchEvent(new CustomEvent('widget-visibility-change', { bubbles: true }));
            }
            return;
        }

        el.removeClass('component-disabled');
        // Show the container if it was hidden
        const container = el.closest('.widget-item.in-sidebar') as HTMLElement;
        if (container) {
            const wasHidden = container.style.display === 'none';
            container.style.display = '';
            if (wasHidden) {
                container.dispatchEvent(new CustomEvent('widget-visibility-change', { bubbles: true }));
            }
        }

        const requiredArgs = Component.getRequiredArgs(component);
        if (requiredArgs.length > 0) {
            validateArguments(cleanArgs, requiredArgs);
        }

        applyCssFromArgs(el, { ...cleanArgs, ...cssOverrides }, componentArgKeys);

        // Internal global class
        el.addClass('component');

        const argsWithDefaults = Component.mergeWithDefaults(component, cleanArgs);
        const argsWithOriginal = { ...argsWithDefaults, original: originalArgs } as ComponentArgs;

        let renderFn: RenderFunction<readonly string[]>;
        // Use renderRefresh only if instance exists AND element has content
        // (element may have been cleared by disable, requiring full render)
        if (!isNew && component.renderRefresh && el.hasChildNodes()) {
            renderFn = component.renderRefresh;
        } else {
            renderFn = component.render;
        }

        instance.data._isRendering = true;
        try {
            await renderFn(argsWithOriginal, el, ctx, app, instance, componentSettings);
        } finally {
            instance.data._isRendering = false;
            // Process queued refresh if one was requested during render
            if (instance.data._pendingRefresh) {
                instance.data._pendingRefresh = false;
                instance.data.triggerRefresh();
            }
        }

        const endTime = Date.now();
        // debug(`render ${component.keyName} took ${endTime - startTime}ms`);

        // Recovery: if file.* args were undefined, wait for cache update then refresh
        const recoveryKey = `_recoveryAttempted_${ctx.sourcePath}`;
        const alreadyAttempted = instance.data[recoveryKey] === true;

        if (needsFileRecovery && !alreadyAttempted) {
            instance.data[recoveryKey] = true;

            const file = app.vault.getAbstractFileByPath(ctx.sourcePath);
            if (file instanceof TFile) {
                let retryCount = 0;
                const maxRetries = 5;

                const recoveryHandler = (changedFile: TFile, _data: string, cache: CachedMetadata) => {
                    if (changedFile.path !== file.path) return;

                    const stillMissing = fileKeys.some(key => cache?.frontmatter?.[key] === undefined);
                    retryCount++;

                    if (!stillMissing || retryCount >= maxRetries) {
                        app.metadataCache.off('changed', recoveryHandler);
                        el.empty();
                        instance.data.triggerRefresh?.();
                    }
                };
                app.metadataCache.on('changed', recoveryHandler);
                //cleanup
                setTimeout(() => {
                    app.metadataCache.off('changed', recoveryHandler);
                }, 2000);
            }
        }
    }
}

import { COMPONENTS } from "./components.register";
export { COMPONENTS };
import { GROUPS } from "./groups";
export { GROUPS };