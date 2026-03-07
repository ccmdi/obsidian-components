import { App, MarkdownPostProcessorContext, TFile } from "obsidian";

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

export interface QueryResult {
    file: TFile;
    fm: Record<string, any>;
}

export interface OjsApi {
    grid: (parent: HTMLElement, className?: string) => HTMLElement;
    card: (parent: HTMLElement, options: CardOptions) => HTMLElement;
    loadScript: (url: string) => Promise<void>;
    loadStyle: (url: string) => Promise<void>;
    fetchJSON: <T = any>(url: string, cacheMins?: number) => Promise<T>;
    query: (path?: string, filter?: (result: QueryResult) => boolean) => QueryResult[];
}

const scriptCache = new Map<string, Promise<void>>();
const styleCache = new Map<string, Promise<void>>();
const jsonCache = new Map<string, { data: any; expires: number }>();

export function createApi(app: App): OjsApi {
    return {
        loadScript(url: string): Promise<void> {
            const existing = scriptCache.get(url);
            if (existing) return existing;

            const promise = new Promise<void>((resolve, reject) => {
                const script = document.createElement('script');
                script.src = url;
                script.addEventListener('load', () => resolve());
                script.addEventListener('error', () => {
                    scriptCache.delete(url);
                    reject(new Error(`Failed to load script: ${url}`));
                });
                document.head.appendChild(script);
            });

            scriptCache.set(url, promise);
            return promise;
        },

        loadStyle(url: string): Promise<void> {
            const existing = styleCache.get(url);
            if (existing) return existing;

            const promise = new Promise<void>((resolve, reject) => {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = url;
                link.addEventListener('load', () => resolve());
                link.addEventListener('error', () => {
                    styleCache.delete(url);
                    reject(new Error(`Failed to load stylesheet: ${url}`));
                });
                document.head.appendChild(link);
            });

            styleCache.set(url, promise);
            return promise;
        },

        async fetchJSON<T = any>(url: string, cacheMins = 5): Promise<T> {
            const cached = jsonCache.get(url);
            if (cached && Date.now() < cached.expires) return cached.data as T;

            const res = await fetch(url);
            if (!res.ok) throw new Error(`Fetch failed (${res.status}): ${url}`);
            const data = await res.json();
            jsonCache.set(url, { data, expires: Date.now() + cacheMins * 60_000 });
            return data as T;
        },

        query(path?: string, filter?: (result: QueryResult) => boolean): QueryResult[] {
            const results: QueryResult[] = [];
            for (const file of app.vault.getMarkdownFiles()) {
                if (path && !file.path.startsWith(path)) continue;
                const cache = app.metadataCache.getFileCache(file);
                const fm = (cache?.frontmatter as Record<string, any>) || {};
                const result = { file, fm };
                if (filter && !filter(result)) continue;
                results.push(result);
            }
            return results;
        },

        grid(parent: HTMLElement, className = 'vault-analytics-grid'): HTMLElement {
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

import * as obsidian from 'obsidian';

export async function executeOjs(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
    app: App
): Promise<void> {
    const api = createApi(app);

    try {
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const fn = new AsyncFunction('app', 'el', 'ctx', 'api', 'obsidian', source);
        await fn(app, el, ctx, api, obsidian);
    } catch (e) {
        const errorEl = el.createEl('div', { cls: 'ojs-error' });
        errorEl.createEl('strong', { text: 'ojs error: ' });
        errorEl.appendText(e.message);
    }
}