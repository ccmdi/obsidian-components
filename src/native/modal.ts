import { App, FuzzySuggestModal, Modal, Setting, Notice, Editor } from "obsidian";
import { Component, COMPONENTS } from "components";
import ComponentsPlugin, { COMPONENT_SIDEBAR_VIEW_TYPE } from "main";
import { renderExternalLinkToElement } from "utils";

export default class ComponentSelectorModal extends Modal {
    plugin: ComponentsPlugin;

    constructor(app: App, plugin: ComponentsPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl, titleEl } = this;
        contentEl.empty();

        // Set the title in the modal header
        titleEl.setText('Open Component in Sidebar');

        // Get enabled components
        const enabledComponents = COMPONENTS.filter(component =>
            (this.plugin.settings.componentStates[component.keyName] ?? false) &&
            (component.isMountable || component.keyName === 'widget-space')
        ).sort((a, b) => (a.name || a.keyName).localeCompare(b.name || b.keyName));

        enabledComponents.forEach(component => {
            const option = contentEl.createEl('div', {
                cls: 'clickable-icon'
            });

            const title = option.createEl('div', {
                text: component.name || component.keyName,
                cls: 'nav-file-title-content'
            });

            if (component.description) {
                const descEl = option.createEl('div', {
                    cls: 'nav-file-tag'
                });
                renderExternalLinkToElement(component.description, descEl);
            } else {
                option.createEl('div', {
                    text: '',
                    cls: 'nav-file-tag'
                });
            }

            option.addEventListener('click', () => {
                this.close();
                new ComponentArgsModal(this.app, component, this.plugin).open();
            });
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    async openComponentSidebar(component: Component<readonly string[]>) {
        const { workspace } = this.app;

        // Create or reveal sidebar leaf
        let leaf = workspace.getRightLeaf(false);
        if (!leaf) {
            leaf = workspace.createLeafInParent(workspace.rightSplit!, 0);
        }

        await leaf.setViewState({
            type: COMPONENT_SIDEBAR_VIEW_TYPE,
            state: { componentKey: component.keyName }
        });

        workspace.revealLeaf(leaf);
    }
}

export class ComponentArgsModal extends Modal {
    component: Component<readonly string[]>;
    plugin: ComponentsPlugin;
    args: Record<string, string> = {};
    onSubmit?: (args: Record<string, string>) => void;
    mode: 'sidebar' | 'insert';

    constructor(
        app: App,
        component: Component<readonly string[]>,
        plugin: ComponentsPlugin,
        options?: {
            mode?: 'sidebar' | 'insert',
            onSubmit?: (args: Record<string, string>) => void
        }
    ) {
        super(app);
        this.component = component;
        this.plugin = plugin;
        this.mode = options?.mode || 'sidebar';
        this.onSubmit = options?.onSubmit;
    }

    onOpen() {
        const { contentEl, titleEl } = this;
        contentEl.empty();

        // Set the title in the modal header
        titleEl.setText(`Configure ${this.component.name || this.component.keyName}`);

        // Create form for each arg
        if (Component.hasArgs(this.component)) {
            Object.entries(this.component.args).forEach(([argKey, argConfig]) => {
                const setting = new Setting(contentEl)
                    .setName(argKey)
                    .addText(text => text
                        .setPlaceholder(argConfig?.default || `Enter ${argKey}...`)
                        .onChange(value => {
                            this.args[argKey] = value;
                        })
                    );

                const description = argConfig?.description || '';
                if (description) {
                    setting.descEl.empty();
                    renderExternalLinkToElement(description, setting.descEl);
                }

                // Mark required args
                if (argConfig?.required === true) {
                    setting.nameEl.createSpan({ text: ' *', cls: 'mod-warning' });
                }
            });
        } else {
            contentEl.createEl('p', { text: 'This component has no configurable arguments.' });
        }

        // Buttons
        const buttonContainer = contentEl.createEl('div', { cls: 'modal-button-container' });

        const submitBtn = buttonContainer.createEl('button', {
            text: this.mode === 'insert' ? 'Insert Code Block' : 'Open in Sidebar',
            cls: 'mod-cta'
        });
        submitBtn.onclick = () => {
            this.handleSubmit();
        };

        const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
        cancelBtn.onclick = () => {
            this.close();
        };
    }

    async handleSubmit() {
        // Validate required args
        const requiredArgs = Component.getRequiredArgs(this.component);

        const missingRequired = requiredArgs.filter(arg => !this.args[arg] || this.args[arg].trim() === '');
        if (missingRequired.length > 0) {
            new Notice(`Missing required arguments: ${missingRequired.join(', ')}`);
            return;
        }

        // Close modal
        this.close();

        if (this.mode === 'insert' && this.onSubmit) {
            this.onSubmit(this.args);
        } else {
            await this.openComponentSidebar();
        }
    }

    async openComponentSidebar() {
        const { workspace } = this.app;

        let leaf = workspace.getRightLeaf(false);
        if (!leaf) {
            leaf = workspace.createLeafInParent(workspace.rightSplit!, 0);
        }

        await leaf.setViewState({
            type: COMPONENT_SIDEBAR_VIEW_TYPE,
            state: {
                componentKey: this.component.keyName,
                args: this.args
            }
        });

        workspace.revealLeaf(leaf);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export class PlaceComponentModal extends Modal {
    plugin: ComponentsPlugin;
    editor: Editor;

    constructor(app: App, plugin: ComponentsPlugin, editor: Editor) {
        super(app);
        this.plugin = plugin;
        this.editor = editor;
    }

    onOpen() {
        const { contentEl, titleEl } = this;
        contentEl.empty();
        titleEl.setText('Place Component');

        const enabledComponents = COMPONENTS.filter(component =>
            this.plugin.settings.componentStates[component.keyName] ?? false
        ).sort((a, b) => (a.name || a.keyName).localeCompare(b.name || b.keyName));

        enabledComponents.forEach(component => {
            const option = contentEl.createEl('div', {
                cls: 'clickable-icon'
            });

            const title = option.createEl('div', {
                text: component.name || component.keyName,
                cls: 'nav-file-title-content'
            });

            if (component.description) {
                const descEl = option.createEl('div', {
                    cls: 'nav-file-tag'
                });
                renderExternalLinkToElement(component.description, descEl);
            } else {
                option.createEl('div', {
                    text: '',
                    cls: 'nav-file-tag'
                });
            }

            option.addEventListener('click', () => {
                this.close();
                new ComponentArgsModal(this.app, component, this.plugin, {
                    mode: 'insert',
                    onSubmit: (args) => {
                        const argsLines = Object.entries(args)
                            .filter(([, value]) => value && value.trim() !== '')
                            .map(([key, value]) => `${key}="${value}"`)
                            .join('\n');
                        const codeBlock = `\`\`\`${component.keyName}\n${argsLines}\n\`\`\``;
                        this.editor.replaceSelection(codeBlock);
                    }
                }).open();
            });
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}