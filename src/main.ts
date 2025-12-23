// main.ts

import { App, Plugin, PluginSettingTab, Setting, Modal, FuzzySuggestModal, ItemView, WorkspaceLeaf, Editor, Menu, TFile, MarkdownView } from 'obsidian';
import { ComponentsSettings, DEFAULT_SETTINGS } from 'settings';
import { COMPONENTS, Component, componentInstances } from 'components';

import ComponentsSettingTab from 'native/settings';
import ComponentSidebarView from 'native/sidebar';
import ComponentSelectorModal, { PlaceComponentModal, ComponentArgsModal } from 'native/modal';
import { ComponentAutoComplete } from 'native/autocomplete';

export const COMPONENT_SIDEBAR_VIEW_TYPE = 'component-sidebar';

export default class ComponentsPlugin extends Plugin {
    static instance: ComponentsPlugin;

    settings: ComponentsSettings;
    private registeredProcessors: Set<string> = new Set();
    private globalStyleElement: HTMLStyleElement | null = null;
    private autoComplete: ComponentAutoComplete | null = null;

    async onload() {
        ComponentsPlugin.instance = this;
        await this.loadSettings();
        this.addSettingTab(new ComponentsSettingTab(this.app, this));

        this.registerView(
            COMPONENT_SIDEBAR_VIEW_TYPE,
            (leaf) => new ComponentSidebarView(leaf, this)
        );

        this.addCommand({
            id: 'open-component-sidebar',
            name: 'Open component in sidebar',
            callback: () => {
                new ComponentSelectorModal(this.app, this).open();
            }
        });

        this.addCommand({
            id: 'place-component',
            name: 'Place component',
            editorCallback: (editor) => {
                new PlaceComponentModal(this.app, this, editor).open();
            }
        });

        // Add sidebar icon for widget-space
        this.addRibbonIcon('layout-grid', 'Open Widget Space', async () => {
            // Check if widget-space view already exists
            const existingLeaf = this.app.workspace.getLeavesOfType(COMPONENT_SIDEBAR_VIEW_TYPE).find(leaf => {
                return (leaf.view as ComponentSidebarView).componentKey === 'widget-space';
            });

            if (existingLeaf) {
                // If it exists, just reveal it
                this.app.workspace.revealLeaf(existingLeaf);
            } else {
                // Create new leaf with widget-space
                const leaf = this.app.workspace.getRightLeaf(false);
                await leaf?.setViewState({
                    type: COMPONENT_SIDEBAR_VIEW_TYPE,
                    state: { componentKey: 'widget-space' }
                });
                this.app.workspace.revealLeaf(leaf!);
            }
        });

        this.registerProcessors();
        this.updateGlobalStyles();
        this.registerComponentContextMenu();

        if (this.settings.enableAutoComplete) {
            this.autoComplete = new ComponentAutoComplete(this);
            this.registerEditorSuggest(this.autoComplete);
        }
    }

    /**
     * Register context menu handler for editing components
     */
    registerComponentContextMenu() {
        // Track the last right-clicked component for editor-menu event
        let lastClickedComponent: {
            el: HTMLElement;
            key: string;
            args: Record<string, string>;
            sourcePath: string;
        } | null = null;

        // Capture right-click target before Obsidian's menu handler
        this.registerDomEvent(document, 'contextmenu', (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const componentEl = target.closest('.component[data-component-key]') as HTMLElement;
            
            if (componentEl) {
                // Skip sidebar components - they can't be edited via code blocks
                const isInSidebar = componentEl.classList.contains('in-sidebar') || 
                                    componentEl.closest('.workspace-leaf-content[data-type="component-sidebar"]');
                
                if (isInSidebar) {
                    lastClickedComponent = null;
                    return;
                }

                const componentKey = componentEl.dataset.componentKey;
                const componentArgsStr = componentEl.dataset.componentArgs;
                const sourcePath = componentEl.dataset.componentSource;

                if (componentKey && sourcePath) {
                    let currentArgs: Record<string, string> = {};
                    try {
                        if (componentArgsStr) {
                            currentArgs = JSON.parse(componentArgsStr);
                        }
                    } catch { /* ignore */ }

                    lastClickedComponent = {
                        el: componentEl,
                        key: componentKey,
                        args: currentArgs,
                        sourcePath
                    };
                } else {
                    lastClickedComponent = null;
                }
            } else {
                lastClickedComponent = null;
            }

            // In reading mode (no editor), show our own menu
            const isInEditor = target.closest('.cm-editor, .markdown-source-view');
            if (componentEl && !isInEditor) {
                const componentKey = componentEl.dataset.componentKey;
                const sourcePath = componentEl.dataset.componentSource;
                
                if (!componentKey || !sourcePath) return;

                const component = COMPONENTS.find(c => c.keyName === componentKey);
                if (!component) return;

                e.preventDefault();

                const menu = new Menu();
                menu.addItem((item) => {
                    item.setTitle(`Edit ${component.name || component.keyName}`)
                        .setIcon('pencil')
                        .onClick(() => {
                            new ComponentArgsModal(this.app, component, {
                                mode: 'insert',
                                initialArgs: lastClickedComponent?.args || {},
                                submitText: 'Update',
                                onSubmit: async (newArgs) => {
                                    await this.updateCodeBlockArgs(componentEl, componentKey, newArgs, sourcePath);
                                }
                            }).open();
                        });
                });
                menu.showAtMouseEvent(e);
            }
        }, true); // Use capture phase to run before Obsidian

        // Editing mode: hook into Obsidian's editor-menu event  
        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
                // Only add edit option if we clicked on a rendered component
                if (!lastClickedComponent) return;

                const component = COMPONENTS.find(c => 
                    c.keyName === lastClickedComponent!.key || 
                    c.aliases?.includes(lastClickedComponent!.key)
                );
                
                if (!component || !Component.hasArgs(component)) return;

                const clickedInfo = lastClickedComponent;
                
                menu.addSeparator();
                menu.addItem((item) => {
                    item.setTitle(`Edit ${component.name || component.keyName}`)
                        .setIcon('pencil')
                        .onClick(() => {
                            new ComponentArgsModal(this.app, component, {
                                mode: 'insert',
                                initialArgs: clickedInfo.args,
                                submitText: 'Update',
                                onSubmit: async (newArgs) => {
                                    await this.updateCodeBlockArgs(
                                        clickedInfo.el, 
                                        clickedInfo.key, 
                                        newArgs, 
                                        clickedInfo.sourcePath
                                    );
                                }
                            }).open();
                        });
                });
            })
        );
    }

    /**
     * Update the code block arguments in the source file
     */
    async updateCodeBlockArgs(
        el: HTMLElement,
        componentKey: string,
        newArgs: Record<string, string>,
        sourcePath: string
    ): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(sourcePath);
        if (!(file instanceof TFile)) return;

        const content = await this.app.vault.read(file);
        const lines = content.split('\n');

        // Find the code block by looking for the component key
        // We need to find the code block that contains our current args
        let blockStart = -1;
        let blockEnd = -1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim() === `\`\`\`${componentKey}`) {
                // Found potential start, look for end
                blockStart = i;
                for (let j = i + 1; j < lines.length; j++) {
                    if (lines[j].trim() === '```') {
                        blockEnd = j;
                        break;
                    }
                }
                // Check if this block matches our current args by comparing content
                if (blockEnd > blockStart) {
                    // For now, use first matching block (could be improved with unique IDs)
                    break;
                }
            }
        }

        if (blockStart === -1 || blockEnd === -1) return;

        // Build new code block content
        const argsLines = Object.entries(newArgs)
            .filter(([, value]) => value && value.trim() !== '')
            .map(([key, value]) => `${key}="${value}"`)
            .join('\n');

        const newCodeBlock = `\`\`\`${componentKey}\n${argsLines}\n\`\`\``;

        // Replace the old code block
        const newLines = [
            ...lines.slice(0, blockStart),
            newCodeBlock,
            ...lines.slice(blockEnd + 1)
        ];

        await this.app.vault.modify(file, newLines.join('\n'));
    }

    updateGlobalStyles() {
        // Remove existing global styles
        if (this.globalStyleElement) {
            this.globalStyleElement.remove();
        }

        this.globalStyleElement = document.createElement('style');
        this.globalStyleElement.textContent = `
            .component:not(.in-sidebar) {
                margin: ${this.settings.defaultContainerMargin || 6}px;
            }
        `;
        document.head.appendChild(this.globalStyleElement);
    }

    onunload() {
        if (this.globalStyleElement) {
            this.globalStyleElement.remove();
        }

        // Cleanup all component instances
        Array.from(componentInstances.values()).forEach(instance => instance.destroy());
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);

        // Refresh renders
        this.registerProcessors();

        // Toggle autocomplete based on settings
        if (this.settings.enableAutoComplete && !this.autoComplete) {
            this.autoComplete = new ComponentAutoComplete(this);
            this.registerEditorSuggest(this.autoComplete);
        }
    }

    registerProcessors() {
        COMPONENTS.forEach(component => {

            // Register main component keyName
            const registerProcessor = (processorKey: string) => {
                if (!this.registeredProcessors.has(processorKey)) {
                    this.registerMarkdownCodeBlockProcessor(
                        processorKey,
                        async (source, el, ctx) => {
                            try {
                                const isEnabledBySettings = this.settings.componentStates[component.keyName];
                                if (!isEnabledBySettings) {
                                    return;
                                }
                                await Component.render(component, source, el, ctx, this.app, this.settings.componentSettings[component.keyName] || {});
                            } catch (error) {
                                el.empty();
                                el.createEl("pre", {
                                    text: `[${component.keyName}] Error:\n${error.message}`,
                                    cls: 'component-error'
                                });
                                console.error(`[${component.keyName}] Error:`, error);
                            }
                        }
                    );
                    this.registeredProcessors.add(processorKey);
                }
            };

            // Register main keyName
            registerProcessor(component.keyName);

            // Register aliases
            if (component.aliases) {
                component.aliases.forEach(alias => {
                    registerProcessor(alias);
                });
            }
        });
    }
}
