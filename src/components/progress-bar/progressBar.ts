import type { Component } from 'components';
import { progressBarStyles } from './styles';
import { parseBoolean } from 'utils';

type LabelPosition = 'center' | 'left' | 'right' | 'above' | 'below' | 'inside-left' | 'inside-right' | 'none';

function animateValue(element: HTMLElement, start: number, end: number, duration: number) {
	const startTime = performance.now();

	const step = (currentTime: number) => {
		const elapsed = currentTime - startTime;
		const progress = Math.min(elapsed / duration, 1);

		// Ease-in-out curve to match the CSS transition
		const eased = progress < 0.5
			? 2 * progress * progress
			: 1 - Math.pow(-2 * progress + 2, 2) / 2;

		const current = Math.round(start + (end - start) * eased);
		element.textContent = `${current}%`;

		if (progress < 1) {
			requestAnimationFrame(step);
		}
	};

	requestAnimationFrame(step);
}

function formatLabel(progress: number, format: string): string {
	return format
		.replace('{value}', String(Math.round(progress)))
		.replace('{decimal}', progress.toFixed(1))
		.replace('{percent}', `${Math.round(progress)}%`);
}

export const progressBar: Component<[
	'progress', 'height', 'backgroundColor', 'barColor', 'textColor',
	'borderRadius', 'showLabel', 'labelPosition', 'labelFormat',
	'striped', 'animated', 'showGlow'
]> = {
	keyName: 'progress-bar',
	name: 'Progress Bar',
	description: 'Display a progress bar with percentage.',
	icon: 'bar-chart-2',
	args: {
		progress: {
			description: 'Progress value (0-100)',
			default: '0',
		},
		height: {
			description: 'Height of the progress bar in pixels',
			default: '24',
		},
		backgroundColor: {
			description: 'Background color of the progress bar track',
			default: 'var(--background-modifier-border)',
		},
		barColor: {
			description: 'Color of the progress fill',
			default: 'var(--color-accent)',
		},
		textColor: {
			description: 'Color of the percentage text',
			default: 'var(--text-on-accent)',
		},
		borderRadius: {
			description: 'Border radius in pixels',
			default: '4',
		},
		showLabel: {
			description: 'Whether to show the percentage label (deprecated, use labelPosition=none)',
			default: 'true',
		},
		labelPosition: {
			description: 'Position of the label: center, left, right, above, below, inside-left, inside-right, or none',
			default: 'center',
		},
		labelFormat: {
			description: 'Custom label format. Use {value}, {decimal}, or {percent}',
			default: '{percent}',
		},
		striped: {
			description: 'Show striped pattern on the progress bar',
			default: 'false',
		},
		animated: {
			description: 'Animate the striped pattern (requires striped=true)',
			default: 'false',
		},
		showGlow: {
			description: 'Show a subtle glow effect on the progress bar',
			default: 'false',
		},
	},
	isMountable: true,
	aliases: ['progress'],
	styles: progressBarStyles,

	render: async (args, el, ctx, app, instance) => {
		let progress = parseFloat(args.progress) || 0;
		progress = Math.max(0, Math.min(100, progress));

		const height = parseInt(args.height) || 24;
		const backgroundColor = args.backgroundColor;
		const barColor = args.barColor;
		const textColor = args.textColor;
		const borderRadius = args.borderRadius;
		const showLabel = parseBoolean(args.showLabel, true);
		const labelPosition = (showLabel ? (args.labelPosition || 'center') : 'none') as LabelPosition;
		const labelFormat = args.labelFormat || '{percent}';
		const striped = parseBoolean(args.striped, false);
		const animated = parseBoolean(args.animated, false);
		const showGlow = parseBoolean(args.showGlow, false);

		// Wrapper for above/below label positions
		const wrapper = el.createDiv({ cls: 'progress-bar-wrapper' });

		// Above label
		let aboveLabel: HTMLElement | null = null;
		if (labelPosition === 'above') {
			aboveLabel = wrapper.createDiv({ cls: 'progress-bar-label-external progress-bar-label-above' });
			aboveLabel.textContent = formatLabel(progress, labelFormat);
			aboveLabel.style.color = 'var(--text-normal)';
		}

		// Container with left/right external labels
		const rowContainer = wrapper.createDiv({ cls: 'progress-bar-row' });

		// Left external label
		let leftLabel: HTMLElement | null = null;
		if (labelPosition === 'left') {
			leftLabel = rowContainer.createDiv({ cls: 'progress-bar-label-external progress-bar-label-left' });
			leftLabel.textContent = formatLabel(progress, labelFormat);
			leftLabel.style.color = 'var(--text-normal)';
		}

		// Main container
		const container = rowContainer.createDiv({ cls: 'progress-bar-container' });
		container.style.height = `${height}px`;
		container.style.backgroundColor = backgroundColor;
		container.style.borderRadius = `${borderRadius}px`;

		// Progress fill
		const fillClasses = ['progress-bar-fill'];
		if (striped) fillClasses.push('progress-bar-striped');
		if (animated) fillClasses.push('progress-bar-animated');
		if (showGlow) fillClasses.push('progress-bar-glow');

		const progressFill = container.createDiv({ cls: fillClasses.join(' ') });
		progressFill.style.width = `${progress}%`;
		progressFill.style.backgroundColor = barColor;
		progressFill.style.borderRadius = `${borderRadius}px`;

		if (showGlow) {
			progressFill.style.boxShadow = `0 0 8px ${barColor}`;
		}

		// Internal labels (center, inside-left, inside-right)
		let internalLabel: HTMLElement | null = null;
		if (['center', 'inside-left', 'inside-right'].includes(labelPosition)) {
			const labelOverlay = container.createDiv({
				cls: `progress-bar-label progress-bar-label-${labelPosition}`
			});

			internalLabel = labelOverlay.createEl('span');
			internalLabel.textContent = formatLabel(progress, labelFormat);
			internalLabel.style.color = textColor;
		}

		// Right external label
		let rightLabel: HTMLElement | null = null;
		if (labelPosition === 'right') {
			rightLabel = rowContainer.createDiv({ cls: 'progress-bar-label-external progress-bar-label-right' });
			rightLabel.textContent = formatLabel(progress, labelFormat);
			rightLabel.style.color = 'var(--text-normal)';
		}

		// Below label
		let belowLabel: HTMLElement | null = null;
		if (labelPosition === 'below') {
			belowLabel = wrapper.createDiv({ cls: 'progress-bar-label-external progress-bar-label-below' });
			belowLabel.textContent = formatLabel(progress, labelFormat);
			belowLabel.style.color = 'var(--text-normal)';
		}

		// Store refs for renderRefresh
		instance.data.progressFill = progressFill;
		instance.data.internalLabel = internalLabel;
		instance.data.aboveLabel = aboveLabel;
		instance.data.belowLabel = belowLabel;
		instance.data.leftLabel = leftLabel;
		instance.data.rightLabel = rightLabel;
		instance.data.currentProgress = progress;
		instance.data.labelFormat = labelFormat;
	},

	renderRefresh: async (args, el, ctx, app, instance) => {
		let newProgress = parseFloat(args.progress) || 0;
		newProgress = Math.max(0, Math.min(100, newProgress));

		const oldProgress = instance.data.currentProgress;
		instance.data.currentProgress = newProgress;

		const labelFormat = args.labelFormat || instance.data.labelFormat || '{percent}';

		// Animate the bar (CSS transition handles this)
		if (instance.data.progressFill) {
			instance.data.progressFill.style.width = `${newProgress}%`;
		}

		// Animate internal label
		if (instance.data.internalLabel) {
			animateValue(instance.data.internalLabel, oldProgress, newProgress, 500);
		}

		// Update external labels (no animation for simplicity)
		const formattedLabel = formatLabel(newProgress, labelFormat);
		if (instance.data.aboveLabel) {
			instance.data.aboveLabel.textContent = formattedLabel;
		}
		if (instance.data.belowLabel) {
			instance.data.belowLabel.textContent = formattedLabel;
		}
		if (instance.data.leftLabel) {
			instance.data.leftLabel.textContent = formattedLabel;
		}
		if (instance.data.rightLabel) {
			instance.data.rightLabel.textContent = formattedLabel;
		}
	},
};
