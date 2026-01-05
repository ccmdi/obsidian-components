import { ItemView, WorkspaceLeaf, MarkdownPostProcessorContext, ViewStateResult, Menu } from "obsidian";
import { COMPONENTS, Component, componentInstances } from "components";
import ComponentsPlugin, { COMPONENT_SIDEBAR_VIEW_TYPE } from "main";
import { ComponentArgsModal } from "./modal";
import { argsToSource } from "utils";

export interface ComponentSidebarState extends Record<string, unknown> {
    componentKey?: string;
    args?: Record<string, string>;
}

export default class ComponentSidebarView extends ItemView {
    plugin: ComponentsPlugin;
    currentComponent: Component<readonly string[]> | null = null;
    componentArgs: Record<string, string> = {};
    componentKey: string | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: ComponentsPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return COMPONENT_SIDEBAR_VIEW_TYPE;
    }

    getDisplayText(): string {
        return this.currentComponent?.name || this.currentComponent?.keyName || 'Component';
    }

    getIcon(): string {
        return this.currentComponent?.icon || 'puzzle';
    }

    onPaneMenu(menu: Menu, source: string): void {
        if (this.currentComponent && Component.hasArgs(this.currentComponent)) {
            menu.addItem((item) => {
                item
                    .setTitle('Edit component arguments')
                    .setIcon('settings')
                    .onClick(() => {
                        new ComponentArgsModal(this.app, this.currentComponent!, {
                            mode: 'sidebar',
                            initialArgs: this.componentArgs,
                            submitText: 'Update',
                            onSubmit: async (newArgs) => {
                                this.componentArgs = newArgs;
                                await this.renderComponent();
                                // Update the view state so it persists
                                this.leaf.setViewState({
                                    type: COMPONENT_SIDEBAR_VIEW_TYPE,
                                    state: { componentKey: this.componentKey, args: newArgs }
                                });
                            }
                        }).open();
                    });
            });
        }
        super.onPaneMenu(menu, source);
    }

    async onOpen() {
        // Component will be set via setState

        // Refresh component when active leaf changes
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', (leaf) => {
                if (this.currentComponent && this.currentComponent.refresh && leaf?.view.getViewType() !== COMPONENT_SIDEBAR_VIEW_TYPE) {
                    this.renderComponent();
                }
            })
        );
    }

    async setState(state: ComponentSidebarState, result: ViewStateResult) {
        await super.setState(state, result);

        if (state?.componentKey) {
            this.componentKey = state.componentKey;
            this.currentComponent = COMPONENTS.find(c => c.keyName === state.componentKey) || null;
            this.componentArgs = state.args || {};
            await this.renderComponent();
        }
    }

    getState(): ComponentSidebarState {
        return {
            componentKey: this.currentComponent?.keyName,
            args: this.componentArgs
        };
    }

    async renderComponent() {
        if (!this.currentComponent) return;

        const container = this.containerEl.children[1];

        // Cleanup existing component instances before emptying
        const instances = Array.from(componentInstances.values()).filter(
            instance => container.contains(instance.element)
        );
        instances.forEach(instance => instance.destroy());

        container.empty();
        container.addClass('in-sidebar');

        try {
            const argsSource = argsToSource(this.componentArgs);

            // Use active note context for components that need it
            const activeFile = this.app.workspace.getActiveFile();
            const mockContext: MarkdownPostProcessorContext = {
                sourcePath: activeFile?.path || '',
                frontmatter: activeFile ? (this.app.metadataCache.getFileCache(activeFile)?.frontmatter || {}) : {},
                addChild: () => {},
                getSectionInfo: () => null,
                docId: ''
            } as MarkdownPostProcessorContext;

            await Component.render(
                this.currentComponent,
                argsSource,
                container as HTMLElement,
                mockContext,
                this.app,
                this.plugin.settings.componentSettings[this.currentComponent.keyName] || {}
            );
        } catch (error) {
            container.createEl('div', {
                text: `Error rendering component: ${error.message}`,
                cls: 'mod-warning'
            });
        }
    }

    async onClose() {
        const container = this.containerEl.children[1];
        const instances = Array.from(componentInstances.values()).filter(
            instance => container.contains(instance.element)
        );
        instances.forEach(instance => instance.destroy());
    }
}