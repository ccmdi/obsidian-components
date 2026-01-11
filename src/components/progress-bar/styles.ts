export const progressBarStyles = /*css*/`
.progress-bar-container {
	position: relative;
	width: 100%;
	height: var(--pb-height, 30px);
	background-color: var(--pb-bg-color, #363636);
	border-radius: var(--pb-border-radius, 5px);
	overflow: hidden;
	box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
}

.progress-bar-fill {
	position: absolute;
	left: 0;
	top: 0;
	height: 100%;
	transition: width 0.5s ease-in-out;
	background-color: var(--pb-bar-color, var(--color-accent));
}

.progress-bar-label {
	position: absolute;
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	pointer-events: none;
	user-select: none;
}

.progress-bar-label span {
	color: var(--pb-text-color, white);
	font-weight: bold;
	text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}
`;
