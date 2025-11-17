import { App, MarkdownPostProcessorContext, TAbstractFile, TFile, MarkdownRenderChild } from "obsidian";
import { parseArguments, validateArguments, parseFM, resolveSpecialVariables, parseArgsAliases } from "utils";
import { applyCssFromArgs } from "utils";
import ComponentsPlugin from "main";
import { ComponentGroup } from "groups";

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

                // Remove from registry
                componentInstances.delete(id);
                // console.log(`Component ${id} cleaned up. Total instances: ${componentInstances.size}`);
            }
        };

        // Store instance reference on element
        el.dataset.componentId = id;
        componentInstances.set(id, instance);
        // console.log(`Component ${id} created. Total instances: ${componentInstances.size}`);

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
            const now = Date.now();
            const msUntilNextInterval = intervalMs - (now % intervalMs);
            
            setTimeout(() => {
                updateFn();
                const interval = setInterval(updateFn, intervalMs);
                addInterval(instance, interval);
            }, msUntilNextInterval);
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

export type ComponentArgs<TArgs extends readonly string[] = readonly string[]> = 
Record<TArgs[number], string> & {
    original: Record<string, string>;
};

export interface Component<TArgs extends readonly string[]> {
    keyName: string;
    name?: string;
    description?: string;
    icon?: string;
    enabled?: boolean; // Default true - set to false to exclude from COMPONENTS array
    args: Partial<Record<TArgs[number], ComponentArg>>;
    aliases?: string[];
    render: (args: ComponentArgs<TArgs>, el: HTMLElement, ctx: MarkdownPostProcessorContext, app: App, instance: ComponentInstance, componentSettings?: ComponentSettingsData) => Promise<void>;
    refresh?: boolean;
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

    export async function render(
        component: Component<readonly string[]>,
        source: string,
        el: HTMLElement,
        ctx: MarkdownPostProcessorContext,
        app: App,
        componentSettings?: ComponentSettingsData
    ): Promise<void> {
        const originalArgs = parseArguments(source);
        let args = { ...originalArgs };

        const componentArgKeys = new Set(Component.getArgKeys(component));

        args = parseFM(args, app, ctx);
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

        // Internal instance
        const instance = ComponentInstance.create(el);

        // Obsidian instance: Markdown/reading mode cleanup
        if (ctx.addChild) {
            const cleanupComponent = new MarkdownRenderChild(el);
            cleanupComponent.register(() => instance.destroy());
            ctx.addChild(cleanupComponent);
        }
        // Beyond here, the view is responsible for cleanup.

        const requiredArgs = Component.getRequiredArgs(component);
        if (requiredArgs.length > 0) {
            validateArguments(cleanArgs, requiredArgs);
        }

        applyCssFromArgs(el, { ...cleanArgs, ...cssOverrides }, componentArgKeys);

        // Internal global class
        el.addClass('component');

        const argsWithDefaults = Component.mergeWithDefaults(component, cleanArgs);
        const argsWithOriginal = { ...argsWithDefaults, original: originalArgs } as ComponentArgs;

        // Auto-inject component styles if specified
        if (component.styles) {
            const styleEl = el.createEl('style');
            styleEl.textContent = component.styles;
            el.appendChild(styleEl);
        }

        await component.render(argsWithOriginal, el, ctx, app, instance, componentSettings);
    }
}

import { COMPONENTS } from "./components.register";
export { COMPONENTS };
import { GROUPS } from "./groups";
export { GROUPS };