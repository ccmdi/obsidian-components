import { AbstractInputSuggest, App, TAbstractFile, TFolder, TFile } from "obsidian";

/**
 * Suggests folder paths from the vault
 */
export class FolderSuggest extends AbstractInputSuggest<TFolder> {
    private textInputEl: HTMLInputElement;

    constructor(app: App, inputEl: HTMLInputElement) {
        super(app, inputEl);
        this.textInputEl = inputEl;
    }

    getSuggestions(query: string): TFolder[] {
        const lowerQuery = query.toLowerCase();
        const folders: TFolder[] = [];

        const collectFolders = (folder: TAbstractFile) => {
            if (folder instanceof TFolder) {
                folders.push(folder);
                folder.children.forEach(collectFolders);
            }
        };

        collectFolders(this.app.vault.getRoot());

        return folders
            .filter(folder => folder.path.toLowerCase().includes(lowerQuery))
            .sort((a, b) => a.path.localeCompare(b.path))
            .slice(0, 50);
    }

    renderSuggestion(folder: TFolder, el: HTMLElement): void {
        el.createDiv({ text: folder.path || '/', cls: 'suggestion-content' });
    }

    selectSuggestion(folder: TFolder): void {
        this.textInputEl.value = folder.path;
        this.textInputEl.trigger('input');
        this.close();
    }
}

/**
 * Query suggestion item type
 */
interface QuerySuggestion {
    type: 'folder' | 'tag';
    value: string;
    display: string;
}

/**
 * Suggests query values: folders (quoted) and tags (#tag)
 * Supports the query syntax used by matchesQuery:
 * - #tags
 * - "folder/paths"
 * - AND/OR operators
 */
export class QuerySuggest extends AbstractInputSuggest<QuerySuggestion> {
    private textInputEl: HTMLInputElement;

    constructor(app: App, inputEl: HTMLInputElement) {
        super(app, inputEl);
        this.textInputEl = inputEl;
    }

    getSuggestions(query: string): QuerySuggestion[] {
        // Get the current term being typed (after last space or operator)
        const parts = query.split(/\s+(AND|OR)\s+/);
        const currentPart = parts[parts.length - 1].trim();

        // Determine what we're currently typing
        const lowerPart = currentPart.toLowerCase();
        const suggestions: QuerySuggestion[] = [];

        // If starting with #, suggest tags
        if (currentPart.startsWith('#') || currentPart === '') {
            const tagQuery = currentPart.startsWith('#') ? currentPart.slice(1).toLowerCase() : '';
            const allTags = this.getAllTags();

            allTags
                .filter(tag => tag.toLowerCase().includes(tagQuery))
                .slice(0, 25)
                .forEach(tag => {
                    suggestions.push({
                        type: 'tag',
                        value: `#${tag}`,
                        display: `#${tag}`
                    });
                });
        }

        // If starting with " or just typing, suggest folders
        if (currentPart.startsWith('"') || !currentPart.startsWith('#')) {
            const folderQuery = currentPart.startsWith('"')
                ? currentPart.slice(1).toLowerCase()
                : currentPart.toLowerCase();

            const folders = this.getAllFolders();

            folders
                .filter(folder => folder.toLowerCase().includes(folderQuery))
                .slice(0, 25)
                .forEach(folder => {
                    suggestions.push({
                        type: 'folder',
                        value: `"${folder}"`,
                        display: folder || '/'
                    });
                });
        }

        return suggestions;
    }

    private getAllTags(): string[] {
        const tags = new Set<string>();

        this.app.vault.getMarkdownFiles().forEach(file => {
            const cache = this.app.metadataCache.getFileCache(file);

            // Tags in content
            cache?.tags?.forEach(t => {
                tags.add(t.tag.slice(1)); // Remove leading #
            });

            // Tags in frontmatter
            const fmTags = cache?.frontmatter?.tags;
            if (Array.isArray(fmTags)) {
                fmTags.forEach(t => tags.add(t.replace(/^#/, '')));
            } else if (typeof fmTags === 'string') {
                tags.add(fmTags.replace(/^#/, ''));
            }
        });

        return Array.from(tags).sort();
    }

    private getAllFolders(): string[] {
        const folders: string[] = [];

        const collectFolders = (folder: TAbstractFile) => {
            if (folder instanceof TFolder) {
                folders.push(folder.path);
                folder.children.forEach(collectFolders);
            }
        };

        collectFolders(this.app.vault.getRoot());
        return folders.sort();
    }

    renderSuggestion(suggestion: QuerySuggestion, el: HTMLElement): void {
        const container = el.createDiv({ cls: 'suggestion-content' });

        if (suggestion.type === 'tag') {
            container.createSpan({ text: suggestion.display, cls: 'suggestion-tag' });
        } else {
            container.createSpan({ text: suggestion.display, cls: 'suggestion-folder' });
        }
    }

    selectSuggestion(suggestion: QuerySuggestion): void {
        const currentValue = this.textInputEl.value;

        // Find the last term being typed and replace it
        const parts = currentValue.split(/(\s+(?:AND|OR)\s+)/);

        // Replace the last part with the suggestion
        parts[parts.length - 1] = suggestion.value;

        this.textInputEl.value = parts.join('');
        this.textInputEl.trigger('input');
        this.close();
    }
}

/**
 * Suggests file paths (notes) from the vault
 */
export class FileSuggest extends AbstractInputSuggest<TFile> {
    private textInputEl: HTMLInputElement;

    constructor(app: App, inputEl: HTMLInputElement) {
        super(app, inputEl);
        this.textInputEl = inputEl;
    }

    getSuggestions(query: string): TFile[] {
        const lowerQuery = query.toLowerCase();

        return this.app.vault.getMarkdownFiles()
            .filter(file => file.path.toLowerCase().includes(lowerQuery))
            .sort((a, b) => a.path.localeCompare(b.path))
            .slice(0, 50);
    }

    renderSuggestion(file: TFile, el: HTMLElement): void {
        el.createDiv({ text: file.path, cls: 'suggestion-content' });
    }

    selectSuggestion(file: TFile): void {
        this.textInputEl.value = file.path;
        this.textInputEl.trigger('input');
        this.close();
    }
}
