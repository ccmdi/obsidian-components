import { Component, ComponentAction, ComponentInstance } from "components";
import { TFile, TFolder } from "obsidian";
import { parseBoolean, matchesQuery } from "utils";
import { placesStyles } from "./styles";

interface PlaceData {
    name: string;
    path: string;
    country?: string;
    state?: string;
    locality?: string;
    score?: number;
}

interface StateStats {
    state: string;
    scores: number[];
    median: number;
    average: number;
    high: number;
    low: number;
    count: number;
}

/**
 * Get a nested property from an object using dot notation
 */
function getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Check if a value looks like place data (array) rather than a query string
 */
function isPlaceData(value: any): boolean {
    if (Array.isArray(value)) return true;

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                return Array.isArray(parsed);
            } catch {
                return false;
            }
        }
    }

    return false;
}

/**
 * Calculate median of an array of numbers
 */
function median(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Create a flag image element for a country code
 */
function createFlagElement(container: HTMLElement, countryCode: string): void {
    if (!countryCode || countryCode.length !== 2) return;
    const img = container.createEl('img', {
        cls: 'places-flag',
        attr: {
            src: `https://flagsapi.com/${countryCode.toUpperCase()}/flat/24.png`,
            alt: countryCode
        }
    });
}

export const places: Component<[
    'source', 'query', 'showFlags', 'showStateTable',
    'countryField', 'stateField', 'localityField', 'scoreField', 'excludeTag'
]> = {
    name: 'Places',
    description: 'Display visited places statistics from a folder or frontmatter data',
    keyName: 'places',
    icon: 'map',
    args: {
        source: {
            description: 'Folder path to find places, OR use fm.places to read from frontmatter',
            required: true
        },
        query: {
            description: 'Additional query filter (supports #tags, AND/OR operators)',
            default: ''
        },
        showFlags: {
            description: 'Show country flags next to country names',
            default: 'true'
        },
        showStateTable: {
            description: 'Show state scores table with statistics',
            default: 'false'
        },
        countryField: {
            description: 'Frontmatter field path for country (e.g., place.country)',
            default: 'place.country'
        },
        stateField: {
            description: 'Frontmatter field path for state (e.g., place.state)',
            default: 'place.state'
        },
        localityField: {
            description: 'Frontmatter field path for locality/town (e.g., place.locality)',
            default: 'place.locality'
        },
        scoreField: {
            description: 'Frontmatter field path for score (e.g., score)',
            default: 'score'
        },
        excludeTag: {
            description: 'Tag to exclude from results',
            default: ''
        }
    },
    isMountable: true,
    does: [ComponentAction.READ],
    styles: placesStyles,

    render: async (args, el, ctx, app, instance: ComponentInstance) => {
        const source = args.source;
        const query = args.query || '';
        const showFlags = parseBoolean(args.showFlags, true);
        const showStateTable = parseBoolean(args.showStateTable, false);
        const countryField = args.countryField || 'place.country';
        const stateField = args.stateField || 'place.state';
        const localityField = args.localityField || 'place.locality';
        const scoreField = args.scoreField || 'score';
        const excludeTag = args.excludeTag || '';

        let places: PlaceData[] = [];

        // Check if source is already place data (array from frontmatter)
        if (isPlaceData(source)) {
            let placeList: any[] = [];

            if (Array.isArray(source)) {
                placeList = source;
            } else if (typeof source === 'string') {
                try {
                    placeList = JSON.parse(source);
                } catch { /* ignore */ }
            }

            places = placeList.map((p: any) => ({
                name: p.name || '',
                path: p.path || '',
                country: getNestedProperty(p, countryField) || p.country,
                state: getNestedProperty(p, stateField) || p.state,
                locality: getNestedProperty(p, localityField) || p.locality,
                score: getNestedProperty(p, scoreField) ?? p.score
            }));
        } else {
            // Dynamic mode: resolve source as folder path or query
            let folderPath = source.trim();
            if (folderPath.startsWith('"') && folderPath.endsWith('"')) {
                folderPath = folderPath.slice(1, -1);
            }

            const isPureQuery = source.startsWith('#') || source.includes(' AND ') || source.includes(' OR ');
            const folder = isPureQuery ? null : app.vault.getFolderByPath(folderPath);

            if (!isPureQuery && !folder) {
                el.createEl('div', {
                    cls: 'places-error',
                    text: `Folder not found: ${folderPath}`
                });
                return;
            }

            const collectFiles = (f: TFolder): TFile[] => {
                const files: TFile[] = [];
                for (const child of f.children) {
                    if (child instanceof TFile && child.extension === 'md') {
                        files.push(child);
                    } else if (child instanceof TFolder) {
                        files.push(...collectFiles(child));
                    }
                }
                return files;
            };

            const files = isPureQuery ? app.vault.getMarkdownFiles() : collectFiles(folder!);
            const fullQuery = isPureQuery
                ? (query ? `${source} AND ${query}` : source)
                : (query || '');

            for (const file of files) {
                const cache = app.metadataCache.getFileCache(file);

                // Apply query filter if present
                if (fullQuery && !matchesQuery(file, cache, fullQuery)) continue;

                const fm = cache?.frontmatter;
                if (!fm) continue;

                // Check for exclude tag
                if (excludeTag) {
                    const inlineTags = cache?.tags?.map(t => t.tag.replace(/^#/, '')) || [];
                    const fmTags = Array.isArray(fm.tags) ? fm.tags : (fm.tags ? [fm.tags] : []);
                    const allTags = [...fmTags, ...inlineTags];
                    if (allTags.some(tag => tag.includes(excludeTag))) continue;
                }

                // Extract place data using configurable field paths
                const country = getNestedProperty(fm, countryField);
                const state = getNestedProperty(fm, stateField);
                const locality = getNestedProperty(fm, localityField);
                const score = getNestedProperty(fm, scoreField);

                places.push({
                    name: fm.name || file.basename,
                    path: file.path,
                    country,
                    state,
                    locality,
                    score: typeof score === 'number' ? score : undefined
                });
            }
        }

        // Aggregate data
        const countries = new Set<string>();
        const states = new Set<string>();
        const localities = new Set<string>();
        const stateScores: Record<string, number[]> = {};

        for (const place of places) {
            if (place.country) countries.add(place.country);
            if (place.state) states.add(place.state);
            if (place.locality) localities.add(place.locality);

            // Collect scores by state
            if (place.state && place.score !== undefined && !isNaN(place.score)) {
                if (!stateScores[place.state]) {
                    stateScores[place.state] = [];
                }
                stateScores[place.state].push(place.score);
            }
        }

        const sortedCountries = [...countries].sort();
        const sortedStates = [...states].sort();
        const sortedLocalities = [...localities].sort();

        // Build UI
        const wrapper = el.createEl('div', { cls: 'places-wrapper' });

        // Countries section
        const countriesSection = wrapper.createEl('div', { cls: 'places-section' });
        countriesSection.createEl('div', { cls: 'places-stat', text: `${countries.size} countries visited` });
        
        const countriesList = countriesSection.createEl('ul', { cls: 'places-list places-countries' });
        for (const country of sortedCountries) {
            const li = countriesList.createEl('li', { cls: 'places-item' });
            if (showFlags && country.length === 2) {
                createFlagElement(li, country);
            }
            li.createEl('span', { cls: 'places-name', text: country });
        }

        // States section
        const statesSection = wrapper.createEl('div', { cls: 'places-section' });
        statesSection.createEl('div', { cls: 'places-stat', text: `${states.size} states visited` });
        
        const statesText = sortedStates.join(', ');
        if (statesText) {
            statesSection.createEl('p', { cls: 'places-inline-list', text: statesText });
        }

        // Localities section
        const localitiesSection = wrapper.createEl('div', { cls: 'places-section' });
        localitiesSection.createEl('div', { cls: 'places-stat', text: `${localities.size} towns visited` });

        // State scores table
        if (showStateTable && Object.keys(stateScores).length > 0) {
            const tableSection = wrapper.createEl('div', { cls: 'places-section places-table-section' });

            const tableData: StateStats[] = Object.entries(stateScores).map(([state, scores]) => {
                const validScores = scores.filter(score => !isNaN(score));
                const sum = validScores.reduce((acc, score) => acc + score, 0);
                const avg = validScores.length > 0 ? sum / validScores.length : 0;

                return {
                    state,
                    scores: validScores,
                    median: median(validScores),
                    average: avg,
                    high: Math.max(...validScores),
                    low: Math.min(...validScores),
                    count: validScores.length
                };
            });

            // Sort by median descending
            tableData.sort((a, b) => b.median - a.median);

            const table = tableSection.createEl('table', { cls: 'places-table' });
            
            // Header
            const thead = table.createEl('thead');
            const headerRow = thead.createEl('tr');
            ['State', 'Median', 'Average', 'High', 'Low', 'Count'].forEach(header => {
                headerRow.createEl('th', { text: header });
            });

            // Body
            const tbody = table.createEl('tbody');
            for (const row of tableData) {
                const tr = tbody.createEl('tr');
                tr.createEl('td', { text: row.state });
                tr.createEl('td', { text: String(row.median) });
                tr.createEl('td', { text: row.average.toFixed(2) });
                tr.createEl('td', { text: String(row.high) });
                tr.createEl('td', { text: String(row.low) });
                const countCell = tr.createEl('td', { cls: 'places-count' });
                countCell.createEl('span', { text: String(row.count) });
            }
        }

        // Store data for potential refresh
        instance.data.places = places;

        // Metadata change listener for dynamic mode
        if (!isPlaceData(source)) {
            const handleMetadataChange = (changedFile: TFile) => {
                let folderPath = source.trim();
                if (folderPath.startsWith('"') && folderPath.endsWith('"')) {
                    folderPath = folderPath.slice(1, -1);
                }

                const isPureQuery = source.startsWith('#') || source.includes(' AND ') || source.includes(' OR ');

                if (!isPureQuery && !changedFile.path.startsWith(folderPath)) return;

                if (instance.data.triggerRefresh) {
                    instance.data.triggerRefresh();
                }
            };

            app.metadataCache.on('changed', handleMetadataChange);
            ComponentInstance.addCleanup(instance, () => {
                app.metadataCache.off('changed', handleMetadataChange);
            });
        }
    }
};
