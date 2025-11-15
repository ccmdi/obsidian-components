import { Component, ComponentAction, ComponentInstance } from "components";
import { requestUrl } from "obsidian";
import { ankiStatusStyles } from "./styles";
import { parseBoolean } from "utils";

export const ankiStatus: Component<['showStats', 'showDeck', 'compact']> = {
    name: 'Anki Status',
    keyName: 'anki-status',
    args: {
        showStats: {
            description: 'Show review counts and due cards',
            default: 'true'
        },
        showDeck: {
            description: 'Show current/selected deck information',
            default: 'false'
        },
        compact: {
            description: 'Compact mode',
            default: 'false'
        }
    },
    isMountable: true,
    does: [ComponentAction.EXTERNAL],
    styles: ankiStatusStyles,
    render: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
        const showStats = parseBoolean(args.showStats, true);
        const showDeck = parseBoolean(args.showDeck, false);
        const compact = parseBoolean(args.compact, false);

        el.style.position = 'relative';

        const widget = el.createEl('div', { cls: `anki-status-container ${compact ? 'compact' : ''}` });

        const connectionIndicator = el.createEl('div', { cls: 'connection-status' });
        widget.append(connectionIndicator);

        // Initial loading skeleton
        if (showStats) {
            const statsContainer = widget.createEl('div', { cls: `anki-stats ${compact ? 'compact' : ''}` });

            const cards = ['new', 'learning', 'review', 'due'];
            const labels = ['New', 'Learning', 'Reviewed', 'Due'];

            for (let i = 0; i < cards.length; i++) {
                const statCard = statsContainer.createEl('div', { cls: `stat-card ${cards[i]} ${compact ? 'compact' : ''}` });
                const statIcon = statCard.createEl('div', { cls: `stat-icon ${compact ? 'compact' : ''}` });
                statIcon.createEl('div', { cls: 'loading-placeholder anki-loading-icon' });
                statCard.createEl('div', { cls: `stat-value ${compact ? 'compact' : ''} loading-placeholder anki-loading-value` });
                statCard.createEl('div', { cls: `stat-label ${compact ? 'compact' : ''}`, text: labels[i] });
            }
        }

        el.appendChild(widget);

        let pollInterval: NodeJS.Timeout;
        let isDestroyed = false;

        const ankiConnectRequest = async (action: string, params: Record<string, unknown> = {}) => {
            try {
                const response = await requestUrl({
                    url: 'http://localhost:8765',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action,
                        version: 6,
                        params
                    })
                });

                const data = response.json;
                if (data.error) {
                    throw new Error(data.error);
                }

                return data.result;
            } catch (error) {
                throw error;
            }
        };

        const showError = (message: string, help?: string) => {
            widget.empty();
            const errorContainer = widget.createEl('div', { cls: 'anki-error' });
            errorContainer.createEl('div', { cls: 'error-icon', text: '!' });
            errorContainer.createEl('div', { cls: 'error-message', text: message });
            if (help) {
                errorContainer.createEl('div', { cls: 'error-help', text: help });
            }
            errorContainer.createEl('button', { cls: 'retry-button', text: 'Retry', attr: { id: 'anki-retry-btn' } });

            // Add event listener to retry button with proper cleanup
            const retryBtn = widget.querySelector('#anki-retry-btn') as HTMLButtonElement;
            if (retryBtn) {
                const retryHandler = () => {
                    updateUI();
                };
                retryBtn.addEventListener('click', retryHandler);

                // Register cleanup for the event listener
                ComponentInstance.addCleanup(instance, () => {
                    retryBtn.removeEventListener('click', retryHandler);
                });
            }
        };

        const updateUI = async () => {
            if (isDestroyed) return;

            try {
                const [deckNames, deckStats, dueCards, newCards, learningCards] = await Promise.all([
                    ankiConnectRequest('deckNames'),
                    ankiConnectRequest('getNumCardsReviewedToday'),
                    ankiConnectRequest('findCards', { query: 'is:due' }),
                    ankiConnectRequest('findCards', { query: 'is:new' }),
                    ankiConnectRequest('findCards', { query: 'is:learn' })
                ]);

                if (!deckNames || deckNames.length === 0) {
                    throw new Error('No decks found');
                }

                const reviewedToday = deckStats || 0;

                connectionIndicator.className = 'connection-status';

                // Helper function to create SVG element
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

                widget.empty();
                widget.appendChild(connectionIndicator);

                // Build stats section
                if (showStats) {
                    const statsContainer = widget.createEl('div', { cls: `anki-stats ${compact ? 'compact' : ''}` });

                    const cardData = [
                        { type: 'new', value: newCards.length, label: 'New', svg: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' },
                        { type: 'learning', value: learningCards.length, label: 'Learning', svg: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
                        { type: 'review', value: reviewedToday, label: 'Reviewed', svg: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z' },
                        { type: 'due', value: dueCards.length, label: 'Due', svg: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z' }
                    ];

                    for (const card of cardData) {
                        const statCard = statsContainer.createEl('div', { cls: `stat-card ${card.type} ${compact ? 'compact' : ''}` });
                        const statIcon = statCard.createEl('div', { cls: `stat-icon ${compact ? 'compact' : ''}` });
                        statIcon.appendChild(createSvg(card.svg));
                        statCard.createEl('div', { cls: `stat-value ${compact ? 'compact' : ''}`, text: String(card.value) });
                        statCard.createEl('div', { cls: `stat-label ${compact ? 'compact' : ''}`, text: card.label });
                    }
                }

                // Build deck section
                if (showDeck && deckNames.length > 0) {
                    try {
                        // Use deckStats API which is much faster than individual queries
                        const deckStatsData = await ankiConnectRequest('getDeckStats', { decks: deckNames.slice(0, 5) });

                        for (const deck of deckNames.slice(0, 5)) {
                            const deckContainer = widget.createEl('div', { cls: 'anki-deck' });
                            deckContainer.createEl('div', { cls: 'deck-name', text: deck });
                            const stats = deckStatsData[deck];
                            if (stats) {
                                deckContainer.createEl('div', { cls: 'deck-details', text: `${stats.total_cards || 0} cards • ${stats.due_count || 0} due` });
                            }
                        }
                    } catch (error) {
                        // Fallback - just show deck names without detailed stats
                        for (const deck of deckNames.slice(0, 5)) {
                            const deckContainer = widget.createEl('div', { cls: 'anki-deck' });
                            deckContainer.createEl('div', { cls: 'deck-name', text: deck });
                        }
                    }
                }

            } catch (error) {
                console.error('Anki update error:', error);
                connectionIndicator.className = 'connection-status disconnected';

                if (error.message.includes('fetch')) {
                    showError(
                        'Cannot connect to Anki',
                        'Make sure Anki is running and the AnkiConnect add-on is installed and enabled.'
                    );
                } else {
                    showError(
                        'Anki error occurred',
                        error.message
                    );
                }
            }
        };

        const startPolling = () => {
            clearInterval(pollInterval);
            updateUI();
            pollInterval = setInterval(updateUI, 30000);
            ComponentInstance.addInterval(instance, pollInterval);
        };

        startPolling();

        ComponentInstance.addCleanup(instance, () => {
            isDestroyed = true;
        });
    },
    settings: {}
};