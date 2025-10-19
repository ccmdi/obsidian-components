import { Component, ComponentAction, ComponentInstance } from "components";
import { TFile } from "obsidian";
import { formatDate, getTasks, matchesQuery } from "utils";
import timelineStyles from "./styles";


export const timeline: Component<['query', 'limit', 'journalSection', 'taskSection', 'dateFormat', 'showTasks', 'showJournalDropdown']> = {
    keyName: 'timeline',
    name: 'Timeline',
    description: 'Display a timeline of periodic notes (e.g. daily notes)',
    args: {
        query: {
            description: 'Query to filter notes (supports #tags, "folder/paths", and AND operator). Defaults to current note\'s folder',
            default: ''
        },
        limit: {
            description: 'Maximum number of daily notes to show',
            default: '30'
        },
        journalSection: {
            description: 'Section header to look for journal content',
            default: '## Journal'
        },
        taskSection: {
            description: 'Section header for tasks. If not set, searches entire note for tasks',
            default: ''
        },
        dateFormat: {
            description: 'Date display format (e.g., "MMM DD", "dddd"). Leave empty for raw filename',
            default: ''
        },
        showTasks: {
            description: 'Display completed tasks for each day',
            default: 'true'
        },
        showJournalDropdown: {
            description: 'Show expandable journal content with dropdown',
            default: 'true'
        }
    },
    isMountable: true,
    does: [ComponentAction.READ],
    styles: timelineStyles,
    render: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
        const query = args.query || `"${ctx.sourcePath?.split('/').slice(0, -1).join('/') || ''}"`;
        const limit = parseInt(args.limit);
        const journalSection = args.journalSection;
        const taskSection = args.taskSection;
        const showTasks = args.showTasks !== 'false';
        const showJournalDropdown = args.showJournalDropdown !== 'false';
        const dateFormat = args.dateFormat;

        const container = el.createEl('div', { cls: 'timeline-container' });

        const journalStatusCache: Record<string, boolean> = {};
        const journalData: Record<string, { hasJournal: boolean; completedTasks: string[]; journalContent: string }> = {};

        const extractJournalContent = async (file: TFile): Promise<string | null> => {
            try {
                const content = await app.vault.read(file);
                const cache = app.metadataCache.getFileCache(file);
                const headings = cache?.headings || [];

                // Parse the user's heading (e.g., "## Journal" -> level 2, text "Journal")
                const headingMatch = journalSection.match(/^(#+)\s*(.+)$/);
                if (!headingMatch) return null;

                const [, hashes, headingText] = headingMatch;
                const targetLevel = hashes.length;
                const targetText = headingText.trim();

                // Find the exact heading with matching level and text
                const journalHeading = headings.find(h =>
                    h.level === targetLevel && h.heading.trim() === targetText
                );

                if (!journalHeading) {
                    return null;
                }

                // Find the next heading at the same or higher level
                const nextHeading = headings.find(h =>
                    h.position.start.line > journalHeading.position.start.line &&
                    h.level <= journalHeading.level
                );

                const lines = content.split('\n');
                const startLine = journalHeading.position.start.line + 1;
                const endLine = nextHeading ? nextHeading.position.start.line : lines.length;

                const journalContent = lines.slice(startLine, endLine).join('\n').trim();
                return journalContent || null;
            } catch (error) {
                console.error('Error reading journal content:', error);
                return null;
            }
        };

        const extractCompletedTasks = async (file: TFile): Promise<string[]> => {
            try {
                if (!taskSection) {
                    // ENTIRE FILE
                    return await getTasks(app, file, { completed: true, incomplete: false });
                } else {
                    // SECTION
                    return await getTasks(app, file, { completed: true, incomplete: false, section: taskSection });
                }
            } catch (error) {
                console.error('Error reading completed tasks:', error);
                return [];
            }
        };

        const checkJournalExists = async (file: TFile): Promise<boolean> => {
            const cacheKey = file.path;

            if (cacheKey in journalStatusCache) {
                return journalStatusCache[cacheKey];
            }

            const journalContent = await extractJournalContent(file);
            const result = journalContent !== null && journalContent.length > 0;
            journalStatusCache[cacheKey] = result;
            return result;
        };

        const renderTimelineHTML = (sortedFiles: TFile[]): string => {
            let html = '<div class="timeline-content">';

            sortedFiles.forEach(file => {
                const fileName = file.name.replace('.md', '');
                const data = journalData[file.path] || { hasJournal: false, completedTasks: [], journalContent: '' };
                const hasJournal = data.hasJournal && data.journalContent;

                html += `<div class="note-card" style="
                    background: var(--background-secondary);
                    border-radius: 8px;
                    padding: 12px 16px;
                    transition: box-shadow 0.2s ease;
                    border: 1px solid var(--background-modifier-border);
                    margin-bottom: 8px;
                    transform: none;
                " data-file-path="${file.path}">`;

                html += '<div class="note-header" style="display: flex; justify-content: space-between; align-items: center;">';
                const formattedDate = dateFormat ? formatDate(new Date(fileName + 'T00:00:00'), dateFormat) : fileName;
                html += `<div class="note-date" style="font-size: 1.1em; font-weight: bold; color: var(--color-accent); line-height: 1.2; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    ${formattedDate}
                    ${hasJournal ? '<span style="color: var(--color-accent); font-size: 0.9em;">✓</span>' : ''}
                </div>`;

                if (hasJournal && showJournalDropdown) {
                    html += `<button class="dropdown-button" style="
                        background: var(--background-modifier-hover);
                        border: none;
                        padding: 2px;
                        width: 24px;
                        height: 24px;
                        cursor: pointer;
                        color: var(--text-muted);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 4px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1);
                        transition: box-shadow 0.2s ease, transform 0.1s ease;
                    " data-file-path="${file.path}"
                    ></button>`;
                }

                html += '</div>';

                // Show completed tasks directly (no dropdown)
                if (showTasks && data.completedTasks.length > 0) {
                    html += `<div style="margin-top: 8px;">`;
                    data.completedTasks.forEach(task => {
                        html += `<div style="
                            font-size: 0.9em;
                            color: var(--text-muted);
                            margin-bottom: 2px;
                            padding-left: 6px;
                            border-left: 2px solid var(--color-accent);
                        ">✓ ${task}</div>`;
                    });
                    html += '</div>';
                }

                // Journal content in dropdown
                if (hasJournal && showJournalDropdown) {
                    html += `<div class="journal-content" style="
                        display: grid;
                        margin-top: 0;
                        grid-template-rows: 0fr;
                        overflow: hidden;
                        background: var(--background-primary);
                        border-radius: 6px;
                        border: 0 solid var(--background-modifier-border);
                        color: var(--text-normal);
                        font-size: 0.95em;
                        line-height: 1.5;
                        opacity: 0;
                        box-shadow: 0 0 0 rgba(0, 0, 0, 0);
                        transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                                    border-width 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                                    margin-top 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                                    opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                                    box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    " data-file-path="${file.path}">`;

                    html += `<div style="
                        min-height: 0;
                        opacity: 0;
                        transform: translateX(-12px) scale(0.98);
                        margin: 0;
                        padding: 0;
                        overflow: hidden;
                        transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                                    transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                                    padding 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    ">`;
                    html += `<div style="white-space: pre-wrap;">${data.journalContent}</div>`;
                    html += '</div></div>';
                }

                html += '</div>';
            });

            html += '</div>';
            return html;
        };

        const checkAllContent = async (files: TFile[]) => {
            for (const file of files) {
                const [hasJournal, completedTasks, journalContent] = await Promise.all([
                    checkJournalExists(file),
                    extractCompletedTasks(file),
                    extractJournalContent(file)
                ]);

                journalData[file.path] = { hasJournal, completedTasks, journalContent: journalContent || '' };
            }
        };

        const initializeTimelineView = async () => {
            try {
                const allFiles = app.vault.getMarkdownFiles();

                const files = allFiles
                    .filter(file => {
                        const cache = app.metadataCache.getFileCache(file);
                        return matchesQuery(file, cache, query);
                    })
                    .filter(file => {
                        const fileName = file.name.replace('.md', '');
                        return /^\d{4}-\d{2}-\d{2}$/.test(fileName);
                    })
                    .sort((a, b) => {
                        const dateA = new Date(a.name.replace('.md', '') + 'T00:00:00');
                        const dateB = new Date(b.name.replace('.md', '') + 'T00:00:00');
                        return dateB.getTime() - dateA.getTime();
                    })
                    .slice(0, limit);

                if (files.length === 0) {
                    container.textContent = `No daily note files found matching query.`;
                    return;
                }

                container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">Loading timeline...</div>';

                await checkAllContent(files);

                const timelineHTML = renderTimelineHTML(files);
                container.innerHTML = timelineHTML;

                container.addEventListener('mousedown', async (event) => {
                    const target = event.target as HTMLElement;

                    if (target.classList.contains('dropdown-button') && event.button === 0) {
                        event.stopPropagation();
                        const filePath = target.getAttribute('data-file-path');
                        if (filePath) {
                            const journalContent = container.querySelector(`.journal-content[data-file-path="${filePath}"]`) as HTMLElement;
                            const isOpen = target.classList.contains('open');

                            if (isOpen) {
                                target.classList.remove('open');
                                journalContent.classList.remove('visible');

                                // Hide inner content FIRST
                                const innerDiv = journalContent.querySelector('div') as HTMLElement;
                                if (innerDiv) {
                                    innerDiv.style.opacity = '0';
                                    innerDiv.style.transform = 'translateX(-12px) scale(0.98)';
                                    innerDiv.style.paddingTop = '0';
                                    innerDiv.style.paddingBottom = '0';
                                }

                                // Then collapse container after a brief delay
                                setTimeout(() => {
                                    journalContent.style.gridTemplateRows = '0fr';
                                    journalContent.style.marginTop = '0';
                                    journalContent.style.borderWidth = '0';
                                    journalContent.style.opacity = '0';
                                }, 0);
                            } else {
                                target.classList.add('open');
                                journalContent.classList.add('visible');
                                // Direct style fallback
                                journalContent.style.gridTemplateRows = '1fr';
                                journalContent.style.marginTop = '10px';
                                journalContent.style.borderWidth = '1px';
                                journalContent.style.opacity = '1';

                                // Fix inner content styling
                                const innerDiv = journalContent.querySelector('div') as HTMLElement;
                                if (innerDiv) {
                                    innerDiv.style.opacity = '1';
                                    innerDiv.style.transform = 'translateX(0) scale(1)';
                                    innerDiv.style.padding = '12px';
                                }
                            }
                        }
                    } else if (target.classList.contains('note-date')) {
                        const noteCard = target.closest('.note-card');
                        const filePath = noteCard?.getAttribute('data-file-path');
                        if (filePath) {
                            const file = app.vault.getAbstractFileByPath(filePath);
                            if (file instanceof TFile) {
                                const newLeaf = event.button === 1; // Middle click
                                await app.workspace.getLeaf(newLeaf).openFile(file);
                            }
                        }
                    } else if (target.classList.contains('internal-link') && event.button === 0) {
                        event.preventDefault();
                        event.stopPropagation();
                        const linkTarget = target.getAttribute('data-href');
                        if (linkTarget) {
                            // Use the current file's path as context for resolving relative links
                            const noteCard = target.closest('.note-card');
                            const contextPath = noteCard?.getAttribute('data-file-path') || '';
                            await app.workspace.openLinkText(linkTarget, contextPath);
                        }
                    }
                });

            } catch (error) {
                console.error('Error initializing timeline view:', error);
                container.textContent = 'Error loading timeline. Check console for details.';
            }
        };

        await initializeTimelineView();
        el.appendChild(container);
    },
    settings: {
        limit: {
            name: "Timeline Limit",
            desc: "Maximum number of daily notes to show in timeline",
            type: "number",
            default: 30
        },
        journalSection: {
            name: "Journal Section Header",
            desc: "Header text to look for journal content",
            type: "text",
            default: "## Journal"
        },
        taskSection: {
            name: "Task Section Header",
            desc: "Header text to look for completed tasks",
            type: "text",
            default: "## Tasks"
        },
        dateFormat: {
            name: "Date Format",
            desc: "Format for date display. Use 'YYYY-MM-DD', 'dddd' (full day name), 'MMM DD' (short month day), etc. Leave empty to show raw filename",
            type: "text",
            placeholder: "YYYY-MM-DD",
            default: ""
        },
        showTasks: {
            name: "Show Tasks",
            desc: "Display completed tasks for each day",
            type: "toggle",
            default: true
        },
        showJournalDropdown: {
            name: "Show Journal Dropdown",
            desc: "Show expandable journal content with dropdown button",
            type: "toggle",
            default: true
        },
    }
}