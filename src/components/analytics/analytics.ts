import { Component, ComponentInstance, ComponentAction, ComponentSettingsData } from "components";
import { App, MarkdownPostProcessorContext, TFile, getAllTags } from "obsidian";
import { parseBoolean, renderMarkdownLinkToElement } from "utils";
import { createApi, injectOjsStyles } from "ojs";

interface LinkData {
    file: string;
    link: string;
    outlinks: number;
    internalOutlinks: number;
    unresolvedOutlinks: number;
    inlinks: number;
    tags: number;
    size: number;
}

interface AnalyticsData {
    totalPages: number;
    linkCounts: LinkData[];
    topMissingLinks: [string, number][];
    totalOutlinks: number;
    totalInternalLinks: number;
    totalUnresolvedLinks: number;
    islands: LinkData[];
    wellConnected: LinkData[];
    hubs: LinkData[];
    authorities: LinkData[];
    deadEnds: LinkData[];
    orphans: LinkData[];
    notesWithContent: LinkData[];
    substantialNotes: number;
    shortNotes: number;
    developedNotes: number;
    recentlyActive: number;
    staleNotes: number;
    totalTags: number;
    taggedNotes: number;
    totalSize: number;
    avgSize: number;
}

const renderAnalytics = async (
    args,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
    app: App,
    instance: ComponentInstance,
    componentSettings: ComponentSettingsData = {}
): Promise<void> => {
    injectOjsStyles();

    const searchFolder = args.searchFolder || "";
    const colors = args.colors || "colorful";
    const showTitle = parseBoolean(args.showTitle);
    const showInlineList = parseBoolean(args.showInlineList);

    try {
        const data = await analyzeVault(app, searchFolder);
        generateAnalyticsDOM(el, data, searchFolder, colors, showTitle, showInlineList);

    } catch (error) {
        console.error('Analytics error:', error);
        const errorDiv = el.createEl('div', {
            attr: { style: 'color: var(--text-error); padding: 12px;' }
        });
        errorDiv.appendText('Error generating analytics: ');
        errorDiv.appendText(error.message);
    }
};

async function analyzeVault(app: App, searchFolder: string): Promise<AnalyticsData> {
    const pages = searchFolder
        ? app.vault.getMarkdownFiles().filter((file: TFile) => file.path.startsWith(searchFolder))
        : app.vault.getMarkdownFiles();

    const totalPages = pages.length;
    const noteNames = new Set(pages.map((p: TFile) => p.basename));
    const pagePaths = new Set(pages.map((p: TFile) => p.path));

    const inlinksMap = new Map<string, number>();
    for (const sourcePath in app.metadataCache.resolvedLinks) {
        if (searchFolder && !pagePaths.has(sourcePath)) continue;

        const sourceLinks = app.metadataCache.resolvedLinks[sourcePath];
        for (const targetPath in sourceLinks) {
            if (!pagePaths.has(targetPath)) continue;
            // sourceLinks[targetPath] is the count of links from source to target
            inlinksMap.set(targetPath, (inlinksMap.get(targetPath) || 0) + sourceLinks[targetPath]);
        }
    }

    const linkCounts: LinkData[] = [];
    const nonExistingLinks = new Map<string, number>();

    for (const page of pages) {
        const cache = app.metadataCache.getFileCache(page);
        const allOutlinks = cache?.links?.length || 0;

        // Count resolved vs unresolved links using proper path resolution
        let resolvedCount = 0;
        let unresolvedCount = 0;

        const links = cache?.links || [];
        for (const link of links) {
            const resolved = app.metadataCache.getFirstLinkpathDest(link.link, page.path);
            if (resolved) {
                resolvedCount++;
            } else {
                unresolvedCount++;
                // Track for "Missing Notes" section
                const linkName = link.displayText || link.link?.replace(/\.md$/, '') || '';
                if (linkName) {
                    nonExistingLinks.set(linkName, (nonExistingLinks.get(linkName) || 0) + 1);
                }
            }
        }

        const inlinks = inlinksMap.get(page.path) || 0;

        linkCounts.push({
            file: page.basename,
            link: page.basename,
            outlinks: allOutlinks,
            internalOutlinks: resolvedCount,
            unresolvedOutlinks: unresolvedCount,
            inlinks,
            tags: cache ? getAllTags(cache)?.length || 0 : 0,
            size: page.stat.size
        });
    }

    const topMissingLinks = Array.from(nonExistingLinks.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30);

    // Calculate analytics in a single pass
    let totalOutlinks = 0;
    let totalInternalLinks = 0;
    let totalUnresolvedLinks = 0;
    let totalSize = 0;
    let totalTags = 0;
    let substantialNotes = 0;
    let shortNotes = 0;
    let taggedNotes = 0;

    const islands: LinkData[] = [];
    const wellConnected: LinkData[] = [];
    const hubs: LinkData[] = [];
    const authorities: LinkData[] = [];
    const deadEnds: LinkData[] = [];
    const orphans: LinkData[] = [];
    const notesWithContent: LinkData[] = [];

    for (const p of linkCounts) {
        // Accumulate totals
        totalOutlinks += p.outlinks;
        totalInternalLinks += p.internalOutlinks;
        totalUnresolvedLinks += p.unresolvedOutlinks;
        totalSize += p.size;
        totalTags += p.tags;

        // Categorize by link structure
        if (p.inlinks === 0 && p.outlinks === 0) islands.push(p);
        if (p.inlinks >= 3 && p.internalOutlinks >= 3) wellConnected.push(p);
        if (p.internalOutlinks >= 5) hubs.push(p);
        if (p.inlinks >= 3) authorities.push(p);
        if (p.inlinks > 0 && p.outlinks === 0) deadEnds.push(p);
        if (p.inlinks === 0 && p.outlinks > 0) orphans.push(p);

        // Categorize by content
        if (p.size > 0) notesWithContent.push(p);
        if (p.size > 1000) substantialNotes++;
        if (p.size > 0 && p.size < 200) shortNotes++;
        if (p.tags > 0) taggedNotes++;
    }

    // Sort after categorization
    hubs.sort((a, b) => b.internalOutlinks - a.internalOutlinks);
    authorities.sort((a, b) => b.inlinks - a.inlinks);
    deadEnds.sort((a, b) => b.inlinks - a.inlinks);
    orphans.sort((a, b) => b.outlinks - a.outlinks);

    const avgSize = totalPages > 0 ? totalSize / totalPages : 0;
    const developedNotes = notesWithContent.length - shortNotes;

    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const staleMs = 90 * 24 * 60 * 60 * 1000;

    let recentlyActive = 0;
    let staleNotes = 0;

    for (const page of pages) {
        if (now - page.stat.mtime < weekMs) recentlyActive++;
        if (now - page.stat.mtime > staleMs) staleNotes++;
    }

    return {
        totalPages,
        linkCounts,
        topMissingLinks,
        totalOutlinks,
        totalInternalLinks,
        totalUnresolvedLinks,
        islands,
        wellConnected,
        hubs,
        authorities,
        deadEnds,
        orphans,
        notesWithContent,
        substantialNotes,
        shortNotes,
        developedNotes,
        recentlyActive,
        staleNotes,
        totalTags,
        taggedNotes,
        totalSize,
        avgSize
    };
}

function generateAnalyticsDOM(el: HTMLElement, data: AnalyticsData, searchFolder: string, colors = "colorful", showTitle = true, showInlineList = true): void {
    const {
        totalPages, islands, wellConnected, substantialNotes, totalInternalLinks,
        totalUnresolvedLinks, recentlyActive, staleNotes, taggedNotes, totalTags,
        notesWithContent, developedNotes, shortNotes, totalSize, avgSize,
        authorities, hubs, deadEnds, orphans, topMissingLinks
    } = data;

    const api = createApi();

    // Map color based on scheme
    const getColor = (originalColor: string): string => {
        switch (colors) {
            case "false": return 'var(--text-muted)';
            case "accent": return 'var(--color-accent)';
            default: return originalColor;
        }
    };

    // Title
    if (showTitle) {
        el.createEl('h2', { text: searchFolder ? `Analytics: ${searchFolder}` : "Vault Analytics" });
    }

    // Grid
    const grid = api.grid(el);

    api.card(grid, {
        title: 'CONNECTION HEALTH',
        color: getColor('var(--color-accent)'),
        value: `${Math.round((totalPages - islands.length) / totalPages * 100)}%`,
        suffix: 'connected',
        subtitle: `${islands.length} islands, ${wellConnected.length} bridges`
    });

    api.card(grid, {
        title: 'KNOWLEDGE DEPTH',
        color: getColor('var(--color-green)'),
        value: `${totalPages > 0 ? Math.round(substantialNotes / totalPages * 100) : 0}%`,
        suffix: 'substantial',
        subtitle: `${substantialNotes} notes >1k chars`
    });

    api.card(grid, {
        title: 'INTERNAL LINKS',
        color: getColor('var(--color-purple)'),
        value: `${(totalInternalLinks / totalPages).toFixed(1)}`,
        suffix: 'per note',
        subtitle: `${totalInternalLinks} note-to-note`
    });

    api.card(grid, {
        title: 'UNRESOLVED LINKS',
        color: getColor('var(--color-blue)'),
        value: `${totalUnresolvedLinks}`,
        suffix: 'unresolved',
        subtitle: `${(totalUnresolvedLinks / totalPages).toFixed(1)} per note`
    });

    api.card(grid, {
        title: 'FRESHNESS',
        color: getColor('var(--color-orange)'),
        value: `${Math.round(recentlyActive / totalPages * 100)}%`,
        suffix: 'active',
        subtitle: `${recentlyActive} updated this week`
    });

    api.card(grid, {
        title: 'MAINTENANCE',
        color: getColor('var(--color-red)'),
        value: `${Math.round(staleNotes / totalPages * 100)}%`,
        suffix: 'stale',
        subtitle: `${staleNotes} notes >90 days old`
    });

    api.card(grid, {
        title: 'ORGANIZATION',
        color: getColor('var(--color-yellow)'),
        value: `${Math.round(taggedNotes / totalPages * 100)}%`,
        suffix: 'tagged',
        subtitle: `${totalTags} tags total`
    });

    api.card(grid, {
        title: 'CONTENT QUALITY',
        color: getColor('var(--color-cyan)'),
        value: `${notesWithContent.length > 0 ? Math.round(developedNotes / notesWithContent.length * 100) : 0}%`,
        suffix: 'developed',
        subtitle: `${shortNotes} stub notes <200 chars`
    });

    api.card(grid, {
        title: 'KNOWLEDGE SIZE',
        color: getColor('var(--color-pink)'),
        value: `${totalPages}`,
        suffix: 'notes',
        subtitle: `${Math.round(totalSize / 1000)}k chars, ${Math.round(avgSize)} avg`
    });

    // Sections
    if (showInlineList) {
        generateSectionDOM(el, 'Authorities', authorities.slice(0, 3), (a) => `[[${a.link}]] (${a.inlinks})`);
        generateSectionDOM(el, 'Hubs', hubs.slice(0, 3), (h) => `[[${h.link}]] (${h.internalOutlinks})`);
        generateSectionDOM(el, 'Bridges', wellConnected.slice(0, 3), (w) => `[[${w.link}]] (${w.inlinks}↔${w.internalOutlinks})`);
        generateSectionDOM(el, 'Islands', islands.slice(0, 3), (i) => `[[${i.link}]]`);
        generateSectionDOM(el, 'Dead-ends', deadEnds.slice(0, 3), (d) => `[[${d.link}]] (${d.inlinks}→)`);
        generateSectionDOM(el, 'Orphans', orphans.slice(0, 3), (o) => `[[${o.link}]] (→${o.outlinks})`);
        generateMissingLinksDOM(el, topMissingLinks);
    }
}

function generateSectionDOM<T>(el: HTMLElement, title: string, items: T[], formatter: (item: T) => string): void {
    if (items.length === 0) return;

    const p = el.createEl('p');
    p.createEl('strong', { text: `${title}: ` });

    items.forEach((item, index) => {
        if (index > 0) {
            p.appendText(' • ');
        }
        const text = formatter(item);
        renderMarkdownLinkToElement(text, p);
    });
}

function generateMissingLinksDOM(el: HTMLElement, topMissingLinks: [string, number][]): void {
    if (topMissingLinks.length === 0) return;

    const p = el.createEl('p');
    p.createEl('strong', { text: 'Missing Notes: ' });

    topMissingLinks.forEach(([name, count], index) => {
        if (index > 0) {
            p.appendText(' • ');
        }
        const searchQuery = `/\\[\\[${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\]/`;
        p.createEl('a', {
            attr: { href: `obsidian://search?query=${encodeURIComponent(searchQuery)}` },
            text: name
        });
        p.appendText(` (${count})`);
    });
}

export const analytics: Component<['searchFolder', 'colors', 'showTitle', 'showInlineList']> = {
    keyName: 'analytics',
    name: 'Vault Analytics',
    description: 'Display comprehensive vault analytics and insights',
    icon: 'bar-chart-2',
    args: {
        searchFolder: {
            description: 'Folder to analyze (leave empty for entire vault)',
            default: ''
        },
        colors: {
            description: 'Color scheme: "colorful" (default), "accent" (all accent color), or "false" (no colors)',
            default: 'colorful'
        },
        showTitle: {
            description: 'Show the "Vault Analytics" title',
            default: 'true'
        },
        showInlineList: {
            description: 'Show the additional section at the bottom including authorities, hubs, bridges, etc.',
            default: 'true'
        }
    },
    isMountable: false,
    does: [ComponentAction.READ],
    styles: null,
    render: renderAnalytics,
    refresh: 'leafChanged',
    settings: {
        colors: {
            name: "Color Scheme",
            desc: "Default color scheme for analytics cards",
            type: "dropdown",
            options: [
                { value: "colorful", text: "Colorful (default)" },
                { value: "accent", text: "Accent color only" },
                { value: "false", text: "No colors" }
            ],
            default: "colorful"
        },
        showTitle: {
            name: "Show Title",
            desc: "Show the 'Vault Analytics' heading by default",
            type: "toggle",
            default: true
        }
    }
};