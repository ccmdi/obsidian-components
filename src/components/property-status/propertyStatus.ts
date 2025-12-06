import { Component, ComponentArgs, ComponentAction, ComponentInstance } from "components";
import propertyStatusStyles from "./styles";
import { App, MarkdownPostProcessorContext, TFile } from "obsidian";
import { formatDate } from "utils";

type PropertyStatusArgs = ['property', 'mode', 'dateFormat', 'countLabel', 'singularLabel', 'latestLabel', 'emptyText', 'emptyLatestText'];

/**
 * Parse a value as a date, handling various formats
 */
function parseDate(value: any): Date | null {
    if (!value) return null;

    if (value instanceof Date) return value;

    // Handle Obsidian's DateTime objects (from Dataview)
    if (typeof value === 'object' && value.ts) {
        return new Date(value.ts);
    }

    // Handle string dates - add time component to avoid timezone issues
    if (typeof value === 'string') {
        // If it's just a date (YYYY-MM-DD), add noon time to avoid timezone shifts
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return new Date(value + 'T12:00:00');
        }
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) return parsed;
    }

    // Handle timestamps
    if (typeof value === 'number') {
        return new Date(value);
    }

    return null;
}

/**
 * Get the most recent date from an array of values
 */
function getMostRecentDate(values: any[]): Date | null {
    if (!values || !Array.isArray(values) || values.length === 0) return null;

    const dates = values
        .map(v => parseDate(v))
        .filter((d): d is Date => d !== null);

    if (dates.length === 0) return null;

    return new Date(Math.max(...dates.map(d => d.getTime())));
}

/**
 * Get the oldest date from an array of values
 */
function getOldestDate(values: any[]): Date | null {
    if (!values || !Array.isArray(values) || values.length === 0) return null;

    const dates = values
        .map(v => parseDate(v))
        .filter((d): d is Date => d !== null);

    if (dates.length === 0) return null;

    return new Date(Math.min(...dates.map(d => d.getTime())));
}

/**
 * Calculate sum of numeric values
 */
function getSum(values: any[]): number {
    if (!values || !Array.isArray(values)) return 0;
    return values.reduce((sum, v) => {
        const num = parseFloat(v);
        return sum + (isNaN(num) ? 0 : num);
    }, 0);
}

/**
 * Calculate average of numeric values
 */
function getAverage(values: any[]): number {
    if (!values || !Array.isArray(values) || values.length === 0) return 0;
    const sum = getSum(values);
    return sum / values.length;
}

/**
 * Get singular form of a label
 */
function getSingularLabel(label: string, singularOverride?: string): string {
    if (singularOverride) return singularOverride;

    // Common pluralization rules (reverse)
    if (label.endsWith('ies')) return label.slice(0, -3) + 'y';
    if (label.endsWith('es')) return label.slice(0, -2);
    if (label.endsWith('s')) return label.slice(0, -1);
    return label;
}

const renderPropertyStatus = async (
    args: ComponentArgs<PropertyStatusArgs>,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
    app: App,
    instance: ComponentInstance,
    componentSettings: Record<string, any> = {}
) => {
    const propertyName = args.property;
    const mode = args.mode || 'both';
    const dateFormat = args.dateFormat || 'MMM D, YYYY';
    const countLabel = args.countLabel || 'entries';
    const singularLabel = args.singularLabel;
    const latestLabel = args.latestLabel || 'Last updated';
    const emptyText = args.emptyText || 'No data';
    const emptyLatestText = args.emptyLatestText || 'never';

    if (!propertyName) {
        el.textContent = "Error: 'property' argument is required";
        return;
    }

    const validModes = ['count', 'latest', 'oldest', 'both', 'sum', 'average', 'value'];
    if (!validModes.includes(mode)) {
        el.textContent = `Error: Invalid mode '${mode}'. Valid modes: ${validModes.join(', ')}`;
        return;
    }

    const container = el.createEl('div', { cls: 'property-status-container' });

    const updateDisplay = () => {
        container.empty();

        // Get frontmatter
        const file = app.vault.getAbstractFileByPath(ctx.sourcePath);
        if (!(file instanceof TFile)) {
            container.createEl('div', { text: 'Error: Cannot read file', cls: 'property-status-empty' });
            return;
        }

        const cache = app.metadataCache.getFileCache(file);
        const fm = cache?.frontmatter || {};
        const propertyValue = fm[propertyName];

        // Handle empty/missing property
        if (propertyValue === undefined || propertyValue === null ||
            (Array.isArray(propertyValue) && propertyValue.length === 0)) {
            container.createEl('div', { text: emptyText, cls: 'property-status-empty' });
            return;
        }

        // Normalize to array for consistent handling
        const values = Array.isArray(propertyValue) ? propertyValue : [propertyValue];

        switch (mode) {
            case 'count': {
                const count = values.length;
                const label = count === 1 ? getSingularLabel(countLabel, singularLabel) : countLabel;
                container.createEl('div', {
                    cls: 'property-status-count',
                    text: `${count} ${label}`
                });
                break;
            }

            case 'latest': {
                const latestDate = getMostRecentDate(values);
                const dateStr = latestDate ? formatDate(latestDate, dateFormat) : emptyLatestText;
                container.createEl('div', {
                    cls: 'property-status-latest',
                    text: `${latestLabel} ${dateStr}`
                });
                break;
            }

            case 'oldest': {
                const oldestDate = getOldestDate(values);
                const dateStr = oldestDate ? formatDate(oldestDate, dateFormat) : emptyLatestText;
                container.createEl('div', {
                    cls: 'property-status-latest',
                    text: `${latestLabel} ${dateStr}`
                });
                break;
            }

            case 'both': {
                // Count display
                const count = values.length;
                const label = count === 1 ? getSingularLabel(countLabel, singularLabel) : countLabel;
                container.createEl('div', {
                    cls: 'property-status-count',
                    text: `${count} ${label}`
                });

                // Latest date display
                const latestDate = getMostRecentDate(values);
                const dateStr = latestDate ? formatDate(latestDate, dateFormat) : emptyLatestText;
                container.createEl('div', {
                    cls: 'property-status-latest',
                    text: `${latestLabel} ${dateStr}`
                });
                break;
            }

            case 'sum': {
                const sum = getSum(values);
                container.createEl('div', {
                    cls: 'property-status-value',
                    text: `${sum}`
                });
                break;
            }

            case 'average': {
                const avg = getAverage(values);
                // Format to 2 decimal places, remove trailing zeros
                const avgStr = avg.toFixed(2).replace(/\.?0+$/, '');
                container.createEl('div', {
                    cls: 'property-status-value',
                    text: `${avgStr}`
                });
                break;
            }

            case 'value': {
                // Just display the raw value
                const displayValue = Array.isArray(propertyValue)
                    ? propertyValue.join(', ')
                    : String(propertyValue);
                container.createEl('div', {
                    cls: 'property-status-value',
                    text: displayValue
                });
                break;
            }
        }
    };

    // Initial render
    updateDisplay();

    // Listen for metadata changes to update display
    const metadataHandler = (file: TFile) => {
        if (file.path === ctx.sourcePath) {
            updateDisplay();
        }
    };

    app.metadataCache.on('changed', metadataHandler);
    ComponentInstance.addCleanup(instance, () => {
        app.metadataCache.off('changed', metadataHandler);
    });

    el.appendChild(container);
};

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
    render: renderPropertyStatus,
    refresh: true,
    does: [ComponentAction.READ],
    aliases: ['prop-status', 'property-stats'],
    styles: propertyStatusStyles
};
