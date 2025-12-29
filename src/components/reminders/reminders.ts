import { Component, ComponentAction, ComponentArgs, ComponentInstance } from "components";
import { useNavigation, useTargetNoteSorting, getTasks, matchesQuery, renderMarkdownLinkToElement } from "utils";
import { remindersStyles } from "./styles";
import { TFile } from "obsidian";

export const reminders: Component<['query', 'monthsBack', 'limit', 'showAges', 'colorAges', 'showCount', 'sort', 'showHeader']> = {
    name: 'Reminders',
    description: 'Display reminders from daily notes',
    keyName: 'reminders',
    icon: 'bell',
    refresh: 'daily',
    args: {
        query: {
            description: 'Query to filter notes (supports #tags, "folder/paths", and AND operator)',
            default: ''
        },
        monthsBack: {
            description: 'Months back to look for tasks',
            default: '6'
        },
        limit: {
            description: 'Maximum number of tasks to show',
            default: '20'
        },
        showAges: {
            description: 'Show task ages',
            default: 'false'
        },
        colorAges: {
            description: 'Color task ages',
            default: 'false'
        },
        showCount: {
            description: 'Show total task count',
            default: 'true'
        },
        sort: {
            description: 'Sort tasks by arbitrary property (e.g. "age", "ctime", "mtime", "date", "text", "note.frontmatter.property", "note.stat.mtime", etc.)',
            default: 'age'
        },
        showHeader: {
            description: 'Show header',
            default: 'true'
        }
    },
    isMountable: true,
    does: [ComponentAction.READ, ComponentAction.WRITE],
    styles: remindersStyles,
    render: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
        // Store render function for reuse in renderRefresh
        instance.data.renderContent = async (container: HTMLElement) => {
            await renderRemindersContent(args, container, ctx, app, instance);
        };

        const container = el.createEl('div', { cls: 'reminders-container' });

        // Show placeholder with same layout as empty state while loading
        const showHeader = args.showHeader !== 'false';
        if (showHeader) {
            const header = container.createEl('div', { cls: 'reminders-header' });
            header.createEl('h3', { cls: 'reminders-title', text: 'Reminders' });
        }
        container.createEl('div', { cls: 'reminders-empty' });

        instance.data.container = container;
        await instance.data.renderContent(container);
    },

    renderRefresh: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
        // Keep showing old content while fetching new data
        const oldContainer = instance.data.container as HTMLElement;
        if (!oldContainer) return;

        // Create new container off-DOM, render into it
        const newContainer = document.createElement('div');
        newContainer.className = 'reminders-container';

        await renderRemindersContent(args, newContainer, ctx, app, instance);

        // Swap in new content
        oldContainer.replaceWith(newContainer);
        instance.data.container = newContainer;
    },
    settings: {
        folder: {
            name: "Daily Notes Folder",
            desc: "Path to folder containing daily notes",
            type: "text",
            default: "Daily"
        },
        monthsBack: {
            name: "Months Back",
            desc: "How many months back to search for tasks",
            type: "number",
            default: 2
        },
        limit: {
            name: "Task Limit",
            desc: "Maximum number of tasks to show",
            type: "number",
            default: 100
        },
        showAges: {
            name: "Show Task Ages",
            desc: "Display how old each task is",
            type: "toggle",
            default: false
        },
        colorAges: {
            name: "Color Task Ages",
            desc: "Use red coloring for older tasks",
            type: "toggle",
            default: false
        },
        sort: {
            name: "Sort By",
            desc: "How to sort tasks: age, ctime, mtime, date, text, or note.frontmatter.property, note.stat.mtime, etc.",
            type: "text",
            default: "age"
        }
    }
};

// Extracted render logic for reuse
async function renderRemindersContent(
    args: ComponentArgs<['query', 'monthsBack', 'limit', 'showAges', 'colorAges', 'showCount', 'sort', 'showHeader']>,
    container: HTMLElement,
    ctx: any,
    app: any,
    instance: ComponentInstance
) {
    const query = args.query;
    const monthsBack = parseInt(args.monthsBack) || 6;
    const limit = parseInt(args.limit) || 100;

    const daysBetween = (date1: Date, date2: Date): number => {
        const oneDay = 24 * 60 * 60 * 1000;
        const diffDays = Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay)) - 1;
        return Math.max(diffDays, 0);
    };

    const showAges = args.showAges !== 'false';
    const colorAges = args.colorAges !== 'false';
    const showCount = args.showCount !== 'false';
    const sortBy = args.sort;
    const showHeader = args.showHeader !== 'false';

    const getColorForAge = (age: number): string => {
        if (!colorAges) return "var(--text-muted)";
        if (age < 7) return "rgba(0, 0, 0, 0)";
        if (age < 14) return "rgba(244, 67, 54, 0.5)";
        if (age < 21) return "rgba(244, 67, 54, 0.7)";
        return "rgba(244, 67, 54, 0.9)";
    };

    // Mark a task as complete in its source file
    const completeTask = async (file: TFile, taskText: string): Promise<boolean> => {
        try {
            const content = await app.vault.read(file);
            const lines = content.split('\n');

            // Find and replace the task line
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Match incomplete task with this text
                const taskMatch = line.match(/^(\s*- \[)[ /R](\] .*)$/);
                if (taskMatch) {
                    const extractedText = line.replace(/^\s*- \[.\] /, '');
                    if (extractedText === taskText) {
                        // Replace with completed task
                        lines[i] = line.replace(/^(\s*- \[)[ /R](\].*)$/, '$1x$2');
                        await app.vault.modify(file, lines.join('\n'));
                        return true;
                    }
                }
            }
            return false;
        } catch (error) {
            console.error('Error completing task:', error);
            return false;
        }
    };

    try {
        // Get date range
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - monthsBack);
        const startDateStr = startDate.toISOString().slice(0, 10);

        // Get all files and filter by query
        const allFiles = app.vault.getMarkdownFiles();

        const files = allFiles
            .filter(file => {
                const cache = app.metadataCache.getFileCache(file);
                return matchesQuery(file, cache, query);
            })
            .filter(file =>
                file.name.replace('.md', '') >= startDateStr &&
                /^\d{4}-\d{2}-\d{2}$/.test(file.name.replace('.md', ''))
            )
            .sort((a, b) => b.name.localeCompare(a.name));

        if (files.length === 0) {
            container.empty();
            container.textContent = `No daily note files found matching query.`;
            return;
        }

        // Extract ALL tasks from all files to track completion status
        const taskTextMap: Record<string, {
            firstDate: Date,
            lastDate: Date,
            firstFile: TFile,
            lastFile: TFile,
            latestCompleted: boolean
        }> = {};

        for (const file of files) {
            const fileDate = new Date(file.name.replace('.md', ''));

            const allTasksInFile = await getTasks(app, file, { incomplete: true, completed: true });
            const completedTasks = await getTasks(app, file, { incomplete: false, completed: true });
            const completedSet = new Set(completedTasks);

            for (const taskText of allTasksInFile) {
                const isCompleted = completedSet.has(taskText);

                if (!taskTextMap[taskText]) {
                    taskTextMap[taskText] = {
                        firstDate: fileDate,
                        lastDate: fileDate,
                        firstFile: file,
                        lastFile: file,
                        latestCompleted: isCompleted
                    };
                } else {
                    if (fileDate < taskTextMap[taskText].firstDate) {
                        taskTextMap[taskText].firstDate = fileDate;
                        taskTextMap[taskText].firstFile = file;
                    }
                    if (fileDate > taskTextMap[taskText].lastDate) {
                        taskTextMap[taskText].lastDate = fileDate;
                        taskTextMap[taskText].lastFile = file;
                        taskTextMap[taskText].latestCompleted = isCompleted;
                    }
                }
            }
        }

        const uniqueTasks = Object.entries(taskTextMap)
            .filter(([_, data]) => !data.latestCompleted)
            .map(([text, data]) => {
                const fm = app.metadataCache.getFileCache(data.lastFile);
                return {
                    text,
                    date: data.lastDate,
                    age: daysBetween(new Date(), data.firstDate),
                    file: data.lastFile,
                    fm
                };
            });

        const sortedTasks = useTargetNoteSorting(uniqueTasks, sortBy);

        let countEl: HTMLElement | null = null;
        let currentCount = Math.min(sortedTasks.length, limit);

        container.empty();

        if (sortedTasks.length === 0) {
            if (showHeader) {
                const header = container.createEl('div', { cls: 'reminders-header' });
                header.createEl('h3', { cls: 'reminders-title', text: 'Reminders' });
            }
            container.createEl('div', { cls: 'reminders-empty', text: 'No incomplete tasks found.' });
            return;
        }

        if (showHeader) {
            const header = container.createEl('div', { cls: 'reminders-header' });
            header.createEl('h3', { cls: 'reminders-title', text: 'Reminders' });
            if (showCount) {
                countEl = header.createEl('div', {
                    cls: 'reminders-count',
                    text: currentCount.toString()
                });
            }
        }

        const taskList = container.createEl('div', { cls: 'reminders-list' });

        for (const task of sortedTasks.slice(0, limit)) {
            const listItem = taskList.createEl('div', { cls: 'reminder-item' });

            const checkbox = listItem.createEl('input', {
                cls: 'reminder-checkbox task-list-item-checkbox',
                attr: { type: 'checkbox' }
            });

            checkbox.addEventListener('click', async (e) => {
                e.stopPropagation();

                if (checkbox.checked) {
                    checkbox.disabled = true;
                    listItem.addClass('completing');

                    const success = await completeTask(task.file, task.text);

                    if (success) {
                        currentCount--;
                        if (countEl) {
                            countEl.textContent = currentCount.toString();
                        }

                        listItem.addClass('completed');
                        setTimeout(() => {
                            listItem.remove();
                            if (taskList.children.length === 0) {
                                taskList.remove();
                                container.createEl('div', {
                                    cls: 'reminders-empty',
                                    text: 'No incomplete tasks found.'
                                });
                            }
                        }, 300);
                    } else {
                        checkbox.checked = false;
                        checkbox.disabled = false;
                        listItem.removeClass('completing');
                    }
                }
            });

            const textSpan = listItem.createEl('span', { cls: 'reminder-text' });
            renderMarkdownLinkToElement(task.text, textSpan);

            if (showAges && task.age >= 7) {
                const color = getColorForAge(task.age);
                const ageText = `${task.age} day${task.age === 1 ? '' : 's'} old`;
                const ageSpan = listItem.createEl('span', { cls: 'reminder-age' });
                ageSpan.createEl('span', {
                    attr: { style: `color: ${color}; font-weight: bold;` },
                    text: `(${ageText})`
                });
            }

            listItem.addEventListener('mousedown', async (event) => {
                const target = event.target as HTMLElement;
                if (target.classList.contains('reminder-checkbox') ||
                    target.classList.contains('internal-link')) {
                    return;
                }
                const filePath = `${task.file?.path}`;
                const isNewTab = event.button === 1;
                await useNavigation(app, filePath, isNewTab);
            });
        }

    } catch (error) {
        console.error('Error in reminders component:', error);
        container.empty();
        container.textContent = 'Error loading reminders. Check console for details.';
    }
}
