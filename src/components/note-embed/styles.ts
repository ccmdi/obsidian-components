export const noteEmbedStyles = /*css*/`
.note-embed-container {
	padding: 1rem;
	border: 1px solid var(--background-modifier-border);
	border-radius: 4px;
	background: var(--background-secondary);
	overflow: auto;
	opacity: 0;
	transition: opacity 0.15s ease-in;
}

.note-embed-container.note-embed-ready {
	opacity: 1;
}

.note-embed-error {
	color: var(--text-error);
	padding: 1rem;
	text-align: center;
	border: 1px solid var(--text-error);
	border-radius: 4px;
	background: var(--background-secondary);
}
`;
