export const remoteStyles = `
.remote-wrapper {
	position: relative;
}
	
.remote-error {
	color: var(--text-error);
}

.remote-content {
	cursor: text;
}

.remote-content input[type="checkbox"] {
	cursor: pointer;
}

.remote-editor {
	width: 100%;
	min-height: 400px;
	padding: 8px;
	font-family: var(--font-monospace);
	font-size: var(--font-text-size);
	background: var(--background-primary);
	color: var(--text-normal);
	border: 1px solid var(--background-modifier-border);
	border-radius: 4px;
	resize: vertical;
}

.remote-editor:focus {
	outline: none;
	border-color: var(--interactive-accent);
}
`;
