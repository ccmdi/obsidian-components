export const projectCardsSettingsStyles = /*css*/`
.project-cards-list-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 16px 0;
    padding: 12px;
    background: var(--background-primary);
    border-radius: 8px;
    border: 1px solid var(--background-modifier-border);
    min-height: 60px;
}
.project-cards-list-container:empty::before {
    content: 'No entries yet';
    color: var(--text-muted);
    font-style: italic;
    font-size: 0.9em;
    text-align: center;
    padding: 16px;
}
.project-cards-list-entry {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--background-secondary);
    border-radius: 8px;
    border: 1px solid var(--background-modifier-border);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.project-cards-list-entry:hover {
    border-color: var(--background-modifier-border-hover);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.project-cards-input {
    flex: 1;
    min-width: 0;
    padding: 8px 12px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    background: var(--background-primary);
    color: var(--text-normal);
    font-size: 0.9em;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.project-cards-input::placeholder {
    color: var(--text-faint);
}
.project-cards-input:focus {
    outline: none;
    border-color: var(--interactive-accent);
    box-shadow: 0 0 0 2px rgba(var(--interactive-accent-rgb), 0.2);
}
.project-cards-input-tag {
    flex: 0 0 140px;
    max-width: 140px;
}
.project-cards-arrow {
    color: var(--text-muted);
    font-weight: 600;
    font-size: 1.1em;
    flex-shrink: 0;
    padding: 0 4px;
}
.project-cards-color-group {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
}
.project-cards-color-label {
    font-size: 0.7em;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.3px;
}
.project-cards-color-input {
    width: 36px;
    height: 32px;
    padding: 2px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    cursor: pointer;
    background: var(--background-primary);
    transition: border-color 0.15s ease, transform 0.1s ease;
}
.project-cards-color-input:hover {
    border-color: var(--interactive-accent);
    transform: scale(1.05);
}
.project-cards-color-input::-webkit-color-swatch-wrapper {
    padding: 2px;
}
.project-cards-color-input::-webkit-color-swatch {
    border-radius: 3px;
    border: none;
}
.project-cards-remove-btn {
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    background: var(--background-primary);
    color: var(--text-muted);
    font-size: 1.3em;
    font-weight: 300;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.15s ease;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
}
.project-cards-remove-btn:hover {
    background: var(--background-modifier-error);
    color: var(--text-on-accent);
}
.project-cards-add-btn {
    width: 100%;
    padding: 10px 16px;
    border: 2px dashed var(--background-modifier-border);
    border-radius: 8px;
    background: transparent;
    color: var(--text-muted);
    font-size: 0.9em;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: 8px;
}
.project-cards-add-btn:hover {
    border-color: var(--interactive-accent);
    color: var(--interactive-accent);
    background: var(--background-secondary);
}
.project-cards-section-spacer {
    height: 24px;
}
`;
