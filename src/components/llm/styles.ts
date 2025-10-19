export const llmStyles = `
    .llm-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--background-secondary);
        border-radius: 8px;
        overflow: hidden;
    }
    .llm-header {
        padding: 12px 16px;
        background: var(--background-modifier-border);
        border-bottom: 1px solid var(--background-modifier-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .llm-title {
        font-weight: 600;
        font-size: 0.9em;
        color: var(--text-normal);
    }
    .llm-clear {
        padding: 6px 12px;
        font-size: 0.8em;
        cursor: pointer;
        color: var(--text-muted);
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        margin-bottom: 12px;
        align-self: center;
    }
    .llm-clear:hover {
        color: var(--text-normal);
        background: var(--background-modifier-hover);
    }
    .llm-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    .llm-message {
        display: flex;
        flex-direction: column;
        gap: 4px;
        max-width: 85%;
    }
    .llm-message.user {
        align-self: flex-end;
    }
    .llm-message.assistant {
        align-self: flex-start;
    }
    .llm-message-role {
        font-size: 0.75em;
        color: var(--text-muted);
        font-weight: 500;
    }
    .llm-message-content {
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 0.9em;
        line-height: 1.4;
        white-space: pre-wrap;
        word-wrap: break-word;
    }
    .llm-token {
        display: inline;
        animation: fadeInToken 0.3s ease-out;
    }
    @keyframes fadeInToken {
        from {
            opacity: 0;
            transform: translateY(2px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    .llm-message.user .llm-message-content {
        background: var(--color-accent);
        color: var(--text-on-accent);
    }
    .llm-message.assistant .llm-message-content {
        background: var(--background-primary);
        color: var(--text-normal);
        border: 1px solid var(--background-modifier-border);
    }
    .llm-input-container {
        padding: 12px 16px;
        padding-bottom: 50px;
        border-top: 1px solid var(--background-modifier-border);
    }
    .llm-input {
        width: 100%;
        padding: 8px 12px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        color: var(--text-normal);
        font-size: 0.9em;
        resize: none;
        min-height: 36px;
        max-height: 120px;
    }
    .llm-input:focus {
        outline: none;
        border-color: var(--color-accent);
    }
    .llm-input:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    .llm-loading {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        font-size: 0.9em;
        color: var(--text-muted);
        max-width: 85%;
        align-self: flex-start;
    }
    .llm-error {
        padding: 16px;
        color: var(--text-error);
        text-align: center;
    }
    .llm-tool-use {
        margin-top: 8px;
        padding: 8px 12px;
        background: var(--background-modifier-border);
        border-left: 3px solid var(--color-accent);
        border-radius: 4px;
        font-size: 0.85em;
    }
    .llm-tool-name {
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--text-accent);
    }
    .llm-tool-input {
        font-family: var(--font-monospace);
        color: var(--text-muted);
        white-space: pre-wrap;
    }
`;