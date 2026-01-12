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
		const showLabel = args.showLabel === 'true';

		const container = el.createDiv();
		container.style.setProperty('--pb-height', `${args.height}px`);
		container.style.setProperty('--pb-bg-color', args.backgroundColor);
		container.style.setProperty('--pb-bar-color', args.barColor);
		container.style.setProperty('--pb-text-color', args.textColor);
		container.style.setProperty('--pb-border-radius', `${args.borderRadius}px`);
		container.addClass('progress-bar-container');

		const progressFill = container.createDiv({ cls: 'progress-bar-fill' });
		progressFill.style.width = `${progress}%`;

		let label: HTMLElement | null = null;
		if (showLabel) {
			const labelOverlay = container.createDiv({ cls: 'progress-bar-label' });
			label = labelOverlay.createEl('span', { text: `${progress}%` });
		}

		instance.data.progressFill = progressFill;
		instance.data.label = label;
		instance.data.currentProgress = progress;
	},

	renderRefreshDuration: 500, // Animation duration - delayed full refresh waits for this

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
