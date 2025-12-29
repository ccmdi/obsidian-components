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
        min-height: 52px;
    }

    .anthropic-usage-compact {
        padding: 8px 12px;
        min-height: 40px;
        gap: 8px;
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

    .anthropic-usage-compact .anthropic-usage-value {
        font-size: 16px;
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

    .anthropic-usage-error {
        color: var(--text-error);
        font-size: 12px;
        flex: 1;
    }

    .anthropic-usage-retrying .anthropic-usage-error {
        color: var(--text-muted);
        animation: anthropic-pulse 2s ease-in-out infinite;
    }

    @keyframes anthropic-pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
    }

    /* Loading skeleton styles */
    .anthropic-usage-loading {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .loading-placeholder {
        background: linear-gradient(90deg, var(--background-modifier-border) 25%, var(--background-primary) 50%, var(--background-modifier-border) 75%);
        background-size: 200% 100%;
        animation: anthropic-shimmer 1.5s ease-in-out infinite;
        border-radius: 4px;
    }

    @keyframes anthropic-shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }

    .anthropic-icon-skeleton {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .anthropic-value-skeleton {
        width: 48px;
        height: 22px;
    }

    .anthropic-info-skeleton {
        height: 14px;
        width: 60%;
    }

    .anthropic-bar-skeleton {
        height: 6px;
        width: 100%;
    }

    .anthropic-usage-compact-skeleton {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
    }
`;
