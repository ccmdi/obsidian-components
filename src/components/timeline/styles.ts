export const timelineStyles = /*css*/`
  .timeline-container {
    padding: 8px 0;
  }

  .timeline-container .note-card {
    background: var(--background-secondary);
    border-radius: 8px;
    padding: 12px 16px;
    transition: box-shadow 0.2s ease;
    border: 1px solid var(--background-modifier-border);
    margin-bottom: 8px;
  }

  .timeline-container .note-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .timeline-container .note-date {
    font-size: 1.1em;
    font-weight: bold;
    color: var(--color-accent);
    line-height: 1.2;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .timeline-container .note-date .journal-check {
    color: var(--color-accent);
    font-size: 0.9em;
  }

  .timeline-container .dropdown-button {
    background: var(--background-modifier-hover);
    border: none;
    padding: 2px;
    width: 24px;
    height: 24px;
    cursor: pointer;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: box-shadow 0.2s ease, transform 0.1s ease;
  }

  .timeline-container .dropdown-button::after {
    content: '▼';
    font-size: 0.8em;
    transition: transform 0.3s ease;
    margin: 2px 0;
  }

  .timeline-container .dropdown-button.open::after {
    transform: rotate(180deg);
  }

  .timeline-container .dropdown-button:hover {
    color: var(--text-normal);
  }

  .timeline-container .tasks-container {
    margin-top: 8px;
  }

  .timeline-container .task-item {
    font-size: 0.9em;
    color: var(--text-muted);
    margin-bottom: 2px;
    padding-left: 6px;
    border-left: 2px solid var(--color-accent);
  }

  .timeline-container .journal-content {
    display: grid;
    margin-top: 0;
    grid-template-rows: 0fr;
    overflow: hidden;
    background: var(--background-primary);
    border-radius: 6px;
    border: 0 solid var(--background-modifier-border);
    color: var(--text-normal);
    font-size: 0.95em;
    line-height: 1.5;
    opacity: 0;
    box-shadow: 0 0 0 rgba(0, 0, 0, 0);
    transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                border-width 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                margin-top 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .timeline-container .journal-content.visible {
    margin-top: 10px;
    grid-template-rows: 1fr;
    border-width: 1px;
    opacity: 1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .timeline-container .journal-content-inner {
    min-height: 0;
    opacity: 0;
    transform: translateX(-12px) scale(0.98);
    margin: 0;
    padding: 0;
    overflow: hidden;
    transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                padding 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .timeline-container .journal-content.visible .journal-content-inner {
    opacity: 1;
    transform: translateX(0) scale(1);
    padding: 12px;
    transition-delay: 0.1s;
  }

  .timeline-container .journal-text {
    white-space: pre-wrap;
  }

  .timeline-container .loading-message {
    text-align: center;
    padding: 20px;
    color: var(--text-muted);
  }
`;

export default timelineStyles;