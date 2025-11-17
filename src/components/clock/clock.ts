import { Component, ComponentInstance } from "components";
import { parseBoolean } from "utils";

export const clock: Component<['type', 'format', 'timezone', 'size', 'showSeconds', 'showDate', 'background', 'background-color', 'border']> = {
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
            description: 'Timezone of clock',
            default: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        size: {
            description: 'Size of clock',
            default: '200'
        },
        showSeconds: {
            description: 'Show seconds',
            default: 'true'
        },
        showDate: {
            description: 'Show date',
            default: 'false'
        },
        background: {
            description: 'Background color of clock',
            default: 'var(--background-primary)'
        },
        'background-color': {
            description: 'Background color of clock',
            default: 'var(--background-primary)'
        },
        border: {
            description: 'Border color of clock',
            default: '2px solid var(--text-normal)'
        }
    },
    isMountable: true,
    styles: null,
    render: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
        const type = args.type;
        const format = args.format;
        const timezone = args.timezone;
        const size = args.size;
        const showSeconds = parseBoolean(args.showSeconds, true);
        const showDate = parseBoolean(args.showDate, false);

        el.addClass('clock-container');

        const createDigitalClock = () => {
            el.addClass('clock-digital');

            const updateDigital = () => {
                const now = new Date();
                const options: Intl.DateTimeFormatOptions = {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: format === '12'
                };

                if (showSeconds) {
                    options.second = '2-digit';
                }

                if (timezone) {
                    options.timeZone = timezone;
                }

                let timeString = now.toLocaleTimeString('en-US', options);

                if (showDate) {
                    const dateString = now.toLocaleDateString('en-US');
                    timeString = `${dateString}\n${timeString}`;
                }

                // Use textContent for safety - no HTML needed here, just use CSS for line breaks
                el.textContent = timeString.replace('\n', ' | ');
            };

            ComponentInstance.createUpdateLoop(instance, updateDigital, 1000, true);
        };

        const createAnalogClock = () => {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', size);
            svg.setAttribute('height', size);
            svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
            svg.style.borderRadius = '50%';
            svg.style.maxWidth = '100%';
            svg.style.height = 'auto';
            svg.style.aspectRatio = '1 / 1';

            // Apply component args for styling the clock face
            svg.style.border = args.border || '2px solid var(--text-normal)';
            svg.style.background = args.background || args['background-color'] || 'var(--background-primary)';

            const center = parseInt(size) / 2;
            const radius = center - 20;

            // Create clock face
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

            const secondHand = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            if (showSeconds) {
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
                const hours = now.getHours() % 12;
                const minutes = now.getMinutes();
                const seconds = now.getSeconds();

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

                if (showSeconds) {
                    const secondX = center + (radius * 0.9) * Math.cos(secondAngle);
                    const secondY = center + (radius * 0.9) * Math.sin(secondAngle);
                    secondHand.setAttribute('x2', secondX.toString());
                    secondHand.setAttribute('y2', secondY.toString());
                }
            };

            el.appendChild(svg);
            ComponentInstance.createUpdateLoop(instance, updateAnalog, 1000, true);
        };

        const createBinaryClock = () => {
            el.addClass('clock-binary');

            const createBinaryRow = (label: string, value: number) => {
                const row = el.createEl('div');
                row.appendText(`${label}: `);
                const binary = value.toString(2).padStart(8, '0');
                for (const bit of binary) {
                    const span = row.createEl('span', {
                        attr: {
                            style: `color: ${bit === '1' ? 'var(--text-accent)' : 'var(--text-muted)'}; font-weight: bold;`
                        },
                        text: bit
                    });
                }
                return row;
            };

            let hoursRow: HTMLElement, minutesRow: HTMLElement, secondsRow: HTMLElement | null = null;

            const updateBinary = () => {
                const now = new Date();
                const hours = format === '24' ? now.getHours() : now.getHours() % 12 || 12;
                const minutes = now.getMinutes();
                const seconds = now.getSeconds();

                // Clear and recreate rows
                el.empty();
                hoursRow = createBinaryRow('H', hours);
                minutesRow = createBinaryRow('M', minutes);
                if (showSeconds) {
                    secondsRow = createBinaryRow('S', seconds);
                }
            };

            ComponentInstance.createUpdateLoop(instance, updateBinary, 1000, true);
        };

        const createMatrixClock = () => {
            el.addClass('clock-matrix');

            const updateMatrix = () => {
                const now = new Date();
                const timeStr = now.toLocaleTimeString('en-US', {
                    hour12: format === '12',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: showSeconds ? '2-digit' : undefined,
                    timeZone: timezone
                });

                // Add matrix-like effect with random characters
                const chars = '01';
                const noise = Array(20).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join(' ');

                el.empty();
                el.createEl('div', {
                    attr: { style: 'opacity: 0.3; font-size: 0.8em;' },
                    text: noise
                });
                el.createEl('div', {
                    attr: { style: 'text-shadow: 0 0 10px #00ff00;' },
                    text: timeStr
                });
                el.createEl('div', {
                    attr: { style: 'opacity: 0.3; font-size: 0.8em;' },
                    text: noise.split('').reverse().join('')
                });
            };

            ComponentInstance.createUpdateLoop(instance, updateMatrix, 1000, true);
        };

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
    },
    settings: {}
};