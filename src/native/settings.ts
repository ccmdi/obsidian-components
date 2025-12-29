import { App, PluginSettingTab, Setting, ToggleComponent } from "obsidian";
import { COMPONENTS, Component, ComponentAction, ComponentSetting, GROUPS } from "components";
import ComponentsPlugin from "main";
import { ComponentGroup, initializeGroups } from "groups";
import { renderExternalLinkToElement } from "utils";

export default class ComponentsSettingTab extends PluginSettingTab {
    plugin: ComponentsPlugin;
    private currentView: 'general' | 'components' | string = 'components';
    private searchQuery = '';

    constructor(app: App, plugin: ComponentsPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // Initialize groups lazily (populates GROUPS.members)
        initializeGroups();

        // Create tab navigation
        this.createTabNavigation();

        if (this.currentView === 'general') {
            this.displayGeneralSettings();
        } else if (this.currentView === 'components') {
            this.displayMainMenu();
        } else {
            this.displayComponentSettings(this.currentView);
        }
    }

    createTabNavigation(): void {
        const { containerEl } = this;

        // Tab container
        const tabContainer = containerEl.createEl('div', { cls: 'setting-tab-container' });

        // Components tab
        const componentsTab = tabContainer.createEl('div', {
            text: 'Components',
            cls: `setting-tab ${this.currentView === 'components' ? 'is-active' : ''}`
        });
        componentsTab.onclick = () => {
            this.currentView = 'components';
            this.display();
        };

        // General tab
        const generalTab = tabContainer.createEl('div', {
            text: 'General',
            cls: `setting-tab ${this.currentView === 'general' ? 'is-active' : ''}`
        });
        generalTab.onclick = () => {
            this.currentView = 'general';
            this.display();
        };
    }

    displayGeneralSettings(): void {
        const { containerEl } = this;

        // Autocomplete modal sub-option (will be updated dynamically)
        const modalSetting = new Setting(containerEl);
        let modalToggle: ToggleComponent;

        // Autocomplete setting
        new Setting(containerEl)
            .setName('Enable component autocomplete')
            .setDesc('Show autocomplete suggestions when typing component code blocks (```)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableAutoComplete)
                .onChange(async (value) => {
                    this.plugin.settings.enableAutoComplete = value;
                    await this.plugin.saveSettings();

                    // Update the modal setting state without re-rendering
                    if (modalToggle) {
                        modalToggle.setDisabled(!value);
                    }
                    if (modalSetting) {
                        if (!value) {
                            modalSetting.settingEl.addClass('is-disabled');
                        } else {
                            modalSetting.settingEl.removeClass('is-disabled');
                        }
                    }
                })
            );

        // Autocomplete modal sub-option (disabled if autocomplete is off)
        modalSetting
            .setName('Open argument modal on select')
            .setDesc('When selecting a component from autocomplete, open a modal to configure arguments. If disabled, just inserts the component name.')
            .addToggle(toggle => {
                modalToggle = toggle;
                toggle
                    .setValue(this.plugin.settings.autoCompleteOpenModal)
                    .setDisabled(!this.plugin.settings.enableAutoComplete)
                    .onChange(async (value) => {
                        this.plugin.settings.autoCompleteOpenModal = value;
                        await this.plugin.saveSettings();
                    });
            });

        // Gray out the setting if autocomplete is disabled
        if (!this.plugin.settings.enableAutoComplete) {
            modalSetting.settingEl.addClass('is-disabled');
        }

        // Modal argument autocomplete setting
        new Setting(containerEl)
            .setName('Enable modal argument autocomplete')
            .setDesc('Show autocomplete suggestions for folder paths and queries when configuring component arguments')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.modalArgSuggest)
                .onChange(async (value) => {
                    this.plugin.settings.modalArgSuggest = value;
                    await this.plugin.saveSettings();
                })
            );

        // Container margin setting
        new Setting(containerEl)
            .setName('Default container margin')
            .setDesc('Default margin for all component containers (in pixels)')
            .addText(text => text
                .setPlaceholder('6')
                .setValue(String(this.plugin.settings.defaultContainerMargin || 6))
                .onChange(async (value) => {
                    const numValue = parseInt(value) || 6;
                    this.plugin.settings.defaultContainerMargin = numValue;
                    await this.plugin.saveSettings();
                    this.plugin.updateGlobalStyles();
                })
            );

        // JavaScript execution setting
        new Setting(containerEl)
            .setName('Enable JavaScript blocks (ojs)')
            .setDesc('Allow execution of JavaScript in ```ojs code blocks. Provides app, el, ctx, and api in scope.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableJsExecution)
                .onChange(async (value) => {
                    this.plugin.settings.enableJsExecution = value;
                    await this.plugin.saveSettings();
                })
            );
    }

    updateComponentClickabilityInPlace(component: Component<readonly string[]>, nameEl: HTMLElement, isEnabled: boolean): void {
        const hasSubmenu = (component.settings && Object.keys(component.settings).length > 0) || Component.hasArgs(component);

        if (hasSubmenu && isEnabled) {
            nameEl.addClass('is-clickable');
            nameEl.addClass('is-enabled');

            // Add click handler if not already there
            if (!nameEl.onclick) {
                nameEl.onclick = () => {
                    this.currentView = component.keyName;
                    this.display();
                };
            }
        } else {
            nameEl.removeClass('is-clickable');
            nameEl.removeClass('is-enabled');
            nameEl.onclick = null;
        }
    }

    displayMainMenu(): void {
        const { containerEl } = this;

        // Search bar
        const searchSetting = new Setting(containerEl)
            .addSearch(search => {
                search
                    .setPlaceholder('Search components...')
                    .setValue(this.searchQuery)
                    .onChange((value) => {
                        this.searchQuery = value;
                        this.refreshComponentList(listContainer);
                    });
            });
        searchSetting.settingEl.addClass('components-search-setting');

        const listContainer = containerEl.createDiv();
        this.refreshComponentList(listContainer);
    }

    private refreshComponentList(container: HTMLElement): void {
        container.empty();
        const query = this.searchQuery.toLowerCase();

        Object.values(GROUPS).forEach((group) => {
            group.members?.sort((a, b) => (a.name || a.keyName).localeCompare(b.name || b.keyName));
        });

        const sortedItems: Array<Component<readonly string[]> | ComponentGroup> = [];

        const ungroupedComponents = COMPONENTS.filter(c => !c.group);
        sortedItems.push(...ungroupedComponents);

        (Object.keys(GROUPS) as ComponentGroup[]).forEach((groupKey) => {
            const group = GROUPS[groupKey];
            if (!group.members || group.members.length === 0) return;
            sortedItems.push(groupKey);
        });

        sortedItems.sort((a, b) => {
            const nameA = typeof a === 'string' ? GROUPS[a].name : (a.name || a.keyName);
            const nameB = typeof b === 'string' ? GROUPS[b].name : (b.name || b.keyName);
            return nameA.toLowerCase().localeCompare(nameB.toLowerCase());
        });

        sortedItems.forEach((item) => {
            if (typeof item === 'string') {
                const groupMeta = GROUPS[item];
                const groupMatches = groupMeta.name.toLowerCase().includes(query);
                const memberMatches = groupMeta.members?.some(c =>
                    (c.name || c.keyName).toLowerCase().includes(query) ||
                    c.keyName.toLowerCase().includes(query)
                );
                if (!query || groupMatches || memberMatches) {
                    this.renderGroup(container, item, query);
                }
            } else {
                const matches = (item.name || item.keyName).toLowerCase().includes(query) ||
                    item.keyName.toLowerCase().includes(query);
                if (!query || matches) {
                    this.renderComponent(container, item, false);
                }
            }
        });
    }

    renderComponent(containerEl: HTMLElement, component: Component<readonly string[]>, isIndented: boolean): void {
        const isEnabledBySettings = this.plugin.settings.componentStates[component.keyName] ?? false;

        const displayName = component.name || component.keyName;
        const description = component.description || '';

        const componentSetting = new Setting(containerEl)
            .setName(displayName)
            .setDesc(description)
            .addToggle(toggle => toggle
                .setValue(isEnabledBySettings)
                .onChange(async (value) => {
                    this.plugin.settings.componentStates[component.keyName] = value;
                    await this.plugin.saveSettings();
                    // Smooth update instead of full refresh
                    this.updateComponentClickabilityInPlace(component, componentSetting.nameEl, value);
                })
            );

        // Add indentation for grouped components
        if (isIndented) {
            componentSetting.settingEl.addClass('setting-item-indented');
        }

        // Add keyName as separate element if component has a display name
        if (component.name) {
            componentSetting.nameEl.createSpan({
                text: ` - ${component.keyName}`,
                cls: 'setting-item-keyname'
            });
        }

        if(component.does) {
            for(const does of component.does) {
              const doesEl = componentSetting.nameEl.createSpan({
                text: `${does}`,
                cls: 'setting-item-does'
              });

              switch (does) {
                case ComponentAction.READ:
                  doesEl.addClass('does-read');
                  break;
                case ComponentAction.WRITE:
                  doesEl.addClass('does-write');
                  break;
                case ComponentAction.EXTERNAL:
                  doesEl.addClass('does-external');
                  break;
              }
            }
        }

        // Set initial clickability using the same method
        this.updateComponentClickabilityInPlace(component, componentSetting.nameEl, isEnabledBySettings);
    }

    renderGroup(containerEl: HTMLElement, group: ComponentGroup, query = ''): void {
        const groupKey = group;
        const groupMetadata = GROUPS[groupKey];
        const components = groupMetadata.members!;
        const isGroupEnabled = this.plugin.settings.groupStates[groupKey] ?? false;

        // Render group toggle
        const groupSetting = new Setting(containerEl)
            .setName(groupMetadata.name)
            .setDesc(groupMetadata.description)
            .addToggle(toggle => toggle
                .setValue(isGroupEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.groupStates[groupKey] = value;

                    // If disabling the group, disable all child components
                    if (!value) {
                        components.forEach(component => {
                            this.plugin.settings.componentStates[component.keyName] = false;
                        });
                    }

                    await this.plugin.saveSettings();
                    // Refresh the entire view to show/hide children
                    this.display();
                })
            );

        // Make group name bold
        groupSetting.nameEl.addClass('setting-item-group-name');

        // Render child components if group is enabled
        if (isGroupEnabled) {
            components
                .filter(c => !query ||
                    (c.name || c.keyName).toLowerCase().includes(query) ||
                    c.keyName.toLowerCase().includes(query))
                .forEach(component => {
                    this.renderComponent(containerEl, component, true);
                });
        }
    }

    displayComponentSettings(componentKey: string): void {
        const { containerEl } = this;
        const component = COMPONENTS.find(c => c.keyName === componentKey);

        if (!component) {
            this.currentView = 'components';
            this.display();
            return;
        }

        const hasSettings = component.settings && Object.keys(component.settings).length > 0;
        const hasArgs = Component.hasArgs(component);


        if (!hasSettings && !hasArgs) {
            this.currentView = 'components';
            this.display();
            return;
        }

        const displayName = component.name || component.keyName;
        containerEl.createEl('h1', { text: displayName });
        // if (component.name) {
        //     const subheader = containerEl.createEl('p', {
        //         text: `(${component.keyName})`,
        //         cls: 'setting-item-description'
        //     });
        //     subheader.style.marginTop = '-10px';
        //     subheader.style.marginBottom = '20px';
        // }

        // Args section
        if (hasArgs) {
            containerEl.createEl('h3', { text: 'Arguments' });
            Object.entries(component.args!).forEach(([argKey, argConfig]) => {
                const argDesc = argConfig?.description || '';
                const argSetting = new Setting(containerEl)
                    .setName(argKey);

                // Add red asterisk for required args
                if (argConfig?.required) {
                    argSetting.nameEl.createSpan({
                        text: ' *',
                        cls: 'setting-item-required-asterisk'
                    });
                }

                // Set description with DOM rendering
                const descEl = argSetting.descEl;
                descEl.empty();
                if (argDesc) {
                    renderExternalLinkToElement(argDesc, descEl);
                }
                if (argConfig?.default) {
                    descEl.createEl('br');
                    descEl.createEl('em', { text: `Default: ${argConfig.default}` });
                }
                argSetting.settingEl.addClass('component-arg-setting');
            });
        }

        // Settings section
        if (hasSettings) {
            // Check if component has custom _render function
            if (component.settings && component.settings._render) {
                containerEl.createEl('h3', { text: 'Settings' });
                const customContainer = containerEl.createDiv();
                component.settings._render(customContainer, this.app, this.plugin);
            } else {
                containerEl.createEl('h3', { text: 'Settings' });
                const settings = component.settings as unknown as ComponentSetting;
                Object.entries(settings!).forEach(([settingKey, settingConfig]) => {
                    const currentValue = this.plugin.settings.componentSettings[component.keyName]?.[settingKey] || settingConfig.default || '';

                    const setting = new Setting(containerEl)
                        .setName(settingConfig.name)
                        .setDesc(settingConfig.desc || '');

                    if (settingConfig.type === 'toggle') {
                        setting.addToggle(toggle => toggle
                            .setValue(currentValue === true || currentValue === 'true')
                            .onChange(async (value) => {
                                if (!this.plugin.settings.componentSettings[component.keyName]) {
                                    this.plugin.settings.componentSettings[component.keyName] = {};
                                }
                                this.plugin.settings.componentSettings[component.keyName][settingKey] = value;
                                await this.plugin.saveSettings();
                            })
                        );
                    } else if (settingConfig.type === 'number') {
                        setting.addText(text => text
                            .setPlaceholder(settingConfig.placeholder || '')
                            .setValue(String(currentValue))
                            .onChange(async (value) => {
                                if (!this.plugin.settings.componentSettings[component.keyName]) {
                                    this.plugin.settings.componentSettings[component.keyName] = {};
                                }
                                this.plugin.settings.componentSettings[component.keyName][settingKey] = parseInt(value) || settingConfig.default;
                                await this.plugin.saveSettings();
                            })
                        );
                    } else {
                        setting.addText(text => text
                            .setPlaceholder(settingConfig.placeholder || '')
                            .setValue(String(currentValue))
                            .onChange(async (value) => {
                                if (!this.plugin.settings.componentSettings[component.keyName]) {
                                    this.plugin.settings.componentSettings[component.keyName] = {};
                                }
                                this.plugin.settings.componentSettings[component.keyName][settingKey] = value;
                                await this.plugin.saveSettings();
                            })
                        );
                    }
                });
            }
        }

        // Add event listener for browser back button
        const handlePopState = () => {
            this.currentView = 'components';
            this.display();
        };

        window.addEventListener('popstate', handlePopState, { once: true });
        window.history.pushState({ view: componentKey }, '', '');
    }
}