import { Component, ComponentAction } from 'components';
import { wikiStyles } from './styles';

interface WikiSummary {
    title: string;
    description?: string;
    extract: string;
    extract_html?: string;
    thumbnail?: {
        source: string;
        width: number;
        height: number;
    };
    content_urls: {
        desktop: { page: string };
        mobile: { page: string };
    };
    type: string;
}

interface WikiSearchResult {
    title: string;
    pageid: number;
    snippet: string;
}

interface WikiSearchResponse {
    query?: {
        search: WikiSearchResult[];
    };
}

/**
 * Extract a clean topic from a filename
 * Handles common patterns like dates, brackets, prefixes
 */
function extractTopic(filename: string): string {
    let topic = filename;

    // Remove file extension
    topic = topic.replace(/\.[^/.]+$/, '');

    // Remove common date patterns
    // YYYY-MM-DD at start or end
    topic = topic.replace(/^\d{4}-\d{2}-\d{2}\s*[-–—]?\s*/, '');
    topic = topic.replace(/\s*[-–—]?\s*\d{4}-\d{2}-\d{2}$/, '');
    // DD-MM-YYYY or MM-DD-YYYY
    topic = topic.replace(/^\d{2}[-/]\d{2}[-/]\d{4}\s*[-–—]?\s*/, '');
    // YYYYMMDD
    topic = topic.replace(/^\d{8}\s*[-–—]?\s*/, '');

    // Remove common prefixes (case-insensitive)
    topic = topic.replace(/^(note|notes|draft|wip|todo|ref|reference)\s*[-–—:]\s*/i, '');

    // Remove content in parentheses at the end (often disambiguation)
    // But keep it if that's most of the title
    const withoutParens = topic.replace(/\s*\([^)]+\)\s*$/, '');
    if (withoutParens.length > 3) {
        topic = withoutParens;
    }

    // Remove content in square brackets
    topic = topic.replace(/\s*\[[^\]]+\]\s*/g, ' ');

    // Clean up multiple spaces and trim
    topic = topic.replace(/\s+/g, ' ').trim();

    return topic;
}

/**
 * Search Wikipedia for a topic (fuzzy matching)
 */
async function searchWikipedia(query: string): Promise<string | null> {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json&origin=*`;

    const response = await fetch(searchUrl);
    if (!response.ok) return null;

    const data: WikiSearchResponse = await response.json();

    if (data.query?.search?.length) {
        return data.query.search[0].title;
    }

    return null;
}

/**
 * Get Wikipedia summary for a page title
 */
async function getWikiSummary(title: string): Promise<WikiSummary | null> {
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;

    const response = await fetch(summaryUrl);
    if (!response.ok) return null;

    const data: WikiSummary = await response.json();

    if (data.type === 'disambiguation') {
        return null;
    }

    return data;
}

/**
 * Render the wiki content into the element
 */
function renderWikiContent(el: HTMLElement, data: WikiSummary, compact: boolean): void {
    el.empty();

    const container = el.createEl('div', { cls: 'wiki-container' });

    // Header with thumbnail and title
    const header = container.createEl('div', { cls: 'wiki-header' });

    // Thumbnail
    if (data.thumbnail?.source) {
        header.createEl('img', {
            cls: 'wiki-thumbnail',
            attr: {
                src: data.thumbnail.source,
                alt: data.title,
                loading: 'lazy'
            }
        });
    } else {
        const placeholder = header.createEl('div', { cls: 'wiki-thumbnail-placeholder' });
        placeholder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;
    }

    // Info section
    const info = header.createEl('div', { cls: 'wiki-info' });

    // Title with external link icon
    const titleEl = info.createEl('h3', { cls: 'wiki-title' });
    titleEl.createEl('a', {
        text: data.title,
        attr: {
            href: data.content_urls.desktop.page,
            target: '_blank',
            rel: 'noopener noreferrer'
        }
    });
    // External link icon
    titleEl.insertAdjacentHTML('beforeend', `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`);

    // Description (short tagline)
    if (data.description) {
        info.createEl('p', {
            cls: 'wiki-description',
            text: data.description
        });
    }

    // Extract (main content)
    container.createEl('p', {
        cls: compact ? 'wiki-extract wiki-extract-short' : 'wiki-extract',
        text: data.extract
    });

    // Footer
    const footer = container.createEl('div', { cls: 'wiki-footer' });

    const source = footer.createEl('span', { cls: 'wiki-source' });
    source.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
    source.appendText(' Wikipedia');

    footer.createEl('a', {
        cls: 'wiki-read-more',
        text: 'Read more',
        attr: {
            href: data.content_urls.desktop.page,
            target: '_blank',
            rel: 'noopener noreferrer'
        }
    });
}

function renderLoading(el: HTMLElement, topic: string): void {
    el.empty();
    const loading = el.createEl('div', { cls: 'wiki-loading' });
    loading.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="loading-spinner"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`;
    loading.appendText(`Searching for "${topic}"...`);
}

function renderNotFound(el: HTMLElement, topic: string): void {
    el.empty();
    el.createEl('div', {
        cls: 'wiki-not-found',
        text: `No Wikipedia article found for "${topic}"`
    });
}

function renderError(el: HTMLElement, message: string): void {
    el.empty();
    el.createEl('div', {
        cls: 'wiki-error',
        text: message
    });
}

export const wiki: Component<['topic', 'compact']> = {
    name: 'Wikipedia',
    description: 'Show Wikipedia summary for the current note topic',
    keyName: 'wiki',
    icon: 'globe',
    aliases: ['wikipedia'],
    refresh: 'leafChanged',
    args: {
        topic: {
            description: 'Topic to search for. If not provided, uses the note filename.',
            required: false
        },
        compact: {
            description: 'Show compact view with truncated extract',
            default: 'true'
        }
    },
    isMountable: true,
    does: [ComponentAction.EXTERNAL],
    styles: wikiStyles,

    render: async (args, el, ctx, app, instance) => {
        const compact = args.compact !== 'false';

        // Get topic: from args, or extract from filename
        let topic = args.topic;
        if (!topic || topic === 'undefined') {
            const filename = ctx.sourcePath.split('/').pop() || '';
            topic = extractTopic(filename);
        }

        if (!topic) {
            renderError(el, 'Could not determine topic');
            return;
        }

        // Store for refresh
        instance.data.topic = topic;
        instance.data.compact = compact;

        renderLoading(el, topic);

        try {
            // Search first (fuzzy match)
            const matchedTitle = await searchWikipedia(topic);

            if (!matchedTitle) {
                renderNotFound(el, topic);
                return;
            }

            const summary = await getWikiSummary(matchedTitle);

            if (!summary) {
                renderNotFound(el, topic);
                return;
            }

            // Store for potential refresh comparison
            instance.data.lastTitle = matchedTitle;

            renderWikiContent(el, summary, compact);
        } catch (error) {
            console.error('Wiki component error:', error);
            renderError(el, 'Failed to fetch Wikipedia data');
        }
    },

    renderRefresh: async (args, el, ctx, app, instance) => {
        const compact = args.compact !== 'false';

        let topic = args.topic;
        if (!topic || topic === 'undefined') {
            const filename = ctx.sourcePath.split('/').pop() || '';
            topic = extractTopic(filename);
        }

        if (topic === instance.data.topic) {
            return;
        }

        // Topic changed, do full re-render
        instance.data.topic = topic;
        instance.data.compact = compact;

        if (!topic) {
            renderError(el, 'Could not determine topic');
            return;
        }

        renderLoading(el, topic);

        try {
            const matchedTitle = await searchWikipedia(topic);

            if (!matchedTitle) {
                renderNotFound(el, topic);
                return;
            }

            const summary = await getWikiSummary(matchedTitle);

            if (!summary) {
                renderNotFound(el, topic);
                return;
            }

            instance.data.lastTitle = matchedTitle;

            renderWikiContent(el, summary, compact);
        } catch (error) {
            console.error('Wiki component refresh error:', error);
            renderError(el, 'Failed to fetch Wikipedia data');
        }
    }
};
