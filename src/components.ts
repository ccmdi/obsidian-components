import { App, MarkdownPostProcessorContext, TFile, MarkdownRenderChild } from "obsidian";
import { parseArguments, validateArguments, parseFM, parseFileContent, resolveSpecialVariables, parseArgsAliases } from "utils";
import { applyCssFromArgs } from "utils";
import ComponentsPlugin from "main";
import { ComponentGroup } from "groups";
import { debug } from "debug";

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
    export function create(el: HTMLElement): ComponentInstance {
        const id = `component-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        const instance: ComponentInstance = {
            id,
            element: el,
            data: {
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
        debug(`Component ${id} created. Total instances: ${componentInstances.size}`);

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
}

export interface ComponentArg {
    description?: string;
    default?: string;
    required?: boolean;
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
    | 'fileModified'
    | 'anyMetadataChanged'
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
        return Object.keys(component.args || {}).length > 0;
    }

    export function mergeWithDefaults(component: Component<readonly string[]>, args: Record<string, string>): Record<string, string> {
        const result = { ...args };

        // Apply defaults for any missing args
        Object.entries(component.args || {}).forEach(([argKey, argConfig]) => {
            if (!(argKey in result) && argConfig?.default !== undefined) {
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
        app: App
    ): void {
        if (!refresh) return;
        if (refresh === 'metadataChanged') {
            const handler = (file: TFile) => {
                // debug("RENDER REASON: metadataChanged", file.path, instance.element.dataset.componentSource);
                if (file.path === instance.element.dataset.componentSource) instance.data.triggerRefresh();
            };
            app.metadataCache.on('changed', handler);
            ComponentInstance.addCleanup(instance, () => app.metadataCache.off('changed', handler));
        }
        else if (refresh === 'fileModified') {
            const handler = (file: TFile) => {
                // debug("RENDER REASON: fileModified", file.path, instance.element.dataset.componentSource);
                if (file.path === instance.element.dataset.componentSource) instance.data.triggerRefresh();
            };
            app.vault.on('modify', handler);
            ComponentInstance.addCleanup(instance, () => app.vault.off('modify', handler));
        }
        else if (refresh === 'anyMetadataChanged') {
            const handler = () => {
                // debug("RENDER REASON: anyMetadataChanged", instance.element.dataset.componentSource);
                instance.data.triggerRefresh();
            };
            app.metadataCache.on('changed', handler);
            ComponentInstance.addCleanup(instance, () => app.metadataCache.off('changed', handler));
        }
        else if (refresh === 'leafChanged') {
            const isInSidebar = instance.element.closest('.in-sidebar') !== null;
            if (isInSidebar) {
                const handler = () => {
                    //TODO double render fix
                    // debug("RENDER REASON: leafChanged", instance.element.dataset.componentSource);
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
        options: { usesFm: boolean; usesFile: boolean; usesSelf: boolean; isInSidebarContext: boolean }
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

        const registerStrategy = (refresh: RefreshStrategyOptions) => {
            if (!refresh) return;
            const key = typeof refresh === 'object' ? `timeElapsed:${refresh.interval}` : refresh;
            if (!registeredStrategies.has(key)) {
                registeredStrategies.add(key);
                setupRefreshHandlers(component, instance, refresh, ctx, app);
            }
        };

        // Setup explicit refresh handlers from component definition
        if (component.refresh) {
            if (Array.isArray(component.refresh)) {
                component.refresh.forEach(registerStrategy);
            } else {
                registerStrategy(component.refresh);
            }
        }

        // special variables mandate strategies
        if (options.usesFm) {
            registerStrategy('metadataChanged');
        }
        if (options.usesFile) {
            registerStrategy('fileModified');
        }
        if ((options.usesFm || options.usesFile || options.usesSelf) && options.isInSidebarContext) {
            registerStrategy('leafChanged');
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
        debug('render', component.keyName, el.dataset.componentSource);
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
        const usesFm = argValues.some(v => v?.startsWith('fm.'));
        const usesFile = argValues.some(v => v?.startsWith('file.'));
        const usesSelf = argValues.some(v => v?.includes('__SELF__'));

        const componentArgKeys = new Set(Component.getArgKeys(component));

        args = parseFM(args, app, ctx);
        args = await parseFileContent(args, app, ctx);

        // Handle special VALUES
        args = resolveSpecialVariables(args, ctx);
        args = parseArgsAliases(args, componentArgKeys);

        // Handle special KEYS
        const cssOverrides: Record<string, string> = {};
        const cleanArgs: Record<string, string> = {};
        let isEnabled = true;

        Object.entries(args).forEach(([key, value]) => {
            // ! => force to CSS
            if (key.endsWith('!')) {
                const cleanKey = key.slice(0, -1);
                cssOverrides[cleanKey] = value;
                componentArgKeys.delete(cleanKey);
            // enabled => RESERVED KEYWORD for enabling/disabling components
            } else if (key === 'enabled') {
                if (value === 'false') {
                    isEnabled = false;
                }
                componentArgKeys.delete(key);
            // all other keys => component args / CSS carryovers
            } else {
                cleanArgs[key] = value;
            }
        });

        if (!isEnabled) {
            return;
        }

        const { instance, isNew } = getOrCreateInstance(component, el, ctx, app, {
            usesFm,
            usesFile,
            usesSelf,
            isInSidebarContext
        });

        const requiredArgs = Component.getRequiredArgs(component);
        if (requiredArgs.length > 0) {
            validateArguments(cleanArgs, requiredArgs);
        }

        applyCssFromArgs(el, { ...cleanArgs, ...cssOverrides }, componentArgKeys);

        // Internal global class
        el.addClass('component');

        el.dataset.componentKey = component.keyName;
        if (Component.hasArgs(component)) {
            el.dataset.componentArgs = JSON.stringify(originalArgs);
        }
        el.dataset.componentSource = ctx.sourcePath;

        const argsWithDefaults = Component.mergeWithDefaults(component, cleanArgs);
        const argsWithOriginal = { ...argsWithDefaults, original: originalArgs } as ComponentArgs;

        instance.data.triggerRefresh = async () => {
            if (!component.renderRefresh) el.empty();
            Component.render(component, source, el, ctx, app, componentSettings);
        };
        
        let renderFn: RenderFunction<readonly string[]>;
        if(!isNew && component.renderRefresh) {
            renderFn = component.renderRefresh;
        } else {
            renderFn = component.render;
        }

        await renderFn(argsWithOriginal, el, ctx, app, instance, componentSettings);
    }
}

import { COMPONENTS } from "./components.register";
export { COMPONENTS };
import { GROUPS } from "./groups";
export { GROUPS };