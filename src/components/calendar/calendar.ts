import { Component, ComponentArgs, ComponentAction, ComponentInstance } from "components";
import calendarStyles from "./styles";
import { App, MarkdownPostProcessorContext, TFile } from "obsidian";
import { debug } from "debug";

const renderCalendar = async (
    args: ComponentArgs<[]>,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
    app: App,
    instance: ComponentInstance
) => {
    const container = el.createEl('div', { cls: 'calendar-container' });

    // Get daily notes configuration
    let dailyNotesFolder = '';
    let dailyNotesFormat = 'YYYY-MM-DD';

    try {
        // @ts-ignore - Access daily notes plugin settings
        const dailyNotesPlugin = app.internalPlugins?.plugins?.['daily-notes'];
        if (dailyNotesPlugin?.enabled) {
            // @ts-ignore
            const dailyNotesSettings = dailyNotesPlugin.instance?.options;
            if (dailyNotesSettings) {
                dailyNotesFolder = dailyNotesSettings.folder || '';
                dailyNotesFormat = dailyNotesSettings.format || 'YYYY-MM-DD';
            }
        }
    } catch (e) {
        debug('Could not access daily notes settings, using defaults');
    }

    // Track current view month/year
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();

    const formatDateForFile = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        // Support common daily note formats
        return dailyNotesFormat
            .replace('YYYY', String(year))
            .replace('MM', month)
            .replace('DD', day);
    };

    const checkNoteExists = (date: Date): boolean => {
        const fileName = formatDateForFile(date);
        const fullPath = dailyNotesFolder ? `${dailyNotesFolder}/${fileName}.md` : `${fileName}.md`;
        return app.vault.getAbstractFileByPath(fullPath) !== null;
    };

    const navigateToDate = async (date: Date) => {
        const fileName = formatDateForFile(date);
        const fullPath = dailyNotesFolder ? `${dailyNotesFolder}/${fileName}.md` : `${fileName}.md`;

        let file = app.vault.getAbstractFileByPath(fullPath);

        // Create the note if it doesn't exist
        if (!file) {
            try {
                // Try to use daily notes plugin to create the note
                // @ts-ignore
                const dailyNotesPlugin = app.internalPlugins?.plugins?.['daily-notes'];
                if (dailyNotesPlugin?.enabled) {
                    // @ts-ignore - Use daily notes creation if available
                    const createdFile = await dailyNotesPlugin.instance?.createDailyNote?.(date);
                    if (createdFile) {
                        file = createdFile;
                    }
                }

                // Fall back to manual creation
                if (!file) {
                    file = await app.vault.create(fullPath, '');
                }
            } catch (e) {
                console.error('Error creating daily note:', e);
                return;
            }
        }

        // Open the file
        if (file instanceof TFile) {
            await app.workspace.getLeaf(false).openFile(file);
        }
    };

    const renderCalendarView = () => {
        container.empty();

        // Header with month/year and navigation
        const header = container.createEl('div', { cls: 'calendar-header' });

        const prevButton = header.createEl('button', {
            cls: 'calendar-nav-button',
            text: '‹'
        });
        prevButton.type = 'button';
        prevButton.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderCalendarView();
        });

        const monthYearLabel = header.createEl('div', { cls: 'calendar-month-year' });
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        monthYearLabel.textContent = `${monthNames[currentMonth]} ${currentYear}`;

        const nextButton = header.createEl('button', {
            cls: 'calendar-nav-button',
            text: '›'
        });
        nextButton.type = 'button';
        nextButton.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderCalendarView();
        });

        // Weekday labels
        const weekdaysContainer = container.createEl('div', { cls: 'calendar-weekdays' });
        const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        weekdays.forEach(day => {
            weekdaysContainer.createEl('div', { cls: 'calendar-weekday', text: day });
        });

        // Days grid
        const daysContainer = container.createEl('div', { cls: 'calendar-days' });

        // Calculate the first day of the month and total days
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        const startingDayOfWeek = firstDayOfMonth.getDay();
        const daysInMonth = lastDayOfMonth.getDate();

        // Get previous month's days
        const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

        // Today's date for comparison
        const today = new Date();
        const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;
        const todayDate = today.getDate();

        // Fill in previous month's days
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const dayNum = prevMonthLastDay - i;
            const dayEl = daysContainer.createEl('div', {
                cls: 'calendar-day calendar-day-other-month',
                text: String(dayNum)
            });
        }

        // Fill in current month's days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const dayEl = daysContainer.createEl('div', {
                cls: 'calendar-day',
                text: String(day)
            });

            // Highlight today
            if (isCurrentMonth && day === todayDate) {
                dayEl.addClass('calendar-day-today');
            }

            // Show indicator if note exists
            if (checkNoteExists(date)) {
                dayEl.addClass('calendar-day-has-note');
            }

            // Click handler
            dayEl.addEventListener('click', async () => {
                await navigateToDate(date);
            });

            // Middle click to open in new tab (only if note exists)
            dayEl.addEventListener('auxclick', async (e) => {
                if (e.button === 1 && checkNoteExists(date)) {
                    e.preventDefault();
                    const fileName = formatDateForFile(date);
                    const fullPath = dailyNotesFolder ? `${dailyNotesFolder}/${fileName}.md` : `${fileName}.md`;
                    const file = app.vault.getAbstractFileByPath(fullPath);
                    if (file instanceof TFile) {
                        await app.workspace.getLeaf('tab').openFile(file);
                    }
                }
            });
        }

        // Fill in next month's days to complete 6 rows (42 cells)
        const totalCellsUsed = startingDayOfWeek + daysInMonth;
        const remainingCells = 42 - totalCellsUsed;

        for (let day = 1; day <= remainingCells; day++) {
            daysContainer.createEl('div', {
                cls: 'calendar-day calendar-day-other-month',
                text: String(day)
            });
        }
    };

    const refreshNoteIndicators = () => {
        const days = container.querySelectorAll('.calendar-day:not(.calendar-day-other-month)');
        days.forEach((dayEl, index) => {
            const day = index + 1;
            const date = new Date(currentYear, currentMonth, day);
            if (checkNoteExists(date)) {
                dayEl.classList.add('calendar-day-has-note');
            } else {
                dayEl.classList.remove('calendar-day-has-note');
            }
        });
    };

    renderCalendarView();

    app.workspace.on('active-leaf-change', refreshNoteIndicators);
    ComponentInstance.addCleanup(instance, () => {
        app.workspace.off('active-leaf-change', refreshNoteIndicators);
    });
};

export const calendar: Component<[]> = {
    name: 'Calendar',
    description: 'Interactive calendar for navigating daily notes',
    keyName: 'calendar',
    icon: 'calendar',
    args: {},
    isMountable: true,
    render: renderCalendar,
    does: [ComponentAction.READ, ComponentAction.WRITE],
    styles: calendarStyles,
    refresh: 'daily'
};
