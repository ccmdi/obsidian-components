export const progressBarStyles = /*css*/`
.progress-bar-wrapper {
	display: flex;
	flex-direction: column;
	gap: 4px;
	width: 100%;
}

.progress-bar-row {
	display: flex;
	align-items: center;
	gap: 8px;
	width: 100%;
}

.progress-bar-container {
	position: relative;
	flex: 1;
	overflow: hidden;
	box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.15);
}

.progress-bar-fill {
	position: absolute;
	left: 0;
	top: 0;
	height: 100%;
	transition: width 0.5s ease-in-out;
}

/* Striped pattern */
.progress-bar-striped {
	background-image: linear-gradient(
		45deg,
		rgba(255, 255, 255, 0.15) 25%,
		transparent 25%,
		transparent 50%,
		rgba(255, 255, 255, 0.15) 50%,
		rgba(255, 255, 255, 0.15) 75%,
		transparent 75%,
		transparent
	);
	background-size: 1rem 1rem;
}

/* Animated stripes */
.progress-bar-animated {
	animation: progress-bar-stripes 1s linear infinite;
}

@keyframes progress-bar-stripes {
	from { background-position: 1rem 0; }
	to { background-position: 0 0; }
}

/* Glow effect */
.progress-bar-glow {
	transition: width 0.5s ease-in-out, box-shadow 0.3s ease;
}

/* Internal labels (center, inside-left, inside-right) */
.progress-bar-label {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	pointer-events: none;
	user-select: none;
}

.progress-bar-label-center {
	justify-content: center;
}

.progress-bar-label-inside-left {
	justify-content: flex-start;
	padding-left: 8px;
}

.progress-bar-label-inside-right {
	justify-content: flex-end;
	padding-right: 8px;
}

.progress-bar-label span {
	font-weight: 600;
	font-size: 0.85em;
	text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	font-variant-numeric: tabular-nums;
}

/* External labels (above, below, left, right) */
.progress-bar-label-external {
	font-weight: 500;
	font-size: 0.9em;
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}

.progress-bar-label-above,
.progress-bar-label-below {
	text-align: center;
}

.progress-bar-label-left,
.progress-bar-label-right {
	flex-shrink: 0;
	min-width: 40px;
}

.progress-bar-label-left {
	text-align: right;
}

.progress-bar-label-right {
	text-align: left;
}
`;
