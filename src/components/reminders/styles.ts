export const remindersStyles = /*css*/`
    .reminders-container {
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 12px;
        padding: 16px;
        font-family: var(--font-interface);
    }
    .reminders-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
    }
    .reminders-icon {
        width: 20px;
        height: 20px;
        color: var(--text-accent);
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .reminders-title {
        font-size: 1.1em;
        font-weight: 600;
        color: var(--text-normal);
        margin: 0;
    }
    .reminders-count {
        background: var(--text-accent);
        color: var(--text-on-accent);
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.8em;
        font-weight: 500;
        margin-left: auto;
    }
    .reminders-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .reminder-item {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        background: var(--background-primary);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 1px solid transparent;
    }
    .reminder-item:hover {
        background: var(--background-modifier-hover);
        border-color: var(--background-modifier-border);
        transform: translateX(2px);
    }
    .reminder-bullet {
        color: var(--text-accent);
        margin-right: 8px;
        font-weight: bold;
    }
    .reminder-text {
        flex: 1;
        color: var(--text-normal);
        font-size: 0.95em;
        line-height: 1.4;
        word-wrap: break-word;
        overflow-wrap: break-word;
        white-space: normal;
    }
    .reminder-age {
        font-size: 0.8em;
        margin-left: 8px;
    }
    .reminders-empty {
        text-align: center;
        color: var(--text-muted);
        font-style: italic;
        padding: 20px;
    }
`;