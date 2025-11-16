export const countdownStyles = `
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
}

.countdown-error {
	color: var(--text-error);
	padding: 1rem;
	text-align: center;
}
`;
