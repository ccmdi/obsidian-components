export const mediaStyles = `/* Media component styles */
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
`