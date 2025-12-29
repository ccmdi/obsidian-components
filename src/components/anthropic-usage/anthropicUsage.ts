import { Component, ComponentAction, ComponentInstance } from "components";
import { requestUrl } from "obsidian";
import { anthropicUsageStyles } from "./styles";
import { createColoredIcon, parseBoolean } from "utils";

interface AnthropicUsageData {
    five_hour: {
        utilization: number;
        resets_at: string;
    };
}

const fetchUsage = async (organizationId: string, sessionKey: string): Promise<AnthropicUsageData> => {
    const response = await requestUrl({
        url: `https://claude.ai/api/organizations/${organizationId}/usage`,
        headers: {
            'Cookie': `sessionKey=${sessionKey}`
        }
    });
    return JSON.parse(response.text);
};

const renderLoadingSkeleton = (container: HTMLElement, compact: boolean): void => {
    container.empty();
    container.addClass('anthropic-usage-loading');

    if (compact) {
        const row = container.createEl('div', { cls: 'anthropic-usage-compact-skeleton' });
        row.createEl('div', { cls: 'loading-placeholder anthropic-icon-skeleton' });
        row.createEl('div', { cls: 'loading-placeholder anthropic-value-skeleton' });
    } else {
        container.createEl('div', { cls: 'loading-placeholder anthropic-icon-skeleton' });
        container.createEl('div', { cls: 'loading-placeholder anthropic-value-skeleton' });
        const barWrapper = container.createEl('div', { cls: 'anthropic-usage-bar-wrapper' });
        barWrapper.createEl('div', { cls: 'loading-placeholder anthropic-info-skeleton' });
        barWrapper.createEl('div', { cls: 'loading-placeholder anthropic-bar-skeleton' });
    }
};

const renderUsage = (
    container: HTMLElement,
    data: AnthropicUsageData,
    showRelativeTime: boolean,
    compact: boolean,
    onIconClick: () => void
): { valueEl: HTMLElement; barFill: HTMLElement | null; resetEl: HTMLElement | null } => {
    container.empty();
    container.removeClass('anthropic-usage-loading');
    container.removeClass('anthropic-usage-retrying');

    if (compact) {
        container.addClass('anthropic-usage-compact');
    } else {
        container.removeClass('anthropic-usage-compact');
    }

    // Icon
    const iconContainer = container.createEl('div', { cls: 'anthropic-usage-icon' });
    iconContainer.style.cursor = 'pointer';
    iconContainer.addEventListener('click', onIconClick);
    const icon = createColoredIcon('claude');
    iconContainer.appendChild(icon);

    // Percentage value
    const valueEl = container.createEl('div', {
        cls: 'anthropic-usage-value',
        text: `${data.five_hour.utilization}%`
    });

    let barFill: HTMLElement | null = null;
    let resetEl: HTMLElement | null = null;

    if (!compact) {
        // Bar and info wrapper
        const barWrapper = container.createEl('div', { cls: 'anthropic-usage-bar-wrapper' });

        // Top info row
        const info = barWrapper.createEl('div', { cls: 'anthropic-usage-info' });
        info.createEl('div', { cls: 'anthropic-usage-label', text: 'Usage' });

        // Reset time
        if (data.five_hour.resets_at && window.moment(data.five_hour.resets_at).isValid()) {
            const resetMoment = window.moment(data.five_hour.resets_at);
            const resetTime = resetMoment.format('h:mm A');
            let resetText = `resets ${resetTime}`;
            if (showRelativeTime) {
                const relativeTime = resetMoment.fromNow(true);
                resetText += ` (${relativeTime})`;
            }
            resetEl = info.createEl('div', { cls: 'anthropic-usage-reset', text: resetText });
        }

        // Progress bar
        const bar = barWrapper.createEl('div', { cls: 'anthropic-usage-bar' });
        barFill = bar.createEl('div', {
            cls: 'anthropic-usage-bar-fill',
            attr: { style: `width: ${data.five_hour.utilization}%` }
        });
    }

    return { valueEl, barFill, resetEl };
};

export const anthropicUsage: Component<['organizationId', 'sessionKey', 'showRelativeTime', 'compact', 'refreshInterval']> = {
    name: 'Anthropic Usage',
    keyName: 'anthropic-usage',
    icon: 'brain',
    args: {
        organizationId: {
            description: 'Organization ID (found in claude.ai URL)',
            required: true
        },
        sessionKey: {
            description: 'Session Key (from browser cookies)',
            required: true
        },
        showRelativeTime: {
            description: 'Show relative time until reset (e.g. "in 13 minutes")',
            default: 'false'
        },
        compact: {
            description: 'Compact mode showing only icon and percentage',
            default: 'false'
        },
        refreshInterval: {
            description: 'Refresh interval in seconds (minimum 60)',
            default: '240'
        }
    },
    isMountable: true,
    does: [ComponentAction.EXTERNAL],
    styles: anthropicUsageStyles,

    render: async (args, el, ctx, app, instance: ComponentInstance) => {
        const showRelativeTime = parseBoolean(args.showRelativeTime, false);
        const compact = parseBoolean(args.compact, false);
        const refreshInterval = Math.max(60, parseInt(args.refreshInterval) || 240) * 1000;

        const widget = el.createEl('div', { cls: 'anthropic-usage-container' });

        // Spin animation state
        let spinClicks = 0;
        let currentRotation = 0;
        let decayTimeout: NodeJS.Timeout | null = null;
        const spinTimeouts: NodeJS.Timeout[] = [];

        ComponentInstance.addCleanup(instance, () => {
            if (decayTimeout) clearTimeout(decayTimeout);
            spinTimeouts.forEach(t => clearTimeout(t));
        });

        const spinIcon = (degrees: number, duration: number = 300) => {
            const iconContainer = widget.querySelector('.anthropic-usage-icon') as HTMLElement;
            if (!iconContainer) return;
            iconContainer.style.transition = `transform ${duration}ms ease-out`;
            iconContainer.style.transform = `rotate(${degrees}deg)`;
        };

        const resetSpin = () => {
            if (currentRotation === 0) return;
            spinClicks = 0;
            currentRotation = 0;
            spinIcon(0, 600);
        };

        const handleIconClick = () => {
            if (decayTimeout) clearTimeout(decayTimeout);

            spinClicks++;

            if (spinClicks >= 5) {
                spinClicks = 0;
                spinIcon(360, 500);
                const t1 = setTimeout(() => {
                    currentRotation = 0;
                    spinIcon(0, 500);
                    const t2 = setTimeout(() => fetchAndRender(), 500);
                    spinTimeouts.push(t2);
                }, 500);
                spinTimeouts.push(t1);
            } else {
                currentRotation += 60;
                spinIcon(currentRotation);
                decayTimeout = setTimeout(resetSpin, 2000);
            }
        };

        const renderError = (error: Error, attempt: number, nextRetryMs: number | null) => {
            widget.empty();
            widget.removeClass('anthropic-usage-loading');

            const errorDiv = widget.createEl('div', { cls: 'anthropic-usage-error' });
            const errorMsg = error.message || 'Unknown error';

            if (nextRetryMs !== null) {
                widget.addClass('anthropic-usage-retrying');
                const seconds = Math.round(nextRetryMs / 1000);
                errorDiv.textContent = `Failed to fetch. Retrying in ${seconds}s...`;
            } else {
                widget.removeClass('anthropic-usage-retrying');
                errorDiv.textContent = `Failed to fetch usage: ${errorMsg}`;
            }
        };

        const { retry: fetchWithRetry } = ComponentInstance.createRetryableOperation(
            instance,
            () => fetchUsage(args.organizationId, args.sessionKey),
            {
                maxRetries: 5,
                baseDelay: 5000,
                maxDelay: 60000,
                onError: renderError,
                onSuccess: () => widget.removeClass('anthropic-usage-retrying')
            }
        );

        const fetchAndRender = async () => {
            const data = await fetchWithRetry();
            if (data) {
                const refs = renderUsage(widget, data, showRelativeTime, compact, handleIconClick);
                instance.data.valueEl = refs.valueEl;
                instance.data.barFill = refs.barFill;
                instance.data.resetEl = refs.resetEl;
                instance.data.lastData = data;
            }
        };

        // Store config for renderRefresh
        instance.data.widget = widget;
        instance.data.showRelativeTime = showRelativeTime;
        instance.data.compact = compact;
        instance.data.handleIconClick = handleIconClick;
        instance.data.fetchWithRetry = fetchWithRetry;
        instance.data.hasError = false;

        // Initial loading state
        renderLoadingSkeleton(widget, compact);

        // Initial fetch
        await fetchAndRender();

        // Auto-refresh
        ComponentInstance.createUpdateLoop(instance, fetchAndRender, refreshInterval);
    },

    renderRefresh: async (args, el, ctx, app, instance) => {
        // Skip if there's been an error (let retry handle it)
        if (instance.data.hasError) return;

        const showRelativeTime = parseBoolean(args.showRelativeTime, false);

        try {
            const data = await fetchUsage(args.organizationId, args.sessionKey);

            // Update value
            if (instance.data.valueEl) {
                instance.data.valueEl.textContent = `${data.five_hour.utilization}%`;
            }

            // Update bar
            if (instance.data.barFill) {
                instance.data.barFill.style.width = `${data.five_hour.utilization}%`;
            }

            // Update reset time
            if (instance.data.resetEl && data.five_hour.resets_at) {
                const resetMoment = window.moment(data.five_hour.resets_at);
                if (resetMoment.isValid()) {
                    const resetTime = resetMoment.format('h:mm A');
                    let resetText = `resets ${resetTime}`;
                    if (showRelativeTime) {
                        const relativeTime = resetMoment.fromNow(true);
                        resetText += ` (${relativeTime})`;
                    }
                    instance.data.resetEl.textContent = resetText;
                }
            }

            instance.data.lastData = data;
        } catch (error) {
            console.error('Anthropic usage refresh error:', error);
            // Don't show error on refresh, just keep old data
        }
    },

    settings: {}
};
