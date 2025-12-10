export const discordStatusStyles = /*css*/`
    .discord-status-container {
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 12px;
        padding: 8px;
        font-family: var(--font-interface);
        transition: all 0.2s ease;
        max-width: 100%;
        box-sizing: border-box;
        container-type: inline-size;
        min-height: 64px;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }

    /* Use CSS clamp for truly responsive height based on container width */
    .discord-status-container {
        min-height: 72px;
    }

    /* Widget-space specific adjustments */
    .widget-content .discord-status-container {
        min-height: clamp(48px, 12vw, 60px);
    }
    .discord-status-wrapper {
        display: flex;
        align-items: center;
        gap: 3%;
        width: 100%;
    }
    .discord-status-container.hide-profile .discord-status-wrapper {
        display: none;
    }
    .discord-status-container.hide-profile {
        padding: 0;
        background: none;
        border: none;
    }
    .discord-avatar {
        position: relative;
        flex-shrink: 0;
    }
    .discord-avatar img {
        width: clamp(32px, 12vw, 48px);
        height: clamp(32px, 12vw, 48px);
        border-radius: 50%;
        border: 2px solid var(--background-secondary);
    }
    .status-indicator {
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: clamp(12px, 4vw, 16px);
        height: clamp(12px, 4vw, 16px);
        border-radius: 50%;
        border: 3px solid var(--background-secondary);
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .discord-info {
        flex: 1;
        min-width: 0;
    }
    @container (max-width: 200px) {
        .discord-info {
            display: none !important;
        }
        .activity-info {
            display: none !important;
        }
        .discord-activity-card {
            gap: 3%;
        }
        .activity-artwork {
            flex: 1;
            width: 50%;
            height: 100%;
            aspect-ratio: 1;
        }
        .activity-artwork img {
            aspect-ratio: 1;
            object-fit: cover;
        }
        .activity-controls {
            flex: 1;
            align-items: center !important;
            justify-content: center;
        }
        .activity-timer {
            font-size: clamp(12px, 4vw, 18px);
            font-weight: 600;
        }
        .discord-avatar {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 8px;
        }
        .discord-avatar img {
            width: clamp(45px, 15vw, 65px);
            height: clamp(45px, 15vw, 65px);
            aspect-ratio: 1;
        }
        .discord-avatar .status-indicator {
            position: absolute;
            bottom: 6%;
            right: 33%;
        }
    }
    .discord-username {
        font-weight: 600;
        font-size: clamp(14px, 4vw, 16px);
        color: var(--text-normal);
        margin-bottom: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .discord-status-text {
        font-size: clamp(11px, 3.2vw, 13px);
        color: var(--text-muted);
        margin-bottom: 4px;
    }
    .custom-status {
        font-size: clamp(10px, 3vw, 12px);
        color: var(--text-faint);
        font-style: italic;
        margin-top: 2px;
    }
    .discord-activity {
        margin-top: 2%;
        padding: 4px;
        background: var(--background-primary);
        border-radius: 8px;
        border-left: 3px solid var(--interactive-accent);
    }
    .activity-name {
        font-weight: 500;
        font-size: 13px;
        color: var(--text-normal);
        margin-bottom: 2px;
    }
    .activity-details, .activity-state {
        font-size: 11px;
        color: var(--text-muted);
        line-height: 1.3;
    }
    .discord-activity-card {
        margin-top: 2%;
        padding: 4px;
        background: var(--background-secondary);
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 3%;
        position: relative;
        overflow: hidden;
    }
    .activity-artwork {
        width: clamp(32px, 10vw, 40px);
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: clamp(14px, 4.5vw, 18px);
        color: var(--text-muted);
        position: relative;
        overflow: hidden;
    }
    .activity-artwork img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 6px;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    .activity-artwork img.loaded {
        opacity: 1;
    }
    .activity-artwork::after {
        content: '♪';
        position: absolute;
        font-size: 14px;
        color: var(--text-faint);
        z-index: 1;
        transition: opacity 0.3s ease;
    }
    .activity-artwork.has-image::after {
        opacity: 0;
    }
    .activity-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .activity-title {
        font-weight: 500;
        font-size: clamp(12px, 3.5vw, 14px);
        color: var(--text-normal);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .activity-subtitle {
        font-size: clamp(10px, 3vw, 12px);
        color: var(--text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .activity-controls {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
        flex-shrink: 0;
    }
    .activity-timer {
        color: var(--text-faint);
        font-family: var(--font-interface);
    }
    .connection-status {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--text-error);
        transition: opacity 0.2s ease;
        opacity: 0;
    }
    .connection-status.disconnected {
        opacity: 1;
    }
    .loading-placeholder {
        background: linear-gradient(90deg, var(--background-modifier-border) 25%, transparent 37%, var(--background-modifier-border) 63%);
        background-size: 400% 100%;
        animation: loading 1.4s ease infinite;
    }
    @keyframes loading {
        0% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    .discord-tooltip {
        position: absolute;
        background: var(--background-tooltip);
        color: var(--text-on-accent);
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.2s ease;
        pointer-events: none;
        transform: translateX(-50%) translateY(-100%);
        margin-top: -8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
`