// utils.ts

import { App, MarkdownPostProcessorContext, TFile, CachedMetadata } from "obsidian";

/**
 * Parses .env-style key-value pairs from a code block.
 * e.g., `GITHUB_TOKEN="your_token_here"`
 */
export function parseArguments(source: string): Record<string, string> {
    const args: Record<string, string> = {};
    const lines = source.split('\n');
    // This regex finds lines like: KEY="value" or KEY='value' or KEY=value or KEY!=value
    const quotedRegex = /^\s*([a-zA-Z0-9_!-]+)\s*=\s*["'](.*?)["']/;
    const unquotedRegex = /^\s*([a-zA-Z0-9_!-]+)\s*=\s*([^\s]+.*?)$/;

    for (const line of lines) {
        // Try quoted values first
        let match = line.match(quotedRegex);
        if (match) {
            const [, key, value] = match;
            args[key] = value;
        } else {
            // Try unquoted values
            match = line.match(unquotedRegex);
            if (match) {
                const [, key, value] = match;
                args[key] = value.trim();
            }
        }
    }
    
    return args;
}

/**
 * Checks if all required arguments are present and throws an error if not.
 */
export function validateArguments(args: Record<string, string>, required: string[]): void {
    const missingArgs = required.filter(key => !(key in args));
    if (missingArgs.length > 0) {
        throw new Error(`Missing required arguments: ${missingArgs.join(', ')}`);
    }
}

export function resolvePath(pathArg: string, path: string): string {
    const isAbsolute = pathArg.startsWith('/');
    
    let baseSegments = pathArg.split('/').filter(Boolean);
    const relativeSegments = path.split('/');

    for (const segment of relativeSegments) {
        if (segment === '..') {
            if (baseSegments.length > 0) {
                baseSegments.pop();
            }
        } else if (segment !== '.' && segment.length > 0) {
            baseSegments.push(segment);
        }
    }
    
    const resolvedPath = baseSegments.join('/');

    if (isAbsolute) {
        return '/' + resolvedPath;
    }
    
    return resolvedPath;
}


export function resolveSpecialVariables(args: Record<string, string>, ctx: MarkdownPostProcessorContext): Record<string, string> {
    const resolved = { ...args };

    Object.keys(resolved).forEach(key => {
        const value = resolved[key];
        if (value === '__SELF__') {
            resolved[key] = ctx.sourcePath;
        } else if (value.includes('__SELF__')) {
            resolved[key] = value.replace('__SELF__', ctx.sourcePath);
        } else if (value === '__ROOT__') {
            resolved[key] = '';
        }
    });

    return resolved;
}

export function parseFM(args: Record<string, string>, app: App, ctx: MarkdownPostProcessorContext): Record<string, string> {
    const file = app.vault.getAbstractFileByPath(ctx.sourcePath);
    const fm = file instanceof TFile ? app.metadataCache.getFileCache(file)?.frontmatter || {} : {};
    Object.keys(args).forEach(key => {
        if (args[key]?.startsWith('fm.')) {
            const fmKey = args[key].slice(3);
            args[key] = String(fm[fmKey]);
        }
    });
    
    return args;
}

export function applyCssFromArgs(element: HTMLElement, args: Record<string, string>, handledKeys: Set<string> = new Set()) {
    Object.entries(args).forEach(([key, value]) => {
        if (!handledKeys.has(key)) {
            const previousValue = element.style.getPropertyValue(key);
            element.style.setProperty(key, value);

            if (element.style.getPropertyValue(key) !== value && value !== '') {
                throw new Error(`CSS property '${key}' with value '${value}' is invalid or not supported`);
            }
        }
    });
}

/**
 * Converts a string argument to a boolean value.
 * Handles common boolean string representations consistently.
 * - 'true', '1', 'yes', 'on' -> true
 * - 'false', '0', 'no', 'off', '' -> false
 * - undefined/null -> defaultValue
 */
export function parseBoolean(value: string | undefined, defaultValue: boolean = false): boolean {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }
    const normalized = value.toLowerCase().trim();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
        return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') {
        return false;
    }
    return defaultValue;
}



/**
 * Formats a date according to the specified format string.
 * Uses moment.js (available globally in Obsidian) for proper format string support.
 * Supports moment.js format tokens like: YYYY, MM, DD, HH, mm, ss, MMM, MMMM, ddd, dddd, etc.
 */
export function formatDate(date: Date, format: string): string {
    if (!format) return date.toISOString().slice(0, 10); // Default YYYY-MM-DD
    return window.moment(date).format(format);
}

/**
 * Converts an HSL color string to a hex code using direct math.
 * e.g., "hsl(246, 84%, 69%)" -> "766df3"
 */
export function getAccentColorHex(el: HTMLElement): string {
    const fallback = 'black';

    const tempDiv = el.ownerDocument.createElement('div');
    tempDiv.style.color = 'var(--text-accent)';
    el.ownerDocument.body.appendChild(tempDiv);

    const computedColor = getComputedStyle(tempDiv).color;
    el.ownerDocument.body.removeChild(tempDiv);

    if (!computedColor || computedColor === 'rgba(0, 0, 0, 0)') return fallback;

    // Parse rgb/rgba values
    const rgbMatch = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
        const [, r, g, b] = rgbMatch.map(Number);
        const toHex = (val: number) => val.toString(16).padStart(2, '0');
        return `${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    return fallback;
}

export async function useTemplate(
    app: App,
    templatePath: string,
    folderPath: string,
    targetName: string
): Promise<void> {
    const fullPath = `${folderPath}/${targetName}.md`;
    const fileExists = app.vault.getAbstractFileByPath(fullPath);

    if (!fileExists) {
        //@ts-ignore use user's templater plugin
        const tp = app.plugins.plugins["templater-obsidian"]?.templater?.current_functions_object;
        if (tp && templatePath) {
            const templateFile = tp.file.find_tfile(templatePath);
            if (templateFile) {
                await tp.file.create_new(templateFile, targetName, true, folderPath);
            } else {
                const content = '';
                await app.vault.create(fullPath, content);
            }
        } else {
            const templateFile = templatePath ? app.vault.getFileByPath(templatePath) : null;
            const content = templateFile ? await app.vault.read(templateFile) : '';
            await app.vault.create(fullPath, content);
        }
    }

    const pathTFile = app.vault.getFileByPath(fullPath);
    if (pathTFile) {
        await app.workspace.getLeaf(false).openFile(pathTFile);
    }
}

export async function useNavigation(
    app: App,
    filePath: string,
    isNewTab: boolean = false
): Promise<void> {
    const file = app.vault.getAbstractFileByPath(filePath);
    if (file instanceof TFile) {
        await app.workspace.getLeaf(isNewTab).openFile(file);
    }
}

/**
 * Access a nested property using dot notation or array syntax.
 * Supports paths like "frontmatter.priority", "stat.mtime", "location[0]", or "nested.array[1]"
 */
export function usePropertyAccess(obj: any, path: string): any {
    // Support dot notation like "frontmatter.priority" or "stat.mtime"
    // Also support array syntax like "location[0]" or "nested.array[1]"
    return path.split('.').reduce((current: any, key: string) => {
        // Check for array syntax like "location[0]"
        const arrayMatch = key.match(/^(.+)\[(\d+)\]$/);
        if (arrayMatch) {
            const [, prop, index] = arrayMatch;
            const value = current?.[prop];
            return Array.isArray(value) ? value[parseInt(index)] : undefined;
        }
        return current?.[key];
    }, obj);
}

/**
 * Access a property from a note's cached metadata with 'note.' prefix support.
 */
export function useTargetNoteProperty(noteObj: CachedMetadata | null | undefined, propertyPath: string): any {
    // Handle note.* prefix for accessing target note properties
    if (propertyPath.startsWith('note.')) {
        const actualPath = propertyPath.slice(5); // Remove 'note.' prefix
        return usePropertyAccess(noteObj, actualPath);
    }
    return undefined;
}

/**
 * Sort an array of items by various criteria (age, date, file stats, or note properties).
 */
export function useTargetNoteSorting<T extends { fm?: CachedMetadata | null, age?: number, date?: Date, file?: TFile, text?: string }>(
    items: T[],
    sortBy: string
): T[] {
    return items.sort((a, b) => {
        switch (sortBy) {
            case 'age':
                return (b.age || 0) - (a.age || 0); // Oldest first
            case 'ctime':
                return (a.file?.stat.ctime || 0) - (b.file?.stat.ctime || 0); // Oldest created first
            case 'mtime':
                return (b.file?.stat.mtime || 0) - (a.file?.stat.mtime || 0); // Recently modified first
            case 'date':
                return (b.date?.getTime() || 0) - (a.date?.getTime() || 0); // Latest date first
            case 'text':
                return (a.text || '').localeCompare(b.text || ''); // Alphabetical
            default:
                // Handle note.* prefix for target note properties
                if (sortBy.startsWith('note.') && a.fm && b.fm) {
                    const aVal = useTargetNoteProperty(a.fm, sortBy);
                    const bVal = useTargetNoteProperty(b.fm, sortBy);

                    if (typeof aVal === 'number' && typeof bVal === 'number') {
                        return bVal - aVal; // Descending for numbers
                    }
                    if (typeof aVal === 'string' && typeof bVal === 'string') {
                        return aVal.localeCompare(bVal); // Ascending for strings
                    }
                    if (aVal instanceof Date && bVal instanceof Date) {
                        return bVal.getTime() - aVal.getTime(); // Descending for dates
                    }
                }
                return (b.age || 0) - (a.age || 0); // Default to age
        }
    });
}

export function renderMarkdownLink(link: string) {
    return link.replace(/\[\[([^\]]+)\]\]/g, (match, linkText) => {
        const [target, display] = linkText.split('|');
        const displayText = display || target;
        return `<a href="#" class="internal-link" data-href="${target.trim()}">${displayText.trim()}</a>`;
    });
}

/**
 * Renders text with markdown links as DOM elements (safe alternative to innerHTML).
 * Creates text nodes and link elements instead of HTML strings.
 */
export function renderMarkdownLinkToElement(text: string, container: HTMLElement): void {
    const linkRegex = /\[\[([^\]]+)\]\]/g;
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
        // Add text before the link
        if (match.index > lastIndex) {
            container.appendText(text.substring(lastIndex, match.index));
        }

        // Parse the link
        const linkText = match[1];
        const [target, display] = linkText.split('|');
        const displayText = display || target;

        // Create the link element
        const link = container.createEl('a', {
            cls: 'internal-link',
            text: displayText.trim(),
            attr: {
                href: '#',
                'data-href': target.trim()
            }
        });

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text after the last link
    if (lastIndex < text.length) {
        container.appendText(text.substring(lastIndex));
    }
}

export function renderExternalLink(text: string): string {
    return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
        return `<a href="${url}" target="_blank">${linkText}</a>`;
    });
}

/**
 * Renders text with external links as DOM elements (safe alternative to innerHTML).
 * Creates text nodes and link elements instead of HTML strings.
 */
export function renderExternalLinkToElement(text: string, container: HTMLElement): void {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
        // Add text before the link
        if (match.index > lastIndex) {
            container.appendText(text.substring(lastIndex, match.index));
        }

        // Create the link element
        const linkText = match[1];
        const url = match[2];
        const link = container.createEl('a', {
            text: linkText,
            href: url
        });
        link.setAttribute('target', '_blank');

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text after the last link
    if (lastIndex < text.length) {
        container.appendText(text.substring(lastIndex));
    }
}

export async function getTasks(app: App, file: TFile, options: {
    completed?: boolean;
    incomplete?: boolean;
    section?: string;
} = {}): Promise<string[]> {
    const { completed = false, incomplete = true, section } = options;

    try {
        const content = await app.vault.read(file);
        const lines = content.split('\n');
        const tasks: string[] = [];

        let startIndex = 0;
        let endIndex = lines.length;

        // If section is specified, find the section boundaries
        if (section) {
            const sectionStartIndex = lines.findIndex(line => line.trim() === section);
            if (sectionStartIndex === -1) {
                return [];
            }

            startIndex = sectionStartIndex + 1;

            // Find the next section or end of file
            for (let i = startIndex; i < lines.length; i++) {
                if (lines[i].startsWith('## ')) {
                    endIndex = i;
                    break;
                }
            }
        }

        // Extract tasks from the specified range
        for (let i = startIndex; i < endIndex; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            const taskMatch = trimmedLine.match(/^- \[(.)\] (.+)$/);

            if (taskMatch) {
                const [, status, taskText] = taskMatch;
                const isCompleted = status === 'x' || status === 'X' || status === 'C';
                const isIncomplete = status === ' ' || status === 'R' || status === '/';

                if ((completed && isCompleted) || (incomplete && isIncomplete)) {
                    let processedTaskText = renderMarkdownLink(taskText);
                    tasks.push(processedTaskText);
                }
            }
        }

        return tasks;
    } catch (error) {
        console.error('Error reading tasks from file:', error);
        return [];
    }
}

/**
 * Query Obsidian notes.
 * Supports:
 * - Tag queries: #tagname
 * - Quoted folder paths: "folder/path"
 * - Unquoted folder paths: folder/path
 * - AND operator: "#tag AND folder/path"
 * - OR operator: "#tag1 OR #tag2"
 * - Combined: "#tag1 OR #tag2 AND folder/path" (AND has higher precedence)
 */
export function matchesQuery(file: TFile, cache: CachedMetadata | null, query: string): boolean {
    if (!query.trim()) return true;

    const frontmatter = cache?.frontmatter || {};
    const tags = cache?.tags?.map((t) => t.tag) || [];
    const fmTags = Array.isArray(frontmatter?.tags) ? frontmatter.tags :
                  frontmatter?.tags ? [frontmatter.tags] : [];
    const allTags = [...tags, ...fmTags.map((t: string) => t.startsWith('#') ? t : `#${t}`)];

    // Helper function to check if a single query part matches
    const matchesPart = (part: string): boolean => {
        // Tag query
        if (part.startsWith('#')) {
            return allTags.some(tag => tag.includes(part.slice(1)));
        }

        // Quoted folder path
        if (part.startsWith('"') && part.endsWith('"')) {
            const folderPath = part.slice(1, -1);
            return file.path.startsWith(folderPath);
        }

        // Unquoted folder path
        return file.path.includes(part);
    };

    // Split by OR first (lower precedence)
    const orGroups = query.split(' OR ').map(group => group.trim());

    // For each OR group, all AND conditions must be true
    return orGroups.some(orGroup => {
        const andParts = orGroup.split(' AND ').map(part => part.trim());
        return andParts.every(matchesPart);
    });
}

const aliases = {
    folder: 'query'
}
export function parseArgsAliases(args: Record<string, string>, componentArgKeys: Set<string>): Record<string, string> {
    return Object.keys(args).reduce((acc, key) => {
        if (aliases[key] && !args[aliases[key]] && componentArgKeys.has(aliases[key])) {
            acc[aliases[key]] = args[key];
        } else {
            acc[key] = args[key];
        }
        return acc;
    }, {});
}