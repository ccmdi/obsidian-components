import { App, MarkdownPostProcessorContext } from "obsidian";

export const ojsStyles = /*css*/`
.vault-analytics-grid {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 1rem !important;
    margin: 1rem auto !important;
    max-width: 900px !important;
}

.vault-analytics-grid > div {
    background: var(--background-primary-alt) !important;
}

@media (max-width: 768px) {
    .vault-analytics-grid {
        grid-template-columns: 1fr !important;
    }
}

.ojs-error {
    color: var(--text-error);
    padding: 8px;
    background: var(--background-secondary);
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.9em;
}
`;

export function injectOjsStyles(): void {
    const styleId = 'ojs-styles';
    if (!document.getElementById(styleId)) {
        const styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = ojsStyles;
        document.head.appendChild(styleEl);
    }
}

export interface CardOptions {
    title: string;
    color: string;
    value: string;
    suffix?: string;
    subtitle?: string;
}

export interface OjsApi {
    grid: (parent: HTMLElement, className?: string) => HTMLElement;
    card: (parent: HTMLElement, options: CardOptions) => HTMLElement;
}

export function createApi(): OjsApi {
    return {
        grid(parent: HTMLElement, className: string = 'vault-analytics-grid'): HTMLElement {
            return parent.createEl('div', { cls: className });
        },

        card(parent: HTMLElement, options: CardOptions): HTMLElement {
            const { title, color, value, suffix = '', subtitle = '' } = options;

            const card = parent.createEl('div', {
                attr: {
                    style: `background: var(--background-secondary); padding: 1rem; border-radius: 6px; border-left: 3px solid ${color};`
                }
            });

            card.createEl('strong', {
                attr: { style: `color: ${color}; font-size: 0.9em;` },
                text: title
            });

            card.appendChild(document.createElement('br'));

            card.createEl('span', {
                attr: { style: 'font-size: 1.4em; font-weight: 600;' },
                text: value
            });

            if (suffix) {
                card.appendText(` ${suffix}`);
            }

            card.appendChild(document.createElement('br'));

            if (subtitle) {
                card.createEl('small', {
                    attr: { style: 'color: var(--text-muted);' },
                    text: subtitle
                });
            }

            return card;
        }
    };
}

export async function executeOjs(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
    app: App
): Promise<void> {
    const api = createApi();

    try {
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const fn = new AsyncFunction('app', 'el', 'ctx', 'api', source);
        await fn(app, el, ctx, api);
    } catch (e) {
        const errorEl = el.createEl('div', { cls: 'ojs-error' });
        errorEl.createEl('strong', { text: 'ojs error: ' });
        errorEl.appendText(e.message);
    }
}
