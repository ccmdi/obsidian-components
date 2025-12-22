export const mediaStyles = /*css*/`
    /* Media component styles */
    .media-container {
        position: relative;
        border-radius: 8px;
        text-align: -webkit-center;
    }

    .media-container > img, .media-container > video {
        max-height: 500px;
        width: auto;
        display: block;
        border-radius: 8px;
    }

    .media-selector {
        margin-bottom: 8px;
        padding: 4px 8px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        background: var(--background-secondary);
        color: var(--text-normal);
        font-size: 0.9em;
    }

    /* Centered variant */
    .media-centered {
        display: block;
        margin-left: auto;
        margin-right: auto;
    }
    .media-centered video,
    .media-centered img {
        display: block;
        margin: 0 auto;
        text-align: center;
    }

    /* Sidebar adjustments */
    .in-sidebar .media-container {
        margin: 0 auto;
    }
`