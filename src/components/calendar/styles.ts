export default /*css*/`
.calendar-container {
    width: 100%;
    max-width: 320px;
    margin: 0 auto;
    padding: 12px;
    background: var(--background-primary);
    border-radius: 8px;
    border: 1px solid var(--background-modifier-border);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding: 0 4px;
}

.calendar-month-year {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-normal);
}

button.calendar-nav-button {
    all: unset;
    background-color: transparent !important;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
    font-size: 14px;
    line-height: 1;
    transition: color 0.15s ease;
}

.calendar-nav-button:hover {
    color: var(--text-normal);
}

.calendar-nav-button:active {
    color: var(--text-accent);
}

.calendar-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    margin-bottom: 8px;
}

.calendar-weekday {
    text-align: center;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    padding: 4px 0;
    text-transform: uppercase;
}

.calendar-days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    grid-template-rows: repeat(6, 1fr);
    gap: 4px;
}

.calendar-day {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    background: var(--background-primary);
    color: var(--text-normal);
    border: 1px solid transparent;
}

.calendar-day:not(.calendar-day-other-month):hover {
    background: var(--background-modifier-hover);
    transform: scale(1.05);
    border-color: var(--background-modifier-border);
}

.calendar-day:not(.calendar-day-other-month):active {
    transform: scale(0.95);
}

.calendar-day-other-month {
    color: var(--text-faint);
    cursor: default;
}

.calendar-day-today {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    font-weight: 600;
    box-shadow: 0 0 0 2px var(--interactive-accent-hover);
}

.calendar-day-today:hover {
    background: var(--interactive-accent-hover);
    color: var(--text-on-accent);
    transform: scale(1.05);
}

.calendar-day-has-note::after {
    content: '';
    position: absolute;
    bottom: 3px;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--interactive-accent);
}

.calendar-day-today.calendar-day-has-note::after {
    background: var(--text-on-accent);
}
`;
