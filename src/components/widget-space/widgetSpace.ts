import { Component, ComponentAction, ComponentInstance } from "../../components";
import { App, Modal, Setting, TextComponent, Notice } from "obsidian";
import { widgetSpaceStyles } from "./styles";
import ConfirmationModal from "../../native/confirmation";
import { COMPONENTS, componentInstances } from "../../components";
import ComponentSidebarView from "../../native/sidebar";

interface WidgetConfig {
    id: string;
    componentKey: string;
    args: Record<string, string>;
    width: number;
    height: number;
    order: number;
}

interface WidgetSpaceLayout {
    widgets: WidgetConfig[];
}

interface WidgetState {
    element: HTMLElement;
    componentKey: string;
    args: Record<string, string>;
    componentInstance: ComponentInstance | null;
}

declare global {
    interface Window {
        Muuri: any;
    }
}

const CONFIG_PATH = (app: App) => `${app.vault.configDir}/plugins/components/components-widget-layout.json`;

async function loadMuuri(): Promise<void> {
    if (window.Muuri) return;

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/muuri@0.9.5/dist/muuri.min.js';
    await new Promise<void>((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function loadLayout(app: App, argsLayout: string): Promise<WidgetSpaceLayout> {
    try {
        const configPath = CONFIG_PATH(app);
        if (await app.vault.adapter.exists(configPath)) {
            return JSON.parse(await app.vault.adapter.read(configPath));
        } else if (argsLayout) {
            return JSON.parse(argsLayout);
        }
    } catch { /* fall through */ }
    return { widgets: [] };
}

function createSkeleton(parent: HTMLElement, count: number): HTMLElement {
    const skeleton = parent.createEl('div', { cls: 'widget-space-skeleton' });
    Object.assign(skeleton.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        backgroundColor: 'var(--background-primary)',
        zIndex: '10'
    });

    for (let i = 0; i < Math.max(3, count); i++) {
        skeleton.createEl('div', { cls: 'widget-skeleton' });
    }
    return skeleton;
}

function argsToSource(args: Record<string, string>): string {
    return Object.entries(args)
        .map(([key, value]) => `${key}="${value}"`)
        .join('\n');
}

class ComponentSelectorModal extends Modal {
    private availableComponents: Component<readonly string[]>[];
    private onSelect: (component: Component<readonly string[]>) => void;

    constructor(app: App, components: Component<readonly string[]>[], onSelect: (comp: Component<readonly string[]>) => void) {
        super(app);
        this.availableComponents = components;
        this.onSelect = onSelect;
    }

    onOpen() {
        const { contentEl, titleEl } = this;
        contentEl.empty();
        titleEl.setText('Add Widget');

        this.availableComponents.forEach(component => {
            const option = contentEl.createEl('div', { cls: 'clickable-icon' });
            option.createEl('div', {
                text: component.name || component.keyName,
                cls: 'nav-file-title-content'
            });
            option.createEl('div', {
                text: component.description || '',
                cls: 'nav-file-tag'
            });

            option.addEventListener('click', async () => {
                this.close();
                if (component.keyName === 'widget-space') {
                    await this.openWidgetSpaceSidebar();
                } else {
                    this.onSelect(component);
                }
            });
        });
    }

    private async openWidgetSpaceSidebar() {
        const existingLeaf = this.app.workspace.getLeavesOfType('component-sidebar').find(leaf =>
            (leaf.view as ComponentSidebarView).componentKey === 'widget-space'
        );

        if (existingLeaf) {
            this.app.workspace.revealLeaf(existingLeaf);
        } else {
            const leaf = this.app.workspace.getRightLeaf(false);
            await leaf?.setViewState({
                type: 'component-sidebar',
                state: { componentKey: 'widget-space' }
            });
            this.app.workspace.revealLeaf(leaf!);
        }
    }

    onClose() {
        this.contentEl.empty();
    }
}

class WidgetConfigModal extends Modal {
    private component: Component<readonly string[]>;
    private args: Record<string, string> = {};
    private onSubmit: (args: Record<string, string>) => void;

    constructor(app: App, component: Component<readonly string[]>, onSubmit: (args: Record<string, string>) => void) {
        super(app);
        this.component = component;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: `Configure ${this.component.name || this.component.keyName}` });

        if (Component.hasArgs(this.component)) {
            Object.entries(this.component.args).forEach(([argKey, argConfig]) => {
                const setting = new Setting(contentEl)
                    .setName(argKey)
                    .setDesc(argConfig?.description || '')
                    .addText((text: TextComponent) => text
                        .setPlaceholder(argConfig?.default || `Enter ${argKey}...`)
                        .onChange((value: string) => { this.args[argKey] = value; })
                    );

                if (argConfig?.required) {
                    setting.nameEl.createSpan({ text: ' *', cls: 'mod-warning' });
                }
            });
        } else {
            contentEl.createEl('p', { text: 'This component has no configurable arguments.' });
        }

        const buttonContainer = contentEl.createEl('div', { cls: 'modal-button-container' });

        buttonContainer.createEl('button', { text: 'Add Widget', cls: 'mod-cta' })
            .onclick = () => this.submit();

        buttonContainer.createEl('button', { text: 'Cancel' })
            .onclick = () => this.close();
    }

    private submit() {
        const requiredArgs = Component.getRequiredArgs(this.component);
        const missingRequired = requiredArgs.filter(arg => !this.args[arg]?.trim());

        if (missingRequired.length > 0) {
            new Notice(`Missing required arguments: ${missingRequired.join(', ')}`);
            return;
        }

        this.close();
        this.onSubmit(this.args);
    }

    onClose() {
        this.contentEl.empty();
    }
}

export const widgetSpace: Component<['layout']> = {
    name: 'Widget Space',
    description: 'A modular container for multiple components with drag & drop',
    keyName: 'widget-space',
    icon: 'layout-grid',
    isMountable: false,
    args: {
        layout: {
            description: 'JSON layout configuration (optional)',
            default: ''
        }
    },
    does: [ComponentAction.READ, ComponentAction.WRITE, ComponentAction.EXTERNAL],
    styles: widgetSpaceStyles,

    render: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
        const layout = await loadLayout(app, args.layout);
        await loadMuuri();

        el.style.position = 'relative';

        // DOM setup
        const container = el.createEl('div', { cls: 'widget-space-container' });
        const grid = el.createEl('div', { cls: 'widget-space-grid' });
        const skeleton = createSkeleton(el, layout.widgets.length);

        container.appendChild(grid);
        container.appendChild(skeleton);
        el.appendChild(container);

        // State
        const activeWidgets = new Map<string, WidgetState>();
        let widgetCounter = 0;
        let muuri: any;

        // Width tracking
        const updateWidthVariable = () => {
            container.style.setProperty('--widget-space-width', `${grid.offsetWidth}px`);
        };
        updateWidthVariable();

        const gridResizeObserver = new ResizeObserver(updateWidthVariable);
        gridResizeObserver.observe(grid);

        // Persistence
        const saveLayout = async () => {
            const widgets: WidgetConfig[] = muuri.getItems()
                .map((item: any, index: number) => {
                    const element = item.getElement();
                    const widgetData = activeWidgets.get(element.dataset.widgetId);
                    if (!widgetData || !document.contains(element)) return null;

                    return {
                        id: element.dataset.widgetId,
                        componentKey: widgetData.componentKey,
                        args: widgetData.args,
                        width: element.offsetWidth,
                        height: element.offsetHeight,
                        order: index
                    };
                })
                .filter(Boolean);

            try {
                await app.vault.adapter.write(CONFIG_PATH(app), JSON.stringify({ widgets }, null, 2));
            } catch { /* silent */ }
        };

        // Widget management
        const addWidget = async (componentKey: string, componentName: string, componentArgs: Record<string, string> = {}) => {
            const widgetId = `widget-${++widgetCounter}`;
            const widget = el.createEl('div', { cls: 'widget-item' });
            widget.dataset.widgetId = widgetId;
            widget.dataset.componentKey = componentKey;

            activeWidgets.set(widgetId, {
                element: widget,
                componentKey,
                args: componentArgs,
                componentInstance: null
            });

            widget.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                new ConfirmationModal(app, `Remove ${componentName} widget?`, () => removeWidget(widget)).open();
            });

            const content = widget.createEl('div', { cls: 'widget-content' });
            content.dataset.widgetId = widgetId;
            content.dataset.componentKey = componentKey;

            const component = COMPONENTS.find(c => c.keyName === componentKey);
            if (component) {
                try {
                    const activeFile = app.workspace.getActiveFile();
                    const dynamicCtx = ctx.sourcePath && activeFile
                        ? { ...ctx, sourcePath: activeFile.path }
                        : ctx;
                    await Component.render(component, argsToSource(componentArgs), content, dynamicCtx, app, componentSettings);
                } catch (error) {
                    content.createEl('div', {
                        attr: { style: 'color: var(--text-error); padding: 8px;' },
                        text: `Error loading ${componentName}: ${error.message}`
                    });
                }
            }

            // Position new widget below existing ones
            const existingItems = muuri.getItems();
            if (existingItems.length > 0) {
                const maxBottom = existingItems.reduce((max: number, item: any) => {
                    const el = item.getElement();
                    const rect = el.getBoundingClientRect();
                    const containerRect = grid.getBoundingClientRect();
                    return Math.max(max, rect.bottom - containerRect.top + el.offsetHeight);
                }, 0);
                widget.style.transform = `translate3d(0px, ${maxBottom + 8}px, 0)`;
            }

            grid.appendChild(widget);
            muuri.add(widget, { index: existingItems.length });
            setTimeout(() => muuri?.layout(false), 0);
            muuri.resizeObserver?.observe(content);
            await saveLayout();
        };

        const removeWidget = async (widget: HTMLElement) => {
            const widgetId = widget.dataset.widgetId!;
            const content = widget.querySelector('.widget-content');

            muuri.resizeObserver?.unobserve(content);
            widget.remove();
            muuri.refreshItems();
            muuri.layout(true);
            activeWidgets.delete(widgetId);
            await saveLayout();
        };

        // Muuri initialization
        const initMuuri = () => {
            muuri = new window.Muuri(grid, {
                items: '.widget-item',
                dragEnabled: true,
                dragContainer: container,
                dragSortHeuristics: { sortInterval: 10, minDragDistance: 5, minBounceBackAngle: Math.PI / 2 },
                layout: { fillGaps: true, horizontal: false, alignRight: false, alignBottom: false, rounding: true },
                layoutDuration: 0,
                layoutEasing: 'ease',
                dragStartPredicate: { distance: 10, delay: 0 },
                dragAxis: null,
                dragSort: true,
                itemHeight: 'auto'
            });

            muuri.on('layoutEnd', () => {
                if (grid.dataset.initialLoadComplete === 'true' && !grid.classList.contains('initial-load-done')) {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            grid.classList.add('initial-load-done');
                            skeleton.style.display = 'none';
                        });
                    });
                }
            });

            muuri.on('dragStart', (item: any) => {
                grid.classList.add('is-dragging');
                const el = item.getElement();
                el.style.zIndex = '1000';
                el.style.transform += ' scale(1.02)';
                el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
            });

            muuri.on('dragEnd', async (item: any) => {
                grid.classList.remove('is-dragging');
                const el = item.getElement();
                el.style.zIndex = '';
                el.style.transform = el.style.transform.replace(' scale(1.02)', '');
                el.style.boxShadow = '';
                await saveLayout();
            });

            muuri.resizeObserver = new ResizeObserver((entries) => {
                if (entries.some(e => e.target.closest('.widget-item'))) {
                    muuri.refreshItems();
                    muuri.layout(false);
                }
            });
        };

        // Component refresh on active leaf change
        const refreshComponents = async () => {
            for (const [, widgetData] of activeWidgets) {
                const component = COMPONENTS.find(c => c.keyName === widgetData.componentKey);
                if (!component?.refresh) continue;

                const content = widgetData.element.querySelector('.widget-content') as HTMLElement;
                if (!content) continue;

                try {
                    const componentId = content.dataset.componentId;
                    if (componentId) {
                        componentInstances.get(componentId)?.destroy();
                    }
                    content.empty();

                    const activeFile = app.workspace.getActiveFile();
                    const dynamicCtx = ctx.sourcePath && activeFile
                        ? { ...ctx, sourcePath: activeFile.path }
                        : ctx;
                    await Component.render(component, argsToSource(widgetData.args), content, dynamicCtx, app, componentSettings);
                } catch (error) {
                    console.warn(`Failed to refresh ${component.keyName}:`, error);
                }
            }
        };

        // Event handlers
        const availableComponents = COMPONENTS.filter(c => c.isMountable);

        container.addEventListener('dblclick', (e) => {
            if (e.target === container || e.target === grid) {
                new ComponentSelectorModal(app, availableComponents, (comp) => {
                    new WidgetConfigModal(app, comp, (args) => {
                        addWidget(comp.keyName, comp.name || comp.keyName, args);
                    }).open();
                }).open();
            }
        });

        const handleInternalLink = async (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.classList.contains('internal-link')) return;
            if (e.type === 'click' && e.button !== 0) return;
            if (e.type === 'auxclick' && e.button !== 1) return;

            e.preventDefault();
            e.stopPropagation();

            const linkTarget = target.getAttribute('data-href');
            if (linkTarget) {
                const widget = target.closest('.widget-item') as HTMLElement;
                const isNewTab = e.button === 1 || e.ctrlKey || e.metaKey;
                await app.workspace.openLinkText(linkTarget, widget?.dataset.componentKey || '', isNewTab ? 'tab' : false);
            }
        };
        container.addEventListener('click', handleInternalLink);
        container.addEventListener('auxclick', handleInternalLink);

        // Initialize
        initMuuri();

        for (const widgetConfig of [...layout.widgets].sort((a, b) => (a.order || 0) - (b.order || 0))) {
            const component = COMPONENTS.find(c => c.keyName === widgetConfig.componentKey);
            if (component) {
                await addWidget(widgetConfig.componentKey, component.name || component.keyName, widgetConfig.args);
            }
        }

        grid.dataset.initialLoadComplete = 'true';
        if (layout.widgets.length === 0) {
            skeleton.style.display = 'none';
            grid.classList.add('initial-load-done');
        } else {
            muuri.layout(false);
        }

        // Visibility handling for sidebar tab switching
        let hasBeenVisibleOnce = false;
        const visibilityObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!grid.classList.contains('initial-load-done') && !hasBeenVisibleOnce) {
                    if (entry.isIntersecting) hasBeenVisibleOnce = true;
                    return;
                }

                if (!entry.isIntersecting) {
                    grid.classList.remove('initial-load-done');
                    skeleton.style.display = '';
                } else if (!grid.classList.contains('initial-load-done')) {
                    muuri.refreshItems();
                    muuri.layout(false);
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            grid.classList.add('initial-load-done');
                            skeleton.style.display = 'none';
                        });
                    });
                }
            });
        }, { threshold: 0.01 });
        visibilityObserver.observe(container);

        // Observe existing widget contents
        grid.querySelectorAll('.widget-content').forEach(content => {
            muuri.resizeObserver?.observe(content);
        });

        app.workspace.on('active-leaf-change', refreshComponents);

        // Cleanup
        ComponentInstance.addCleanup(instance, () => {
            app.workspace.off('active-leaf-change', refreshComponents);
            visibilityObserver.disconnect();
            gridResizeObserver.disconnect();
            muuri.resizeObserver?.disconnect();
            muuri.destroy();
        });
    },
    settings: {}
};
