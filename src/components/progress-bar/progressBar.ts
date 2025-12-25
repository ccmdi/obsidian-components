import type { Component } from 'components';
import { progressBarStyles } from './styles';

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

export const progressBar: Component<['progress', 'height', 'backgroundColor', 'barColor', 'textColor', 'borderRadius', 'showLabel']> = {
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
			default: '30',
		},
		backgroundColor: {
			description: 'Background color of the progress bar',
			default: '#363636',
		},
		barColor: {
			description: 'Color of the progress fill (CSS class or color)',
			default: 'var(--color-accent)',
		},
		textColor: {
			description: 'Color of the percentage text',
			default: 'white',
		},
		borderRadius: {
			description: 'Border radius in pixels',
			default: '5',
		},
		showLabel: {
			description: 'Whether to show the percentage label',
			default: 'true',
		},
	},
	isMountable: true,
	aliases: ['progress'],
	styles: progressBarStyles,

	render: async (args, el, ctx, app, instance) => {
		let progress = parseFloat(args.progress) || 0;
		progress = Math.max(0, Math.min(100, progress));

		const height = args.height;
		const backgroundColor = args.backgroundColor;
		const barColor = args.barColor;
		const textColor = args.textColor;
		const borderRadius = args.borderRadius;
		const showLabel = args.showLabel === 'true';

		const container = el.createDiv({ cls: 'progress-bar-container' });
		container.style.position = 'relative';
		container.style.width = '100%';
		container.style.height = `${height}px`;
		container.style.backgroundColor = backgroundColor;
		container.style.borderRadius = `${borderRadius}px`;
		container.style.overflow = 'hidden';

		const progressFill = container.createDiv({ cls: 'progress-bar-fill' });
		progressFill.style.position = 'absolute';
		progressFill.style.left = '0';
		progressFill.style.top = '0';
		progressFill.style.width = `${progress}%`;
		progressFill.style.height = '100%';
		progressFill.style.transition = 'width 0.5s ease-in-out';
		progressFill.style.backgroundColor = barColor;

		let label: HTMLElement | null = null;
		if (showLabel) {
			const labelOverlay = container.createDiv({ cls: 'progress-bar-label' });
			labelOverlay.style.position = 'absolute';
			labelOverlay.style.width = '100%';
			labelOverlay.style.height = '100%';
			labelOverlay.style.display = 'flex';
			labelOverlay.style.alignItems = 'center';
			labelOverlay.style.justifyContent = 'center';

			label = labelOverlay.createEl('span');
			label.textContent = `${progress}%`;
			label.style.color = textColor;
			label.style.fontWeight = 'bold';
		}

		// Store refs for renderRefresh
		instance.data.progressFill = progressFill;
		instance.data.label = label;
		instance.data.currentProgress = progress;
	},

	renderRefresh: async (args, el, ctx, app, instance) => {
		let newProgress = parseFloat(args.progress) || 0;
		newProgress = Math.max(0, Math.min(100, newProgress));

		const oldProgress = instance.data.currentProgress;
		instance.data.currentProgress = newProgress;

		// Animate the bar (CSS transition handles this)
		instance.data.progressFill.style.width = `${newProgress}%`;

		// Animate the label count
		if (instance.data.label) {
			animateValue(instance.data.label, oldProgress, newProgress, 500);
		}
	},
};
