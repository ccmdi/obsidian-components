// main.ts

import { App, Plugin, PluginSettingTab, Setting, Modal, FuzzySuggestModal, ItemView, WorkspaceLeaf } from 'obsidian';
import { ComponentsSettings, DEFAULT_SETTINGS } from './settings'; // Assuming you still have this
import { COMPONENTS, Component, componentInstances } from './components';

import ComponentsSettingTab from './native/settings';
import ComponentSidebarView from './native/sidebar';
import ComponentSelectorModal from './native/modal';
import { ComponentAutoComplete } from './native/autocomplete';

export const COMPONENT_SIDEBAR_VIEW_TYPE = 'component-sidebar';

export default class ComponentsPlugin extends Plugin {
    settings: ComponentsSettings;
    private registeredProcessors: Set<string> = new Set();
    private globalStyleElement: HTMLStyleElement | null = null;
    private autoComplete: ComponentAutoComplete | null = null;

    async onload() {
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

        // api (optionally)
        // setupComponentAPI(this.app, this.settings);

        this.registerProcessors();
        this.updateGlobalStyles();

        // Register autocomplete
        if (this.settings.enableAutoComplete) {
            this.autoComplete = new ComponentAutoComplete(this);
            this.registerEditorSuggest(this.autoComplete);
        }
    }

    updateGlobalStyles() {
        // Remove existing global styles
        if (this.globalStyleElement) {
            this.globalStyleElement.remove();
        }

        this.globalStyleElement = document.createElement('style');
        this.globalStyleElement.textContent = `
            .component {
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
                                const errorEl = el.createEl("pre", { text: `[${component.keyName}] Error:\n${error.message}` });
                                errorEl.style.color = "var(--text-error)";
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
