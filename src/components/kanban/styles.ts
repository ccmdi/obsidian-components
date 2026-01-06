export const kanbanStyles = /*css*/`
/* ========== Kanban Board Layout ========== */
.kanban-wrapper {
    width: 100%;
    overflow-x: auto;
    padding-bottom: 8px;
}

.kanban-board {
    display: flex;
    gap: 16px;
    min-height: 400px;
    padding: 8px;
}

/* ========== Kanban Columns ========== */
.kanban-column {
    flex: 1;
    min-width: 280px;
    max-width: 350px;
    background: var(--background-secondary);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    transition: background-color 0.2s ease;
}

.kanban-column.drag-over {
    background: var(--background-modifier-hover);
    box-shadow: inset 0 0 0 2px var(--interactive-accent);
}

.kanban-column-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--background-modifier-border);
    position: sticky;
    top: 0;
    background: inherit;
    border-radius: 10px 10px 0 0;
    z-index: 1;
}

.kanban-column-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
}

.kanban-column-title {
    font-weight: 600;
    font-size: 0.95em;
    color: var(--text-normal);
    flex: 1;
}

.kanban-column-count {
    font-size: 0.8em;
    color: var(--text-muted);
    background: var(--background-modifier-border);
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: 500;
}

.kanban-column-content {
    flex: 1;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    min-height: 100px;
}

/* ========== Kanban Cards ========== */
.kanban-card {
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
    overflow: hidden;
}

.kanban-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-color: var(--background-modifier-border-hover);
}

.kanban-card.dragging {
    opacity: 0.5;
    transform: scale(0.98);
}

.kanban-card.has-cover {
    border-top: none;
}

.kanban-card-cover {
    height: 100px;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
}

.kanban-card-content {
    padding: 12px;
}

.kanban-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 6px;
}

.kanban-card-title {
    flex: 1;
    font-weight: 500;
    font-size: 0.95em;
    line-height: 1.3;
}

.kanban-card-title a {
    color: var(--text-normal);
    text-decoration: none;
}

.kanban-card-title a:hover {
    color: var(--interactive-accent);
    text-decoration: underline;
}

.kanban-card-priority {
    font-size: 0.75em;
    font-weight: 600;
    color: var(--text-muted);
    background: var(--background-modifier-border);
    padding: 2px 7px;
    border-radius: 4px;
    flex-shrink: 0;
}

.kanban-card-description {
    font-size: 0.85em;
    color: var(--text-muted);
    margin: 0 0 8px 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.kanban-card-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 8px;
}

/* ========== Card Tags ========== */
.kanban-card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.kanban-card-tag {
    font-size: 0.7em;
    padding: 2px 8px;
    border-radius: 10px;
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    opacity: 0.85;
    font-weight: 500;
}

.kanban-card-tag-more {
    background: var(--background-modifier-border);
    color: var(--text-muted);
}

/* ========== Due Date ========== */
.kanban-card-due {
    font-size: 0.75em;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
}

.kanban-card-due::before {
    content: '📅';
    font-size: 0.9em;
}

.kanban-card-due.overdue {
    color: var(--text-error);
    font-weight: 600;
}

.kanban-card-due.soon {
    color: var(--text-warning);
    font-weight: 500;
}

/* ========== Empty & Error States ========== */
.kanban-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
    padding: 40px 20px;
    min-height: 200px;
    width: 100%;
}

.kanban-error {
    text-align: center;
    color: var(--text-error);
    padding: 20px;
    background: var(--background-secondary);
    border-radius: 8px;
}

/* ========== Sidebar / Widget Space Styles ========== */
.in-sidebar .kanban-board,
.widget-space .kanban-board {
    flex-direction: column;
    gap: 12px;
    min-height: auto;
}

.in-sidebar .kanban-column,
.widget-space .kanban-column {
    min-width: 0;
    max-width: none;
}

.in-sidebar .kanban-column-header,
.widget-space .kanban-column-header {
    padding: 10px 12px;
}

.in-sidebar .kanban-column-content,
.widget-space .kanban-column-content {
    padding: 8px;
    gap: 8px;
}

.in-sidebar .kanban-card-content,
.widget-space .kanban-card-content {
    padding: 10px;
}

.in-sidebar .kanban-card-cover,
.widget-space .kanban-card-cover {
    height: 60px;
}

/* ========== Compact Mode (when many columns) ========== */
.kanban-board:has(.kanban-column:nth-child(5)) .kanban-column {
    min-width: 220px;
}

.kanban-board:has(.kanban-column:nth-child(5)) .kanban-card-description {
    -webkit-line-clamp: 1;
}

.kanban-board:has(.kanban-column:nth-child(5)) .kanban-card-cover {
    height: 60px;
}

/* ========== Scrollbar Styling ========== */
.kanban-column-content::-webkit-scrollbar {
    width: 6px;
}

.kanban-column-content::-webkit-scrollbar-track {
    background: transparent;
}

.kanban-column-content::-webkit-scrollbar-thumb {
    background: var(--background-modifier-border);
    border-radius: 3px;
}

.kanban-column-content::-webkit-scrollbar-thumb:hover {
    background: var(--background-modifier-border-hover);
}

.kanban-wrapper::-webkit-scrollbar {
    height: 8px;
}

.kanban-wrapper::-webkit-scrollbar-track {
    background: var(--background-secondary);
    border-radius: 4px;
}

.kanban-wrapper::-webkit-scrollbar-thumb {
    background: var(--background-modifier-border);
    border-radius: 4px;
}

/* ========== Mobile Styles ========== */
.is-mobile .kanban-board {
    flex-direction: column;
}

.is-mobile .kanban-column {
    min-width: 0;
    max-width: none;
}

/* ========== Dark Theme Adjustments ========== */
.theme-dark .kanban-card:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.theme-dark .kanban-column.drag-over {
    background: var(--background-modifier-hover);
}
`;
