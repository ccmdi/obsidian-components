import type { App, MarkdownPostProcessorContext } from 'obsidian';
import type { Component } from 'components';
import { ComponentInstance } from 'components';
import { progressBarStyles } from './styles';

export const progressBar: Component<['progress', 'height', 'backgroundColor', 'barColor', 'textColor', 'borderRadius', 'showLabel']> = {
	keyName: 'progress-bar',
	icon: 'bar-chart-2',
	name: 'Progress Bar',
	description: 'Display a progress bar with percentage.',
	args: {
		progress: {
			description: 'Progress value (0-100). Can use frontmatter: progress=fm.progress',
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
	render: async (
		args,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext,
		app: App,
		instance: ComponentInstance,
	) => {
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

		if (barColor.startsWith('var(') || barColor.startsWith('#') || barColor.startsWith('rgb')) {
			progressFill.style.backgroundColor = barColor;
		} else {
			progressFill.style.backgroundColor = barColor;
		}

		if (showLabel) {
			const labelOverlay = container.createDiv({ cls: 'progress-bar-label' });
			labelOverlay.style.position = 'absolute';
			labelOverlay.style.width = '100%';
			labelOverlay.style.height = '100%';
			labelOverlay.style.display = 'flex';
			labelOverlay.style.alignItems = 'center';
			labelOverlay.style.justifyContent = 'center';

			const label = labelOverlay.createEl('span');
			label.textContent = `${progress}%`;
			label.style.color = textColor;
			label.style.fontWeight = 'bold';
		}
	},
};
