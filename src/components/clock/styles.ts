export const clockStyles = /*css*/`
    .clock-container {
        text-align: center;
        max-width: 100%;
        width: 100%;
        margin-left: auto;
        margin-right: auto;
        padding: 0.25em;
    }

    .clock-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5em;
    }

    /* Digital clock */
    .clock-digital {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25em;
    }

    .clock-time {
        font-size: 2em;
        font-family: var(--font-monospace);
        font-weight: bold;
        font-variant-numeric: tabular-nums;
        color: var(--text-normal);
    }

    .clock-date {
        font-size: 0.9em;
        color: var(--text-muted);
    }

    /* Timezone/custom label */
    .clock-label {
        font-size: 0.85em;
        color: var(--text-muted);
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    /* Binary clock */
    .clock-binary {
        font-family: var(--font-monospace);
        font-size: 1.1em;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .clock-binary-row {
        display: flex;
        align-items: center;
        gap: 2px;
    }

    .clock-binary-label {
        color: var(--text-muted);
        width: 24px;
        text-align: right;
    }

    .clock-binary-bit {
        font-weight: bold;
        width: 12px;
        text-align: center;
    }

    .clock-binary-bit.on {
        color: var(--text-accent);
    }

    .clock-binary-bit.off {
        color: var(--text-faint);
    }

    /* Matrix clock */
    .clock-matrix {
        font-family: 'Courier New', var(--font-monospace);
        background-color: #0a0a0a;
        color: #00ff00;
        padding: 12px;
        border-radius: 6px;
        font-size: 1.2em;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
    }

    .clock-matrix-noise {
        opacity: 0.3;
        font-size: 0.8em;
        letter-spacing: 2px;
    }

    .clock-matrix-time {
        text-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00;
        font-weight: bold;
        font-variant-numeric: tabular-nums;
    }

    /* Analog clock adjustments */
    .clock-analog {
        display: block;
        margin: 0 auto;
    }
`;
