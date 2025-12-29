import { Component, ComponentAction, ComponentInstance } from "components";
import { requestUrl } from "obsidian";
import { ankiStatusStyles } from "./styles";
import { parseBoolean } from "utils";

// SVG paths for stat icons
const STAT_ICONS = {
    new: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
    learning: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    review: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    due: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z'
} as const;

const STAT_LABELS = ['New', 'Learning', 'Reviewed', 'Due'] as const;
const STAT_TYPES = ['new', 'learning', 'review', 'due'] as const;

interface AnkiStats {
    newCards: number;
    learningCards: number;
    reviewedToday: number;
    dueCards: number;
}

interface DeckStats {
    [deckName: string]: {
        total_cards?: number;
        due_count?: number;
    };
}

const ankiConnectRequest = async (action: string, params: Record<string, unknown> = {}) => {
    const response = await requestUrl({
        url: 'http://localhost:8765',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, version: 6, params })
    });

    const data = response.json;
    if (data.error) throw new Error(data.error);
    return data.result;
};

const createSvg = (pathD: string): SVGElement => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '12');
    svg.setAttribute('height', '12');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'currentColor');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    svg.appendChild(path);
    return svg;
};

const fetchAnkiStats = async (deckFilter?: string): Promise<AnkiStats> => {
    const deckQuery = deckFilter ? `deck:"${deckFilter}" ` : '';

    const [deckStats, dueCards, newCards, learningCards] = await Promise.all([
        ankiConnectRequest('getNumCardsReviewedToday'),
        ankiConnectRequest('findCards', { query: `${deckQuery}is:due` }),
        ankiConnectRequest('findCards', { query: `${deckQuery}is:new` }),
        ankiConnectRequest('findCards', { query: `${deckQuery}is:learn` })
    ]);

    return {
        newCards: newCards?.length || 0,
        learningCards: learningCards?.length || 0,
        reviewedToday: deckStats || 0,
        dueCards: dueCards?.length || 0
    };
};

const renderStatCard = (
    container: HTMLElement,
    type: string,
    value: number | null,
    label: string,
    compact: boolean,
    isLoading: boolean
): HTMLElement => {
    const statCard = container.createEl('div', { cls: `stat-card ${type} ${compact ? 'compact' : ''}` });
    const statIcon = statCard.createEl('div', { cls: `stat-icon ${compact ? 'compact' : ''}` });

    if (isLoading) {
        statIcon.createEl('div', { cls: 'loading-placeholder anki-loading-icon' });
        statCard.createEl('div', { cls: `stat-value ${compact ? 'compact' : ''} loading-placeholder anki-loading-value` });
    } else {
        statIcon.appendChild(createSvg(STAT_ICONS[type as keyof typeof STAT_ICONS]));
        statCard.createEl('div', { cls: `stat-value ${compact ? 'compact' : ''}`, text: String(value) });
    }

    statCard.createEl('div', { cls: `stat-label ${compact ? 'compact' : ''}`, text: label });
    return statCard;
};

const renderStats = (
    statsContainer: HTMLElement,
    stats: AnkiStats | null,
    compact: boolean
): void => {
    statsContainer.empty();

    const values = stats
        ? [stats.newCards, stats.learningCards, stats.reviewedToday, stats.dueCards]
        : [null, null, null, null];

    for (let i = 0; i < STAT_TYPES.length; i++) {
        renderStatCard(statsContainer, STAT_TYPES[i], values[i], STAT_LABELS[i], compact, stats === null);
    }
};

const renderDecks = async (
    widget: HTMLElement,
    deckFilter?: string,
    maxDecks: number = 5
): Promise<void> => {
    const deckNames: string[] = await ankiConnectRequest('deckNames');
    if (!deckNames || deckNames.length === 0) return;

    // Filter decks if specified
    let filteredDecks = deckFilter
        ? deckNames.filter(d => d.toLowerCase().includes(deckFilter.toLowerCase()))
        : deckNames;
    filteredDecks = filteredDecks.slice(0, maxDecks);

    if (filteredDecks.length === 0) return;

    try {
        const deckStatsData: DeckStats = await ankiConnectRequest('getDeckStats', { decks: filteredDecks });

        for (const deck of filteredDecks) {
            const deckContainer = widget.createEl('div', { cls: 'anki-deck' });
            deckContainer.createEl('div', { cls: 'deck-name', text: deck });
            const stats = deckStatsData[deck];
            if (stats) {
                deckContainer.createEl('div', {
                    cls: 'deck-details',
                    text: `${stats.total_cards || 0} cards • ${stats.due_count || 0} due`
                });
            }
        }
    } catch {
        // Fallback - just show deck names without detailed stats
        for (const deck of filteredDecks) {
            const deckContainer = widget.createEl('div', { cls: 'anki-deck' });
            deckContainer.createEl('div', { cls: 'deck-name', text: deck });
        }
    }
};

export const ankiStatus: Component<['showStats', 'showDeck', 'compact', 'deck', 'refreshInterval']> = {
    name: 'Anki Status',
    keyName: 'anki-status',
    icon: 'brain',
    args: {
        showStats: {
            description: 'Show review counts and due cards',
            default: 'true'
        },
        showDeck: {
            description: 'Show deck information',
            default: 'false'
        },
        compact: {
            description: 'Compact mode with smaller cards',
            default: 'false'
        },
        deck: {
            description: 'Filter stats to a specific deck name (partial match supported)',
            required: false
        },
        refreshInterval: {
            description: 'Refresh interval in seconds',
            default: '30'
        }
    },
    isMountable: true,
    does: [ComponentAction.EXTERNAL],
    styles: ankiStatusStyles,

    render: async (args, el, ctx, app, instance: ComponentInstance) => {
        const showStats = parseBoolean(args.showStats, true);
        const showDeck = parseBoolean(args.showDeck, false);
        const compact = parseBoolean(args.compact, false);
        const deckFilter = args.deck;
        const refreshInterval = Math.max(5, parseInt(args.refreshInterval) || 30) * 1000;

        el.style.position = 'relative';

        const widget = el.createEl('div', { cls: `anki-status-container ${compact ? 'compact' : ''}` });
        const connectionIndicator = widget.createEl('div', { cls: 'connection-status' });

        // Create stats container with loading skeleton
        let statsContainer: HTMLElement | null = null;
        if (showStats) {
            statsContainer = widget.createEl('div', { cls: `anki-stats ${compact ? 'compact' : ''}` });
            renderStats(statsContainer, null, compact); // Initial loading state
        }

        // Store refs for renderRefresh
        instance.data.widget = widget;
        instance.data.statsContainer = statsContainer;
        instance.data.connectionIndicator = connectionIndicator;
        instance.data.showStats = showStats;
        instance.data.showDeck = showDeck;
        instance.data.compact = compact;
        instance.data.deckFilter = deckFilter;
        instance.data.isDestroyed = false;
        instance.data.hasError = false;

        const showError = (message: string, help?: string) => {
            instance.data.hasError = true;
            widget.empty();
            widget.appendChild(connectionIndicator);
            connectionIndicator.className = 'connection-status disconnected';

            const errorContainer = widget.createEl('div', { cls: 'anki-error' });
            errorContainer.createEl('div', { cls: 'error-icon', text: '!' });
            errorContainer.createEl('div', { cls: 'error-message', text: message });
            if (help) {
                errorContainer.createEl('div', { cls: 'error-help', text: help });
            }

            const retryBtn = errorContainer.createEl('button', { cls: 'retry-button', text: 'Retry' });
            retryBtn.addEventListener('click', () => updateUI());
        };

        const updateUI = async () => {
            if (instance.data.isDestroyed) return;

            try {
                const stats = await fetchAnkiStats(deckFilter);

                // If we had an error before, rebuild the UI
                if (instance.data.hasError) {
                    instance.data.hasError = false;
                    widget.empty();
                    widget.appendChild(connectionIndicator);

                    if (showStats) {
                        instance.data.statsContainer = widget.createEl('div', { cls: `anki-stats ${compact ? 'compact' : ''}` });
                    }
                }

                connectionIndicator.className = 'connection-status';

                if (showStats && instance.data.statsContainer) {
                    renderStats(instance.data.statsContainer, stats, compact);
                }

                // Handle deck section
                if (showDeck) {
                    // Remove old deck elements
                    widget.querySelectorAll('.anki-deck').forEach(el => el.remove());
                    await renderDecks(widget, deckFilter);
                }

            } catch (error: unknown) {
                console.error('Anki update error:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                if (errorMessage.includes('fetch') || errorMessage.includes('Failed')) {
                    showError(
                        'Cannot connect to Anki',
                        'Make sure Anki is running and AnkiConnect is installed.'
                    );
                } else {
                    showError('Anki error occurred', errorMessage);
                }
            }
        };

        // Initial fetch
        await updateUI();

        // Set up polling
        const pollInterval = setInterval(updateUI, refreshInterval);
        ComponentInstance.addInterval(instance, pollInterval);

        ComponentInstance.addCleanup(instance, () => {
            instance.data.isDestroyed = true;
        });
    },

    renderRefresh: async (args, el, ctx, app, instance) => {
        if (instance.data.isDestroyed || instance.data.hasError) return;

        const deckFilter = args.deck;
        const showStats = parseBoolean(args.showStats, true);
        const showDeck = parseBoolean(args.showDeck, false);
        const compact = parseBoolean(args.compact, false);

        try {
            const stats = await fetchAnkiStats(deckFilter);

            instance.data.connectionIndicator.className = 'connection-status';

            if (showStats && instance.data.statsContainer) {
                renderStats(instance.data.statsContainer, stats, compact);
            }

            if (showDeck) {
                const widget = instance.data.widget;
                widget.querySelectorAll('.anki-deck').forEach((el: Element) => el.remove());
                await renderDecks(widget, deckFilter);
            }
        } catch (error) {
            console.error('Anki refresh error:', error);
            instance.data.connectionIndicator.className = 'connection-status disconnected';
        }
    },

    settings: {}
};