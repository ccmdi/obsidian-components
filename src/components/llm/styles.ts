export const llmStyles = /*css*/`
    /* Container */
    .llm-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 400px;
        background: var(--background-primary);
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid var(--background-modifier-border);
    }

    /* Header */
    .llm-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: var(--background-secondary);
        border-bottom: 1px solid var(--background-modifier-border);
    }
    .llm-header-title {
        font-weight: 600;
        font-size: 0.95em;
        color: var(--text-normal);
    }
    .llm-header-clear {
        padding: 4px 10px;
        font-size: 0.75em;
        background: transparent;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        color: var(--text-muted);
        cursor: pointer;
        transition: all 0.15s ease;
    }
    .llm-header-clear:hover {
        background: var(--background-modifier-hover);
        color: var(--text-normal);
    }

    /* Messages */
    .llm-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    /* Empty state */
    .llm-empty {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 40px 20px;
        color: var(--text-muted);
    }
    .llm-empty-icon {
        font-size: 2.5em;
        margin-bottom: 12px;
        opacity: 0.5;
    }
    .llm-empty-title {
        font-size: 1.1em;
        font-weight: 500;
        color: var(--text-normal);
        margin-bottom: 4px;
    }
    .llm-empty-desc {
        font-size: 0.85em;
        max-width: 280px;
    }

    /* Message bubbles */
    .llm-msg {
        display: flex;
    }
    .llm-msg-user {
        justify-content: flex-end;
    }
    .llm-msg-assistant {
        justify-content: flex-start;
    }
    .llm-bubble {
        max-width: 85%;
        border-radius: 12px;
    }
    .llm-bubble-user {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border-radius: 12px 12px 4px 12px;
    }
    .llm-bubble-assistant {
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 12px 12px 12px 4px;
    }
    .llm-bubble-content {
        padding: 10px 14px;
        font-size: 0.9em;
        line-height: 1.5;
        white-space: pre-wrap;
        word-wrap: break-word;
    }
    .llm-text-block {
        margin-bottom: 8px;
    }
    .llm-text-block:last-child {
        margin-bottom: 0;
    }

    /* Typing indicator */
    .llm-typing {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 0;
    }
    .llm-typing-dot {
        width: 6px;
        height: 6px;
        background: var(--text-muted);
        border-radius: 50%;
        animation: llm-bounce 1.4s infinite ease-in-out both;
    }
    .llm-typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .llm-typing-dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes llm-bounce {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
        40% { transform: scale(1); opacity: 1; }
    }

    /* Tool use - glimmering animation */
    .llm-tool {
        margin: 8px 0;
        padding: 10px 12px;
        background: var(--background-primary);
        border-radius: 8px;
        border: 1px solid var(--background-modifier-border);
        font-size: 0.85em;
    }
    .llm-tool-active {
        position: relative;
        overflow: hidden;
    }
    .llm-tool-active::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(
            90deg,
            transparent,
            rgba(var(--interactive-accent-rgb), 0.1),
            rgba(var(--interactive-accent-rgb), 0.2),
            rgba(var(--interactive-accent-rgb), 0.1),
            transparent
        );
        animation: llm-shimmer 1.5s infinite;
    }
    @keyframes llm-shimmer {
        0% { left: -100%; }
        100% { left: 100%; }
    }
    .llm-tool-active .llm-tool-header {
        opacity: 0.8;
    }
    .llm-tool-done {
        background: var(--background-secondary);
        border-color: var(--background-modifier-border-hover);
    }
    .llm-tool-header {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .llm-tool-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-accent);
    }
    .llm-tool-name {
        color: var(--text-muted);
        font-size: 0.9em;
    }
    .llm-tool-active .llm-tool-name {
        color: var(--text-accent);
    }
    .llm-tool-status {
        margin-left: auto;
        width: 12px;
        height: 12px;
        border: 2px solid var(--text-accent);
        border-top-color: transparent;
        border-radius: 50%;
        animation: llm-spin 0.8s linear infinite;
    }
    @keyframes llm-spin {
        to { transform: rotate(360deg); }
    }

    /* Tags display - native Obsidian style */
    .llm-tool-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid var(--background-modifier-border);
    }
    .llm-tag {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        font-size: 0.8em;
        background: var(--tag-background);
        color: var(--tag-color);
        border-radius: 4px;
        opacity: 0.7;
        font-family: var(--font-interface);
    }
    .llm-tool-done .llm-tag {
        opacity: 1;
    }

    /* Tool results */
    .llm-tool-results {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid var(--background-modifier-border);
        font-size: 0.85em;
        color: var(--text-muted);
    }
    .llm-tool-result-count {
        color: var(--text-accent);
    }
    .llm-tool-error {
        color: var(--text-error);
    }

    /* Input area */
    .llm-input-area {
        padding: 12px 16px 16px;
        background: var(--background-secondary);
        border-top: 1px solid var(--background-modifier-border);
    }
    .llm-input-wrapper {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        padding: 8px 8px 8px 12px;
        transition: border-color 0.15s ease;
    }
    .llm-input-wrapper:focus-within {
        border-color: var(--interactive-accent);
    }
    .llm-input {
        flex: 1;
        background: transparent;
        border: none;
        color: var(--text-normal);
        font-size: 0.9em;
        line-height: 1.4;
        resize: none;
        min-height: 20px;
        max-height: 150px;
        padding: 0;
        font-family: var(--font-interface);
    }
    .llm-input:focus {
        outline: none;
        box-shadow: none;
    }
    .llm-input::placeholder {
        color: var(--text-muted);
    }
    .llm-input:disabled {
        opacity: 0.5;
    }

    /* Send button */
    .llm-send-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background: var(--interactive-accent);
        border: none;
        border-radius: 6px;
        color: var(--text-on-accent);
        cursor: pointer;
        transition: all 0.15s ease;
        flex-shrink: 0;
    }
    .llm-send-btn:hover:not(:disabled) {
        opacity: 0.9;
        transform: scale(1.02);
    }
    .llm-send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    .llm-send-btn.llm-sending {
        animation: llm-pulse 1s ease-in-out infinite;
    }
    @keyframes llm-pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
    }

    /* Error states */
    .llm-error-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
        min-height: 200px;
        background: var(--background-secondary);
        border-radius: 8px;
        border: 1px solid var(--background-modifier-border);
    }
    .llm-error-icon {
        font-size: 2em;
        margin-bottom: 12px;
    }
    .llm-error-title {
        font-weight: 600;
        color: var(--text-normal);
        margin-bottom: 4px;
    }
    .llm-error-desc {
        font-size: 0.85em;
        color: var(--text-muted);
        max-width: 280px;
    }
    .llm-error-inline {
        padding: 8px 12px;
        background: rgba(var(--color-red-rgb), 0.1);
        border-radius: 4px;
        color: var(--text-error);
        font-size: 0.85em;
    }

    /* Scrollbar */
    .llm-messages::-webkit-scrollbar {
        width: 6px;
    }
    .llm-messages::-webkit-scrollbar-track {
        background: transparent;
    }
    .llm-messages::-webkit-scrollbar-thumb {
        background: var(--background-modifier-border);
        border-radius: 3px;
    }
    .llm-messages::-webkit-scrollbar-thumb:hover {
        background: var(--background-modifier-border-hover);
    }
`;
