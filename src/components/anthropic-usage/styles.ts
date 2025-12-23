export const anthropicUsageStyles = /*css*/`
    .anthropic-usage-container {
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        padding: 12px;
        font-family: var(--font-interface);
        max-width: 100%;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .anthropic-usage-icon {
        width: 24px;
        height: 24px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .anthropic-usage-icon svg {
        width: 100%;
        height: 100%;
        display: block;
    }

    .anthropic-usage-bar-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .anthropic-usage-info {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
    }

    .anthropic-usage-label {
        font-size: 12px;
        color: var(--text-muted);
        font-weight: 500;
    }

    .anthropic-usage-value {
        font-size: 18px;
        color: var(--text-normal);
        font-weight: 600;
        font-variant-numeric: tabular-nums;
    }

    .anthropic-usage-bar {
        position: relative;
        height: 6px;
        background: var(--background-primary);
        border-radius: 3px;
        overflow: hidden;
    }

    .anthropic-usage-bar-fill {
        height: 100%;
        background: var(--text-accent);
        border-radius: 3px;
        transition: width 0.5s ease;
    }

    .anthropic-usage-reset {
        font-size: 11px;
        color: var(--text-faint);
        font-variant-numeric: tabular-nums;
    }

    .anthropic-usage-loading {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
    }

    .loading-placeholder {
        background: linear-gradient(90deg, var(--background-modifier-border) 25%, transparent 37%, var(--background-modifier-border) 63%);
        background-size: 400% 100%;
        animation: loading 1.4s ease infinite;
        border-radius: 4px;
    }

    @keyframes loading {
        0% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }

    .anthropic-usage-error {
        color: var(--text-error);
        font-size: 12px;
    }
`;
