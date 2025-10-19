import { Component, ComponentAction, ComponentInstance } from "components";
import { TFile } from "obsidian";
import { useNavigation, useTargetNoteSorting, getTasks, matchesQuery } from "utils";
import { remindersStyles } from "./styles";

export const reminders: Component<['query', 'monthsBack', 'limit', 'showAges', 'colorAges', 'showCount', 'sort', 'showHeader']> = {
    name: 'Reminders',
    description: 'Display reminders from daily notes',
    keyName: 'reminders',
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
            default: 'true'
        },
        colorAges: {
            description: 'Color task ages',
            default: 'true'
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
    does: [ComponentAction.READ],
    render: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
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

        const styledAge = (age: number): string => {
            if (!showAges) return "";

            const color = getColorForAge(age);

            if (age < 7 && colorAges) {
                return "";
            }

            const ageText = `${age} day${age === 1 ? '' : 's'} old`;
            return `<span style="color: ${color}; font-weight: bold;">(${ageText})</span>`;
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
                el.textContent = `No daily note files found matching query.`;
                return;
            }

            // Extract ALL tasks from all files to track completion status
            const taskTextMap: Record<string, { firstDate: Date, lastDate: Date, latestCompleted: boolean }> = {};

            for (const file of files) {
                const fileDate = new Date(file.name.replace('.md', ''));

                // Get both complete and incomplete tasks
                const allTasksInFile = await getTasks(app, file, { incomplete: true, completed: true });

                for (const taskText of allTasksInFile) {
                    // Check if task is completed in this file
                    const completedTasks = await getTasks(app, file, { incomplete: false, completed: true });
                    const isCompleted = completedTasks.includes(taskText);

                    if (!taskTextMap[taskText]) {
                        // First occurrence of this task
                        taskTextMap[taskText] = {
                            firstDate: fileDate,
                            lastDate: fileDate,
                            latestCompleted: isCompleted
                        };
                    } else {
                        // Update earliest occurrence
                        if (fileDate < taskTextMap[taskText].firstDate) {
                            taskTextMap[taskText].firstDate = fileDate;
                        }
                        // Update latest occurrence and completion status
                        if (fileDate > taskTextMap[taskText].lastDate) {
                            taskTextMap[taskText].lastDate = fileDate;
                            taskTextMap[taskText].latestCompleted = isCompleted;
                        }
                    }
                }
            }

            const uniqueTasks = Object.entries(taskTextMap)
                .filter(([text, data]) => !data.latestCompleted)
                .map(([text, data]) => {
                    const fileName = data.firstDate.toISOString().slice(0, 10);
                    const file = files.find(f => f.name.replace('.md', '') === fileName);
                    if(!file) throw new Error(`File not found: ${fileName}`);
                    const fm = app.metadataCache.getFileCache(file);
                    return {
                        text,
                        date: data.firstDate,
                        age: daysBetween(new Date(), data.firstDate),
                        file,
                        fm
                    };
                });

            const sortedTasks = useTargetNoteSorting(uniqueTasks, sortBy);

            const style = el.createEl('style');
            style.textContent = remindersStyles;
            el.appendChild(style);

            const container = el.createEl('div', { cls: 'reminders-container' });

            if (sortedTasks.length === 0) {
                container.innerHTML = `
                    ${showHeader ? `<div class="reminders-header">
                        <h3 class="reminders-title">Reminders</h3>
                    </div>` : ''}
                    <div class="reminders-empty">No incomplete tasks found.</div>
                `;
                return;
            }

            // Create header with count
            if (showHeader) {
                const header = container.createEl('div', { cls: 'reminders-header' });
                header.innerHTML = `
                    <h3 class="reminders-title">Reminders</h3>
                        ${showCount ? `<div class="reminders-count">${Math.min(sortedTasks.length, limit)}</div>` : ''}
                    `;
            }

            // Create task list
            const taskList = container.createEl('div', { cls: 'reminders-list' });

            for (const task of sortedTasks.slice(0, limit)) {
                const listItem = taskList.createEl('div', { cls: 'reminder-item' });

                const ageText = styledAge(task.age);
                listItem.innerHTML = `
                    <span class="reminder-bullet">•</span>
                    <span class="reminder-text">${task.text}</span>
                    ${ageText ? `<span class="reminder-age">${ageText}</span>` : ''}
                `;

                // Make clickable to open the file
                listItem.addEventListener('mousedown', async (event) => {
                    const filePath = `${task.file?.path}`;
                    const isNewTab = event.button === 1; // Middle click
                    await useNavigation(app, filePath, isNewTab);
                });
            }

        } catch (error) {
            console.error('Error in reminders component:', error);
            el.textContent = 'Error loading reminders. Check console for details.';
        }
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
            default: 6
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
            default: true
        },
        colorAges: {
            name: "Color Task Ages",
            desc: "Use red coloring for older tasks",
            type: "toggle",
            default: true
        },
        sort: {
            name: "Sort By",
            desc: "How to sort tasks: age, ctime, mtime, date, text, or note.frontmatter.property, note.stat.mtime, etc.",
            type: "text",
            default: "age"
        }
    }
};