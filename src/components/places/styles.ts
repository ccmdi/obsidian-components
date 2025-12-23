export const placesStyles = `
.places-wrapper {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.places-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.places-stat {
    font-weight: 600;
    font-size: 0.95em;
    color: var(--text-normal);
    border-left: 3px solid var(--color-accent);
    padding-left: 0.75rem;
}

.places-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
}

.places-countries {
    padding-left: 0.75rem;
}

.places-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.9em;
    color: var(--text-muted);
}

.places-flag {
    width: 20px;
    height: auto;
    vertical-align: middle;
    border-radius: 2px;
}

.places-name {
    color: var(--text-normal);
}

.places-inline-list {
    margin: 0;
    padding-left: 0.75rem;
    font-size: 0.9em;
    color: var(--text-muted);
    line-height: 1.6;
}

.places-table-section {
    margin-top: 0.5rem;
}

.places-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85em;
}

.places-table th {
    text-align: left;
    padding: 0.5rem 0.75rem;
    border-bottom: 2px solid var(--background-modifier-border);
    color: var(--text-muted);
    font-weight: 500;
    font-size: 0.85em;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.places-table td {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--background-modifier-border);
    color: var(--text-normal);
}

.places-table tbody tr:hover {
    background: var(--background-secondary);
}

.places-table tbody tr:last-child td {
    border-bottom: none;
}

.places-count span {
    color: var(--text-muted);
    font-size: 0.9em;
}

.places-error {
    color: var(--text-error);
    padding: 1rem;
    background: var(--background-secondary);
    border-radius: 4px;
    border-left: 3px solid var(--text-error);
}

/* Animation for table rows */
.places-table tbody tr {
    animation: places-fade-in 0.3s ease-out;
    animation-fill-mode: both;
}

@keyframes places-fade-in {
    from {
        opacity: 0;
        transform: translateY(-4px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Stagger animation for rows */
.places-table tbody tr:nth-child(1) { animation-delay: 0.02s; }
.places-table tbody tr:nth-child(2) { animation-delay: 0.04s; }
.places-table tbody tr:nth-child(3) { animation-delay: 0.06s; }
.places-table tbody tr:nth-child(4) { animation-delay: 0.08s; }
.places-table tbody tr:nth-child(5) { animation-delay: 0.10s; }
.places-table tbody tr:nth-child(6) { animation-delay: 0.12s; }
.places-table tbody tr:nth-child(7) { animation-delay: 0.14s; }
.places-table tbody tr:nth-child(8) { animation-delay: 0.16s; }
.places-table tbody tr:nth-child(9) { animation-delay: 0.18s; }
.places-table tbody tr:nth-child(10) { animation-delay: 0.20s; }
`;
