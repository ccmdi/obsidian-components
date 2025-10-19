import { Component, ComponentInstance, ComponentAction } from "components";
import { App, MarkdownPostProcessorContext, TFile } from "obsidian";
import { analyticsStyles } from "./style";
import { renderMarkdownLink } from "utils";

interface LinkData {
    file: string;
    link: string;
    outlinks: number;
    internalOutlinks: number;
    externalOutlinks: number;
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
    totalExternalLinks: number;
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
    args: Record<string, string>,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
    app: App,
    instance: ComponentInstance,
    componentSettings: Record<string, any> = {}
): Promise<void> => {
    const searchFolder = args.searchFolder || "";
    const colors = args.colors || componentSettings.colors;
    const showTitle = args.showTitle === 'true' && componentSettings.showTitle !== false;

    try {
        const data = await analyzeVault(app, searchFolder);
        const html = generateAnalyticsHTML(data, searchFolder, colors, showTitle);

        el.innerHTML = html;

        const style = el.createEl('style');
        style.textContent = analyticsStyles;
        el.appendChild(style);


    } catch (error) {
        console.error('Analytics error:', error);
        el.innerHTML = `<div style="color: var(--text-error); padding: 12px;">Error generating analytics: ${error.message}</div>`;
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

        for (const targetPath in app.metadataCache.resolvedLinks[sourcePath]) {
            if (!pagePaths.has(targetPath)) continue;
            inlinksMap.set(targetPath, (inlinksMap.get(targetPath) || 0) + 1);
        }
    }

    const linkCounts: LinkData[] = [];
    const nonExistingLinks = new Map<string, number>();

    for (const page of pages) {
        const cache = app.metadataCache.getFileCache(page);
        const allOutlinks = cache?.links?.length || 0;

        const internalOutlinks = (cache?.links?.filter(link => {
            const linkName = link.displayText || link.link?.replace(/\.md$/, '') || '';
            return noteNames.has(linkName);
        }) || []).length;

        const externalOutlinks = allOutlinks - internalOutlinks;
        const inlinks = inlinksMap.get(page.path) || 0;


        linkCounts.push({
            file: page.basename,
            link: page.basename,
            outlinks: allOutlinks,
            internalOutlinks,
            externalOutlinks,
            inlinks,
            tags: cache?.frontmatter?.tags?.length || 0,
            size: page.stat.size
        });

        // Track non-existing links
        const unresolvedLinks = cache?.links?.filter(link => {
            const linkPath = app.metadataCache.getFirstLinkpathDest(link.link, page.path);
            return !linkPath;
        }) || [];

        unresolvedLinks.forEach(link => {
            const linkName = link.displayText || link.link?.replace(/\.md$/, '') || '';
            if (linkName && !link.original?.startsWith('!')) {
                nonExistingLinks.set(linkName, (nonExistingLinks.get(linkName) || 0) + 1);
            }
        });
    }

    const topMissingLinks = Array.from(nonExistingLinks.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30);

    // Calculate analytics
    const totalOutlinks = linkCounts.reduce((sum, p) => sum + p.outlinks, 0);
    const totalInternalLinks = linkCounts.reduce((sum, p) => sum + p.internalOutlinks, 0);
    const totalExternalLinks = linkCounts.reduce((sum, p) => sum + p.externalOutlinks, 0);
    const islands = linkCounts.filter(p => p.inlinks === 0 && p.outlinks === 0);
    const wellConnected = linkCounts.filter(p => p.inlinks >= 3 && p.internalOutlinks >= 3);
    const hubs = linkCounts.filter(p => p.internalOutlinks >= 5).sort((a, b) => b.internalOutlinks - a.internalOutlinks);
    const authorities = linkCounts.filter(p => p.inlinks >= 3).sort((a, b) => b.inlinks - a.inlinks);
    const deadEnds = linkCounts.filter(p => p.inlinks > 0 && p.outlinks === 0);
    const orphans = linkCounts.filter(p => p.inlinks === 0 && p.outlinks > 0);

    const notesWithContent = linkCounts.filter(p => p.size > 0);
    const totalSize = linkCounts.reduce((sum, p) => sum + p.size, 0);
    const avgSize = totalPages > 0 ? totalSize / totalPages : 0;
    const substantialNotes = linkCounts.filter(p => p.size > 1000).length;
    const shortNotes = linkCounts.filter(p => p.size > 0 && p.size < 200).length;
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

    const totalTags = linkCounts.reduce((sum, p) => sum + p.tags, 0);
    const taggedNotes = linkCounts.filter(p => p.tags > 0).length;

    return {
        totalPages,
        linkCounts,
        topMissingLinks,
        totalOutlinks,
        totalInternalLinks,
        totalExternalLinks,
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

function generateAnalyticsHTML(data: AnalyticsData, searchFolder: string, colors: string = "colorful", showTitle: boolean = true): string {
    const {
        totalPages, islands, wellConnected, substantialNotes, totalInternalLinks,
        totalExternalLinks, recentlyActive, staleNotes, taggedNotes, totalTags,
        notesWithContent, developedNotes, shortNotes, totalSize, avgSize,
        authorities, hubs, deadEnds, orphans, topMissingLinks
    } = data;

    const getCardStyle = () => {
        switch (colors) {
            case "false":
                return "background: var(--background-secondary); padding: 1rem; border-radius: 6px; border-left: 3px solid var(--text-muted);";
            default:
                return "background: var(--background-secondary); padding: 1rem; border-radius: 6px;";
        }
    };

    const getTitleStyle = (color: string) => {
        switch (colors) {
            case "false":
                return "color: var(--text-normal); font-size: 0.9em;";
            case "accent":
                return "color: var(--color-accent); font-size: 0.9em;";
            case "colorful":
            default:
                return `color: ${color}; font-size: 0.9em;`;
        }
    };

    const getBorderStyle = (color: string) => {
        switch (colors) {
            case "false":
                return "";
            case "accent":
                return "border-left: 3px solid var(--color-accent);";
            case "colorful":
            default:
                return `border-left: 3px solid ${color};`;
        }
    };

    return `
        ${showTitle ? `<h2>${searchFolder ? `Analytics: ${searchFolder}` : "Vault Analytics"}</h2>` : ''}

        <div class="vault-analytics-grid">
            <div style="${getCardStyle()} ${getBorderStyle('var(--color-accent)')}">
                <strong style="${getTitleStyle('var(--color-accent)')}">CONNECTION HEALTH</strong><br>
                <span style="font-size: 1.4em; font-weight: 600;">${Math.round((totalPages - islands.length) / totalPages * 100)}%</span> connected<br>
                <small style="color: var(--text-muted);">${islands.length} islands, ${wellConnected.length} bridges</small>
            </div>

            <div style="${getCardStyle()} ${getBorderStyle('var(--color-green)')}">
                <strong style="${getTitleStyle('var(--color-green)')}">KNOWLEDGE DEPTH</strong><br>
                <span style="font-size: 1.4em; font-weight: 600;">${totalPages > 0 ? Math.round(substantialNotes / totalPages * 100) : 0}%</span> substantial<br>
                <small style="color: var(--text-muted);">${substantialNotes} notes >1k chars</small>
            </div>

            <div style="${getCardStyle()} ${getBorderStyle('var(--color-purple)')}">
                <strong style="${getTitleStyle('var(--color-purple)')}">INTERNAL LINKS</strong><br>
                <span style="font-size: 1.4em; font-weight: 600;">${(totalInternalLinks / totalPages).toFixed(1)}</span> per note<br>
                <small style="color: var(--text-muted);">${totalInternalLinks} note-to-note</small>
            </div>

            <div style="${getCardStyle()} ${getBorderStyle('var(--color-blue)')}">
                <strong style="${getTitleStyle('var(--color-blue)')}">EXTERNAL LINKS</strong><br>
                <span style="font-size: 1.4em; font-weight: 600;">${(totalExternalLinks / totalPages).toFixed(1)}</span> per note<br>
                <small style="color: var(--text-muted);">${totalExternalLinks} outside links</small>
            </div>

            <div style="${getCardStyle()} ${getBorderStyle('var(--color-orange)')}">
                <strong style="${getTitleStyle('var(--color-orange)')}">FRESHNESS</strong><br>
                <span style="font-size: 1.4em; font-weight: 600;">${Math.round(recentlyActive / totalPages * 100)}%</span> active<br>
                <small style="color: var(--text-muted);">${recentlyActive} updated this week</small>
            </div>

            <div style="${getCardStyle()} ${getBorderStyle('var(--color-red)')}">
                <strong style="${getTitleStyle('var(--color-red)')}">MAINTENANCE</strong><br>
                <span style="font-size: 1.4em; font-weight: 600;">${Math.round(staleNotes / totalPages * 100)}%</span> stale<br>
                <small style="color: var(--text-muted);">${staleNotes} notes >90 days old</small>
            </div>

            <div style="${getCardStyle()} ${getBorderStyle('var(--color-yellow)')}">
                <strong style="${getTitleStyle('var(--color-yellow)')}">ORGANIZATION</strong><br>
                <span style="font-size: 1.4em; font-weight: 600;">${Math.round(taggedNotes / totalPages * 100)}%</span> tagged<br>
                <small style="color: var(--text-muted);">${totalTags} tags total</small>
            </div>

            <div style="${getCardStyle()} ${getBorderStyle('var(--color-cyan)')}">
                <strong style="${getTitleStyle('var(--color-cyan)')}">CONTENT QUALITY</strong><br>
                <span style="font-size: 1.4em; font-weight: 600;">${notesWithContent.length > 0 ? Math.round(developedNotes / notesWithContent.length * 100) : 0}%</span> developed<br>
                <small style="color: var(--text-muted);">${shortNotes} stub notes <200 chars</small>
            </div>

            <div style="${getCardStyle()} ${getBorderStyle('var(--color-pink)')}">
                <strong style="${getTitleStyle('var(--color-pink)')}">KNOWLEDGE SIZE</strong><br>
                <span style="font-size: 1.4em; font-weight: 600;">${totalPages}</span> notes<br>
                <small style="color: var(--text-muted);">${Math.round(totalSize / 1000)}k chars, ${Math.round(avgSize)} avg</small>
            </div>
        </div>

        ${generateSectionHTML('Authorities', authorities.slice(0, 3), (a) => `[[${a.link}]] (${a.inlinks})`)}
        ${generateSectionHTML('Hubs', hubs.slice(0, 3), (h) => `[[${h.link}]] (${h.internalOutlinks})`)}
        ${generateSectionHTML('Bridges', wellConnected.slice(0, 3), (w) => `[[${w.link}]] (${w.inlinks}↔${w.internalOutlinks})`)}
        ${generateSectionHTML('Islands', islands.slice(0, 3), (i) => `[[${i.link}]]`)}
        ${generateSectionHTML('Dead-ends', deadEnds.slice(0, 3), (d) => `[[${d.link}]] (${d.inlinks}→)`)}
        ${generateSectionHTML('Orphans', orphans.slice(0, 3), (o) => `[[${o.link}]] (→${o.outlinks})`)}
        ${generateMissingLinksHTML(topMissingLinks)}
    `;
}

function generateSectionHTML<T>(title: string, items: T[], formatter: (item: T) => string): string {
    if (items.length === 0) return '';

    const formattedItems = items.map(item => {
        const text = formatter(item);
        return renderMarkdownLink(text);
    }).join(' • ');

    return `<p><strong>${title}:</strong> ${formattedItems}</p>`;
}

function generateMissingLinksHTML(topMissingLinks: [string, number][]): string {
    if (topMissingLinks.length === 0) return '';

    const missingLinksFormatted = topMissingLinks.map(([name, count]) => {
        const searchQuery = `/\\[\\[${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\]/`;
        return `<a href="obsidian://search?query=${encodeURIComponent(searchQuery)}">${name}</a> (${count})`;
    }).join(' • ');

    return `<p><strong>Missing Notes:</strong> ${missingLinksFormatted}</p>`;
}

export const analytics: Component<['searchFolder', 'colors', 'showTitle']> = {
    keyName: 'analytics',
    name: 'Vault Analytics',
    description: 'Display comprehensive vault analytics and insights',
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
        }
    },
    isMountable: false,
    does: [ComponentAction.READ],
    render: renderAnalytics,
    refresh: true,
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