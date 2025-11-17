import type { App, MarkdownPostProcessorContext } from 'obsidian';
import type { Component } from 'components';
import { ComponentInstance } from 'components';
import { countdownStyles } from './styles';

export const countdown: Component<['date', 'name', 'showTime']> = {
	keyName: 'countdown',
	icon: 'timer',
	name: 'Event Countdown',
	description: 'Display countdown to a specific date/event',
	args: {
		date: {
			description: 'Target date (YYYY-MM-DD or any format moment.js understands). Can use frontmatter: date=fm.eventDate',
			required: true,
		},
		name: {
			description: 'Name of the event (optional)',
			default: '',
		},
		showTime: {
			description: 'Show hours/minutes/seconds in addition to days',
			default: 'false',
		},
	},
	isMountable: true,
	aliases: ['event-countdown'],
	styles: countdownStyles,
	render: async (
		args,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext,
		app: App,
		instance: ComponentInstance,
	) => {
		const targetDate = window.moment(args.date);

		if (!targetDate.isValid()) {
			el.createDiv({ text: 'Invalid date format', cls: 'countdown-error' });
			return;
		}

		const showTime = args.showTime === 'true';
		const eventName = args.name;

		const container = el.createDiv({ cls: 'countdown-container' });

		if (eventName) {
			const nameEl = container.createDiv({ cls: 'countdown-name' });
			nameEl.textContent = eventName;
		}

		const timeDisplay = container.createDiv({ cls: 'countdown-time' });

		const updateCountdown = () => {
			const now = window.moment();
			const diff = targetDate.diff(now);

			if (diff < 0) {
				timeDisplay.textContent = 'Event has passed';
				timeDisplay.addClass('countdown-passed');
				return;
			}

			const duration = window.moment.duration(diff);
			const days = Math.floor(duration.asDays());
			const hours = duration.hours();
			const minutes = duration.minutes();
			const seconds = duration.seconds();

			let displayText = '';

			if (showTime) {
				displayText = `${days}d ${hours}h ${minutes}m ${seconds}s`;
			} else {
				displayText = `${days} ${days === 1 ? 'day' : 'days'}`;
			}

			timeDisplay.textContent = displayText;
		};

		// Update immediately
		updateCountdown();

		// Update every second if showing time, otherwise every minute
		// Sync to interval for cleaner updates (like the clock component)
		const updateInterval = showTime ? 1000 : 60000;
		ComponentInstance.createUpdateLoop(instance, updateCountdown, updateInterval, true);
	},
};
