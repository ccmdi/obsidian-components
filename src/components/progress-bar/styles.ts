export const progressBarStyles = `
.progress-bar-container {
	box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
}

.progress-bar-fill {
	background: linear-gradient(90deg,
		var(--color-accent) 0%,
		var(--color-accent-hover) 100%);
}

.progress-bar-label {
	pointer-events: none;
	user-select: none;
}

.progress-bar-label span {
	text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}
`;
