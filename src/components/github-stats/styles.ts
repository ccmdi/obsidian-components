export const githubStyles = /*css*/`
    /* Container for the entire GitHub widget */
    .github-streak-container {
        --gh-gap: 12px; /* Define gap as a variable for consistency */

        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        padding: var(--gh-gap);
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
        margin: 0 auto;
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
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: brightness(0.8);
    }

    .github-icon svg {
        width: 90%;
        height: 90%;
        filter: brightness(0.9);
        display: block;
        margin: 0 auto;
    }

    /* Container for the 7 day squares */
    .github-streak {
        display: flex;
        justify-content: space-between;
        flex-grow: 1;
    }

    /* Individual contribution day square */
    .day-square {
        width: 12%; /* Simplified width */
        aspect-ratio: 1;
        border-radius: 3px;
        cursor: pointer;
        transform: scale(0.9);
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

    /* Skeleton loader placeholder style */
    .loading-placeholder {
        background: var(--background-modifier-border);
        border-radius: 4px; /* Match the element it's replacing */
        animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    /* Loading animation */
    @keyframes pulse {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 0.8; }
    }
`;