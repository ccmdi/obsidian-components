import { Component, ComponentAction, ComponentInstance } from "../../components";
import { getAccentColorHex } from '../../utils';    
import { requestUrl } from "obsidian";
import { ankiStatusStyles } from "./styles";

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
    render: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
        const showStats = args.showStats === 'true';
        const showDeck = args.showDeck === 'true';
        const compact = args.compact === 'true';

        el.style.position = 'relative';

        const style = document.createElement('style');
        style.textContent = ankiStatusStyles;
        el.appendChild(style);

        const widget = document.createElement('div');
        widget.className = `anki-status-container ${compact ? 'compact' : ''}`;

        const connectionIndicator = document.createElement('div');
        connectionIndicator.className = 'connection-status';
        widget.appendChild(connectionIndicator);

        if (showStats) {
            widget.innerHTML += `
                <div class="anki-stats ${compact ? 'compact' : ''}">
                    <div class="stat-card new ${compact ? 'compact' : ''}">
                        <div class="stat-icon ${compact ? 'compact' : ''}">
                            <div class="loading-placeholder" style="width:24px; height:24px; border-radius:50%;"></div>
                        </div>
                        <div class="stat-value ${compact ? 'compact' : ''} loading-placeholder" style="width:30px; height:20px; margin:0 auto 4px;"></div>
                        <div class="stat-label ${compact ? 'compact' : ''}">New</div>
                    </div>
                    <div class="stat-card learning ${compact ? 'compact' : ''}">
                        <div class="stat-icon ${compact ? 'compact' : ''}">
                            <div class="loading-placeholder" style="width:24px; height:24px; border-radius:50%;"></div>
                        </div>
                        <div class="stat-value ${compact ? 'compact' : ''} loading-placeholder" style="width:30px; height:20px; margin:0 auto 4px;"></div>
                        <div class="stat-label ${compact ? 'compact' : ''}">Learning</div>
                    </div>
                    <div class="stat-card review ${compact ? 'compact' : ''}">
                        <div class="stat-icon ${compact ? 'compact' : ''}">
                            <div class="loading-placeholder" style="width:24px; height:24px; border-radius:50%;"></div>
                        </div>
                        <div class="stat-value ${compact ? 'compact' : ''} loading-placeholder" style="width:30px; height:20px; margin:0 auto 4px;"></div>
                        <div class="stat-label ${compact ? 'compact' : ''}">Reviewed</div>
                    </div>
                    <div class="stat-card due ${compact ? 'compact' : ''}">
                        <div class="stat-icon ${compact ? 'compact' : ''}">
                            <div class="loading-placeholder" style="width:24px; height:24px; border-radius:50%;"></div>
                        </div>
                        <div class="stat-value ${compact ? 'compact' : ''} loading-placeholder" style="width:30px; height:20px; margin:0 auto 4px;"></div>
                        <div class="stat-label ${compact ? 'compact' : ''}">Due</div>
                    </div>
                </div>
            `;
        }

        el.appendChild(widget);

        let pollInterval: NodeJS.Timeout;
        let isDestroyed = false;

        const ankiConnectRequest = async (action: string, params: Record<string, any> = {}) => {
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
            widget.innerHTML = `
                <div class="anki-error">
                    <div class="error-icon">!</div>
                    <div class="error-message">${message}</div>
                    ${help ? `<div class="error-help">${help}</div>` : ''}
                    <button class="retry-button" id="anki-retry-btn">Retry</button>
                </div>
            `;

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


                let statsHtml = '';
                if (showStats) {
                    statsHtml = `
                        <div class="anki-stats ${compact ? 'compact' : ''}">
                            <div class="stat-card new ${compact ? 'compact' : ''}">
                                <div class="stat-icon ${compact ? 'compact' : ''}">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                    </svg>
                                </div>
                                <div class="stat-value ${compact ? 'compact' : ''}">${newCards.length}</div>
                                <div class="stat-label ${compact ? 'compact' : ''}">New</div>
                            </div>
                            <div class="stat-card learning ${compact ? 'compact' : ''}">
                                <div class="stat-icon ${compact ? 'compact' : ''}">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                    </svg>
                                </div>
                                <div class="stat-value ${compact ? 'compact' : ''}">${learningCards.length}</div>
                                <div class="stat-label ${compact ? 'compact' : ''}">Learning</div>
                            </div>
                            <div class="stat-card review ${compact ? 'compact' : ''}">
                                <div class="stat-icon ${compact ? 'compact' : ''}">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                    </svg>
                                </div>
                                <div class="stat-value ${compact ? 'compact' : ''}">${reviewedToday}</div>
                                <div class="stat-label ${compact ? 'compact' : ''}">Reviewed</div>
                            </div>
                            <div class="stat-card due ${compact ? 'compact' : ''}">
                                <div class="stat-icon ${compact ? 'compact' : ''}">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                                    </svg>
                                </div>
                                <div class="stat-value ${compact ? 'compact' : ''}">${dueCards.length}</div>
                                <div class="stat-label ${compact ? 'compact' : ''}">Due</div>
                            </div>
                        </div>
                    `;
                }

                let deckHtml = '';
                if (showDeck && deckNames.length > 0) {
                    try {
                        // Use deckStats API which is much faster than individual queries
                        const deckStatsData = await ankiConnectRequest('getDeckStats', { decks: deckNames.slice(0, 5) });

                        for (const deck of deckNames.slice(0, 5)) {
                            const stats = deckStatsData[deck];
                            if (stats) {
                                deckHtml += `
                                    <div class="anki-deck">
                                        <div class="deck-name">${deck}</div>
                                        <div class="deck-details">${stats.total_cards || 0} cards • ${stats.due_count || 0} due</div>
                                    </div>
                                `;
                            } else {
                                // Fallback - just show deck name without stats
                                deckHtml += `
                                    <div class="anki-deck">
                                        <div class="deck-name">${deck}</div>
                                    </div>
                                `;
                            }
                        }
                    } catch (error) {
                        // Fallback - just show deck names without detailed stats
                        for (const deck of deckNames.slice(0, 5)) {
                            deckHtml += `
                                <div class="anki-deck">
                                    <div class="deck-name">${deck}</div>
                                </div>
                            `;
                        }
                    }
                }
                widget.innerHTML = '';
                widget.appendChild(connectionIndicator);

                // Add content
                if (statsHtml) {
                    widget.insertAdjacentHTML('beforeend', statsHtml);
                }
                if (deckHtml) {
                    widget.insertAdjacentHTML('beforeend', deckHtml);
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