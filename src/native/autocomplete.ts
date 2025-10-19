import { Editor, EditorPosition, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo, TFile } from "obsidian";
import { COMPONENTS, Component } from "components";
import ComponentsPlugin from "main";
import { ComponentArgsModal } from "native/modal";

interface ComponentSuggestion {
    component: Component<readonly string[]>;
    displayText: string;
}

export class ComponentAutoComplete extends EditorSuggest<ComponentSuggestion> {
    plugin: ComponentsPlugin;

    constructor(plugin: ComponentsPlugin) {
        super(plugin.app);
        this.plugin = plugin;
    }

    onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo | null {
        if (!this.plugin.settings.enableAutoComplete) {
            return null;
        }

        const line = editor.getLine(cursor.line);
        const beforeCursor = line.substring(0, cursor.ch);

        const match = beforeCursor.match(/^```(\w*)$/);
        if (match) {
            return {
                start: { line: cursor.line, ch: 3 },
                end: cursor,
                query: match[1] || ''
            };
        }

        return null;
    }

    getSuggestions(context: EditorSuggestContext): ComponentSuggestion[] {
        const query = context.query.toLowerCase();

        return COMPONENTS
            .filter(component => {
                const isEnabled = this.plugin.settings.componentStates[component.keyName];
                if (!isEnabled) return false;

                // Match query against keyName, name, aliases, or description
                if (component.keyName.toLowerCase().includes(query)) return true;
                if (component.name?.toLowerCase().includes(query)) return true;
                if (component.description?.toLowerCase().includes(query)) return true;
                if (component.aliases?.some(alias => alias.toLowerCase().includes(query))) return true;

                return false;
            })
            .map(component => ({
                component,
                displayText: component.name || component.keyName
            }));
    }

    renderSuggestion(suggestion: ComponentSuggestion, el: HTMLElement): void {
        const container = el.createDiv({ cls: 'component-suggestion' });

        const title = container.createDiv({ cls: 'component-suggestion-title' });
        title.textContent = suggestion.displayText;
        title.style.fontWeight = 'bold';

        if (suggestion.component.keyName !== suggestion.displayText) {
            const keyName = container.createDiv({ cls: 'component-suggestion-keyname' });
            keyName.textContent = suggestion.component.keyName;
            keyName.style.fontSize = '0.9em';
            keyName.style.color = 'var(--text-muted)';
        }

        if (suggestion.component.description) {
            const description = container.createDiv({ cls: 'component-suggestion-description' });
            description.textContent = suggestion.component.description;
            description.style.fontSize = '0.85em';
            description.style.color = 'var(--text-faint)';
            description.style.marginTop = '2px';
        }
    }

    selectSuggestion(suggestion: ComponentSuggestion, evt: MouseEvent | KeyboardEvent): void {
        if (!this.context) return;

        const editor = this.context.editor;
        const start = this.context.start;
        const component = suggestion.component;

        // Find the range to remove (opening ``` and possibly closing ```)
        const lineStart = { line: start.line, ch: 0 };
        const currentLine = editor.getLine(start.line);

        let removeEnd = editor.getCursor();
        let foundClosing = false;

        // Check if there's a closing ``` on subsequent lines
        if (currentLine.trim().startsWith('```')) {
            const totalLines = editor.lineCount();
            for (let i = start.line + 1; i < Math.min(start.line + 20, totalLines); i++) {
                const line = editor.getLine(i);

                // Check if it's a closing fence
                if (line.trim() === '```') {
                    // Make sure content between fences is empty or whitespace only
                    let isEmpty = true;
                    for (let j = start.line + 1; j < i; j++) {
                        if (editor.getLine(j).trim() !== '') {
                            isEmpty = false;
                            break;
                        }
                    }

                    if (isEmpty) {
                        // Safe to remove the whole code block
                        removeEnd = { line: i, ch: line.length };
                        foundClosing = true;
                    }
                    break;
                }

                // If we hit another opening fence or non-empty content, stop
                if (line.trim().startsWith('```') || (i === start.line + 1 && line.trim() !== '')) {
                    break;
                }
            }
        }

        // Save the content we're about to remove
        const originalContent = editor.getRange(lineStart, removeEnd);

        // Remove the partial code block
        editor.replaceRange('', lineStart, removeEnd);

        // Check if we should open modal
        if (this.plugin.settings.autoCompleteOpenModal && Component.hasArgs(component)) {
            // Open modal to configure args
            const modal = new ComponentArgsModal(
                this.app,
                component,
                this.plugin,
                {
                    mode: 'insert',
                    onSubmit: (args) => {
                        // Insert the configured code block
                        this.insertCodeBlock(editor, start, component.keyName, args);
                    }
                }
            );

            // Override the modal's close handler to restore content on cancel
            const originalClose = modal.close.bind(modal);
            let submitted = false;

            modal.close = function() {
                if (!submitted) {
                    // User cancelled, restore original content
                    const restoreTo = { line: lineStart.line, ch: 0 };
                    editor.replaceRange(originalContent, restoreTo, restoreTo);

                    // Restore cursor to end of restored content
                    const lines = originalContent.split('\n');
                    const lastLine = lineStart.line + lines.length - 1;
                    const lastCh = lines[lines.length - 1].length;
                    editor.setCursor({ line: lastLine, ch: lastCh });
                }
                originalClose();
            };

            // Override onSubmit to mark as submitted
            const originalOnSubmit = modal.onSubmit;
            modal.onSubmit = (args) => {
                submitted = true;
                if (originalOnSubmit) {
                    originalOnSubmit(args);
                }
            };

            modal.open();
        } else {
            // Simple autocomplete: just insert the component keyname with empty fences
            // Restore original content first
            const restoreTo = { line: lineStart.line, ch: 0 };
            editor.replaceRange(originalContent, restoreTo, restoreTo);

            // Replace just the component name part
            const end = this.context.end;
            editor.replaceRange(component.keyName, start, end);

            // Move cursor after the keyname
            editor.setCursor({
                line: start.line,
                ch: start.ch + component.keyName.length
            });
        }
    }

    insertCodeBlock(editor: Editor, start: EditorPosition, keyName: string, args: Record<string, string>): void {
        // Build the code block content
        const argsLines = Object.entries(args)
            .filter(([, value]) => value && value.trim() !== '')
            .map(([key, value]) => `${key}="${value}"`)
            .join('\n');

        const codeBlock = `\`\`\`${keyName}\n${argsLines}\n\`\`\``;

        // Replace from the start of ``` to current position
        editor.replaceRange(
            codeBlock,
            { line: start.line, ch: 0 },
            editor.getCursor()
        );

        // Move cursor after the code block
        const newLine = start.line + (argsLines ? argsLines.split('\n').length + 2 : 2);
        editor.setCursor({ line: newLine, ch: 0 });
    }
}
