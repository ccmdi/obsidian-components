import { Component, ComponentInstance } from "components";
import { parseBoolean } from "utils";
import { clockStyles } from "./styles";

// Get a friendly timezone label from IANA timezone
function getTimezoneLabel(timezone: string): string {
    try {
        // Get the short timezone abbreviation
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            timeZoneName: 'short'
        });
        const parts = formatter.formatToParts(new Date());
        const tzPart = parts.find(p => p.type === 'timeZoneName');
        return tzPart?.value || timezone.split('/').pop()?.replace(/_/g, ' ') || timezone;
    } catch {
        return timezone;
    }
}

// Get city name from IANA timezone
function getCityFromTimezone(timezone: string): string {
    const parts = timezone.split('/');
    return parts[parts.length - 1].replace(/_/g, ' ');
}

export const clock: Component<[
    'type', 'format', 'timezone', 'size', 'showSeconds', 'showDate',
    'background', 'background-color', 'border', 'label', 'showTimezone'
]> = {
    name: 'Clock',
    keyName: 'clock',
    icon: 'clock',
    args: {
        type: {
            description: 'Type of clock (digital, analog, binary, matrix)',
            default: 'digital'
        },
        format: {
            description: 'Format of clock (12 or 24 hour)',
            default: '12'
        },
        timezone: {
            description: 'Timezone of clock (e.g., America/New_York, Europe/London)',
            default: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        size: {
            description: 'Size of analog clock in pixels',
            default: '200'
        },
        showSeconds: {
            description: 'Show seconds',
            default: 'true'
        },
        showDate: {
            description: 'Show date below time',
            default: 'false'
        },
        background: {
            description: 'Background color of clock',
            default: 'var(--background-primary)'
        },
        'background-color': {
            description: 'Background color of clock (alias)',
            default: 'var(--background-primary)'
        },
        border: {
            description: 'Border style for analog clock',
            default: '2px solid var(--text-normal)'
        },
        label: {
            description: 'Custom label to show below the clock (e.g., city name)',
            default: ''
        },
        showTimezone: {
            description: 'Show timezone abbreviation (auto, city, abbr, full, or none)',
            default: 'none'
        }
    },
    isMountable: true,
    styles: clockStyles,
    render: async (args, el, ctx, app, instance: ComponentInstance) => {
        const type = args.type || 'digital';
        const format = args.format || '12';
        const timezone = args.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        const size = args.size || '200';
        const showSeconds = parseBoolean(args.showSeconds, true);
        const showDate = parseBoolean(args.showDate, false);
        const customLabel = args.label || '';
        const showTimezone = args.showTimezone || 'none';

        el.addClass('clock-container');

        // Create wrapper for clock and label
        const wrapper = el.createEl('div', { cls: 'clock-wrapper' });

        // Determine label text
        let labelText = customLabel;
        if (!labelText && showTimezone !== 'none') {
            switch (showTimezone) {
                case 'city':
                    labelText = getCityFromTimezone(timezone);
                    break;
                case 'abbr':
                    labelText = getTimezoneLabel(timezone);
                    break;
                case 'full':
                    labelText = timezone.replace(/_/g, ' ');
                    break;
                case 'auto':
                    labelText = getCityFromTimezone(timezone);
                    break;
            }
        }

        const createDigitalClock = () => {
            const clockEl = wrapper.createEl('div', { cls: 'clock-digital' });
            const timeEl = clockEl.createEl('div', { cls: 'clock-time' });
            let dateEl: HTMLElement | null = null;
            if (showDate) {
                dateEl = clockEl.createEl('div', { cls: 'clock-date' });
            }

            const updateDigital = () => {
                const now = new Date();
                const timeOptions: Intl.DateTimeFormatOptions = {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: format === '12',
                    timeZone: timezone
                };

                if (showSeconds) {
                    timeOptions.second = '2-digit';
                }

                timeEl.textContent = now.toLocaleTimeString('en-US', timeOptions);

                if (dateEl) {
                    const dateOptions: Intl.DateTimeFormatOptions = {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        timeZone: timezone
                    };
                    dateEl.textContent = now.toLocaleDateString('en-US', dateOptions);
                }
            };

            ComponentInstance.createUpdateLoop(instance, updateDigital, 1000, true);
        };

        const createAnalogClock = () => {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            const sizeNum = parseInt(size);
            svg.setAttribute('width', size);
            svg.setAttribute('height', size);
            svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
            svg.classList.add('clock-analog');
            svg.style.borderRadius = '50%';
            svg.style.maxWidth = '100%';
            svg.style.height = 'auto';
            svg.style.aspectRatio = '1 / 1';
            svg.style.border = args.border || '2px solid var(--text-normal)';
            svg.style.background = args.background || args['background-color'] || 'var(--background-primary)';

            const center = sizeNum / 2;
            const radius = center - 20;

            // Create clock face numbers
            for (let i = 1; i <= 12; i++) {
                const angle = (i * 30 - 90) * Math.PI / 180;
                const x = center + (radius - 15) * Math.cos(angle);
                const y = center + (radius - 15) * Math.sin(angle);

                const number = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                number.setAttribute('x', x.toString());
                number.setAttribute('y', (y + 5).toString());
                number.setAttribute('text-anchor', 'middle');
                number.setAttribute('fill', 'var(--text-normal)');
                number.setAttribute('font-size', '14');
                number.textContent = i.toString();
                svg.appendChild(number);
            }

            // Hour marks
            for (let i = 0; i < 12; i++) {
                const angle = (i * 30) * Math.PI / 180;
                const x1 = center + (radius - 5) * Math.cos(angle);
                const y1 = center + (radius - 5) * Math.sin(angle);
                const x2 = center + radius * Math.cos(angle);
                const y2 = center + radius * Math.sin(angle);

                const mark = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                mark.setAttribute('x1', x1.toString());
                mark.setAttribute('y1', y1.toString());
                mark.setAttribute('x2', x2.toString());
                mark.setAttribute('y2', y2.toString());
                mark.setAttribute('stroke', 'var(--text-normal)');
                mark.setAttribute('stroke-width', '2');
                svg.appendChild(mark);
            }

            // Create hands
            const hourHand = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            hourHand.setAttribute('x1', center.toString());
            hourHand.setAttribute('y1', center.toString());
            hourHand.setAttribute('stroke', 'var(--text-normal)');
            hourHand.setAttribute('stroke-width', '4');
            hourHand.setAttribute('stroke-linecap', 'round');
            svg.appendChild(hourHand);

            const minuteHand = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            minuteHand.setAttribute('x1', center.toString());
            minuteHand.setAttribute('y1', center.toString());
            minuteHand.setAttribute('stroke', 'var(--text-normal)');
            minuteHand.setAttribute('stroke-width', '2');
            minuteHand.setAttribute('stroke-linecap', 'round');
            svg.appendChild(minuteHand);

            let secondHand: SVGLineElement | null = null;
            if (showSeconds) {
                secondHand = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                secondHand.setAttribute('x1', center.toString());
                secondHand.setAttribute('y1', center.toString());
                secondHand.setAttribute('stroke', 'var(--text-accent)');
                secondHand.setAttribute('stroke-width', '1');
                secondHand.setAttribute('stroke-linecap', 'round');
                svg.appendChild(secondHand);
            }

            // Center dot
            const centerDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            centerDot.setAttribute('cx', center.toString());
            centerDot.setAttribute('cy', center.toString());
            centerDot.setAttribute('r', '4');
            centerDot.setAttribute('fill', 'var(--text-normal)');
            svg.appendChild(centerDot);

            const updateAnalog = () => {
                const now = new Date();
                // Convert to timezone
                const tzTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
                const hours = tzTime.getHours() % 12;
                const minutes = tzTime.getMinutes();
                const seconds = tzTime.getSeconds();

                const hourAngle = (hours * 30 + minutes * 0.5 - 90) * Math.PI / 180;
                const minuteAngle = (minutes * 6 - 90) * Math.PI / 180;
                const secondAngle = (seconds * 6 - 90) * Math.PI / 180;

                const hourX = center + (radius * 0.5) * Math.cos(hourAngle);
                const hourY = center + (radius * 0.5) * Math.sin(hourAngle);
                hourHand.setAttribute('x2', hourX.toString());
                hourHand.setAttribute('y2', hourY.toString());

                const minuteX = center + (radius * 0.8) * Math.cos(minuteAngle);
                const minuteY = center + (radius * 0.8) * Math.sin(minuteAngle);
                minuteHand.setAttribute('x2', minuteX.toString());
                minuteHand.setAttribute('y2', minuteY.toString());

                if (secondHand) {
                    const secondX = center + (radius * 0.9) * Math.cos(secondAngle);
                    const secondY = center + (radius * 0.9) * Math.sin(secondAngle);
                    secondHand.setAttribute('x2', secondX.toString());
                    secondHand.setAttribute('y2', secondY.toString());
                }
            };

            wrapper.appendChild(svg);
            ComponentInstance.createUpdateLoop(instance, updateAnalog, 1000, true);
        };

        const createBinaryClock = () => {
            const clockEl = wrapper.createEl('div', { cls: 'clock-binary' });

            const createBinaryRow = (container: HTMLElement, label: string, value: number) => {
                const row = container.createEl('div', { cls: 'clock-binary-row' });
                row.createEl('span', { cls: 'clock-binary-label', text: `${label}: ` });
                const binary = value.toString(2).padStart(8, '0');
                for (const bit of binary) {
                    row.createEl('span', {
                        cls: `clock-binary-bit ${bit === '1' ? 'on' : 'off'}`,
                        text: bit
                    });
                }
                return row;
            };

            const updateBinary = () => {
                const now = new Date();
                const tzTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
                const hours = format === '24' ? tzTime.getHours() : tzTime.getHours() % 12 || 12;
                const minutes = tzTime.getMinutes();
                const seconds = tzTime.getSeconds();

                clockEl.empty();
                createBinaryRow(clockEl, 'H', hours);
                createBinaryRow(clockEl, 'M', minutes);
                if (showSeconds) {
                    createBinaryRow(clockEl, 'S', seconds);
                }
            };

            ComponentInstance.createUpdateLoop(instance, updateBinary, 1000, true);
        };

        const createMatrixClock = () => {
            const clockEl = wrapper.createEl('div', { cls: 'clock-matrix' });

            const updateMatrix = () => {
                const now = new Date();
                const timeStr = now.toLocaleTimeString('en-US', {
                    hour12: format === '12',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: showSeconds ? '2-digit' : undefined,
                    timeZone: timezone
                });

                const chars = '01';
                const noise = Array(20).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join(' ');

                clockEl.empty();
                clockEl.createEl('div', { cls: 'clock-matrix-noise', text: noise });
                clockEl.createEl('div', { cls: 'clock-matrix-time', text: timeStr });
                clockEl.createEl('div', { cls: 'clock-matrix-noise', text: noise.split('').reverse().join('') });
            };

            ComponentInstance.createUpdateLoop(instance, updateMatrix, 1000, true);
        };

        // Create the clock
        switch (type) {
            case 'analog':
                createAnalogClock();
                break;
            case 'binary':
                createBinaryClock();
                break;
            case 'matrix':
                createMatrixClock();
                break;
            default:
                createDigitalClock();
                break;
        }

        // Add label if present
        if (labelText) {
            wrapper.createEl('div', { cls: 'clock-label', text: labelText });
        }
    },
    settings: {}
};
