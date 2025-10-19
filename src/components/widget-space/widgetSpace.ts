import { Component, ComponentAction, ComponentInstance } from "../../components";
import { App, Modal, Setting, TextComponent, FuzzySuggestModal, Notice } from "obsidian";
import { widgetSpaceStyles } from "./styles";
import ConfirmationModal from "../../native/confirmation";
import { COMPONENTS } from "../../components";
import { componentInstances } from "../../components";
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

declare global {
    interface Window {
        Muuri: any;
    }
}

export const widgetSpace: Component<['layout']> = {
    name: 'Widget Space',
    description: 'A modular container for multiple components with drag & drop',
    keyName: 'widget-space',
    isMountable: false,
    args: {
        layout: {
            description: 'JSON layout configuration (optional)',
            default: ''
        },
        // columns: {
        //     description: 'Number of grid columns',
        //     default: '1'
        // }
    },
    does: [ComponentAction.READ, ComponentAction.WRITE, ComponentAction.EXTERNAL],
    styles: widgetSpaceStyles,
    render: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
        // const columns = parseInt(args.columns) || 1;
        let layout: WidgetSpaceLayout;

        try {
            const configPath = `${app.vault.configDir}/plugins/components/components-widget-layout.json`;

            if (await app.vault.adapter.exists(configPath)) {
                layout = JSON.parse(await app.vault.adapter.read(configPath));
            } else if (args.layout) {
                layout = JSON.parse(args.layout);
            } else {
                layout = { widgets: [] };
            }
        } catch {
            layout = { widgets: [] };
        }

        el.style.position = 'relative';

        // Load Muuri from CDN
        if (!window.Muuri) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/muuri@0.9.5/dist/muuri.min.js';
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        const container = el.createEl('div', { cls: 'widget-space-container' });

        // Function to update CSS variable with grid width
        const updateWidthVariable = () => {
            const width = grid.offsetWidth;
            container.style.setProperty('--widget-space-width', `${width}px`);
        };

        // Grid container
        const grid = el.createEl('div', { cls: 'widget-space-grid' });
        container.appendChild(grid);

        // Show skeleton overlay
        const skeleton = el.createEl('div', { cls: 'widget-space-skeleton' });
        skeleton.style.position = 'absolute';
        skeleton.style.top = '0';
        skeleton.style.left = '0';
        skeleton.style.right = '0';
        skeleton.style.bottom = '0';
        skeleton.style.backgroundColor = 'var(--background-primary)';
        skeleton.style.zIndex = '10';

        // Create skeleton items based on saved layout
        const skeletonCount = Math.max(3, layout.widgets.length);
        for (let i = 0; i < skeletonCount; i++) {
            const skeletonItem = el.createEl('div', { cls: 'widget-skeleton' });
            skeleton.appendChild(skeletonItem);
        }

        container.appendChild(skeleton);

        el.appendChild(container);

        // Set initial width variable and observe changes
        updateWidthVariable();
        const gridResizeObserver = new ResizeObserver(() => {
            updateWidthVariable();
        });
        gridResizeObserver.observe(grid);

        const availableComponents: Component<readonly string[]>[] = COMPONENTS.filter(comp => comp.isMountable);

        const showComponentSelector = () => {
            class ComponentSelectorModal extends Modal {
                constructor(app: any) {
                    super(app);
                }

                onOpen() {
                    const { contentEl, titleEl } = this;
                    contentEl.empty();

                    // Set the title in the modal header
                    titleEl.setText('Add Widget');

                    availableComponents.forEach(component => {
                        const option = contentEl.createEl('div', {
                            cls: 'clickable-icon'
                        });

                        const title = option.createEl('div', {
                            text: component.name || component.keyName,
                            cls: 'nav-file-title-content'
                        });

                        if (component.description) {
                            option.createEl('div', {
                                text: component.description,
                                cls: 'nav-file-tag'
                            });
                        } else {
                            option.createEl('div', {
                                text: '',
                                cls: 'nav-file-tag'
                            });
                        }

                        option.addEventListener('click', async () => {
                            this.close();

                            // Special handling for widget-space - open sidebar instead of adding as widget
                            if (component.keyName === 'widget-space') {
                                await this.openWidgetSpaceSidebar();
                            } else {
                                openComponentModal(component);
                            }
                        });
                    });
                }

                async openWidgetSpaceSidebar() {
                    // Check if widget-space view already exists
                    const existingLeaf = app.workspace.getLeavesOfType('component-sidebar').find(leaf => {
                        //TODO type
                        return (leaf.view as any).componentKey === 'widget-space';
                    });

                    if (existingLeaf) {
                        // If it exists, just reveal it
                        app.workspace.revealLeaf(existingLeaf);
                    } else {
                        // Create new leaf with widget-space
                        const leaf = app.workspace.getRightLeaf(false);
                        await leaf?.setViewState({
                            type: 'component-sidebar',
                            state: { componentKey: 'widget-space' }
                        });
                        app.workspace.revealLeaf(leaf!);
                    }
                }

                onClose() {
                    const { contentEl } = this;
                    contentEl.empty();
                }
            }

            new ComponentSelectorModal(app).open();
        };

        // Add double-click to empty space to add widget
        container.addEventListener('dblclick', (e) => {
            // Only trigger if clicking on the container itself, not on widgets
            if (e.target === container || e.target === grid) {
                showComponentSelector();
            }
        });

        let muuri: any;
        let widgetCounter = 0;

        // Create a custom modal class for widget configuration
        class WidgetConfigModal extends Modal {
            component: Component<readonly string[]>;
            args: Record<string, string> = {};

            constructor(app: App, component: Component<readonly string[]>) {
                super(app);
                this.component = component;
            }

            onOpen() {
                const { contentEl } = this;
                contentEl.empty();

                contentEl.createEl('h2', { text: `Configure ${this.component.name || this.component.keyName}` });

                // Create form for each arg
                if (Component.hasArgs(this.component)) {
                    Object.entries(this.component.args).forEach(([argKey, argConfig]) => {
                        const setting = new Setting(contentEl)
                            .setName(argKey)
                            .setDesc(argConfig?.description || '')
                            .addText((text: TextComponent) => text
                                .setPlaceholder(argConfig?.default || `Enter ${argKey}...`)
                                .onChange((value: string) => {
                                    this.args[argKey] = value;
                                })
                            );

                        // Mark required args
                        if (argConfig?.required === true) {
                            setting.nameEl.createSpan({ text: ' *', cls: 'mod-warning' });
                        }
                    });
                } else {
                    contentEl.createEl('p', { text: 'This component has no configurable arguments.' });
                }

                // Buttons using Obsidian's native modal button structure
                const buttonContainer = contentEl.createEl('div', {
                    cls: 'modal-button-container'
                });

                const submitBtn = buttonContainer.createEl('button', {
                    text: 'Add Widget',
                    cls: 'mod-cta'
                });
                submitBtn.onclick = () => {
                    this.addWithArgs();
                };

                const cancelBtn = buttonContainer.createEl('button', {
                    text: 'Cancel'
                });
                cancelBtn.onclick = () => {
                    this.close();
                };
            }

            async addWithArgs() {
                // Validate required args
                const requiredArgs = Component.getRequiredArgs(this.component);

                const missingRequired = requiredArgs.filter(arg => !this.args[arg] || this.args[arg].trim() === '');
                if (missingRequired.length > 0) {
                    new Notice(`Missing required arguments: ${missingRequired.join(', ')}`);
                    return;
                }

                // Close modal and add widget with args
                this.close();
                await addWidget(this.component.keyName, this.component.name || this.component.keyName, this.args);
            }

            onClose() {
                const { contentEl } = this;
                contentEl.empty();
            }
        }

        // Function to open component modal
        const openComponentModal = (component: Component<readonly string[]>) => {
            new WidgetConfigModal(app, component).open();
        };

        // Initialize Muuri grid
        const initGrid = () => {
            const options: any = {
                items: '.widget-item',
                dragEnabled: true,
                dragContainer: container,
                dragSortHeuristics: {
                    sortInterval: 10,
                    minDragDistance: 5,
                    minBounceBackAngle: Math.PI / 2
                },
                layout: {
                    fillGaps: true,
                    horizontal: false,
                    alignRight: false,
                    alignBottom: false,
                    rounding: true
                },
                layoutDuration: 0, // Use CSS transitions instead
                layoutEasing: 'ease',
                dragStartPredicate: {
                    distance: 10,
                    delay: 0
                },
                dragAxis: null,
                dragSort: true,
                itemHeight: 'auto'
            };

            // Only set itemWidth for multi-column layouts
            // if (columns > 1) {
            //     options.itemWidth = Math.floor(grid.offsetWidth / columns);
            // }

            muuri = new window.Muuri(grid, options);

            // Hide skeleton after layout is complete and positioned
            muuri.on('layoutEnd', () => {
                // Give 50ms breathing room for positioning
                setTimeout(() => {
                    skeleton.style.display = 'none';
                }, 50);
            });

            // Improve drag experience
            muuri.on('dragStart', (item: any) => {
                item.getElement().style.zIndex = '1000';
                item.getElement().style.transform += ' scale(1.02)';
                item.getElement().style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
            });

            muuri.on('dragEnd', async (item: any) => {
                item.getElement().style.zIndex = '';
                item.getElement().style.transform = item.getElement().style.transform.replace(' scale(1.02)', '');
                item.getElement().style.boxShadow = '';
                await saveLayout();
            });

            // Remove the move event - it's too frequent and causes issues during drag
            // muuri.on('move', async () => {
            //     await saveLayout();
            // });

            //TODO
            const resizeObserver = new ResizeObserver((entries) => {
                let needsLayout = false;
                entries.forEach(entry => {
                    const widget = entry.target.closest('.widget-item') as HTMLElement;
                    if (widget && muuri) {
                        needsLayout = true;
                    }
                });

                if (needsLayout) {
                    if (muuri) {
                        muuri.refreshItems();
                        muuri.layout(false); // Instant layout, CSS transitions handle the animation
                    }
                }
            });

            // Store observer reference for cleanup
            muuri.resizeObserver = resizeObserver;
        };

        const addWidget = async (componentKey: string, componentName: string, componentArgs: Record<string, string> = {}) => {

            const widgetId = `widget-${++widgetCounter}`;
            const widget = el.createEl('div', { cls: 'widget-item' });
            widget.dataset.widgetId = widgetId;
            widget.dataset.componentKey = componentKey;

            // widget args
            widgetConfigs.set(widgetId, componentArgs);
            // Track in our state (will add componentInstance after creation)
            activeWidgets.set(widgetId, { element: widget, componentKey, args: componentArgs, componentInstance: null as any });

            widget.addEventListener('contextmenu', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                new ConfirmationModal(
                    app, 
                    `Remove ${componentName} widget?`,
                    async () => {
                        await removeWidget(widget);
                    }
                ).open();
            });

            const content = el.createEl('div', { cls: 'widget-content' });
            widget.appendChild(content);

            const component = COMPONENTS.find(comp => comp.keyName === componentKey);
            if (component) {
                try {
                    content.innerHTML = '';

                    // Add unique identifier to help with component isolation
                    content.dataset.widgetId = widgetId;
                    content.dataset.componentKey = componentKey;

                    // Convert args to source format for Component.render
                    const argsSource = Object.entries(componentArgs)
                        .map(([key, value]) => `${key}="${value}"`)
                        .join('\n');

                    // Use active file context if widget-space is mounted, otherwise use original context
                    const activeFile = app.workspace.getActiveFile();
                    const dynamicCtx = ctx.sourcePath && activeFile ?
                        { ...ctx, sourcePath: activeFile.path } : ctx;

                    await Component.render(component, argsSource, content, dynamicCtx, app, componentSettings);

                } catch (error) {
                    content.innerHTML = `<div style="color: var(--text-error); padding: 8px;">Error loading ${componentName}<br>${error.message}</div>`;
                }
            }

            const existingItems = muuri.getItems();
            let initialY = 0;

            if (existingItems.length > 0) {
                let maxBottom = 0;
                existingItems.forEach((item: any) => {
                    const element = item.getElement();
                    const rect = element.getBoundingClientRect();
                    const containerRect = grid.getBoundingClientRect();
                    const relativeBottom = rect.bottom - containerRect.top + element.offsetHeight;
                    maxBottom = Math.max(maxBottom, relativeBottom);
                });
                initialY = maxBottom + 8; 
            }

            widget.style.transform = `translate3d(0px, ${initialY}px, 0)`;

            grid.appendChild(widget);

            muuri.add(widget, { index: existingItems.length });

            setTimeout(() => {
                if (muuri) {
                    muuri.layout(false);
                }
            }, 0);

            const resizeObserver = muuri.resizeObserver;
            if (resizeObserver && content) {
                resizeObserver.observe(content);
            }

            await saveLayout();
        };

        const removeWidget = async (widget: HTMLElement) => {
            const widgetId = widget.dataset.widgetId;

            const content = widget.querySelector('.widget-content');
            if (content) {
                const resizeObserver = muuri.resizeObserver;
                if (resizeObserver) {
                    resizeObserver.unobserve(content);
                }
            }

            widget.remove();

            muuri.refreshItems();
            muuri.layout(true);

            widgetConfigs.delete(widgetId!);
            activeWidgets.delete(widgetId!);

            await saveLayout();
        };

        // widget configs
        const widgetConfigs = new Map<string, Record<string, string>>();
        const activeWidgets = new Map<string, { element: HTMLElement, componentKey: string, args: Record<string, string>, componentInstance: ComponentInstance }>();

        const saveLayout = async () => {
            const widgets: WidgetConfig[] = [];
        
            const items = muuri.getItems();
            
            items.forEach((item: any, index: number) => {
                const element = item.getElement();
                const widgetId = element.dataset.widgetId;
                const widgetData = activeWidgets.get(widgetId);
                
                if (widgetData && document.contains(element)) {
                    widgets.push({
                        id: widgetId,
                        componentKey: widgetData.componentKey,
                        args: widgetData.args,
                        width: element.offsetWidth,
                        height: element.offsetHeight,
                        order: index
                    });
                }
            });
        
            const newLayout: WidgetSpaceLayout = { widgets };
        
            try {
                const configPath = `${app.vault.configDir}/plugins/components/components-widget-layout.json`;
                await app.vault.adapter.write(configPath, JSON.stringify(newLayout, null, 2));
            } catch (error) {
                // Silently fail
            }
        };

        const loadWidgets = async () => {
            const sortedWidgets = [...layout.widgets].sort((a, b) => (a.order || 0) - (b.order || 0));
            
            for (const widgetConfig of sortedWidgets) {
                const component = COMPONENTS.find(comp => comp.keyName === widgetConfig.componentKey);
                if (component) {
                    await addWidget(widgetConfig.componentKey, component.name || component.keyName, widgetConfig.args);
                }
            }
        };

        initGrid();
        await loadWidgets();

        if (layout.widgets.length === 0) {
            skeleton.style.display = 'none';
        }


        const resizeObserver = muuri.resizeObserver;
        if (resizeObserver) {
            const existingWidgets = grid.querySelectorAll('.widget-item');
            existingWidgets.forEach((widget: HTMLElement) => {
                const content = widget.querySelector('.widget-content');
                if (content) {
                    resizeObserver.observe(content);
                }
            });
        }

        const refreshComponents = async () => {
            for (const [widgetId, widgetData] of activeWidgets) {
                const { componentKey, args } = widgetData;
                const component = COMPONENTS.find(comp => comp.keyName === componentKey);

                if (component?.refresh) {
                    try {
                        const content = widgetData.element.querySelector('.widget-content') as HTMLElement;
                        if (content) {
                            // DESTROY existing component instance before re-rendering
                            const componentId = content.dataset.componentId;
                            if (componentId) {
                                const existingInstance = componentInstances.get(componentId);
                                if (existingInstance) {
                                    existingInstance.destroy();
                                }
                            }

                            // Use active file context if widget-space is mounted, otherwise use original context
                            const activeFile = app.workspace.getActiveFile();
                            const dynamicCtx = ctx.sourcePath && activeFile ?
                                { ...ctx, sourcePath: activeFile.path } : ctx;

                            const argsSource = Object.entries(args)
                                .map(([key, value]) => `${key}="${value}"`)
                                .join('\n');

                            await Component.render(component, argsSource, content, dynamicCtx, app, componentSettings);
                        }
                    } catch (error) {
                        console.warn(`Failed to refresh ${component.keyName}:`, error);
                    }
                }
            }
        };

        const onActiveLeafChange = () => {
            refreshComponents();
        };

        app.workspace.on('active-leaf-change', onActiveLeafChange);

        const cleanup = () => {
            app.workspace.off('active-leaf-change', onActiveLeafChange);
            if (muuri.resizeObserver) {
                muuri.resizeObserver.disconnect();
            }
            gridResizeObserver.disconnect();
            muuri.destroy();
        };

        ComponentInstance.addCleanup(instance, cleanup);
    },
    settings: {}
};