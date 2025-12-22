export const projectCardsStyles = /*css*/`
/* Project Cards Wrapper */
.project-cards-wrapper {
    width: 100%;
}

/* Filter Controls */
.project-cards-controls {
    margin-bottom: 15px;
}

.project-cards-filter {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    background-color: var(--background-secondary);
    color: var(--text-normal);
    font-size: 0.95em;
}

.project-cards-filter:focus {
    outline: none;
    border-color: var(--interactive-accent);
}

.project-cards-filter::placeholder {
    color: var(--text-muted);
}

/* Projects Container - Grid Layout */
.projects-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(clamp(250px, calc((100% - 30px) / 3), 400px), 1fr));
    grid-auto-flow: row;
    gap: 15px;
    padding: 15px;
}

.is-mobile .projects-container {
    grid-template-columns: repeat(1, 1fr);
}

/* Project Card */
.project-card {
    display: flex;
    flex-direction: column;
    background-color: var(--background-secondary);
    border-radius: 6px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    padding: 12px;
    min-height: 140px;
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
    will-change: transform;
    cursor: pointer;
}

.project-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.4);
}

.project-card.has-cover {
    color: white;
}

.project-card.has-cover .project-title a {
    color: white;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.project-card.has-cover .project-description,
.project-card.has-cover .project-subtask {
    color: rgba(255, 255, 255, 0.9);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.project-card.has-cover .project-priority,
.project-card.has-cover .project-difficulty {
    background-color: rgba(0, 0, 0, 0.4);
    color: white;
}

/* Project Content */
.project-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    margin-bottom: 0;
    position: relative;
    padding-bottom: 12px;
}

.project-main {
    flex: 1;
}

.project-bottom {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

/* Project Header */
.project-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2px;
}

.markdown-rendered .project-title {
    font-size: 1.1em;
    margin: 0;
    margin-right: 5px;
}

.project-title a {
    color: var(--color-accent);
    text-decoration: none;
}

.project-title a:hover {
    text-decoration: underline;
}

/* Project Badges */
.project-badges {
    display: flex;
    align-items: center;
    gap: 6px;
}

.markdown-rendered .project-difficulty {
    font-size: 0.75em;
    color: var(--text-on-accent);
    background-color: var(--color-accent-2);
    padding: 2px 6px;
    border-radius: 12px;
    font-weight: 500;
}

.markdown-rendered .project-priority {
    font-size: 0.8em;
    color: var(--text-muted);
    background-color: var(--background-modifier-border);
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 500;
}

/* Subtask Styling */
.markdown-rendered .project-subtask {
    font-size: 0.9em;
    color: var(--text-normal);
    margin: 4px 0 6px 0;
    padding-left: 8px;
    border-left: 2px solid var(--interactive-accent);
    font-weight: 500;
}

/* Description Styling */
.markdown-rendered .project-description {
    font-size: 0.85em;
    color: var(--text-muted);
    margin: 6px 0 8px 0;
    line-height: 1.3;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}

.project-description:hover {
    cursor: help;
}

/* Progress Bar */
.project-progress {
    margin-top: auto;
    padding-top: 12px;
}

.project-card .progress-bar {
    height: 8px;
    width: 100%;
    background-color: var(--background-modifier-border);
    border-radius: 4px;
    overflow: hidden;
    position: relative;
}

.project-card .progress-bar::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: var(--progress);
    background-color: var(--interactive-accent);
    transition: width 0.5s ease-in-out;
}

/* Project Tags */
.project-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: flex-end;
    margin-top: 0px;
}

.project-tag {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 12px;
    transition: filter 0.2s ease;
}

.project-tag:hover {
    filter: brightness(1.1);
}

/* Project Card Footer */
.project-card-footer {
    background: hsla(var(--theme-hue, 0), var(--theme-saturation, 0%), var(--theme-lightness, 50%), 0.1);
    color: var(--text-muted);
    font-size: 0.9em;
    padding: 6px 12px;
    border-top: 1px solid var(--background-modifier-border);
    border-radius: 0 0 6px 6px;
    margin: 0 -12px -12px;
}

/* Empty State */
.project-cards-empty {
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
    padding: 40px 20px;
    grid-column: 1 / -1;
}

/* Error State */
.project-cards-error {
    text-align: center;
    color: var(--text-error);
    padding: 20px;
    background: var(--background-secondary);
    border-radius: 6px;
}

/* ========== Settings UI Styles ========== */

/* Section headers */
.project-cards-settings-section {
    margin-bottom: 24px;
}

.project-cards-settings-section .setting-item-heading {
    font-size: 1em;
    font-weight: 600;
    color: var(--text-normal);
    margin-bottom: 4px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--background-modifier-border);
}

/* List container */
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

/* Entry row */
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

/* Input fields */
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

/* Arrow separator */
.project-cards-arrow {
    color: var(--text-muted);
    font-weight: 600;
    font-size: 1.1em;
    flex-shrink: 0;
    padding: 0 4px;
}

/* Color pickers */
.project-cards-color-input {
    width: 40px;
    height: 36px;
    padding: 3px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    cursor: pointer;
    background: var(--background-primary);
    transition: border-color 0.15s ease, transform 0.1s ease;
    flex-shrink: 0;
}

.project-cards-color-input:hover {
    border-color: var(--interactive-accent);
    transform: scale(1.05);
}

.project-cards-color-input::-webkit-color-swatch-wrapper {
    padding: 2px;
}

.project-cards-color-input::-webkit-color-swatch {
    border-radius: 4px;
    border: none;
}

/* Color labels */
.project-cards-color-label {
    font-size: 0.75em;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
}

/* Remove button */
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
    transform: scale(1.1);
}

/* Add button */
.project-cards-add-btn {
    width: 100%;
    padding: 12px 20px;
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

.project-cards-add-btn:active {
    transform: scale(0.98);
}

/* Section spacer */
.project-cards-section-spacer {
    height: 32px;
    border-bottom: 1px solid var(--background-modifier-border);
    margin-bottom: 16px;
}
`;

