import { Component, ComponentArgs, ComponentAction } from "components";
import propertyStatusStyles from "./styles";
import { App, MarkdownPostProcessorContext, TFile } from "obsidian";
import { formatDate } from "utils";

type PropertyStatusArgs = ['property', 'mode', 'dateFormat', 'countLabel', 'singularLabel', 'latestLabel', 'emptyText', 'emptyLatestText'];

function parseDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'object' && value.ts) return new Date(value.ts);
    if (typeof value === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(value + 'T12:00:00');
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) return parsed;
    }
    if (typeof value === 'number') return new Date(value);
    return null;
}

function getMostRecentDate(values: any[]): Date | null {
    if (!values?.length) return null;
    const dates = values.map(v => parseDate(v)).filter((d): d is Date => d !== null);
    return dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;
}

function getOldestDate(values: any[]): Date | null {
    if (!values?.length) return null;
    const dates = values.map(v => parseDate(v)).filter((d): d is Date => d !== null);
    return dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
}

function getSum(values: any[]): number {
    if (!Array.isArray(values)) return 0;
    return values.reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
}

function getAverage(values: any[]): number {
    if (!values?.length) return 0;
    return getSum(values) / values.length;
}

function getSingularLabel(label: string, singularOverride?: string): string {
    if (singularOverride) return singularOverride;
    if (label.endsWith('ies')) return label.slice(0, -3) + 'y';
    if (label.endsWith('es')) return label.slice(0, -2);
    if (label.endsWith('s')) return label.slice(0, -1);
    return label;
}

function updateDisplay(
    container: HTMLElement,
    args: ComponentArgs<PropertyStatusArgs>,
    app: App,
    ctx: MarkdownPostProcessorContext
) {
    container.empty();

    const propertyName = args.property;
    const mode = args.mode;
    const dateFormat = args.dateFormat;
    const countLabel = args.countLabel;
    const singularLabel = args.singularLabel;
    const latestLabel = args.latestLabel;
    const emptyText = args.emptyText;
    const emptyLatestText = args.emptyLatestText;

    const file = app.vault.getAbstractFileByPath(ctx.sourcePath);
    if (!(file instanceof TFile)) {
        container.createEl('div', { text: 'Error: Cannot read file', cls: 'property-status-empty' });
        return;
    }

    const cache = app.metadataCache.getFileCache(file);
    const propertyValue = cache?.frontmatter?.[propertyName];

    if (propertyValue === undefined || propertyValue === null ||
        (Array.isArray(propertyValue) && propertyValue.length === 0)) {
        container.createEl('div', { text: emptyText, cls: 'property-status-empty' });
        return;
    }

    const values = Array.isArray(propertyValue) ? propertyValue : [propertyValue];

    switch (mode) {
        case 'count': {
            const count = values.length;
            const label = count === 1 ? getSingularLabel(countLabel, singularLabel) : countLabel;
            container.createEl('div', { cls: 'property-status-count', text: `${count} ${label}` });
            break;
        }
        case 'latest': {
            const dateStr = getMostRecentDate(values) ? formatDate(getMostRecentDate(values)!, dateFormat) : emptyLatestText;
            container.createEl('div', { cls: 'property-status-latest', text: `${latestLabel} ${dateStr}` });
            break;
        }
        case 'oldest': {
            const dateStr = getOldestDate(values) ? formatDate(getOldestDate(values)!, dateFormat) : emptyLatestText;
            container.createEl('div', { cls: 'property-status-latest', text: `${latestLabel} ${dateStr}` });
            break;
        }
        case 'both': {
            const count = values.length;
            const label = count === 1 ? getSingularLabel(countLabel, singularLabel) : countLabel;
            container.createEl('div', { cls: 'property-status-count', text: `${count} ${label}` });
            const dateStr = getMostRecentDate(values) ? formatDate(getMostRecentDate(values)!, dateFormat) : emptyLatestText;
            container.createEl('div', { cls: 'property-status-latest', text: `${latestLabel} ${dateStr}` });
            break;
        }
        case 'sum': {
            container.createEl('div', { cls: 'property-status-value', text: `${getSum(values)}` });
            break;
        }
        case 'average': {
            const avgStr = getAverage(values).toFixed(2).replace(/\.?0+$/, '');
            container.createEl('div', { cls: 'property-status-value', text: avgStr });
            break;
        }
        case 'value': {
            const displayValue = Array.isArray(propertyValue) ? propertyValue.join(', ') : String(propertyValue);
            container.createEl('div', { cls: 'property-status-value', text: displayValue });
            break;
        }
    }
}

export const propertyStatus: Component<PropertyStatusArgs> = {
    name: 'Property Status',
    description: 'Display status/statistics of a frontmatter property (count, dates, sums)',
    keyName: 'property-status',
    icon: 'bar-chart-2',
    args: {
        property: {
            description: 'The property name to display',
            required: true
        },
        mode: {
            description: 'Display mode: count, latest, oldest, both, sum, average, value',
            default: 'both'
        },
        dateFormat: {
            description: 'Date format (moment.js format string)',
            default: 'MMM D, YYYY'
        },
        countLabel: {
            description: 'Label for count (plural form)',
            default: 'entries'
        },
        singularLabel: {
            description: 'Singular form of count label (auto-derived if not set)',
            default: ''
        },
        latestLabel: {
            description: 'Label prefix for date display',
            default: 'Last updated'
        },
        emptyText: {
            description: 'Text to show when property is empty or missing',
            default: 'No data'
        },
        emptyLatestText: {
            description: 'Text to show when no valid dates found',
            default: 'never'
        }
    },
    isMountable: true,
    refresh: 'metadataChanged',
    does: [ComponentAction.READ],
    aliases: ['prop-status', 'property-stats'],
    styles: propertyStatusStyles,

    render: async (args, el, ctx, app, instance) => {
        if (!args.property) {
            el.textContent = "Error: 'property' argument is required";
            return;
        }
        const validModes = ['count', 'latest', 'oldest', 'both', 'sum', 'average', 'value'];
        if (args.mode && !validModes.includes(args.mode)) {
            el.textContent = `Error: Invalid mode '${args.mode}'. Valid modes: ${validModes.join(', ')}`;
            return;
        }

        const container = el.createEl('div', { cls: 'property-status-container' });
        instance.data.container = container;
        updateDisplay(container, args, app, ctx);
    },
};
