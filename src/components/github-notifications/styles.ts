export const githubNotificationsStyles = /*css*/`
    .github-notifications-container {
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        padding: 12px;
        padding-right: 6px;
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
    }

    .github-notifications-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--background-modifier-border);
    }

    .github-notifications-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 14px;
        color: var(--text-normal);
    }

    .github-notifications-icon {
        width: 18px;
        height: 18px;
        opacity: 0.8;
    }

    .github-notifications-count {
        background: var(--text-accent);
        color: var(--text-on-accent);
        border-radius: 10px;
        padding: 2px 8px;
        font-size: 12px;
        font-weight: 600;
    }

    .github-notifications-refresh {
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        color: var(--text-muted);
        background: transparent;
        border: 1px solid var(--background-modifier-border);
        transition: all 0.2s;
    }

    .github-notifications-refresh:hover {
        background: var(--background-modifier-hover);
        color: var(--text-normal);
    }

    .github-notifications-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-height: 600px;
        overflow-y: auto;
        padding-right: 6px;
        cursor: default;
    }

    .github-notifications-list::-webkit-scrollbar {
        cursor: pointer;
    }

    .github-notifications-repo-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .github-notifications-repo-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        font-size: 11px;
        font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 0 4px 4px 4px;
        border-bottom: 1px solid var(--background-modifier-border);
        font-family: monospace;
    }

    .github-notifications-repo-count {
        background: var(--text-accent);
        color: var(--text-on-accent);
        border-radius: 8px;
        padding: 1px 6px;
        font-size: 10px;
        font-weight: 600;
    }

    .github-notification-item {
        padding: 10px;
        border-radius: 6px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .github-notification-item:hover {
        background: var(--background-modifier-hover);
        border-color: var(--text-accent);
    }

    .github-notification-unread {
        border-left: 3px solid var(--text-accent);
        background: var(--background-primary-alt);
    }

    .github-notification-header {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .github-notification-type-icon {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
    }

    .github-notification-type-icon svg {
        width: 14px;
        height: 14px;
        color: var(--text-accent);
        fill: var(--text-accent);
    }

    .github-notification-title {
        flex: 1;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-normal);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .github-notification-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        color: var(--text-muted);
        margin-left: 24px;
    }

    .github-notification-repo {
        font-family: monospace;
    }

    .github-notification-reason {
        background: var(--background-secondary);
        padding: 2px 6px;
        border-radius: 3px;
        text-transform: capitalize;
    }

    .github-notification-time {
        margin-left: auto;
    }

    .github-notifications-empty {
        text-align: center;
        padding: 40px 20px;
        color: var(--text-muted);
        font-size: 13px;
    }

    .github-notifications-error {
        background: var(--background-modifier-error);
        color: var(--text-error);
        padding: 12px;
        border-radius: 6px;
        font-size: 12px;
        text-align: center;
    }

    .github-notifications-loading {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .github-notification-skeleton {
        height: 60px;
        background: var(--background-modifier-border);
        border-radius: 6px;
        animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 0.8; }
    }
`;
