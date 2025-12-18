import { Component, ComponentAction, ComponentInstance } from "components";
import { requestUrl } from "obsidian";
import { anthropicUsageStyles } from "./styles";
import { getAccentColorHex, parseBoolean } from "utils";

interface AnthropicUsageData {
    five_hour: {
        utilization: number;
        resets_at: string;
    };
}

export const anthropicUsage: Component<['organizationId', 'sessionKey', 'showRelativeTime']> = {
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
        }
    },
    isMountable: true,
    does: [ComponentAction.EXTERNAL],
    styles: anthropicUsageStyles,
    render: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
        const widget = el.createEl('div', { cls: 'anthropic-usage-container' });

        const accentColorHex = getAccentColorHex(el);
        const svgUrl = `https://cdn.simpleicons.org/claude/${accentColorHex}`;

        const fetchAndRender = async () => {
            try {
                const response = await requestUrl({
                    url: `https://claude.ai/api/organizations/${args.organizationId}/usage`,
                    headers: {
                        'Cookie': `sessionKey=${args.sessionKey}`
                    }
                });
                const usageData: AnthropicUsageData = JSON.parse(response.text);

                // Clear previous content
                widget.empty();

                // Icon
                const iconContainer = widget.createEl('div', { cls: 'anthropic-usage-icon' });
                const icon = iconContainer.createEl('img', {
                    attr: {
                        src: svgUrl,
                        alt: 'Claude',
                        style: 'width: 100%; height: 100%;'
                    }
                });

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
                    text: 'Usage'
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

            } catch (error) {
                widget.empty();
                const errorDiv = widget.createEl('div', { cls: 'anthropic-usage-error' });
                errorDiv.textContent = `Failed to fetch usage: ${error.message || 'Unknown error'}`;
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
        ComponentInstance.createUpdateLoop(instance, fetchAndRender, 240000);
    },
    settings: {}
};