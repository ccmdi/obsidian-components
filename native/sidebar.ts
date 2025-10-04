import { ItemView, WorkspaceLeaf } from "obsidian";
import { COMPONENTS, Component, componentInstances } from "../components";
import ComponentsPlugin, { COMPONENT_SIDEBAR_VIEW_TYPE } from "../main";

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
        switch (this.componentKey) {
            case 'widget-space':
                return 'layout-grid';
            case 'github-stats':
                return 'github';
            case 'discord-status':
                return 'message-circle';
            case 'timeline':
                return 'gantt-chart';
            case 'navigate':
                return 'arrow-left-right';
            case 'map':
                return 'map-pin';
            case 'analytics':
                return 'bar-chart-2';
            case 'anki-status':
                return 'brain';
            case 'reminders':
                return 'bell';
            case 'calendar':
                return 'calendar';
            case 'clock':
                return 'clock';
            case 'stat-chart':
                return 'trending-up';
            case 'media':
                return 'play-circle';
            default:
                return 'puzzle';
        }
    }

    async onOpen() {
        // Component will be set via setState

        // Refresh component when active leaf changes
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', (leaf) => {
                if (this.currentComponent && this.currentComponent.keyName !== 'widget-space' && leaf?.view.getViewType() !== COMPONENT_SIDEBAR_VIEW_TYPE) {
                    this.renderComponent();
                }
            })
        );
    }

    async setState(state: any, result: any) {
        await super.setState(state, result);

        if (state?.componentKey) {
            this.componentKey = state.componentKey;
            this.currentComponent = COMPONENTS.find(c => c.keyName === state.componentKey) || null;
            this.componentArgs = state.args || {};
            await this.renderComponent();
        }
    }

    getState() {
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

        try {
            // Convert args to source format for renderComponent
            const argsSource = Object.entries(this.componentArgs)
                .map(([key, value]) => `${key}="${value}"`)
                .join('\n');

            // Use active note context for components that need it
            const activeFile = this.app.workspace.getActiveFile();
            const mockContext = {
                sourcePath: activeFile?.path || '',
                frontmatter: activeFile ? (this.app.metadataCache.getFileCache(activeFile)?.frontmatter || {}) : {}
            };

            await Component.render(
                this.currentComponent,
                argsSource,
                container as HTMLElement,
                mockContext as any,
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