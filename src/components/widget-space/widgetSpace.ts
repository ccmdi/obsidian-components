import { Component, ComponentAction, ComponentInstance } from "components";
import { App, Modal } from "obsidian";
import { widgetSpaceStyles } from "./styles";
import ConfirmationModal from "native/confirmation";
import { ComponentArgsModal } from "native/modal";
import { COMPONENTS, componentInstances } from "components";
import ComponentSidebarView from "native/sidebar";
import ComponentsPlugin, { COMPONENT_SIDEBAR_VIEW_TYPE } from "main";
import Muuri from "muuri";
import { argsToSource } from "utils";

const MARGIN = 4;

interface MuuriGridExt extends Muuri {
    resizeObserver?: ResizeObserver;
}

interface WidgetConfig {
    id: string;
    componentKey: string;
    args: Record<string, string>;
    order: number;
    x: number;
    y: number;
}

interface WidgetSpaceLayout {
    widgets: WidgetConfig[];
}

interface WidgetState {
    element: HTMLElement;
    componentKey: string;
    args: Record<string, string>;
}

export function parseLayout(layoutBase64: string): WidgetSpaceLayout {
    if (!layoutBase64) return { widgets: [] };
    try {
        // Decode from base64, then parse JSON
        const json = atob(layoutBase64);
        return JSON.parse(json);
    } catch {
        return { widgets: [] };
    }
}

function createSkeleton(parent: HTMLElement, count: number, columns: number): HTMLElement {
    const skeleton = parent.createEl('div', { cls: 'widget-space-skeleton' });
    skeleton.style.cssText = `
        position: absolute; top: 0; left: 0; right: 0; bottom: 0;
        background-color: var(--background-primary); z-index: 10;
        display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 8px; padding: 12px;
    `;
    for (let i = 0; i < Math.max(3, count); i++) {
        skeleton.createEl('div', { cls: 'widget-skeleton' });
    }
    return skeleton;
}

class ComponentSelectorModal extends Modal {
    constructor(
        app: App,
        private components: Component<readonly string[]>[],
        private onSelect: (comp: Component<readonly string[]>) => void
    ) {
        super(app);
    }

    onOpen() {
        this.titleEl.setText('Add Widget');
        this.contentEl.empty();

        this.components.forEach(comp => {
            const option = this.contentEl.createEl('div', { cls: 'clickable-icon' });
            option.createEl('div', { text: comp.name || comp.keyName, cls: 'nav-file-title-content' });
            option.createEl('div', { text: comp.description || '', cls: 'nav-file-tag' });

            option.addEventListener('click', async () => {
                this.close();
                if (comp.keyName === 'widget-space') {
                    const leaf = this.app.workspace.getLeavesOfType('component-sidebar')
                        .find(l => (l.view as ComponentSidebarView).componentKey === 'widget-space');
                    if (leaf) {
                        this.app.workspace.revealLeaf(leaf);
                    } else {
                        const newLeaf = this.app.workspace.getRightLeaf(false);
                        await newLeaf?.setViewState({ type: 'component-sidebar', state: { componentKey: 'widget-space' } });
                        if (newLeaf) this.app.workspace.revealLeaf(newLeaf);
                    }
                } else {
                    this.onSelect(comp);
                }
            });
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}

export const widgetSpace: Component<['layout', 'columns']> = {
    name: 'Widget Space',
    description: 'A modular container for multiple components with drag & drop',
    keyName: 'widget-space',
    icon: 'layout-grid',
    isMountable: false,
    args: {
        layout: { description: 'Layout configuration (b64)', default: '', hidden: true },
        columns: { description: 'Number of columns (default: 1)', default: '1' }
    },
    does: [ComponentAction.READ],
    styles: widgetSpaceStyles,

    render: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
        const layout = parseLayout(args.layout);
        const columns = Math.max(1, parseInt(args.columns) || 1);

        el.style.position = 'relative';

        const container = el.createEl('div', { cls: 'widget-space-container' });
        const grid = el.createEl('div', { cls: 'widget-space-grid' });
        const skeleton = createSkeleton(el, layout.widgets.length, columns);

        container.append(grid, skeleton);
        el.appendChild(container);

        const activeWidgets = new Map<string, WidgetState>();
        let widgetCounter = 0;
        let muuri!: MuuriGridExt;

        // Find sidebar view for state persistence (check if we're inside a sidebar)
        const isInSidebar = !!el.closest('.in-sidebar');
        const getSidebarView = (): ComponentSidebarView | undefined => {
            for (const leaf of app.workspace.getLeavesOfType(COMPONENT_SIDEBAR_VIEW_TYPE)) {
                const view = leaf.view as ComponentSidebarView;
                if (view.containerEl?.contains(el)) return view;
            }
            return undefined;
        };

        const getWidgetWidth = () => Math.floor((grid.offsetWidth - columns * MARGIN * 2) / columns);

        const updateWidgetWidths = () => {
            const width = getWidgetWidth();
            grid.querySelectorAll<HTMLElement>('.widget-item').forEach(w => w.style.width = `${width}px`);
            muuri?.refreshItems();
            muuri?.layout(false);
        };

        const gridResizeObserver = new ResizeObserver(updateWidgetWidths);
        gridResizeObserver.observe(grid);

        const saveLayout = () => {
            const sidebarView = getSidebarView();
            if (!sidebarView) return;

            const widgets: WidgetConfig[] = muuri.getItems()
                .map((item, index) => {
                    const itemEl = item.getElement();
                    if (!itemEl) return null;
                    const data = activeWidgets.get(itemEl.dataset.widgetId || '');
                    if (!data || !document.contains(itemEl)) return null;
                    // Capture current position from Muuri item
                    const pos = item.getPosition();
                    return {
                        id: itemEl.dataset.widgetId || '',
                        componentKey: data.componentKey,
                        args: data.args,
                        order: index,
                        x: pos.left,
                        y: pos.top
                    };
                })
                .filter((w): w is WidgetConfig => w !== null);

            sidebarView.componentArgs = {
                ...sidebarView.componentArgs,
                columns: String(columns),
                layout: btoa(JSON.stringify({ widgets }))
            };
            app.workspace.requestSaveLayout();
        };

        // Calculate where a new widget will be positioned based on current items
        const calculateNewWidgetPosition = (): { x: number; y: number } => {
            const items = muuri?.getItems() || [];
            const newIndex = items.length;
            const col = newIndex % columns;
            const colWidth = getWidgetWidth() + MARGIN * 2;

            // Sum heights of all items in the same column
            let y = 0;
            items.forEach((item, i) => {
                if (i % columns === col) {
                    const el = item.getElement();
                    y += el ? el.offsetHeight + MARGIN * 2 : 100;
                }
            });

            return { x: col * colWidth, y };
        };

        const addWidget = async (componentKey: string, componentName: string, componentArgs: Record<string, string> = {}, initialPos?: { x: number; y: number }) => {
            const widgetId = `widget-${++widgetCounter}`;
            const widget = grid.createEl('div', { cls: `widget-item${isInSidebar ? ' in-sidebar' : ''}` });
            widget.dataset.widgetId = widgetId;
            widget.style.width = `${getWidgetWidth()}px`;

            // Set initial position before Muuri takes over (prevents animation from origin)
            if (initialPos && initialPos.x !== undefined && initialPos.y !== undefined) {
                widget.style.transform = `translateX(${initialPos.x}px) translateY(${initialPos.y}px)`;
            } else if (muuri) {
                // New widget - precalculate where it will land
                const pos = calculateNewWidgetPosition();
                widget.style.transform = `translateX(${pos.x}px) translateY(${pos.y}px)`;
            }

            activeWidgets.set(widgetId, { element: widget, componentKey, args: componentArgs });

            widget.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                new ConfirmationModal(app, `Remove ${componentName} widget?`, () => removeWidget(widget)).open();
            });

            widget.addEventListener('mousedown', (e) => {
                if (e.button !== 1) return;
                e.preventDefault();
                e.stopPropagation();
                new ComponentArgsModal(app, COMPONENTS.find(c => c.keyName === componentKey)!, {
                    mode: 'widget-space',
                    initialArgs: activeWidgets.get(widgetId)!.args,
                    submitText: 'Update Widget',
                    onSubmit: (newArgs) => {
                        activeWidgets.get(widgetId)!.args = newArgs;
                        const content = widget.querySelector('.widget-content') as HTMLElement;
                        const inst = componentInstances.get(content.dataset.componentId!);
                        inst?.destroy();
                        content.empty();
                        Component.render(COMPONENTS.find(c => c.keyName === componentKey)!, argsToSource(newArgs), content, ctx, app, componentSettings);
                        saveLayout();
                    }
                }).open();
            });

            const content = widget.createEl('div', { cls: 'widget-content' });
            content.dataset.widgetId = widgetId;

            const comp = COMPONENTS.find(c => c.keyName === componentKey);
            if (comp) {
                try {
                    await Component.render(comp, argsToSource(componentArgs), content, ctx, app, componentSettings);
                } catch (error) {
                    content.createEl('div', { attr: { style: 'color: var(--text-error); padding: 8px;' }, text: `Error: ${error.message}` });
                }
            }

            // Disable transitions while adding so it doesn't animate from 0,0
            grid.classList.remove('transitions-enabled');
            muuri.add(widget);
            muuri.refreshItems();
            muuri.layout(false);
            muuri.resizeObserver?.observe(content);
            requestAnimationFrame(() => {
                grid.classList.add('transitions-enabled');
            });
            saveLayout();
        };

        const removeWidget = (widget: HTMLElement) => {
            const widgetId = widget.dataset.widgetId!;
            const content = widget.querySelector('.widget-content');
            if (content) muuri.resizeObserver?.unobserve(content);

            const inst = componentInstances.get((content as HTMLElement)?.dataset.componentId!);
            inst?.destroy();

            widget.remove();
            muuri.refreshItems();
            muuri.layout(true);
            activeWidgets.delete(widgetId);
            saveLayout();
        };

        const initMuuri = () => {
            muuri = new Muuri(grid, {
                items: '.widget-item',
                dragEnabled: true,
                dragSortHeuristics: { sortInterval: 100, minDragDistance: 10, minBounceBackAngle: 1 },
                layout: (_, layoutId, items, __, ___, callback) => {
                    const colWidth = getWidgetWidth() + MARGIN * 2;
                    const columnY = new Array(columns).fill(0);
                    const slots: number[] = [];

                    items.forEach((item, i) => {
                        const col = i % columns;
                        const el = item.getElement();
                        const h = el ? el.offsetHeight + MARGIN * 2 : 100;
                        slots.push(col * colWidth, columnY[col]);
                        columnY[col] += h;
                    });

                    callback({
                        id: layoutId,
                        items,
                        slots,
                        styles: { height: `${Math.max(...columnY, 0)}px` }
                    });
                },
                layoutDuration: 0,
                dragStartPredicate: { distance: 10, delay: 0 },
                dragSort: true,
                dragSortPredicate: { threshold: 50, action: 'move' },
                dragAutoScroll: {
                    targets: [{ element: container, priority: 0, axis: Muuri.AutoScroller.AXIS_Y }],
                    threshold: 50,
                    speed: Muuri.AutoScroller.smoothSpeed(500, 800, 1000)
                }
            }) as MuuriGridExt;

            muuri.on('layoutEnd', () => {
                if (grid.dataset.initialLoadComplete === 'true' && !grid.classList.contains('initial-load-done')) {
                    requestAnimationFrame(() => requestAnimationFrame(() => {
                        grid.classList.add('initial-load-done');
                        skeleton.style.display = 'none';
                        setTimeout(() => grid.classList.add('transitions-enabled'), 50);
                    }));
                }
            });

            muuri.on('dragStart', (item) => {
                const el = item.getElement();
                if (el) { el.style.zIndex = '1000'; el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'; }
            });

            muuri.on('dragEnd', (item) => {
                const el = item.getElement();
                if (el) { el.style.zIndex = ''; el.style.boxShadow = ''; }
                saveLayout();
            });

            muuri.resizeObserver = new ResizeObserver((entries) => {
                if (entries.some(e => e.target.closest('.widget-item'))) {
                    muuri.refreshItems();
                    muuri.layout(false);
                }
            });
        };

        const isComponentEnabled = (key: string) => ComponentsPlugin.instance.settings.componentStates[key] ?? false;
        const availableComponents = COMPONENTS.filter(c => c.isMountable && isComponentEnabled(c.keyName));

        container.addEventListener('dblclick', (e) => {
            if (e.target === container || e.target === grid) {
                new ComponentSelectorModal(app, availableComponents, (comp) => {
                    new ComponentArgsModal(app, comp, {
                        mode: 'widget-space',
                        submitText: 'Add Widget',
                        onSubmit: (args) => addWidget(comp.keyName, comp.name || comp.keyName, args)
                    }).open();
                }).open();
            }
        });

        container.addEventListener('click', handleLink);
        container.addEventListener('auxclick', handleLink);

        async function handleLink(e: MouseEvent) {
            const target = e.target as HTMLElement;
            if (!target.classList.contains('internal-link')) return;
            if (e.type === 'click' && e.button !== 0) return;
            if (e.type === 'auxclick' && e.button !== 1) return;
            e.preventDefault();
            e.stopPropagation();
            const href = target.getAttribute('data-href');
            if (href) {
                await app.workspace.openLinkText(href, '', e.button === 1 || e.ctrlKey || e.metaKey ? 'tab' : false);
            }
        }

        initMuuri();

        for (const cfg of [...layout.widgets].sort((a, b) => (a.order || 0) - (b.order || 0))) {
            const comp = COMPONENTS.find(c => c.keyName === cfg.componentKey);
            if (comp && isComponentEnabled(cfg.componentKey)) {
                // Pass saved position so widgets appear in correct place immediately
                const initialPos = (cfg.x !== undefined && cfg.y !== undefined) ? { x: cfg.x, y: cfg.y } : undefined;
                await addWidget(cfg.componentKey, comp.name || comp.keyName, cfg.args, initialPos);
            }
        }

        grid.dataset.initialLoadComplete = 'true';
        if (layout.widgets.length === 0) {
            skeleton.style.display = 'none';
            grid.classList.add('initial-load-done', 'transitions-enabled');
        } else {
            muuri.refreshItems();
            muuri.layout(false);
        }

        const visibilityObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (!grid.classList.contains('initial-load-done')) {
                        // Initial load - show after positioning
                        muuri.refreshItems();
                        muuri.layout(false);
                        requestAnimationFrame(() => requestAnimationFrame(() => {
                            grid.classList.add('initial-load-done');
                            skeleton.style.display = 'none';
                            setTimeout(() => grid.classList.add('transitions-enabled'), 50);
                        }));
                    } else {
                        // Returning from leaf switch - reposition then hide skeleton
                        grid.classList.remove('transitions-enabled');
                        muuri.refreshItems();
                        muuri.layout(false);
                        requestAnimationFrame(() => requestAnimationFrame(() => {
                            skeleton.style.display = 'none';
                            grid.classList.add('transitions-enabled');
                        }));
                    }
                } else if (grid.classList.contains('initial-load-done')) {
                    // Leaving visibility - show skeleton to cover next entrance
                    skeleton.style.display = '';
                }
            });
        }, { threshold: 0.01 });
        visibilityObserver.observe(container);

        grid.querySelectorAll('.widget-content').forEach(c => muuri.resizeObserver?.observe(c));

        ComponentInstance.addCleanup(instance, () => {
            visibilityObserver.disconnect();
            gridResizeObserver.disconnect();
            muuri.resizeObserver?.disconnect();
            muuri.destroy();
        });
    },
    settings: {}
};
