import type { App, MarkdownPostProcessorContext } from 'obsidian';
import type { Component } from 'components';
import { ComponentInstance } from 'components';
import { countdownStyles } from './styles';
import { parseBoolean } from 'utils';

type CountdownStyle = 'simple' | 'segments' | 'minimal' | 'compact';

interface TimeSegments {
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
}

const getTimeSegments = (diff: number): TimeSegments => {
	const duration = window.moment.duration(Math.abs(diff));
	return {
		days: Math.floor(duration.asDays()),
		hours: duration.hours(),
		minutes: duration.minutes(),
		seconds: duration.seconds()
	};
};

const padNumber = (num: number): string => String(num).padStart(2, '0');

const renderSimple = (
	container: HTMLElement,
	segments: TimeSegments,
	showTime: boolean,
	isPast: boolean
): void => {
	const timeDisplay = container.querySelector('.countdown-time') as HTMLElement;
	if (!timeDisplay) return;

	if (isPast) {
		timeDisplay.textContent = 'Event has passed';
		timeDisplay.addClass('countdown-passed');
		return;
	}

	timeDisplay.removeClass('countdown-passed');

	let displayText: string;
	if (showTime) {
		displayText = `${segments.days}d ${segments.hours}h ${segments.minutes}m ${segments.seconds}s`;
	} else {
		displayText = `${segments.days} ${segments.days === 1 ? 'day' : 'days'}`;
	}

	timeDisplay.textContent = displayText;
};

const renderSegments = (
	container: HTMLElement,
	segments: TimeSegments,
	showTime: boolean,
	isPast: boolean
): void => {
	const segmentsContainer = container.querySelector('.countdown-segments') as HTMLElement;
	if (!segmentsContainer) return;

	if (isPast) {
		segmentsContainer.empty();
		segmentsContainer.createEl('div', { cls: 'countdown-passed-message', text: 'Event has passed' });
		return;
	}

	// Update existing segments or create new ones
	const segmentData = showTime
		? [
			{ value: segments.days, label: 'Days' },
			{ value: segments.hours, label: 'Hours' },
			{ value: segments.minutes, label: 'Minutes' },
			{ value: segments.seconds, label: 'Seconds' }
		]
		: [{ value: segments.days, label: segments.days === 1 ? 'Day' : 'Days' }];

	const existingSegments = segmentsContainer.querySelectorAll('.countdown-segment');

	if (existingSegments.length !== segmentData.length) {
		// Rebuild segments
		segmentsContainer.empty();
		for (const seg of segmentData) {
			const segment = segmentsContainer.createEl('div', { cls: 'countdown-segment' });
			segment.createEl('div', { cls: 'countdown-segment-value', text: padNumber(seg.value) });
			segment.createEl('div', { cls: 'countdown-segment-label', text: seg.label });
		}
	} else {
		// Update existing segments
		existingSegments.forEach((segment, i) => {
			const valueEl = segment.querySelector('.countdown-segment-value');
			const labelEl = segment.querySelector('.countdown-segment-label');
			if (valueEl) valueEl.textContent = padNumber(segmentData[i].value);
			if (labelEl) labelEl.textContent = segmentData[i].label;
		});
	}
};

const renderMinimal = (
	container: HTMLElement,
	segments: TimeSegments,
	showTime: boolean,
	isPast: boolean
): void => {
	const timeDisplay = container.querySelector('.countdown-minimal') as HTMLElement;
	if (!timeDisplay) return;

	if (isPast) {
		timeDisplay.textContent = 'Passed';
		timeDisplay.addClass('countdown-passed');
		return;
	}

	timeDisplay.removeClass('countdown-passed');

	let displayText: string;
	if (showTime) {
		displayText = `${segments.days}:${padNumber(segments.hours)}:${padNumber(segments.minutes)}:${padNumber(segments.seconds)}`;
	} else {
		displayText = `${segments.days}d`;
	}

	timeDisplay.textContent = displayText;
};

const renderCompact = (
	container: HTMLElement,
	segments: TimeSegments,
	showTime: boolean,
	isPast: boolean
): void => {
	const timeDisplay = container.querySelector('.countdown-compact') as HTMLElement;
	if (!timeDisplay) return;

	if (isPast) {
		timeDisplay.textContent = 'Passed';
		timeDisplay.addClass('countdown-passed');
		return;
	}

	timeDisplay.removeClass('countdown-passed');

	const parts: string[] = [];
	if (segments.days > 0) parts.push(`${segments.days}d`);
	if (showTime) {
		if (segments.hours > 0 || segments.days > 0) parts.push(`${segments.hours}h`);
		parts.push(`${segments.minutes}m`);
		parts.push(`${segments.seconds}s`);
	}

	timeDisplay.textContent = parts.join(' ');
};

export const countdown: Component<['date', 'name', 'showTime', 'style', 'countUp', 'hideWhenPassed']> = {
	keyName: 'countdown',
	name: 'Event Countdown',
	description: 'Display countdown to a specific date/event',
	icon: 'timer',
	args: {
		date: {
			description: 'Target date (YYYY-MM-DD or any format moment.js understands)',
			required: true,
		},
		name: {
			description: 'Name of the event',
			default: '',
		},
		showTime: {
			description: 'Show hours/minutes/seconds in addition to days',
			default: 'false',
		},
		style: {
			description: 'Display style: simple, segments, minimal, or compact',
			default: 'simple',
		},
		countUp: {
			description: 'Count up from the date instead of down (useful for tracking time since an event)',
			default: 'false',
		},
		hideWhenPassed: {
			description: 'Hide the component when the event has passed',
			default: 'false',
		},
	},
	isMountable: true,
	aliases: ['event-countdown', 'timer'],
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

		const showTime = parseBoolean(args.showTime, false);
		const countUp = parseBoolean(args.countUp, false);
		const hideWhenPassed = parseBoolean(args.hideWhenPassed, false);
		const eventName = args.name;
		const style = (args.style || 'simple') as CountdownStyle;

		const container = el.createDiv({ cls: `countdown-container countdown-style-${style}` });

		if (eventName) {
			container.createDiv({ cls: 'countdown-name', text: eventName });
		}

		// Create the appropriate display element based on style
		switch (style) {
			case 'segments':
				container.createDiv({ cls: 'countdown-segments' });
				break;
			case 'minimal':
				container.createDiv({ cls: 'countdown-minimal' });
				break;
			case 'compact':
				container.createDiv({ cls: 'countdown-compact' });
				break;
			default:
				container.createDiv({ cls: 'countdown-time' });
		}

		// Store refs for potential renderRefresh
		instance.data.container = container;
		instance.data.targetDate = targetDate;
		instance.data.showTime = showTime;
		instance.data.countUp = countUp;
		instance.data.hideWhenPassed = hideWhenPassed;
		instance.data.style = style;

		const updateCountdown = () => {
			const now = window.moment();
			let diff = targetDate.diff(now);
			const isPast = diff < 0;

			// Handle countUp mode
			if (countUp) {
				diff = Math.abs(diff);
			}

			// Hide if passed and hideWhenPassed is true
			if (isPast && !countUp && hideWhenPassed) {
				container.style.display = 'none';
				return;
			} else {
				container.style.display = '';
			}

			const segments = getTimeSegments(diff);
			const effectivelyPast = isPast && !countUp;

			switch (style) {
				case 'segments':
					renderSegments(container, segments, showTime, effectivelyPast);
					break;
				case 'minimal':
					renderMinimal(container, segments, showTime, effectivelyPast);
					break;
				case 'compact':
					renderCompact(container, segments, showTime, effectivelyPast);
					break;
				default:
					renderSimple(container, segments, showTime, effectivelyPast);
			}
		};

		// Update immediately
		updateCountdown();

		// Update every second if showing time, otherwise every minute
		const updateInterval = showTime ? 1000 : 60000;
		ComponentInstance.createUpdateLoop(instance, updateCountdown, updateInterval, true);
	},
};
