import { Component, ComponentAction, ComponentInstance } from "components";
import { discordStatusStyles } from './styles';

export const discordStatus: Component<['userId', 'showActivity', 'compact', 'hideProfile']> = {
    name: 'Discord Status',
    keyName: 'discord-status',
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
    render: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
        const userId = args.userId;
        const showActivity = args.showActivity !== 'false';
        const compact = args.compact === 'true';
        const hideProfile = args.hideProfile === 'true';

        el.style.position = 'relative';

        const style = el.createEl('style');
        style.textContent = discordStatusStyles;
        el.appendChild(style);

        const widget = el.createEl('div', { cls: 'discord-status-container' });
        widget.classList.toggle('hide-profile', hideProfile);

        const tooltip = el.createEl('div', { cls: 'discord-tooltip' });

        const connectionIndicator = el.createEl('div', { cls: 'connection-status' });
        widget.appendChild(connectionIndicator);

        // Loading state
        widget.innerHTML += `
            <div class="discord-status-wrapper">
                <div class="discord-avatar">
                    <div class="loading-placeholder" style="width:clamp(32px, 12vw, 48px); height:clamp(32px, 12vw, 48px); border-radius:50%;"></div>
                    <div class="status-indicator loading-placeholder" style="width:clamp(12px, 4vw, 16px); height:clamp(12px, 4vw, 16px); border-radius:50%;"></div>
                </div>
                <div class="discord-info">
                    <div class="discord-username loading-placeholder" style="width:60%; height:clamp(14px, 4vw, 16px); border-radius:4px;"></div>
                    <div class="discord-status-text loading-placeholder" style="width:40%; height:clamp(11px, 3.2vw, 13px); border-radius:4px; margin-top:4px;"></div>
                </div>
            </div>`;

        el.appendChild(widget);
        el.appendChild(tooltip);

        let ws: WebSocket | null = null;
        let reconnectTimeout: NodeJS.Timeout;
        let heartbeatInterval: NodeJS.Timeout;
        let activityUpdateInterval: NodeJS.Timeout;
        let isDestroyed = false;
        let currentActivities: any[] = [];

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

        const getArtworkUrl = (activity: any) => {
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
                    const elapsed = Date.now() - currentActivities[index].timestamps.start;
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
            widget.innerHTML = `
                <div class="discord-error" style="color: var(--text-error); padding: 16px; text-align: center; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 12px;">
                    ❌ ${message}
                </div>
            `;
        };

        const updateUI = (user: any) => {
            const statusColor = getStatusColor(user.discord_status);

            let activitiesHtml = '';
            currentActivities = [];

            if (showActivity && user.activities && user.activities.length > 0) {
                user.activities.forEach((activity: any) => {
                    const activityType = getActivityType(activity.type);
                    const artworkUrl = getArtworkUrl(activity);

                    // For Spotify activities without separate spotify data, use the activity info
                    let title = activity.name;
                    let subtitle = `${activityType}${activity.details ? ` • ${activity.details}` : ''}${activity.state ? ` • ${activity.state}` : ''}`;

                    currentActivities.push(activity);

                    activitiesHtml += `
                        <div class="discord-spotify">
                            <div class="activity-artwork ${artworkUrl ? '' : ''}">
                                ${artworkUrl ? `<img src="${artworkUrl}" alt="${activity.name} artwork">` : ''}
                            </div>
                            <div class="spotify-info">
                                <div class="spotify-track">${title}</div>
                                <div class="spotify-artist">${subtitle}</div>
                            </div>
                            <div class="spotify-controls">
                                ${activity.timestamps && activity.timestamps.start ? `
                                    <div class="spotify-time">
                                        ${formatTime(Date.now() - activity.timestamps.start)}
                                    </div>
                                ` : ''}
                            </div>
                        </div>`;
                });
            }

            // Add separate Spotify card if showSpotify is enabled and we have spotify data
            if (user.spotify) {
                const spotifyActivity = user.activities?.find((a: any) => a.name === 'Spotify');
                const artworkUrl = spotifyActivity ? getArtworkUrl(spotifyActivity) : null;

                // Add spotify activity to our tracking array
                if (spotifyActivity) {
                    currentActivities.push(spotifyActivity);
                }

                activitiesHtml += `
                    <div class="discord-spotify">
                        <div class="activity-artwork ${artworkUrl ? '' : ''}">
                            ${artworkUrl ? `<img src="${artworkUrl}" alt="${user.spotify.song} artwork">` : ''}
                        </div>
                        <div class="spotify-info">
                            <div class="spotify-track">${user.spotify.song}</div>
                            <div class="spotify-artist">by ${user.spotify.artist}</div>
                        </div>
                        <div class="spotify-controls">
                            <div class="spotify-time">
                                ${formatTime(Date.now() - user.spotify.timestamps.start)}
                            </div>
                        </div>
                    </div>`;
            }

            // Update the main card content
            const mainContent = widget.querySelector('.discord-status-wrapper') || widget;
            mainContent.innerHTML = `
                <div class="discord-status-wrapper">
                    <div class="discord-avatar">
                        <img src="https://cdn.discordapp.com/avatars/${userId}/${user.discord_user.avatar}.png?size=128"
                             alt="${user.discord_user.username}'s avatar">
                        <div class="status-indicator" style="background-color: ${statusColor};"></div>
                    </div>
                    <div class="discord-info">
                        <div class="discord-username">
                            ${user.discord_user.display_name || user.discord_user.username}
                        </div>
                        <div class="discord-status-text">
                            ${user.discord_status.charAt(0).toUpperCase() + user.discord_status.slice(1)}
                        </div>
                        ${user.activities.find((a: any) => a.type === 4)?.state ?
                            `<div class="custom-status">${user.activities.find((a: any) => a.type === 4).state}</div>` : ''}
                    </div>
                </div>`;

            // Remove any existing activity cards
            const existingActivities = widget.querySelectorAll('.discord-spotify');
            existingActivities.forEach(card => card.remove());

            // Add activity cards below if they exist
            if (activitiesHtml) {
                widget.insertAdjacentHTML('beforeend', activitiesHtml);

                // Handle image loading for artwork
                const artworkImages = widget.querySelectorAll('.activity-artwork img');
                artworkImages.forEach((img: HTMLImageElement) => {
                    if (img.src) {
                        img.onload = () => {
                            img.classList.add('loaded');
                            const artwork = img.closest('.activity-artwork');
                            if (artwork) {
                                artwork.classList.add('has-image');
                            }
                        };

                        img.onerror = () => {
                            // If image fails to load, remove it and keep the placeholder
                            img.remove();
                        };

                        // If image is already loaded (cached), handle it immediately
                        if (img.complete && img.naturalWidth > 0) {
                            img.classList.add('loaded');
                            const artwork = img.closest('.activity-artwork');
                            if (artwork) {
                                artwork.classList.add('has-image');
                            }
                        }
                    }
                });
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