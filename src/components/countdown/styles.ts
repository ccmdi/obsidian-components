export const countdownStyles = /*css*/`
.countdown-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 1rem;
	gap: 0.5rem;
}

.countdown-name {
	font-size: 1.2em;
	font-weight: 600;
	color: var(--text-normal);
	text-align: center;
}

.countdown-time {
	font-size: 2em;
	font-weight: 700;
	color: var(--color-accent);
	text-align: center;
	font-variant-numeric: tabular-nums;
}

.countdown-passed {
	color: var(--text-muted);
	font-size: 1.2em;
	font-weight: 500;
}

.countdown-error {
	color: var(--text-error);
	padding: 1rem;
	text-align: center;
}

/* Segments style */
.countdown-segments {
	display: flex;
	gap: 0.75rem;
	flex-wrap: wrap;
	justify-content: center;
}

.countdown-segment {
	display: flex;
	flex-direction: column;
	align-items: center;
	background: var(--background-secondary);
	border: 1px solid var(--background-modifier-border);
	border-radius: 8px;
	padding: 0.75rem 1rem;
	min-width: 60px;
}

.countdown-segment-value {
	font-size: 1.75em;
	font-weight: 700;
	color: var(--color-accent);
	font-variant-numeric: tabular-nums;
	line-height: 1.2;
}

.countdown-segment-label {
	font-size: 0.75em;
	color: var(--text-muted);
	text-transform: uppercase;
	letter-spacing: 0.5px;
	margin-top: 2px;
}

.countdown-passed-message {
	color: var(--text-muted);
	font-size: 1.2em;
	padding: 1rem;
}

/* Minimal style */
.countdown-minimal {
	font-size: 1.5em;
	font-weight: 600;
	color: var(--text-normal);
	font-variant-numeric: tabular-nums;
	font-family: var(--font-monospace);
}

.countdown-style-minimal .countdown-container {
	padding: 0.5rem;
}

/* Compact style */
.countdown-compact {
	font-size: 1em;
	font-weight: 500;
	color: var(--text-normal);
	font-variant-numeric: tabular-nums;
}

.countdown-style-compact .countdown-container {
	padding: 0.5rem;
	flex-direction: row;
	gap: 0.5rem;
}

.countdown-style-compact .countdown-name {
	font-size: 1em;
	font-weight: 500;
}

.countdown-style-compact .countdown-name::after {
	content: ':';
}
`;
