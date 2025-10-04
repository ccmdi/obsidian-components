import { Component, ComponentArgs, ComponentAction, ComponentInstance } from "components";
import { formatDate, useTemplate } from "../../utils";
import navigateStyles from "./styles";
import { App, MarkdownPostProcessorContext } from "obsidian";

const renderNavigate = async (args: ComponentArgs, el: HTMLElement, ctx: MarkdownPostProcessorContext, app: App, instance: ComponentInstance, componentSettings: Record<string, any> = {}) => {
    const folderPath = args.folder || ctx.sourcePath?.split('/').slice(0, -1).join('/') || '';
    const templatePath = args.template;
    const dateFormat = args.dateFormat || componentSettings.dateFormat;

    const initiator = app.workspace.getActiveFile();
    if (!initiator) {
        el.textContent = "No active file to navigate from.";
        return;
    }
    const initiatorName = initiator.name.slice(0, initiator.name.length - 3);

    const createNavigationButton = (dayOffset: number, label: string) => {
        const btn = document.createElement('button');
        btn.className = `daily-nav ${dayOffset < 0 ? 'yesterday' : 'tomorrow'}`;
        btn.type = 'button';
        btn.tabIndex = 0;

        let targetDate: Date;
        if (initiatorName.length == 10) {
            const [year, month, day] = initiatorName.split('-').map(Number);
            targetDate = new Date(year, month - 1, day + dayOffset);
        } else {
            targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + dayOffset);
        }

        btn.textContent = dateFormat ? formatDate(targetDate, dateFormat) : label;

        const handleClick = async (e: Event) => {
            e.preventDefault();
            e.stopPropagation();

            let targetName;
            if (args.date) {
                targetName = args.date;
            } else if (initiatorName.length == 10) {
                const [year, month, day] = initiatorName.split('-').map(Number);
                const navDate = new Date(year, month - 1, day + dayOffset);
                targetName = `${navDate.getFullYear()}-${String(navDate.getMonth() + 1).padStart(2, '0')}-${String(navDate.getDate()).padStart(2, '0')}`;
            } else {
                const navDate = new Date();
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

    // Clear existing content
    el.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'daily-nav-container';
    container.style.display = 'flex';
    container.style.gap = '0';

    const style = document.createElement('style');
    style.textContent = navigateStyles;
    container.appendChild(style);

    const yesterdayBtn = createNavigationButton(-1, 'Yesterday');
    const tomorrowBtn = createNavigationButton(1, 'Tomorrow');

    container.appendChild(yesterdayBtn);
    container.appendChild(tomorrowBtn);
    el.appendChild(container);
};

export const navigate: Component<['folder', 'date', 'template', 'dateFormat']> = {
    name: 'Navigate',
    description: 'Navigate periodic notes',
    keyName: 'navigate',
    args: {
        folder: {
            description: 'Folder to navigate',
            default: ''
        },
        date: {
            description: 'Date to navigate to',
            default: ''
        },
        template: {
            description: 'Template to use',
            default: ''
        },
        dateFormat: {
            description: 'Date format',
            default: 'YYYY-MM-DD'
        }
    },
    isMountable: true,
    render: renderNavigate,
    refresh: true,
    does: [ComponentAction.READ, ComponentAction.WRITE],
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