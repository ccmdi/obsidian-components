import { App, PluginSettingTab, Setting } from "obsidian";
import { COMPONENTS, Component, ComponentAction, ComponentSetting } from "../components";
import ComponentsPlugin from "../main";

export default class ComponentsSettingTab extends PluginSettingTab {
    plugin: ComponentsPlugin;
    private currentView: 'general' | 'components' | string = 'components';

    constructor(app: App, plugin: ComponentsPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

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
        tabContainer.style.cssText = `
            display: flex;
            border-bottom: 1px solid var(--background-modifier-border);
            margin-bottom: 20px;
        `;

        
        // Components tab
        const componentsTab = tabContainer.createEl('div', {
            text: 'Components',
            cls: 'setting-tab'
        });
        componentsTab.style.cssText = `
            padding: 10px 20px;
            cursor: pointer;
            border-bottom: 2px solid ${this.currentView === 'components' ? 'var(--interactive-accent)' : 'transparent'};
            color: ${this.currentView === 'components' ? 'var(--interactive-accent)' : 'var(--text-normal)'};
            font-weight: ${this.currentView === 'components' ? '600' : '400'};
            transition: all 0.2s ease;
        `;
        componentsTab.onclick = () => {
            this.currentView = 'components';
            this.display();
        };

        // General tab
        const generalTab = tabContainer.createEl('div', {
            text: 'General',
            cls: 'setting-tab'
        });
        generalTab.style.cssText = `
            padding: 10px 20px;
            cursor: pointer;
            border-bottom: 2px solid ${this.currentView === 'general' ? 'var(--interactive-accent)' : 'transparent'};
            color: ${this.currentView === 'general' ? 'var(--interactive-accent)' : 'var(--text-normal)'};
            font-weight: ${this.currentView === 'general' ? '600' : '400'};
            transition: all 0.2s ease;
        `;
        generalTab.onclick = () => {
            this.currentView = 'general';
            this.display();
        };
    }

    displayGeneralSettings(): void {
        const { containerEl } = this;

        // Autocomplete modal sub-option (will be updated dynamically)
        let modalSetting: Setting;
        let modalToggle: any;

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
                            modalSetting.setClass('is-disabled');
                            modalSetting.settingEl.style.opacity = '0.5';
                        } else {
                            modalSetting.settingEl.removeClass('is-disabled');
                            modalSetting.settingEl.style.opacity = '1';
                        }
                    }
                })
            );

        // Autocomplete modal sub-option (disabled if autocomplete is off)
        modalSetting = new Setting(containerEl)
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
            modalSetting.setClass('is-disabled');
            modalSetting.settingEl.style.opacity = '0.5';
        }

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
    }

    updateComponentClickabilityInPlace(component: any, nameEl: HTMLElement, isEnabled: boolean): void {
        const hasSettings = component.settings && Object.keys(component.settings).length > 0;
        const hasArgs = Component.hasArgs(component);
        const hasSubmenu = hasSettings || hasArgs;

        if (hasSubmenu && isEnabled) {
            nameEl.style.cursor = 'pointer';
            nameEl.style.color = 'var(--text-accent)';
            nameEl.style.transition = 'color 0.2s ease';

            // Add click handler if not already there
            if (!nameEl.onclick) {
                nameEl.onclick = () => {
                    this.currentView = component.keyName;
                    this.display();
                };
            }
        } else {
            nameEl.style.cursor = 'default';
            nameEl.style.color = 'var(--text-normal)';
            nameEl.style.transition = 'color 0.2s ease';
            nameEl.onclick = null;
        }
    }

    displayMainMenu(): void {
        const { containerEl } = this;

        // Add CSS for smoother toggle animations
        const style = document.createElement('style');
        style.textContent = `
            .checkbox-container,
            .checkbox-container::before,
            .checkbox-container input,
            .setting-item-control .checkbox-container,
            .setting-item-control .checkbox-container::before {
                transition: all 0.4s ease-in-out !important;
            }
        `;
        containerEl.appendChild(style);

        const sortedComponents = [...COMPONENTS].sort((a, b) => {
            const nameA = (a.name || a.keyName).toLowerCase();
            const nameB = (b.name || b.keyName).toLowerCase();
            return nameA.localeCompare(nameB);
        });

        sortedComponents.forEach(component => {
            const isEnabledBySettings = this.plugin.settings.componentStates[component.keyName] ?? false;
            const hasSettings = component.settings && Object.keys(component.settings).length > 0;
            const hasArgs = Component.hasArgs(component);


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

            // Add keyName as separate element if component has a display name
            if (component.name) {
                const keyNameEl = componentSetting.nameEl.createSpan({
                    text: ` - ${component.keyName}`,
                    cls: 'setting-item-keyname'
                });
                keyNameEl.style.fontSize = '0.85em';
                keyNameEl.style.color = 'var(--text-faint)';
                keyNameEl.style.pointerEvents = 'none';
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
        });
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
        const header = containerEl.createEl('h1', { text: displayName });
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
                // Parse markdown links in description
                const processedDesc = argDesc.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
                const argSetting = new Setting(containerEl)
                    .setName(argKey);

                // Add red asterisk for required args
                if (argConfig?.required) {
                    const asterisk = argSetting.nameEl.createSpan({
                        text: ' *',
                        cls: 'mod-warning'
                    });
                    asterisk.style.color = 'var(--text-error)';
                }

                // Set description with HTML rendering
                const descEl = argSetting.descEl;
                descEl.innerHTML = processedDesc + (argConfig?.default ? `<br><em>Default: ${argConfig.default}</em>` : '');
                argSetting.settingEl.style.borderLeft = '3px solid var(--text-accent)';
                argSetting.settingEl.style.paddingLeft = '12px';
                argSetting.settingEl.style.marginBottom = '8px';
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