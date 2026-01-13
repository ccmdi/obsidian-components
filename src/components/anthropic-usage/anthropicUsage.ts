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

export const anthropicUsage: Component<['organizationId', 'sessionKey', 'showRelativeTime', 'label']> = {
    name: 'Anthropic Usage',
    keyName: 'anthropic-usage',
    icon: 'brain',
    args: {
        organizationId: {
            description: 'Organization ID',
            required: true
        },
        sessionKey: {
            description: 'Session Key',
            required: true
        },
        showRelativeTime: {
            description: 'Show relative time until reset (e.g. "13 minutes")',
            default: 'false',
            required: false
        },
        label: {
            description: 'Label to display',
            default: '',
            required: false
        }
    },
    isMountable: true,
    does: [ComponentAction.EXTERNAL],
    styles: anthropicUsageStyles,
    render: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
        const widget = el.createEl('div', { cls: 'anthropic-usage-container' });

        let spinClicks = 0;
        let currentRotation = 0;
        let iconContainer: HTMLElement | null = null;
        let decayTimeout: NodeJS.Timeout | null = null;
        const spinTimeouts: NodeJS.Timeout[] = [];

        ComponentInstance.addCleanup(instance, () => {
            if (decayTimeout) clearTimeout(decayTimeout);
            spinTimeouts.forEach(t => clearTimeout(t));
        });

        const spinIcon = (degrees: number, duration = 300) => {
            if (!iconContainer) return;
            iconContainer.style.transition = `transform ${duration}ms ease-out`;
            iconContainer.style.transform = `rotate(${degrees}deg)`;
        };

        const resetSpin = () => {
            if (currentRotation === 0) return;
            spinClicks = 0;
            currentRotation = 0;
            spinIcon(0, 600); // Slow unwind
        };

        const handleIconClick = async () => {
            // Clear decay timeout on each click
            if (decayTimeout) clearTimeout(decayTimeout);

            spinClicks++;

            if (spinClicks >= 5) {
                // Full spin to 360, unwind to 0, then fetch
                spinClicks = 0;
                spinIcon(360, 500); // Complete one full rotation
                const t1 = setTimeout(() => {
                    currentRotation = 0;
                    spinIcon(0, 500); // Unwind back to start
                    const t2 = setTimeout(() => {
                        instance.data.triggerRefresh?.();
                    }, 500);
                    spinTimeouts.push(t2);
                }, 500);
                spinTimeouts.push(t1);
            } else {
                currentRotation += 60;
                spinIcon(currentRotation);
                // Auto-unwind after 2 seconds of no clicks
                decayTimeout = setTimeout(resetSpin, 2000);
            }
        };

        const renderSuccess = (usageData: AnthropicUsageData) => {
            widget.empty();
            widget.removeClass('anthropic-usage-retrying');

            // Icon
            iconContainer = widget.createEl('div', { cls: 'anthropic-usage-icon' });
            iconContainer.style.cursor = 'pointer';
            iconContainer.addEventListener('click', handleIconClick);
            const icon = createColoredIcon('claude');
            iconContainer.appendChild(icon);

            // Percentage value
            widget.createEl('div', {
                cls: 'anthropic-usage-value',
                text: `${usageData.five_hour.utilization}%`
            });

            // Bar and info wrapper
            const barWrapper = widget.createEl('div', { cls: 'anthropic-usage-bar-wrapper' });

            // Top info row
            const info = barWrapper.createEl('div', { cls: 'anthropic-usage-info' });
            info.createEl('div', {
                cls: 'anthropic-usage-label',
                text: 'Usage' + (args.label ? ` (${args.label})` : '')
            });

            // Only show reset time if resets_at is a valid date
            if (usageData.five_hour.resets_at && window.moment(usageData.five_hour.resets_at).isValid()) {
                const resetMoment = window.moment(usageData.five_hour.resets_at);
                const resetTime = resetMoment.format('h:mm A');
                let resetText = `resets ${resetTime}`;
                if (parseBoolean(args.showRelativeTime)) {
                    const relativeTime = resetMoment.fromNow(true);
                    resetText += ` (${relativeTime})`;
                }
                info.createEl('div', {
                    cls: 'anthropic-usage-reset',
                    text: resetText
                });
            }

            // Progress bar
            const bar = barWrapper.createEl('div', { cls: 'anthropic-usage-bar' });
            bar.createEl('div', {
                cls: 'anthropic-usage-bar-fill',
                attr: { style: `width: ${usageData.five_hour.utilization}%` }
            });
        };

        const renderError = (error: Error, attempt: number, nextRetryMs: number | null) => {
            widget.empty();

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

        const fetchUsage = async (): Promise<AnthropicUsageData> => {
            const response = await requestUrl({
                url: `https://claude.ai/api/organizations/${args.organizationId}/usage`,
                headers: {
                    'Cookie': `sessionKey=${args.sessionKey}`,
                    'User-Agent': navigator.userAgent
                }
            });
            return JSON.parse(response.text);
        };

        const { retry: fetchWithRetry } = ComponentInstance.createRetryableOperation(
            instance,
            fetchUsage,
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
                renderSuccess(data);
            }
        };

        // Initial loading state
        const loadingDiv = widget.createEl('div', { cls: 'anthropic-usage-loading' });
        loadingDiv.createEl('div', {
            cls: 'loading-placeholder',
            attr: { style: 'height: 18px; width: 40px;' }
        });
        const loadingWrapper = loadingDiv.createEl('div', { attr: { style: 'flex: 1; display: flex; flex-direction: column; gap: 4px;' } });
        loadingWrapper.createEl('div', {
            cls: 'loading-placeholder',
            attr: { style: 'height: 18px; width: 60%;' }
        });
        loadingWrapper.createEl('div', {
            cls: 'loading-placeholder',
            attr: { style: 'height: 6px; width: 100%;' }
        });

        // Initial fetch
        await fetchAndRender();

        // Auto-refresh every 4 minutes
        ComponentInstance.createUpdateLoop(instance, instance.data.triggerRefresh, 240000);
    },
    renderRefresh: async (args, el, ctx, app, instance) => {
        const fetchUsage = async (): Promise<AnthropicUsageData> => {
            const response = await requestUrl({
                url: `https://claude.ai/api/organizations/${args.organizationId}/usage`,
                headers: {
                    'Cookie': `sessionKey=${args.sessionKey}`,
                    'User-Agent': navigator.userAgent
                }
            });
            return JSON.parse(response.text);
        };

        try {
            const data = await fetchUsage();

            const valueEl = el.querySelector('.anthropic-usage-value') as HTMLElement;
            if (valueEl) valueEl.textContent = `${data.five_hour.utilization}%`;

            const barFill = el.querySelector('.anthropic-usage-bar-fill') as HTMLElement;
            if (barFill) {
                barFill.style.transition = 'width 300ms ease-out';
                barFill.style.width = `${data.five_hour.utilization}%`;
            }

            const resetEl = el.querySelector('.anthropic-usage-reset') as HTMLElement;
            if (resetEl && data.five_hour.resets_at && window.moment(data.five_hour.resets_at).isValid()) {
                const resetMoment = window.moment(data.five_hour.resets_at);
                const resetTime = resetMoment.format('h:mm A');
                let resetText = `resets ${resetTime}`;
                if (parseBoolean(args.showRelativeTime)) {
                    resetText += ` (${resetMoment.fromNow(true)})`;
                }
                resetEl.textContent = resetText;
            }
        } catch {
            // On error, fall back to full re-render
            instance.data.triggerRefresh?.();
        }
    },
    settings: {}
};