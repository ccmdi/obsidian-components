export const githubStyles = /*css*/`
    /* Container for the entire GitHub widget */
    .github-streak-container {
        --gh-gap: 12px;

        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        padding: var(--gh-gap);
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
        margin: 0 auto;
    }

    .github-compact {
        padding: 8px;
    }

    /* Flex wrapper for the icon and the streak graph */
    .github-streak-wrapper {
        display: flex;
        align-items: center;
        gap: var(--gh-gap);
        width: 100%;
    }

    /* Icon styling */
    .github-icon {
        width: 10%;
        min-width: 24px;
        max-width: 40px;
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .github-icon a {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
    }

    .github-icon svg {
        width: 90%;
        height: 90%;
        filter: brightness(0.9);
        display: block;
        margin: 0 auto;
    }

    .github-icon-skeleton {
        width: 100%;
        aspect-ratio: 1;
        border-radius: 50%;
    }

    /* Container for the day squares */
    .github-streak {
        display: flex;
        justify-content: space-between;
        gap: 4px;
        flex-grow: 1;
    }

    /* Individual contribution day square */
    .day-square {
        flex: 1;
        max-width: 24px;
        aspect-ratio: 1;
        border-radius: 3px;
        cursor: pointer;
        transition: transform 0.15s ease;
    }

    .day-square:hover {
        transform: scale(1.1);
    }

    .component:has(.github-streak-container) {
        width: unset !important;
    }

    /* Tooltip that appears on hover */
    .github-tooltip {
        position: fixed;
        padding: 6px 10px;
        background: var(--background-secondary-alt);
        border: 1px solid var(--background-modifier-border);
        color: var(--text-normal);
        border-radius: 6px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 1000;
        opacity: 0;
        pointer-events: none;
        transform: translate(-50%, calc(-100% - 5px));
        transition: opacity 0.15s ease-in-out;
    }

    /* Stats row */
    .github-stats-row {
        display: flex;
        justify-content: center;
        gap: 16px;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid var(--background-modifier-border);
    }

    .github-stat {
        font-size: 12px;
        color: var(--text-muted);
        font-variant-numeric: tabular-nums;
    }

    /* Error state */
    .github-error {
        color: var(--text-error);
        font-size: 12px;
        text-align: center;
        padding: 8px;
    }

    /* Skeleton loader placeholder style */
    .loading-placeholder {
        background: linear-gradient(90deg, var(--background-modifier-border) 25%, var(--background-primary) 50%, var(--background-modifier-border) 75%);
        background-size: 200% 100%;
        animation: github-shimmer 1.5s ease-in-out infinite;
        border-radius: 4px;
    }

    @keyframes github-shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
`;
