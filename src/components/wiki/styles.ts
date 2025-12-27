export const wikiStyles = /*css*/`
    .wiki-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 12px;
        background: var(--background-secondary);
        border-radius: 8px;
        font-size: 0.9em;
    }

    .wiki-header {
        display: flex;
        align-items: flex-start;
        gap: 12px;
    }

    .wiki-thumbnail {
        width: 80px;
        height: 80px;
        object-fit: cover;
        border-radius: 6px;
        flex-shrink: 0;
    }

    .wiki-thumbnail-placeholder {
        width: 80px;
        height: 80px;
        border-radius: 6px;
        flex-shrink: 0;
        background: var(--background-modifier-border);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-muted);
    }

    .wiki-info {
        flex: 1;
        min-width: 0;
    }

    .wiki-title {
        font-weight: 600;
        font-size: 1.1em;
        color: var(--text-normal);
        margin: 0 0 4px 0;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .wiki-title a {
        color: var(--text-normal);
        text-decoration: none;
    }

    .wiki-title a:hover {
        color: var(--text-accent);
    }

    .wiki-title svg {
        width: 14px;
        height: 14px;
        color: var(--text-muted);
        flex-shrink: 0;
    }

    .wiki-description {
        color: var(--text-muted);
        font-size: 0.9em;
        margin: 0;
    }

    .wiki-extract {
        color: var(--text-normal);
        line-height: 1.5;
        margin: 0;
    }

    .wiki-extract-short {
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .wiki-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.85em;
        color: var(--text-muted);
        border-top: 1px solid var(--background-modifier-border);
        padding-top: 8px;
    }

    .wiki-source {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .wiki-read-more {
        color: var(--text-accent);
        text-decoration: none;
    }

    .wiki-read-more:hover {
        text-decoration: underline;
    }

    .wiki-loading {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--text-muted);
        padding: 12px;
    }

    .wiki-not-found {
        color: var(--text-muted);
        padding: 12px;
        text-align: center;
    }

    .wiki-error {
        color: var(--text-error);
        padding: 12px;
        text-align: center;
    }
`;
