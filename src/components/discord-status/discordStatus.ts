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

interface LanyardData {
    discord_user: DiscordUser;
    discord_status: string;
    activities: DiscordActivity[];
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

        const getArtworkUrl = async (activity: DiscordActivity) => {
            const largeImage = activity.assets?.large_image;
            if (!largeImage) {
                if (!activity.application_id) return null;
                try {
                    const response = await fetch(`https://discord.com/api/v10/applications/${activity.application_id}/rpc`);
                    const data = await response.json();
                    if (!data.icon) return null;
                    return `https://cdn.discordapp.com/app-icons/${activity.application_id}/${data.icon}.png`;
                } catch {
                    return null;
                }
            }

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

            widget.querySelectorAll('.discord-activity-card').forEach(card => {
                const key = (card as HTMLElement).dataset.key;
                const activity = currentActivities.find(a => getActivityKey(a) === key);
                const timeEl = card.querySelector('.activity-timer');
                if (activity?.timestamps?.start && timeEl) {
                    timeEl.textContent = formatTime(Date.now() - activity.timestamps.start);
                }
            });
        };

        const startActivityUpdates = () => {
            clearInterval(activityUpdateInterval);
            const hasTimedActivities = currentActivities.some(a => a.timestamps?.start);
            if (hasTimedActivities) {
                updateActivityTimers();
                activityUpdateInterval = setInterval(updateActivityTimers, 1000);
                ComponentInstance.addInterval(instance, activityUpdateInterval);
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

        const getActivityKey = (activity: DiscordActivity) => `${activity.type}-${activity.name}`;

        const updateActivityCardElement = (card: HTMLElement, activity: DiscordActivity, artworkUrl: string | null, title: string, subtitle: string) => {
            const trackDiv = card.querySelector('.activity-title');
            if (trackDiv && trackDiv.textContent !== title) trackDiv.textContent = title;

            const artistDiv = card.querySelector('.activity-subtitle');
            if (artistDiv && artistDiv.textContent !== subtitle) artistDiv.textContent = subtitle;

            const artworkDiv = card.querySelector('.activity-artwork');
            let img = artworkDiv?.querySelector('img');

            if (artworkUrl) {
                if (!img) {
                    img = document.createElement('img');
                    artworkDiv?.appendChild(img);
                }
                if (img.getAttribute('src') !== artworkUrl) {
                    img.src = artworkUrl;
                    img.alt = `${title} artwork`;
                    img.classList.remove('loaded');
                    artworkDiv?.classList.remove('has-image');
                    
                    img.onload = () => {
                        img!.classList.add('loaded');
                        artworkDiv?.classList.add('has-image');
                    };
                }
            } else if (img) {
                img.remove();
                artworkDiv?.classList.remove('has-image');
            }

            const existingTime = card.querySelector('.activity-timer');
            if (activity.timestamps?.start) {
                if (!existingTime) {
                    const controls = card.querySelector('.activity-controls');
                    const timeDiv = controls?.createEl('div', { cls: 'activity-timer' });
                    if(timeDiv) timeDiv.textContent = formatTime(Date.now() - activity.timestamps.start);
                }
            } else if (existingTime) {
                existingTime.remove();
            }
        };

        const createActivityCard = (activity: DiscordActivity, artworkUrl: string | null, title: string, subtitle: string) => {
            const card = document.createElement('div');
            card.classList.add('discord-activity-card');
            card.dataset.key = getActivityKey(activity);

            const artworkDiv = card.createEl('div', { cls: 'activity-artwork' });
            
            const infoDiv = card.createEl('div', { cls: 'activity-info' });
            infoDiv.createEl('div', { cls: 'activity-title' }); 
            infoDiv.createEl('div', { cls: 'activity-subtitle' }); 

            card.createEl('div', { cls: 'activity-controls' });

            updateActivityCardElement(card, activity, artworkUrl, title, subtitle);

            return card;
        };

        let initialized = false;

        const updateUI = async (user: LanyardData) => {
            const statusColor = getStatusColor(user.discord_status);
            currentActivities = user.activities;

            let wrapper = widget.querySelector('.discord-status-wrapper');

            if (!initialized) {
                widget.empty();
                wrapper = widget.createEl('div', { cls: 'discord-status-wrapper' });

                const avatarDiv = wrapper.createEl('div', { cls: 'discord-avatar' });
                avatarDiv.createEl('img');
                avatarDiv.createEl('div', { cls: 'status-indicator' });

                const infoDiv = wrapper.createEl('div', { cls: 'discord-info' });
                infoDiv.createEl('div', { cls: 'discord-username' });
                infoDiv.createEl('div', { cls: 'discord-status-text' });

                widget.appendChild(connectionIndicator);
                initialized = true;
            }

            const avatarImg = wrapper!.querySelector('.discord-avatar img') as HTMLImageElement;
            const newAvatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${user.discord_user.avatar}.png?size=128`;
            if (avatarImg && avatarImg.src !== newAvatarUrl) {
                avatarImg.src = newAvatarUrl;
                avatarImg.alt = `${user.discord_user.username}'s avatar`;
            }

            const statusInd = wrapper!.querySelector('.status-indicator') as HTMLElement;
            if (statusInd) statusInd.style.backgroundColor = statusColor;

            const nameDiv = wrapper!.querySelector('.discord-username');
            const displayName = user.discord_user.display_name || user.discord_user.username;
            if (nameDiv && nameDiv.textContent !== displayName) nameDiv.textContent = displayName;

            const statusTextDiv = wrapper!.querySelector('.discord-status-text');
            const statusText = user.discord_status.charAt(0).toUpperCase() + user.discord_status.slice(1);
            if (statusTextDiv && statusTextDiv.textContent !== statusText) statusTextDiv.textContent = statusText;

            const infoContainer = wrapper!.querySelector('.discord-info');
            const customStatusActivity = user.activities.find((a) => a.type === 4);
            let customStatusDiv = infoContainer?.querySelector('.custom-status');

            if (customStatusActivity?.state) {
                if (!customStatusDiv) customStatusDiv = infoContainer?.createEl('div', { cls: 'custom-status' });
                if (customStatusDiv && customStatusDiv.textContent !== customStatusActivity.state) customStatusDiv.textContent = customStatusActivity.state;
            } else if (customStatusDiv) {
                customStatusDiv.remove();
            }

            const processedKeys = new Set<string>();
            let lastNode = wrapper as HTMLElement;

            if (showActivity && user.activities && user.activities.length > 0) {
                const cardActivities = user.activities.filter(a => a.type !== 4);

                for (const activity of cardActivities) {
                    const key = getActivityKey(activity);
                    processedKeys.add(key);

                    const artworkUrl = await getArtworkUrl(activity);
                    const activityType = getActivityType(activity.type);
                    const title = activity.name;
                    const subtitle = `${activityType}${activity.details ? ` • ${activity.details}` : ''}${activity.state ? ` • ${activity.state}` : ''}`;

                    let card = widget.querySelector(`.discord-activity-card[data-key="${key}"]`) as HTMLElement;

                    if (!card) {
                        card = createActivityCard(activity, artworkUrl, title, subtitle);
                    } else {
                        updateActivityCardElement(card, activity, artworkUrl, title, subtitle);
                    }

                    if (card !== lastNode.nextSibling) {
                        lastNode.after(card);
                    }
                    lastNode = card;
                }
            }

            widget.querySelectorAll('.discord-activity-card').forEach(card => {
                if (!processedKeys.has((card as HTMLElement).dataset.key || '')) {
                    card.remove();
                }
            });

            startActivityUpdates();
        };

        const connectWebSocket = () => {
            if (isDestroyed) return;

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