import { Component, ComponentAction, ComponentInstance } from "components";
import { discordStatusStyles } from './styles';
import { parseBoolean } from "utils";

interface DiscordActivityAssets {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
}

interface DiscordActivityTimestamps {
    start?: number;
    end?: number;
}

interface DiscordActivity {
    type: number;
    name: string;
    details?: string;
    state?: string;
    assets?: DiscordActivityAssets;
    application_id?: string;
    timestamps?: DiscordActivityTimestamps;
}

interface DiscordUser {
    username: string;
    display_name?: string;
    avatar: string;
    id: string;
}

interface SpotifyData {
    song: string;
    artist: string;
    timestamps?: DiscordActivityTimestamps;
}

interface LanyardData {
    discord_user: DiscordUser;
    discord_status: string;
    activities: DiscordActivity[];
    spotify?: SpotifyData;
}

export const discordStatus: Component<['userId', 'showActivity', 'compact', 'hideProfile']> = {
    name: 'Discord Status',
    keyName: 'discord-status',
    icon: 'message-circle',
    args: {
        userId: {
            description: 'Your Discord user ID',
            required: true
        },
        showActivity: {
            description: 'Show your activity',
            default: 'true'
        },
        compact: {
            description: 'Compact mode',
            default: 'false'
        },
        hideProfile: {
            description: 'Hide your profile',
            default: 'false'
        }
    },
    isMountable: true,
    styles: discordStatusStyles,
    render: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
        const userId = args.userId;
        const showActivity = parseBoolean(args.showActivity, true);
        const compact = parseBoolean(args.compact, false);
        const hideProfile = parseBoolean(args.hideProfile, false);

        el.style.position = 'relative';

        const widget = el.createEl('div', { cls: 'discord-status-container' });
        widget.classList.toggle('hide-profile', hideProfile);

        const tooltip = el.createEl('div', { cls: 'discord-tooltip' });

        const connectionIndicator = el.createEl('div', { cls: 'connection-status' });
        widget.appendChild(connectionIndicator);

        // Loading state
        const loadingWrapper = widget.createEl('div', { cls: 'discord-status-wrapper' });
        const loadingAvatar = loadingWrapper.createEl('div', { cls: 'discord-avatar' });
        loadingAvatar.createEl('div', {
            cls: 'loading-placeholder',
            attr: { style: 'width:clamp(32px, 12vw, 48px); height:clamp(32px, 12vw, 48px); border-radius:50%;' }
        });
        loadingAvatar.createEl('div', {
            cls: 'loading-placeholder status-indicator',
            attr: { style: 'width:clamp(12px, 4vw, 16px); height:clamp(12px, 4vw, 16px); border-radius:50%;' }
        });
        const loadingInfo = loadingWrapper.createEl('div', { cls: 'discord-info' });
        loadingInfo.createEl('div', {
            cls: 'discord-username loading-placeholder',
            attr: { style: 'width:60%; height:clamp(14px, 4vw, 16px); border-radius:4px;' }
        });
        loadingInfo.createEl('div', {
            cls: 'discord-status-text loading-placeholder',
            attr: { style: 'width:40%; height:clamp(11px, 3.2vw, 13px); border-radius:4px; margin-top:4px;' }
        });

        el.appendChild(widget);
        el.appendChild(tooltip);

        let ws: WebSocket | null = null;
        let reconnectTimeout: NodeJS.Timeout;
        let heartbeatInterval: NodeJS.Timeout;
        let activityUpdateInterval: NodeJS.Timeout;
        let isDestroyed = false;
        let currentActivities: DiscordActivity[] = [];

        const getStatusColor = (status: string) => {
            switch (status) {
                case 'online': return '#23a55a';
                case 'idle': return '#f0b232';
                case 'dnd': return '#f23f43';
                case 'offline':
                default: return '#80848e';
            }
        };

        const getActivityType = (type: number) => {
            switch (type) {
                case 0: return 'Playing';
                case 1: return 'Streaming';
                case 2: return 'Listening to';
                case 3: return 'Watching';
                case 5: return 'Competing in';
                default: return 'Custom';
            }
        };

        const getArtworkUrl = (activity: DiscordActivity) => {
            if (!activity.assets) return null;

            const largeImage = activity.assets.large_image;
            if (!largeImage) return null;

            // Spotify artwork
            if (largeImage.startsWith('spotify:')) {
                return `https://i.scdn.co/image/${largeImage.replace('spotify:', '')}`;
            }

            // Discord CDN artwork (mp:external format)
            if (largeImage.startsWith('mp:external/')) {
                const encoded = largeImage.replace('mp:external/', '');
                return `https://media.discordapp.net/external/${encoded}`;
            }

            // Regular Discord application asset
            if (activity.application_id) {
                return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${largeImage}.png`;
            }

            return null;
        };

        const formatTime = (ms: number) => {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);

            if (hours > 0) {
                return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
            }
            return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
        };

        const updateActivityTimers = () => {
            if (isDestroyed || currentActivities.length === 0) return;

            const spotifyTimes = widget.querySelectorAll('.spotify-time');

            spotifyTimes.forEach((timeElement, index) => {
                if (currentActivities[index] && currentActivities[index].timestamps?.start) {
                    const elapsed = Date.now() - (currentActivities[index].timestamps?.start || 0);
                    (timeElement as HTMLElement).textContent = formatTime(elapsed);
                }
            });
        };

        const startActivityUpdates = () => {
            clearInterval(activityUpdateInterval);
            if (currentActivities.length > 0) {
                activityUpdateInterval = setInterval(updateActivityTimers, 1000);
                ComponentInstance.addInterval(instance!, activityUpdateInterval);
            }
        };

        const showError = (message: string) => {
            widget.empty();
            const errorDiv = widget.createEl('div', {
                cls: 'discord-error',
                attr: {
                    style: 'color: var(--text-error); padding: 16px; text-align: center; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 12px;'
                }
            });
            errorDiv.appendText('❌ ');
            errorDiv.appendText(message);
        };

        const createActivityCard = (activity: DiscordActivity, artworkUrl: string | null, title: string, subtitle: string) => {
            const card = document.createElement('div');
            card.classList.add('discord-spotify');

            // Artwork container
            const artworkDiv = card.createEl('div', { cls: 'activity-artwork' });
            if (artworkUrl) {
                const img = artworkDiv.createEl('img', {
                    attr: {
                        src: artworkUrl,
                        alt: '' // Will be set safely below
                    }
                });
                // Set alt text safely using textContent (not directly in template)
                img.alt = `${title} artwork`;

                img.onload = () => {
                    img.classList.add('loaded');
                    artworkDiv.classList.add('has-image');
                };

                img.onerror = () => {
                    img.remove();
                };

                if (img.complete && img.naturalWidth > 0) {
                    img.classList.add('loaded');
                    artworkDiv.classList.add('has-image');
                }
            }

            // Info container
            const infoDiv = card.createEl('div', { cls: 'spotify-info' });
            const trackDiv = infoDiv.createEl('div', { cls: 'spotify-track' });
            trackDiv.textContent = title;
            const artistDiv = infoDiv.createEl('div', { cls: 'spotify-artist' });
            artistDiv.textContent = subtitle;

            // Controls container
            const controlsDiv = card.createEl('div', { cls: 'spotify-controls' });
            if (activity.timestamps && activity.timestamps.start) {
                const timeDiv = controlsDiv.createEl('div', { cls: 'spotify-time' });
                timeDiv.textContent = formatTime(Date.now() - activity.timestamps.start);
            }

            return card;
        };

        const updateUI = (user: LanyardData) => {
            const statusColor = getStatusColor(user.discord_status);

            currentActivities = [];

            // Update the main card content
            const mainContent = widget.querySelector('.discord-status-wrapper') || widget;
            mainContent.empty();

            const wrapper = mainContent.createEl('div', { cls: 'discord-status-wrapper' });

            // Avatar container
            const avatarDiv = wrapper.createEl('div', { cls: 'discord-avatar' });
            const avatarImg = avatarDiv.createEl('img', {
                attr: {
                    src: `https://cdn.discordapp.com/avatars/${userId}/${user.discord_user.avatar}.png?size=128`,
                    alt: '' // Will be set safely below
                }
            });
            avatarImg.alt = `${user.discord_user.username}'s avatar`;

            const statusIndicator = avatarDiv.createEl('div', {
                cls: 'status-indicator',
                attr: { style: `background-color: ${statusColor};` }
            });

            // Info container
            const infoDiv = wrapper.createEl('div', { cls: 'discord-info' });
            const usernameDiv = infoDiv.createEl('div', { cls: 'discord-username' });
            usernameDiv.textContent = user.discord_user.display_name || user.discord_user.username;

            const statusTextDiv = infoDiv.createEl('div', { cls: 'discord-status-text' });
            statusTextDiv.textContent = user.discord_status.charAt(0).toUpperCase() + user.discord_status.slice(1);

            // Custom status (type 4 activity)
            const customStatusActivity = user.activities.find((a) => a.type === 4);
            if (customStatusActivity?.state) {
                const customStatusDiv = infoDiv.createEl('div', { cls: 'custom-status' });
                customStatusDiv.textContent = customStatusActivity.state;
            }

            // Remove any existing activity cards
            const existingActivities = widget.querySelectorAll('.discord-spotify');
            existingActivities.forEach(card => card.remove());

            // Add activity cards
            if (showActivity && user.activities && user.activities.length > 0) {
                user.activities.forEach((activity) => {
                    const activityType = getActivityType(activity.type);
                    const artworkUrl = getArtworkUrl(activity);

                    let title = activity.name;
                    let subtitle = `${activityType}${activity.details ? ` • ${activity.details}` : ''}${activity.state ? ` • ${activity.state}` : ''}`;

                    currentActivities.push(activity);

                    const card = createActivityCard(activity, artworkUrl, title, subtitle);
                    widget.appendChild(card);
                });
            }

            // Add separate Spotify card if showSpotify is enabled and we have spotify data
            if (user.spotify) {
                const spotifyActivity = user.activities?.find((a) => a.name === 'Spotify');
                const artworkUrl = spotifyActivity ? getArtworkUrl(spotifyActivity) : null;

                // Add spotify activity to our tracking array
                if (spotifyActivity) {
                    currentActivities.push(spotifyActivity);
                }

                const subtitle = `by ${user.spotify.artist}`;
                const activityForCard = spotifyActivity || {
                    type: 2, // Listening to
                    name: 'Spotify',
                    timestamps: user.spotify.timestamps
                };
                const card = createActivityCard(activityForCard, artworkUrl, user.spotify.song, subtitle);
                widget.appendChild(card);
            }

            // Start activity timer updates if needed
            startActivityUpdates();
        };

        const connectWebSocket = () => {
            if (isDestroyed) return;

            // Clear existing intervals
            // Intervals handled by instance system

            connectionIndicator.classList.add('disconnected');

            ws = new WebSocket(`wss://api.lanyard.rest/socket`);

            ws.onopen = () => {
                if (isDestroyed) return;
                console.log('Discord WebSocket connected');
            };

            ws.onmessage = (event) => {
                if (isDestroyed) return;

                try {
                    const data = JSON.parse(event.data);

                    // Handle Hello - start heartbeat
                    if (data.op === 1) {
                        console.log('Received Hello, starting heartbeat');
                        connectionIndicator.classList.remove('disconnected');

                        // Send initialize
                        ws?.send(JSON.stringify({
                            op: 2,
                            d: {
                                subscribe_to_id: userId
                            }
                        }));

                        // Start heartbeat
                        const heartbeatIntervalMs = data.d.heartbeat_interval;
                        heartbeatInterval = setInterval(() => {
                            if (ws && ws.readyState === WebSocket.OPEN && !isDestroyed) {
                                ws.send(JSON.stringify({ op: 3 }));
                            }
                        }, heartbeatIntervalMs);
                        ComponentInstance.addInterval(instance!, heartbeatInterval);
                    }

                    // Handle events
                    if (data.op === 0) {
                        if (data.t === 'INIT_STATE') {
                            console.log('Received INIT_STATE');
                            if (data.d && data.d.discord_user) {
                                updateUI(data.d);
                            } else {
                                // User not found - show helpful error
                                showError('User not found. Make sure the user ID is correct and the user is in the Lanyard Discord server (https://discord.gg/lanyard).');
                            }
                        } else if (data.t === 'PRESENCE_UPDATE') {
                            console.log('Received PRESENCE_UPDATE');
                            updateUI(data.d);
                        }
                    }
                } catch (error) {
                    console.error('Discord WebSocket message error:', error);
                }
            };

            ws.onclose = (event) => {
                if (isDestroyed) return;
                console.log('Discord WebSocket closed:', event.code, event.reason);
                connectionIndicator.classList.add('disconnected');
                clearInterval(heartbeatInterval);

                // Handle specific error codes
                if (event.code === 4004 || event.code === 4006) {
                    showError('Invalid user ID or request format. Make sure the user ID is correct.');
                } else if (event.code !== 1000) {
                    // Only reconnect if it wasn't a manual close and not a client error
                    reconnectTimeout = setTimeout(() => {
                        if (!isDestroyed) {
                            connectWebSocket();
                        }
                    }, 5000);
                    ComponentInstance.addInterval(instance!, reconnectTimeout);
                }
            };

            ws.onerror = (error) => {
                console.error('Discord WebSocket error:', error);
                connectionIndicator.classList.add('disconnected');
                clearInterval(heartbeatInterval);

                // Close the connection to trigger reconnect through onclose
                if (ws && ws.readyState !== WebSocket.CLOSED) {
                    ws.close();
                }
            };
        };

        connectWebSocket();

        ComponentInstance.addCleanup(instance, () => {
            isDestroyed = true;
            if (ws) {
                ws.close();
                ws = null;
            }
        });
    },
    does: [ComponentAction.EXTERNAL],
    settings: {
        showFlair: {
            name: 'Show Activity Flair',
            desc: 'Show colored left border on activity cards',
            type: 'toggle',
            default: true
        }
    }
};