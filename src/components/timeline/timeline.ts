import { Component, ComponentAction, ComponentInstance } from "components";
import { TFile } from "obsidian";
import { formatDate, getTasks, matchesQuery, renderMarkdownLinkToElement } from "utils";
import timelineStyles from "./styles";


export const timeline: Component<['query', 'limit', 'journalSection', 'taskSection', 'dateFormat', 'showTasks', 'showJournalDropdown']> = {
    keyName: 'timeline',
    name: 'Timeline',
    description: 'Display a timeline of periodic notes (e.g. daily notes)',
    icon: 'gantt-chart',
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

        const renderTimelineDOM = (container: HTMLElement, sortedFiles: TFile[]): void => {
            const timelineContent = container.createEl('div', { cls: 'timeline-content' });

            sortedFiles.forEach(file => {
                const fileName = file.name.replace('.md', '');
                const data = journalData[file.path] || { hasJournal: false, completedTasks: [], journalContent: '' };
                const hasJournal = data.hasJournal && data.journalContent;

                const noteCard = timelineContent.createEl('div', {
                    cls: 'note-card',
                    attr: { 'data-file-path': file.path }
                });

                const noteHeader = noteCard.createEl('div', { cls: 'note-header' });

                const formattedDate = dateFormat ? formatDate(new Date(fileName + 'T00:00:00'), dateFormat) : fileName;
                const noteDateDiv = noteHeader.createEl('div', { cls: 'note-date' });
                noteDateDiv.appendText(formattedDate);

                if (hasJournal) {
                    noteDateDiv.createEl('span', { cls: 'journal-check', text: '✓' });
                }

                if (hasJournal && showJournalDropdown) {
                    noteHeader.createEl('button', {
                        cls: 'dropdown-button',
                        attr: { 'data-file-path': file.path }
                    });
                }

                if (showTasks && data.completedTasks.length > 0) {
                    const tasksContainer = noteCard.createEl('div', { cls: 'tasks-container' });

                    data.completedTasks.forEach(task => {
                        const taskDiv = tasksContainer.createEl('div', { cls: 'task-item' });
                        taskDiv.appendText('✓ ');
                        renderMarkdownLinkToElement(task, taskDiv);
                    });
                }

                if (hasJournal && showJournalDropdown) {
                    const journalContentDiv = noteCard.createEl('div', {
                        cls: 'journal-content',
                        attr: { 'data-file-path': file.path }
                    });

                    const innerDiv = journalContentDiv.createEl('div', { cls: 'journal-content-inner' });
                    innerDiv.createEl('div', { cls: 'journal-text', text: data.journalContent });
                }
            });
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

                container.empty();
                container.createEl('div', { cls: 'loading-message', text: 'Loading timeline...' });

                await checkAllContent(files);

                container.empty();
                renderTimelineDOM(container, files);

                container.addEventListener('mousedown', async (event) => {
                    event.preventDefault();
                    const target = event.target as HTMLElement;

                    if (target.classList.contains('dropdown-button') && event.button === 0) {
                        event.stopPropagation();
                        const filePath = target.getAttribute('data-file-path');
                        if (filePath) {
                            const journalContent = container.querySelector(`.journal-content[data-file-path="${filePath}"]`) as HTMLElement;
                            target.classList.toggle('open');
                            journalContent.classList.toggle('visible');
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
    refresh: 'daily',
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