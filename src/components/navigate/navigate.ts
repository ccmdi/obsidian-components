import { Component, ComponentArgs, ComponentAction, ComponentInstance, ComponentSettingsData } from "components";
import { formatDate, useTemplate } from "utils";
import navigateStyles from "./styles";
import { App, MarkdownPostProcessorContext } from "obsidian";

const renderNavigate = async (args: ComponentArgs<['folder', 'template', 'date', 'dateFormat', 'previous', 'next']>, el: HTMLElement, ctx: MarkdownPostProcessorContext, app: App, instance: ComponentInstance, componentSettings: ComponentSettingsData = {}) => {
    const folderPath = args.folder || ctx.sourcePath?.split('/').slice(0, -1).join('/') || '';
    const templatePath = args.template;
    const dateFormat = args.dateFormat || (componentSettings.dateFormat as string | undefined);

    if (!ctx.sourcePath) {
        el.textContent = "No active file to navigate from.";
        return;
    }
    const initiatorName = ctx.sourcePath.split('/').pop()?.replace(/\.md$/, '') || '';

    // Determine the "base" date for calculating yesterday/tomorrow
    // Priority: args.today > initiatorName (if valid date) > actual today
    const getBaseDate = (): Date => {
        const parseDate = (str: string | undefined): Date | null => {
            if (!str || str.length !== 10) return null;
            const [y, m, d] = str.split('-').map(Number);
            if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
            return new Date(y, m - 1, d);
        };
    
        return parseDate(args.date) || parseDate(initiatorName) || new Date();
    };

    const baseDate = getBaseDate();

    const createNavigationButton = (dayOffset: number, label: string, overrideTarget?: string) => {
        const btn = el.createEl('button', { cls: `daily-nav ${dayOffset < 0 ? 'yesterday' : 'tomorrow'}` });
        btn.type = 'button';
        btn.tabIndex = 0;

        // Calculate the target date relative to baseDate
        const targetDate = new Date(baseDate);
        targetDate.setDate(targetDate.getDate() + dayOffset);

        btn.textContent = dateFormat ? formatDate(targetDate, dateFormat) : label;

        const handleClick = async (e: Event) => {
            e.preventDefault();
            e.stopPropagation();

            let targetName: string;
            if (overrideTarget) {
                // Use explicit override (previous/next args)
                targetName = overrideTarget;
            } else {
                // Calculate from baseDate + offset
                const navDate = new Date(baseDate);
                navDate.setDate(navDate.getDate() + dayOffset);
                targetName = `${navDate.getFullYear()}-${String(navDate.getMonth() + 1).padStart(2, '0')}-${String(navDate.getDate()).padStart(2, '0')}`;
            }

            await useTemplate(app, templatePath, folderPath, targetName);
        };

        btn.addEventListener('click', handleClick);
        // Prevent mousedown from stealing focus - this is the key fix
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            // Immediately handle the navigation on mousedown instead of waiting for click
            handleClick(e);
        });

        return btn;
    };

    const container = el.createEl('div', { cls: 'daily-nav-container' });

    const yesterdayBtn = createNavigationButton(-1, 'Yesterday', args.previous);
    const tomorrowBtn = createNavigationButton(1, 'Tomorrow', args.next);

    container.appendChild(yesterdayBtn);
    container.appendChild(tomorrowBtn);
    el.appendChild(container);
};

export const navigate: Component<['folder', 'date', 'template', 'dateFormat', 'previous', 'next']> = {
    name: 'Navigate',
    description: 'Navigate periodic notes',
    keyName: 'navigate',
    icon: 'arrow-left-right',
    args: {
        folder: {
            description: 'Folder to navigate. If unset, uses the current note\'s folder.',
            default: ''
        },
        date: {
            description: 'Base date for navigation (YYYY-MM-DD). Yesterday/tomorrow are calculated relative to this.',
            default: ''
        },
        template: {
            description: 'Template to use',
            default: ''
        },
        dateFormat: {
            description: 'Date format for button labels',
            default: 'YYYY-MM-DD'
        },
        previous: {
            description: 'Override target for the previous/yesterday button',
            default: ''
        },
        next: {
            description: 'Override target for the next/tomorrow button',
            default: ''
        }
    },
    isMountable: true,
    render: renderNavigate,
    refresh: 'leafChanged',
    does: [ComponentAction.READ, ComponentAction.WRITE],
    styles: navigateStyles,
    settings: {
        dateFormat: {
            name: "Date Format",
            desc: "Format for button text. Use 'YYYY-MM-DD', 'dddd' (full day name), 'MMM DD' (short month day), etc. Leave empty to show 'Yesterday'/'Tomorrow'",
            type: "text",
            placeholder: "YYYY-MM-DD",
            default: "YYYY-MM-DD"
        }
    }
}