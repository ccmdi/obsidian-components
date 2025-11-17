export const githubNotificationsStyles = /*css*/`
    .github-notifications-container {
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        padding: 12px;
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
        gap: 8px;
        max-height: 600px;
        overflow-y: auto;
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

    .github-notification-header {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .github-notification-type-icon {
        font-size: 16px;
        flex-shrink: 0;
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

    .github-notifications-empty-icon {
        font-size: 48px;
        margin-bottom: 12px;
        opacity: 0.3;
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
