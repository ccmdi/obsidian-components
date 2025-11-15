import ComponentsPlugin from 'main';
import { App, PluginSettingTab, Setting, Modal, Notice } from 'obsidian';

export interface TagCustomization {
    color: string;
}

export interface MapSettings {
    tagCustomizations: Record<string, TagCustomization>;
    tagPriority: string[];
}

export const DEFAULT_MAP_SETTINGS: MapSettings = {
    tagCustomizations: {},
    tagPriority: []
};

export class MapSettingTab extends PluginSettingTab {
    plugin: ComponentsPlugin;
    settings: MapSettings;
    configPath: string;

    constructor(app: App, plugin: ComponentsPlugin, settings: MapSettings, configPath: string) {
        super(app, plugin);
        this.plugin = plugin;
        this.settings = settings;
        this.configPath = configPath;
    }

    async saveSettings() {
        try {
            await this.app.vault.adapter.write(
                this.configPath,
                JSON.stringify(this.settings, null, 2)
            );
            new Notice('Map settings saved');
        } catch (e) {
            new Notice('Failed to save map settings');
            console.error('Error saving map settings:', e);
        }
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // Header for tag customizations
        containerEl.createEl('h3', { text: 'Tag Customizations' });
        containerEl.createEl('p', {
            text: 'Drag to reorder priority. Higher tags take precedence.',
            cls: 'setting-item-description'
        });

        // Container for all tag customizations
        const customizationsContainer = containerEl.createDiv('tag-customizations-container');

        // Display existing customizations
        this.displayExistingCustomizations(customizationsContainer);

        // Add new tag button
        new Setting(containerEl)
            .setName('Add new tag customization')
            .addButton(button => button
                .setButtonText('Add Tag')
                .setCta()
                .onClick(() => {
                    this.addNewTagCustomization(customizationsContainer);
                }));
    }

    private displayExistingCustomizations(container: HTMLElement) {
        container.empty();
        container.style.cssText = `
            padding: 10px;
            margin-bottom: 20px;
        `;

        // Display tags in priority order
        this.settings.tagPriority.forEach((tag, index) => {
            const customization = this.settings.tagCustomizations[tag];
            if (customization) {
                this.createTagCustomizationSetting(container, tag, customization, index);
            }
        });

        if (this.settings.tagPriority.length === 0) {
            const emptyMessage = container.createDiv();
            emptyMessage.textContent = 'No tags configured yet. Add a tag customization below.';
            emptyMessage.style.cssText = `
                color: var(--text-muted);
                font-style: italic;
                text-align: center;
                padding: 20px;
            `;
        }
    }

    private createTagCustomizationSetting(container: HTMLElement, tag: string, customization: TagCustomization, index: number) {
        const settingEl = container.createDiv('draggable-setting');
        settingEl.style.cssText = `
            display: flex;
            align-items: center;
            padding: 12px;
            margin: 4px 0;
            background: var(--background-secondary);
            border-radius: 6px;
            cursor: grab;
            border: 1px solid var(--background-modifier-border);
        `;
        settingEl.draggable = true;

        // Drag handle
        const handle = settingEl.createSpan('drag-handle');
        handle.textContent = '⋮⋮';
        handle.style.cssText = `
            margin-right: 12px;
            color: var(--text-muted);
            font-size: 16px;
            cursor: grab;
        `;

        // Tag name with priority
        const tagLabel = settingEl.createDiv();
        tagLabel.style.cssText = `
            min-width: 120px;
            margin-right: 12px;
            font-weight: 500;
        `;
        tagLabel.appendText(`#${tag} `);
        tagLabel.createEl('span', {
            attr: { style: 'color: var(--text-muted); font-size: 12px;' },
            text: `#${index + 1}`
        });

        // Color input
        const colorInput = settingEl.createEl('input', { type: 'color' });
        colorInput.value = customization.color;
        colorInput.style.cssText = `
            width: 40px;
            height: 30px;
            border: none;
            border-radius: 4px;
            margin-right: 12px;
            cursor: pointer;
        `;
        colorInput.onchange = async () => {
            this.settings.tagCustomizations[tag].color = colorInput.value;
            await this.saveSettings();
        };

        // Spacer to push delete button to the right
        const spacer = settingEl.createDiv();
        spacer.style.flex = '1';

        // Delete button
        const deleteBtn = settingEl.createEl('button', { text: '×' });
        deleteBtn.style.cssText = `
            width: 24px;
            height: 24px;
            border: none;
            background: var(--text-error);
            color: white;
            border-radius: 50%;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
            padding: 0;
        `;
        deleteBtn.onclick = async () => {
            delete this.settings.tagCustomizations[tag];
            const priorityIndex = this.settings.tagPriority.indexOf(tag);
            if (priorityIndex > -1) {
                this.settings.tagPriority.splice(priorityIndex, 1);
            }
            await this.saveSettings();
            this.display();
        };

        // Drag and drop functionality
        settingEl.addEventListener('dragstart', (e) => {
            settingEl.style.opacity = '0.5';
            e.dataTransfer?.setData('text/plain', index.toString());
        });

        settingEl.addEventListener('dragend', () => {
            settingEl.style.opacity = '1';
        });

        settingEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            settingEl.style.background = 'var(--background-modifier-hover)';
        });

        settingEl.addEventListener('dragleave', () => {
            settingEl.style.background = 'var(--background-secondary)';
        });

        settingEl.addEventListener('drop', async (e) => {
            e.preventDefault();
            settingEl.style.background = 'var(--background-secondary)';

            const draggedIndex = parseInt(e.dataTransfer?.getData('text/plain') || '0');
            const targetIndex = index;

            if (draggedIndex !== targetIndex) {
                // Reorder the priority array
                const draggedItem = this.settings.tagPriority.splice(draggedIndex, 1)[0];
                this.settings.tagPriority.splice(targetIndex, 0, draggedItem);

                await this.saveSettings();
                this.displayExistingCustomizations(container);
            }
        });
    }

    private addNewTagCustomization(container: HTMLElement) {
        new AddTagModal(this.app, (tagName: string, color: string) => {
            this.settings.tagCustomizations[tagName] = { color };
            if (!this.settings.tagPriority.includes(tagName)) {
                this.settings.tagPriority.push(tagName);
            }
            this.saveSettings();
            this.display();
        }).open();
    }
}

class AddTagModal extends Modal {
    private onSubmit: (tagName: string, color: string) => void;

    constructor(app: App, onSubmit: (tagName: string, color: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Add new tag customization' });

        const form = contentEl.createDiv();

        const tagInput = form.createEl('input', { type: 'text' });
        tagInput.placeholder = 'Enter tag name (without #)';
        tagInput.style.width = '100%';
        tagInput.style.marginBottom = '10px';
        tagInput.style.padding = '8px';

        const colorInput = form.createEl('input', { type: 'color' });
        colorInput.value = '#7c3aed';
        colorInput.style.marginBottom = '20px';
        colorInput.style.width = '100%';
        colorInput.style.height = '40px';

        const buttonContainer = form.createDiv();
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.justifyContent = 'flex-end';

        const addButton = buttonContainer.createEl('button', { text: 'Add' });
        addButton.classList.add('mod-cta');
        addButton.onclick = () => {
            const tagName = tagInput.value.trim();
            if (tagName) {
                this.onSubmit(tagName, colorInput.value);
                this.close();
            }
        };

        const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
        cancelButton.onclick = () => this.close();

        // Focus on the tag input
        setTimeout(() => tagInput.focus(), 10);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
