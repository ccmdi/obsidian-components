import { Component, ComponentAction, ComponentInstance } from 'components';
import { wikiStyles } from './styles';
import { parseBoolean } from 'utils';

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

// Common Wikipedia language codes
const WIKI_LANGUAGES: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
    ja: 'Japanese',
    zh: 'Chinese',
    ko: 'Korean',
    ar: 'Arabic',
    nl: 'Dutch',
    pl: 'Polish',
    sv: 'Swedish',
    uk: 'Ukrainian',
    he: 'Hebrew',
    vi: 'Vietnamese',
    id: 'Indonesian',
    tr: 'Turkish',
    th: 'Thai',
};

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
 * Get the base URL for a Wikipedia language
 */
function getWikiBaseUrl(lang: string): string {
    const validLang = WIKI_LANGUAGES[lang] ? lang : 'en';
    return `https://${validLang}.wikipedia.org`;
}

/**
 * Search Wikipedia for a topic (fuzzy matching)
 */
async function searchWikipedia(query: string, lang: string = 'en'): Promise<string | null> {
    const baseUrl = getWikiBaseUrl(lang);
    const searchUrl = `${baseUrl}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json&origin=*`;

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
async function getWikiSummary(title: string, lang: string = 'en'): Promise<WikiSummary | null> {
    const baseUrl = getWikiBaseUrl(lang);
    const summaryUrl = `${baseUrl}/api/rest_v1/page/summary/${encodeURIComponent(title)}`;

    const response = await fetch(summaryUrl);
    if (!response.ok) return null;

    const data: WikiSummary = await response.json();

    // Skip disambiguation pages
    if (data.type === 'disambiguation') {
        return null;
    }

    return data;
}

/**
 * Render skeleton loading state that matches final layout
 */
function renderLoadingSkeleton(el: HTMLElement): void {
    el.empty();

    const container = el.createEl('div', { cls: 'wiki-container wiki-loading-skeleton' });

    // Header skeleton
    const header = container.createEl('div', { cls: 'wiki-header' });
    header.createEl('div', { cls: 'wiki-thumbnail-placeholder loading-placeholder' });

    const info = header.createEl('div', { cls: 'wiki-info' });
    info.createEl('div', { cls: 'wiki-title-skeleton loading-placeholder' });
    info.createEl('div', { cls: 'wiki-description-skeleton loading-placeholder' });

    // Extract skeleton
    container.createEl('div', { cls: 'wiki-extract-skeleton loading-placeholder' });
    container.createEl('div', { cls: 'wiki-extract-skeleton wiki-extract-skeleton-short loading-placeholder' });

    // Footer skeleton
    const footer = container.createEl('div', { cls: 'wiki-footer' });
    footer.createEl('div', { cls: 'wiki-footer-skeleton loading-placeholder' });
}

/**
 * Render the wiki content into the element
 */
function renderWikiContent(el: HTMLElement, data: WikiSummary, compact: boolean, lang: string): void {
    el.empty();

    const container = el.createEl('div', { cls: 'wiki-container' });

    // Header with thumbnail and title
    const header = container.createEl('div', { cls: 'wiki-header' });

    // Thumbnail
    if (data.thumbnail?.source) {
        const img = header.createEl('img', {
            cls: 'wiki-thumbnail',
            attr: {
                src: data.thumbnail.source,
                alt: data.title,
                loading: 'lazy'
            }
        });
        // Fade in on load
        img.style.opacity = '0';
        img.onload = () => { img.style.opacity = '1'; };
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
    const langLabel = WIKI_LANGUAGES[lang] || 'English';
    source.appendText(` Wikipedia (${langLabel})`);

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

function renderNotFound(el: HTMLElement, topic: string, lang: string): void {
    el.empty();
    const langLabel = WIKI_LANGUAGES[lang] || 'English';
    el.createEl('div', {
        cls: 'wiki-not-found',
        text: `No ${langLabel} Wikipedia article found for "${topic}"`
    });
}

function renderError(el: HTMLElement, message: string): void {
    el.empty();
    el.createEl('div', {
        cls: 'wiki-error',
        text: message
    });
}

export const wiki: Component<['topic', 'compact', 'lang', 'showThumbnail']> = {
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
        },
        lang: {
            description: 'Wikipedia language code (e.g., en, es, fr, de, ja, zh)',
            default: 'en'
        },
        showThumbnail: {
            description: 'Show the article thumbnail image',
            default: 'true'
        }
    },
    isMountable: true,
    does: [ComponentAction.EXTERNAL],
    styles: wikiStyles,

    render: async (args, el, ctx, app, instance) => {
        const compact = parseBoolean(args.compact, true);
        const lang = args.lang || 'en';
        const showThumbnail = parseBoolean(args.showThumbnail, true);

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
        instance.data.lang = lang;
        instance.data.showThumbnail = showThumbnail;

        // Show skeleton loading state
        renderLoadingSkeleton(el);

        try {
            // Search first (fuzzy match)
            const matchedTitle = await searchWikipedia(topic, lang);

            if (!matchedTitle) {
                renderNotFound(el, topic, lang);
                return;
            }

            // Get summary
            const summary = await getWikiSummary(matchedTitle, lang);

            if (!summary) {
                renderNotFound(el, topic, lang);
                return;
            }

            // Optionally hide thumbnail
            if (!showThumbnail) {
                delete summary.thumbnail;
            }

            // Store for potential refresh comparison
            instance.data.lastTitle = matchedTitle;
            instance.data.cachedSummary = summary;

            renderWikiContent(el, summary, compact, lang);
        } catch (error) {
            console.error('Wiki component error:', error);
            renderError(el, 'Failed to fetch Wikipedia data');
        }
    },

    renderRefresh: async (args, el, ctx, app, instance) => {
        const compact = parseBoolean(args.compact, true);
        const lang = args.lang || 'en';
        const showThumbnail = parseBoolean(args.showThumbnail, true);

        // Get new topic
        let topic = args.topic;
        if (!topic || topic === 'undefined') {
            const filename = ctx.sourcePath.split('/').pop() || '';
            topic = extractTopic(filename);
        }

        // Skip if nothing changed
        if (topic === instance.data.topic && lang === instance.data.lang) {
            // Check if compact or showThumbnail changed - re-render with cached data
            if (compact !== instance.data.compact || showThumbnail !== instance.data.showThumbnail) {
                instance.data.compact = compact;
                instance.data.showThumbnail = showThumbnail;

                if (instance.data.cachedSummary) {
                    const summary = { ...instance.data.cachedSummary };
                    if (!showThumbnail) {
                        delete summary.thumbnail;
                    }
                    renderWikiContent(el, summary, compact, lang);
                }
            }
            return;
        }

        // Topic or language changed, do full re-render
        instance.data.topic = topic;
        instance.data.compact = compact;
        instance.data.lang = lang;
        instance.data.showThumbnail = showThumbnail;

        if (!topic) {
            renderError(el, 'Could not determine topic');
            return;
        }

        renderLoadingSkeleton(el);

        try {
            const matchedTitle = await searchWikipedia(topic, lang);

            if (!matchedTitle) {
                renderNotFound(el, topic, lang);
                return;
            }

            const summary = await getWikiSummary(matchedTitle, lang);

            if (!summary) {
                renderNotFound(el, topic, lang);
                return;
            }

            if (!showThumbnail) {
                delete summary.thumbnail;
            }

            instance.data.lastTitle = matchedTitle;
            instance.data.cachedSummary = summary;

            renderWikiContent(el, summary, compact, lang);
        } catch (error) {
            console.error('Wiki component refresh error:', error);
            renderError(el, 'Failed to fetch Wikipedia data');
        }
    }
};
