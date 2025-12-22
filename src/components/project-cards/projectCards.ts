import { Component, ComponentAction, ComponentInstance, componentInstances } from "components";
import { TFile, TFolder, Setting } from "obsidian";
import { parseBoolean, matchesQuery, useNavigation } from "utils";
import { projectCardsStyles } from "./styles";
import ComponentsPlugin from "main";

/**
 * Trigger refresh for all active project-cards instances
 */
function refreshAllProjectCards() {
    componentInstances.forEach((instance) => {
        // Check if this is a project-cards instance by looking for our specific data
        if (instance.data.projectsContainer && instance.data.triggerRefresh) {
            instance.data.triggerRefresh();
        }
    });
}

interface ProjectData {
    name: string;
    path: string;
    progress?: number;
    description?: string;
    subtask?: string;
    priority?: number;
    difficulty?: number;
    showProgress?: boolean;
    tags?: string[];
    endDate?: string;
    cover?: string;
}

interface TagConfig {
    bg: string;
    text: string;
}

interface TagAliasEntry {
    tag: string;
    displayName: string;
}

interface TagColorEntry {
    tag: string;
    bg: string;
    text: string;
}

/**
 * Resolve a frontmatter `cover` value to a usable browser URL.
 */
function resolveCoverUrl(app: any, cover: any, sourcePath: string): string | null {
    try {
        if (!cover) return null;

        if (typeof cover === 'object') {
            const linkPath = cover?.path || cover?.file?.path;
            if (linkPath) {
                const tfile = app.vault.getAbstractFileByPath(linkPath);
                return tfile ? app.vault.getResourcePath(tfile) : null;
            }
        }

        if (typeof cover === 'string') {
            const trimmed = cover.trim();
            if (/^https?:\/\//i.test(trimmed)) return trimmed;

            const isWiki = /^!{0,1}\[\[[^\]]+\]\]$/.test(trimmed);
            let linkInner = trimmed;
            if (isWiki) linkInner = trimmed.replace(/^!{0,1}\[\[|\]\]$/g, '');

            const dest = app.metadataCache.getFirstLinkpathDest(linkInner, sourcePath || '/');
            if (dest) return app.vault.getResourcePath(dest);

            const abs = app.vault.getAbstractFileByPath(linkInner);
            if (abs) return app.vault.getResourcePath(abs);
        }
    } catch (e) {
        console.warn('Failed to resolve cover URL', e);
    }
    return null;
}

/**
 * Check if a value looks like project data (array) rather than a query string
 */
function isProjectData(value: any): boolean {
    // Already an array
    if (Array.isArray(value)) return true;
    
    // String that looks like a JSON array
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

export const projectCards: Component<[
    'source', 'query', 'showTags', 'showFilter', 'showProgress',
    'sortBy', 'limit', 'showBadges', 'showFooter'
]> = {
    name: 'Project Cards',
    description: 'Display project cards from a folder query or frontmatter data',
    keyName: 'project-cards',
    icon: 'layout-grid',
    // No automatic refresh - we handle our own smart metadata listener
    args: {
        source: {
            description: 'Folder path/query to find projects, OR use fm.projects to read from frontmatter',
            required: true
        },
        query: {
            description: 'Additional query filter (supports #tags, AND/OR operators)',
            default: ''
        },
        showTags: {
            description: 'Show tags on project cards',
            default: 'false'
        },
        showFilter: {
            description: 'Show search/filter input',
            default: 'false'
        },
        showProgress: {
            description: 'Show progress bars (true/false/auto)',
            default: 'auto'
        },
        sortBy: {
            description: 'Sort method: "priority" (default) or "date"',
            default: 'priority'
        },
        limit: {
            description: 'Maximum number of projects to show',
            default: ''
        },
        showBadges: {
            description: 'Show priority and difficulty badges',
            default: 'true'
        },
        showFooter: {
            description: 'Show footer with end date for closed projects',
            default: 'true'
        }
    },
    isMountable: true,
    does: [ComponentAction.READ],
    styles: projectCardsStyles,

    render: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
        const source = args.source;
        const query = args.query || '';
        const showTags = parseBoolean(args.showTags, false);
        const showFilter = parseBoolean(args.showFilter, false);
        const showProgressGlobal = args.showProgress;
        const sortBy = args.sortBy || 'priority';
        const limit = args.limit ? parseInt(args.limit) : undefined;
        const showBadges = parseBoolean(args.showBadges, true);
        const showFooter = parseBoolean(args.showFooter, true);

        // Get tag configurations from component settings (stored as JSON strings)
        let tagAliases: TagAliasEntry[] = [];
        let tagColors: TagColorEntry[] = [];
        
        try {
            const aliasesStr = componentSettings.tagAliases as string | undefined;
            if (aliasesStr) tagAliases = JSON.parse(aliasesStr);
        } catch { /* ignore parse errors */ }
        
        try {
            const colorsStr = componentSettings.tagColors as string | undefined;
            if (colorsStr) tagColors = JSON.parse(colorsStr);
        } catch { /* ignore parse errors */ }

        // Build lookup maps
        const tagDisplayNames: Record<string, string> = {};
        for (const entry of tagAliases) {
            if (entry.tag && entry.displayName) {
                tagDisplayNames[entry.tag] = entry.displayName;
            }
        }

        const tagColorMap: Record<string, TagConfig> = {};
        for (const entry of tagColors) {
            if (entry.tag) {
                tagColorMap[entry.tag] = { bg: entry.bg || '#666666', text: entry.text || 'white' };
            }
        }

        const getTagDisplayName = (tag: string): string => {
            const parts = tag.split('/');
            const childPart = parts[parts.length - 1];
            return tagDisplayNames[tag] || tagDisplayNames[childPart] || 
                (childPart.length > 0 ? childPart[0].toUpperCase() + childPart.slice(1) : '');
        };

        const getTagStyle = (tag: string): TagConfig => {
            if (tagColorMap[tag]) return tagColorMap[tag];
            const parent = tag.split('/')[0];
            if (tagColorMap[parent]) return tagColorMap[parent];
            const childPart = tag.split('/').pop() || '';
            if (tagColorMap[childPart]) return tagColorMap[childPart];
            return tagColorMap['default'] || { bg: '#666666', text: 'white' };
        };

        // Collect projects based on source type
        let projects: ProjectData[] = [];

        // Check if source is already project data (array from fm.projects)
        if (isProjectData(source)) {
            // Static mode: source is project data array
            let projectList: any[] = [];
            
            if (Array.isArray(source)) {
                projectList = source;
            } else if (typeof source === 'string') {
                try {
                    projectList = JSON.parse(source);
                } catch { /* ignore */ }
            }

            projects = projectList.map((p: any) => ({
                name: p.name || '',
                path: p.path || '',
                progress: p.progress,
                description: p.description,
                subtask: p.subtask,
                priority: p.priority ?? 0,
                difficulty: p.difficulty,
                showProgress: p.showProgress,
                tags: p.tags,
                endDate: p.endDate,
                cover: p.cover
            }));
        } else {
            // Dynamic mode: try to resolve source as folder path or query
            let folderPath = source.trim();
            if (folderPath.startsWith('"') && folderPath.endsWith('"')) {
                folderPath = folderPath.slice(1, -1);
            }
            
            // Check if it's a pure tag/operator query (search all files) or a folder path
            const isPureQuery = source.startsWith('#') || source.includes(' AND ') || source.includes(' OR ');
            
            // Try to find as folder
            const folder = isPureQuery ? null : app.vault.getFolderByPath(folderPath);
            
            if (!isPureQuery && !folder) {
                el.createEl('div', { 
                    cls: 'project-cards-error',
                    text: `Folder not found: ${folderPath}` 
                });
                return;
            }

            const today = new Date();

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

            // Combine source query with additional query
            const fullQuery = isPureQuery 
                ? (query ? `${source} AND ${query}` : source)
                : (query || '');

            for (const file of files) {
                const cache = app.metadataCache.getFileCache(file);
                
                // Apply query filter if present
                if (fullQuery && !matchesQuery(file, cache, fullQuery)) continue;

                const fm = cache?.frontmatter;
                if (!fm) continue;

                // Skip completed or ended projects
                if (fm.progress === 100) continue;
                if (fm.priority !== undefined && fm.priority < 0) continue;
                if (fm.endDate && new Date(fm.endDate) <= today) continue;

                // Extract tags
                const inlineTags = cache?.tags?.map(t => t.tag.replace(/^#/, '')) || [];
                const fmTags = Array.isArray(fm.tags) ? fm.tags : (fm.tags ? [fm.tags] : []);
                const allTags = [...new Set([...fmTags, ...inlineTags])];

                projects.push({
                    name: fm.name || fm.title || file.basename,
                    path: file.path,
                    progress: fm.progress,
                    description: fm.description,
                    subtask: fm.subtask,
                    priority: fm.priority ?? 0,
                    difficulty: fm.difficulty,
                    showProgress: fm.showProgress,
                    tags: allTags,
                    endDate: fm.endDate,
                    cover: fm.cover
                });
            }
        }

        // Store for filter updates
        instance.data.allProjects = projects;
        instance.data.currentFilter = '';

        const renderProjects = (projectList: ProjectData[], filterStr: string = '') => {
            let filtered = [...projectList];

            // Apply text filter
            if (filterStr) {
                const filterTerms = filterStr.split(',').map(term => term.trim().toLowerCase()).filter(Boolean);
                filtered = filtered.filter(p =>
                    filterTerms.every(term =>
                        p.name.toLowerCase().includes(term) ||
                        (p.tags && p.tags.some(tag => tag.toLowerCase().includes(term))) ||
                        (p.tags && p.tags.some(tag => getTagDisplayName(tag).toLowerCase().includes(term)))
                    )
                );
            }

            // Sort
            if (sortBy === 'date') {
                filtered.sort((a, b) => {
                    const dateA = a.endDate ? new Date(a.endDate).getTime() : 0;
                    const dateB = b.endDate ? new Date(b.endDate).getTime() : 0;
                    return dateB - dateA;
                });
            } else {
                filtered.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
            }

            // Limit
            if (limit && limit > 0) {
                filtered = filtered.slice(0, limit);
            }

            return filtered;
        };

        const createProjectCard = (project: ProjectData, container: HTMLElement) => {
            const coverUrl = resolveCoverUrl(app, project.cover, ctx.sourcePath);
            
            const card = container.createEl('div', { cls: 'project-card' });
            if (coverUrl) {
                card.addClass('has-cover');
                card.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.08), rgba(0,0,0,0.08)), url('${coverUrl.replace(/'/g, "\\'")}')`;
                card.style.backgroundSize = 'cover';
                card.style.backgroundPosition = 'center';
                card.style.backgroundRepeat = 'no-repeat';
            }

            // Click handler to open project
            if (project.path) {
                card.addEventListener('click', async () => {
                    await useNavigation(app, project.path, false);
                });

                card.addEventListener('mousedown', async (e) => {
                    if (e.button === 1) {
                        e.preventDefault();
                        await useNavigation(app, project.path, true);
                    }
                });
            }

            const content = card.createEl('div', { cls: 'project-content' });
            const main = content.createEl('div', { cls: 'project-main' });

            // Header
            const header = main.createEl('div', { cls: 'project-header' });
            
            const title = header.createEl('h2', { cls: 'project-title' });
            title.createEl('a', {
                cls: 'internal-link',
                text: project.name,
                attr: { href: project.name }
            });

            if (showBadges && sortBy !== 'date') {
                const badges = header.createEl('div', { cls: 'project-badges' });
                
                if (project.difficulty) {
                    let remainingDays = project.difficulty;
                    if (project.progress && project.progress > 0) {
                        const remainingWork = (100 - project.progress) / 100;
                        remainingDays = Math.ceil(project.difficulty * remainingWork);
                    }
                    badges.createEl('span', { 
                        cls: 'project-difficulty',
                        text: `${remainingDays}d`
                    });
                }

                if (project.priority !== undefined) {
                    badges.createEl('span', { 
                        cls: 'project-priority',
                        text: String(project.priority)
                    });
                }
            }

            if (project.subtask) {
                main.createEl('p', { cls: 'project-subtask', text: project.subtask });
            }

            if (project.description) {
                main.createEl('p', { cls: 'project-description', text: project.description });
            }

            // Bottom section
            const bottom = content.createEl('div', { cls: 'project-bottom' });

            const shouldShowProgress = showProgressGlobal === 'true' || 
                (showProgressGlobal === 'auto' && project.showProgress);
            
            if (shouldShowProgress && project.progress !== undefined) {
                const progressContainer = bottom.createEl('div', { cls: 'project-progress' });
                const progressBar = progressContainer.createEl('div', { cls: 'progress-bar' });
                progressBar.style.setProperty('--progress', `${project.progress}%`);
            }

            if (showTags && project.tags && project.tags.length > 0) {
                const tagsContainer = bottom.createEl('div', { cls: 'project-tags' });
                
                for (const tag of project.tags) {
                    if (tag.startsWith('obj/project')) continue;
                    
                    const colorConfig = getTagStyle(tag);
                    const tagEl = tagsContainer.createEl('span', {
                        cls: 'project-tag',
                        text: getTagDisplayName(tag)
                    });
                    tagEl.style.backgroundColor = colorConfig.bg;
                    tagEl.style.color = colorConfig.text;
                }
            }

            if (showFooter && project.endDate) {
                const footer = card.createEl('div', { cls: 'project-card-footer' });
                const status = project.progress === 100 ? 'Completed' : 'Closed';
                const dateStr = new Date(project.endDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                });
                footer.textContent = `${status} ${dateStr}`;
            }
        };

        // Build UI
        const wrapper = el.createEl('div', { cls: 'project-cards-wrapper' });

        // Filter input
        if (showFilter) {
            const controls = wrapper.createEl('div', { cls: 'project-cards-controls' });
            const filterInput = controls.createEl('input', {
                cls: 'project-cards-filter',
                attr: {
                    type: 'text',
                    placeholder: 'Filter by project name or tags (comma-separated)'
                }
            });

            // Store reference for renderRefresh
            instance.data.filterInput = filterInput;

            // Read initial filter from frontmatter
            const currentFile = app.vault.getAbstractFileByPath(ctx.sourcePath);
            if (currentFile instanceof TFile) {
                const cache = app.metadataCache.getFileCache(currentFile);
                const initialFilter = cache?.frontmatter?.tagFilter || '';
                filterInput.value = initialFilter;
                instance.data.currentFilter = initialFilter;
            }

            // Debounce frontmatter save to avoid re-render loops
            let saveTimeout: NodeJS.Timeout | null = null;
            
            filterInput.addEventListener('input', (e) => {
                const filterValue = (e.target as HTMLInputElement).value;
                instance.data.currentFilter = filterValue;

                const projectsContainer = wrapper.querySelector('.projects-container') as HTMLElement;
                if (projectsContainer) {
                    projectsContainer.empty();
                    const filteredProjects = renderProjects(instance.data.allProjects, filterValue);
                    for (const project of filteredProjects) {
                        createProjectCard(project, projectsContainer);
                    }
                }

                // Debounced save to frontmatter (500ms after typing stops)
                if (saveTimeout) clearTimeout(saveTimeout);
                saveTimeout = setTimeout(async () => {
                    const file = app.vault.getAbstractFileByPath(ctx.sourcePath);
                    if (file instanceof TFile) {
                        // Mark that we're saving to prevent re-render from our own save
                        instance.data.isSavingFilter = true;
                        try {
                            await app.fileManager.processFrontMatter(file, (fm: any) => {
                                fm.tagFilter = filterValue;
                            });
                        } catch (e) {
                            console.warn('Failed to save filter:', e);
                        }
                        // Reset flag after a short delay
                        setTimeout(() => { instance.data.isSavingFilter = false; }, 100);
                    }
                }, 500);
            });
        }

        // Projects container
        const projectsContainer = wrapper.createEl('div', { cls: 'projects-container' });
        
        // Store reference for live updates
        instance.data.projectsContainer = projectsContainer;
        instance.data.renderProjects = renderProjects;
        instance.data.createProjectCard = createProjectCard;
        
        const filteredProjects = renderProjects(projects, instance.data.currentFilter);
        
        if (filteredProjects.length === 0) {
            projectsContainer.createEl('div', { 
                cls: 'project-cards-empty',
                text: 'No projects found'
            });
        } else {
            for (const project of filteredProjects) {
                createProjectCard(project, projectsContainer);
            }
        }

        // Smart metadata change listener for live updates (dynamic mode only)
        if (!isProjectData(source)) {
            const handleMetadataChange = (changedFile: TFile) => {
                // Skip if we're currently saving our own filter
                if (instance.data.isSavingFilter) return;
                
                // Skip if the changed file is our own source file
                if (changedFile.path === ctx.sourcePath) return;
                
                // Check if the changed file is in our query scope
                let folderPath = source.trim();
                if (folderPath.startsWith('"') && folderPath.endsWith('"')) {
                    folderPath = folderPath.slice(1, -1);
                }
                
                const isPureQuery = source.startsWith('#') || source.includes(' AND ') || source.includes(' OR ');
                
                // For folder mode, check if file is in the folder
                if (!isPureQuery) {
                    if (!changedFile.path.startsWith(folderPath)) return;
                }
                
                // For query mode, check if file matches query
                if (isPureQuery || query) {
                    const cache = app.metadataCache.getFileCache(changedFile);
                    const fullQuery = isPureQuery 
                        ? (query ? `${source} AND ${query}` : source)
                        : (query || '');
                    if (fullQuery && !matchesQuery(changedFile, cache, fullQuery)) return;
                }
                
                // File is relevant - trigger refresh
                if (instance.data.triggerRefresh) {
                    instance.data.triggerRefresh();
                }
            };
            
            app.metadataCache.on('changed', handleMetadataChange);
            ComponentInstance.addCleanup(instance, () => {
                app.metadataCache.off('changed', handleMetadataChange);
            });
        }
    },

    // Incremental refresh - only update projects, preserve filter input focus
    renderRefresh: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
        const source = args.source;
        const query = args.query || '';
        const showProgressGlobal = args.showProgress;
        const sortBy = args.sortBy || 'priority';
        const limit = args.limit ? parseInt(args.limit) : undefined;
        const showBadges = parseBoolean(args.showBadges, true);
        const showFooter = parseBoolean(args.showFooter, true);
        const showTags = parseBoolean(args.showTags, false);

        // Get existing references
        const projectsContainer = instance.data.projectsContainer as HTMLElement;
        if (!projectsContainer) return;

        // Get tag configurations from component settings
        let tagAliases: TagAliasEntry[] = [];
        let tagColors: TagColorEntry[] = [];
        
        try {
            const aliasesStr = componentSettings.tagAliases as string | undefined;
            if (aliasesStr) tagAliases = JSON.parse(aliasesStr);
        } catch { /* ignore */ }
        
        try {
            const colorsStr = componentSettings.tagColors as string | undefined;
            if (colorsStr) tagColors = JSON.parse(colorsStr);
        } catch { /* ignore */ }

        const tagDisplayNames: Record<string, string> = {};
        for (const entry of tagAliases) {
            if (entry.tag && entry.displayName) {
                tagDisplayNames[entry.tag] = entry.displayName;
            }
        }

        const tagColorMap: Record<string, TagConfig> = {};
        for (const entry of tagColors) {
            if (entry.tag) {
                tagColorMap[entry.tag] = { bg: entry.bg || '#666666', text: entry.text || 'white' };
            }
        }

        const getTagDisplayName = (tag: string): string => {
            const parts = tag.split('/');
            const childPart = parts[parts.length - 1];
            return tagDisplayNames[tag] || tagDisplayNames[childPart] || 
                (childPart.length > 0 ? childPart[0].toUpperCase() + childPart.slice(1) : '');
        };

        const getTagStyle = (tag: string): TagConfig => {
            if (tagColorMap[tag]) return tagColorMap[tag];
            const parent = tag.split('/')[0];
            if (tagColorMap[parent]) return tagColorMap[parent];
            const childPart = tag.split('/').pop() || '';
            if (tagColorMap[childPart]) return tagColorMap[childPart];
            return tagColorMap['default'] || { bg: '#666666', text: 'white' };
        };

        // Re-collect projects
        let projects: ProjectData[] = [];

        if (isProjectData(source)) {
            let projectList: any[] = [];
            if (Array.isArray(source)) {
                projectList = source;
            } else if (typeof source === 'string') {
                try { projectList = JSON.parse(source); } catch { /* ignore */ }
            }
            projects = projectList.map((p: any) => ({
                name: p.name || '',
                path: p.path || '',
                progress: p.progress,
                description: p.description,
                subtask: p.subtask,
                priority: p.priority ?? 0,
                difficulty: p.difficulty,
                showProgress: p.showProgress,
                tags: p.tags,
                endDate: p.endDate,
                cover: p.cover
            }));
        } else {
            let folderPath = source.trim();
            if (folderPath.startsWith('"') && folderPath.endsWith('"')) {
                folderPath = folderPath.slice(1, -1);
            }
            
            const isPureQuery = source.startsWith('#') || source.includes(' AND ') || source.includes(' OR ');
            const folder = isPureQuery ? null : app.vault.getFolderByPath(folderPath);
            
            if (!isPureQuery && !folder) return;

            const today = new Date();

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
                if (fullQuery && !matchesQuery(file, cache, fullQuery)) continue;

                const fm = cache?.frontmatter;
                if (!fm) continue;

                if (fm.progress === 100) continue;
                if (fm.priority !== undefined && fm.priority < 0) continue;
                if (fm.endDate && new Date(fm.endDate) <= today) continue;

                const inlineTags = cache?.tags?.map(t => t.tag.replace(/^#/, '')) || [];
                const fmTags = Array.isArray(fm.tags) ? fm.tags : (fm.tags ? [fm.tags] : []);
                const allTags = [...new Set([...fmTags, ...inlineTags])];

                projects.push({
                    name: fm.name || fm.title || file.basename,
                    path: file.path,
                    progress: fm.progress,
                    description: fm.description,
                    subtask: fm.subtask,
                    priority: fm.priority ?? 0,
                    difficulty: fm.difficulty,
                    showProgress: fm.showProgress,
                    tags: allTags,
                    endDate: fm.endDate,
                    cover: fm.cover
                });
            }
        }

        // Update stored projects
        instance.data.allProjects = projects;

        // Helper to create cards (duplicated for renderRefresh scope)
        const createProjectCard = (project: ProjectData, container: HTMLElement) => {
            const coverUrl = resolveCoverUrl(app, project.cover, ctx.sourcePath);
            
            const card = container.createEl('div', { cls: 'project-card' });
            if (coverUrl) {
                card.addClass('has-cover');
                card.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.08), rgba(0,0,0,0.08)), url('${coverUrl.replace(/'/g, "\\'")}')`;
                card.style.backgroundSize = 'cover';
                card.style.backgroundPosition = 'center';
            }

            if (project.path) {
                card.addEventListener('click', async () => {
                    await useNavigation(app, project.path, false);
                });
                card.addEventListener('mousedown', async (e) => {
                    if (e.button === 1) {
                        e.preventDefault();
                        await useNavigation(app, project.path, true);
                    }
                });
            }

            const content = card.createEl('div', { cls: 'project-content' });
            const main = content.createEl('div', { cls: 'project-main' });
            const header = main.createEl('div', { cls: 'project-header' });
            
            const title = header.createEl('h2', { cls: 'project-title' });
            title.createEl('a', { cls: 'internal-link', text: project.name, attr: { href: project.name } });

            if (showBadges && sortBy !== 'date') {
                const badges = header.createEl('div', { cls: 'project-badges' });
                if (project.difficulty) {
                    let remainingDays = project.difficulty;
                    if (project.progress && project.progress > 0) {
                        remainingDays = Math.ceil(project.difficulty * (100 - project.progress) / 100);
                    }
                    badges.createEl('span', { cls: 'project-difficulty', text: `${remainingDays}d` });
                }
                if (project.priority !== undefined) {
                    badges.createEl('span', { cls: 'project-priority', text: String(project.priority) });
                }
            }

            if (project.subtask) main.createEl('p', { cls: 'project-subtask', text: project.subtask });
            if (project.description) main.createEl('p', { cls: 'project-description', text: project.description });

            const bottom = content.createEl('div', { cls: 'project-bottom' });
            const shouldShowProgress = showProgressGlobal === 'true' || (showProgressGlobal === 'auto' && project.showProgress);
            if (shouldShowProgress && project.progress !== undefined) {
                const progressContainer = bottom.createEl('div', { cls: 'project-progress' });
                const progressBar = progressContainer.createEl('div', { cls: 'progress-bar' });
                progressBar.style.setProperty('--progress', `${project.progress}%`);
            }

            if (showTags && project.tags && project.tags.length > 0) {
                const tagsContainer = bottom.createEl('div', { cls: 'project-tags' });
                for (const tag of project.tags) {
                    if (tag.startsWith('obj/project')) continue;
                    const colorConfig = getTagStyle(tag);
                    const tagEl = tagsContainer.createEl('span', { cls: 'project-tag', text: getTagDisplayName(tag) });
                    tagEl.style.backgroundColor = colorConfig.bg;
                    tagEl.style.color = colorConfig.text;
                }
            }

            if (showFooter && project.endDate) {
                const footer = card.createEl('div', { cls: 'project-card-footer' });
                const status = project.progress === 100 ? 'Completed' : 'Closed';
                footer.textContent = `${status} ${new Date(project.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`;
            }
        };

        // Render filtered projects
        const renderProjects = (projectList: ProjectData[], filterStr: string = '') => {
            let filtered = [...projectList];
            if (filterStr) {
                const terms = filterStr.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
                filtered = filtered.filter(p =>
                    terms.every(term =>
                        p.name.toLowerCase().includes(term) ||
                        (p.tags && p.tags.some(tag => tag.toLowerCase().includes(term))) ||
                        (p.tags && p.tags.some(tag => getTagDisplayName(tag).toLowerCase().includes(term)))
                    )
                );
            }
            if (sortBy === 'date') {
                filtered.sort((a, b) => (b.endDate ? new Date(b.endDate).getTime() : 0) - (a.endDate ? new Date(a.endDate).getTime() : 0));
            } else {
                filtered.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
            }
            if (limit && limit > 0) filtered = filtered.slice(0, limit);
            return filtered;
        };

        // Clear and re-render projects only
        projectsContainer.empty();
        const filteredProjects = renderProjects(projects, instance.data.currentFilter || '');
        
        if (filteredProjects.length === 0) {
            projectsContainer.createEl('div', { cls: 'project-cards-empty', text: 'No projects found' });
        } else {
            for (const project of filteredProjects) {
                createProjectCard(project, projectsContainer);
            }
        }
    },

    settings: {
        _render: async (containerEl: HTMLElement, app: any, plugin: ComponentsPlugin) => {
            const componentKey = 'project-cards';
            
            // Inject settings-specific styles if not already present
            const styleId = 'project-cards-settings-styles';
            if (!document.getElementById(styleId)) {
                const styleEl = document.createElement('style');
                styleEl.id = styleId;
                styleEl.textContent = `
                    .project-cards-list-container {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                        margin: 16px 0;
                        padding: 12px;
                        background: var(--background-primary);
                        border-radius: 8px;
                        border: 1px solid var(--background-modifier-border);
                        min-height: 60px;
                    }
                    .project-cards-list-container:empty::before {
                        content: 'No entries yet';
                        color: var(--text-muted);
                        font-style: italic;
                        font-size: 0.9em;
                        text-align: center;
                        padding: 16px;
                    }
                    .project-cards-list-entry {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 12px 16px;
                        background: var(--background-secondary);
                        border-radius: 8px;
                        border: 1px solid var(--background-modifier-border);
                        transition: border-color 0.15s ease, box-shadow 0.15s ease;
                    }
                    .project-cards-list-entry:hover {
                        border-color: var(--background-modifier-border-hover);
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
                    }
                    .project-cards-input {
                        flex: 1;
                        min-width: 0;
                        padding: 8px 12px;
                        border: 1px solid var(--background-modifier-border);
                        border-radius: 6px;
                        background: var(--background-primary);
                        color: var(--text-normal);
                        font-size: 0.9em;
                        transition: border-color 0.15s ease, box-shadow 0.15s ease;
                    }
                    .project-cards-input::placeholder {
                        color: var(--text-faint);
                    }
                    .project-cards-input:focus {
                        outline: none;
                        border-color: var(--interactive-accent);
                        box-shadow: 0 0 0 2px rgba(var(--interactive-accent-rgb), 0.2);
                    }
                    .project-cards-input-tag {
                        flex: 0 0 140px;
                        max-width: 140px;
                    }
                    .project-cards-arrow {
                        color: var(--text-muted);
                        font-weight: 600;
                        font-size: 1.1em;
                        flex-shrink: 0;
                        padding: 0 4px;
                    }
                    .project-cards-color-group {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        flex-shrink: 0;
                    }
                    .project-cards-color-label {
                        font-size: 0.7em;
                        color: var(--text-muted);
                        text-transform: uppercase;
                        letter-spacing: 0.3px;
                    }
                    .project-cards-color-input {
                        width: 36px;
                        height: 32px;
                        padding: 2px;
                        border: 1px solid var(--background-modifier-border);
                        border-radius: 6px;
                        cursor: pointer;
                        background: var(--background-primary);
                        transition: border-color 0.15s ease, transform 0.1s ease;
                    }
                    .project-cards-color-input:hover {
                        border-color: var(--interactive-accent);
                        transform: scale(1.05);
                    }
                    .project-cards-color-input::-webkit-color-swatch-wrapper {
                        padding: 2px;
                    }
                    .project-cards-color-input::-webkit-color-swatch {
                        border-radius: 3px;
                        border: none;
                    }
                    .project-cards-remove-btn {
                        width: 32px;
                        height: 32px;
                        padding: 0;
                        border: none;
                        background: var(--background-primary);
                        color: var(--text-muted);
                        font-size: 1.3em;
                        font-weight: 300;
                        cursor: pointer;
                        border-radius: 6px;
                        transition: all 0.15s ease;
                        flex-shrink: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        line-height: 1;
                    }
                    .project-cards-remove-btn:hover {
                        background: var(--background-modifier-error);
                        color: var(--text-on-accent);
                    }
                    .project-cards-add-btn {
                        width: 100%;
                        padding: 10px 16px;
                        border: 2px dashed var(--background-modifier-border);
                        border-radius: 8px;
                        background: transparent;
                        color: var(--text-muted);
                        font-size: 0.9em;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        margin-top: 8px;
                    }
                    .project-cards-add-btn:hover {
                        border-color: var(--interactive-accent);
                        color: var(--interactive-accent);
                        background: var(--background-secondary);
                    }
                    .project-cards-section-spacer {
                        height: 24px;
                    }
                `;
                document.head.appendChild(styleEl);
            }
            
            // Ensure settings structure exists
            if (!plugin.settings.componentSettings[componentKey]) {
                plugin.settings.componentSettings[componentKey] = {};
            }
            const settings = plugin.settings.componentSettings[componentKey];

            // Helper to get/set JSON arrays from string storage
            const getAliases = (): TagAliasEntry[] => {
                try {
                    const str = settings.tagAliases as string | undefined;
                    return str ? JSON.parse(str) : [];
                } catch { return []; }
            };

            const setAliases = async (arr: TagAliasEntry[]) => {
                settings.tagAliases = JSON.stringify(arr);
                await plugin.saveSettings();
                refreshAllProjectCards();
            };

            const getColors = (): TagColorEntry[] => {
                try {
                    const str = settings.tagColors as string | undefined;
                    return str ? JSON.parse(str) : [];
                } catch { return []; }
            };

            const setColors = async (arr: TagColorEntry[]) => {
                settings.tagColors = JSON.stringify(arr);
                await plugin.saveSettings();
                refreshAllProjectCards();
            };

            // ========== Tag Aliases Section ==========
            const aliasesHeader = containerEl.createEl('div', { cls: 'setting-item-heading' });
            aliasesHeader.createEl('span', { text: 'Tag Aliases' });
            
            containerEl.createEl('p', { 
                cls: 'setting-item-description',
                text: 'Map tag names to display names (e.g., "dev" → "Development")'
            });

            const aliasesContainer = containerEl.createEl('div', { cls: 'project-cards-list-container' });

            const rerenderAliases = () => {
                aliasesContainer.empty();
                const aliases = getAliases();
                aliases.forEach((entry, index) => {
                    const entryEl = aliasesContainer.createEl('div', { cls: 'project-cards-list-entry' });
                    
                    const tagInput = entryEl.createEl('input', {
                        cls: 'project-cards-input',
                        attr: { type: 'text', placeholder: 'Tag (e.g., dev)' }
                    });
                    tagInput.value = entry.tag || '';
                    tagInput.addEventListener('change', async () => {
                        const arr = getAliases();
                        arr[index].tag = tagInput.value;
                        await setAliases(arr);
                    });

                    entryEl.createEl('span', { text: '→', cls: 'project-cards-arrow' });

                    const displayInput = entryEl.createEl('input', {
                        cls: 'project-cards-input',
                        attr: { type: 'text', placeholder: 'Display name' }
                    });
                    displayInput.value = entry.displayName || '';
                    displayInput.addEventListener('change', async () => {
                        const arr = getAliases();
                        arr[index].displayName = displayInput.value;
                        await setAliases(arr);
                    });

                    const removeBtn = entryEl.createEl('button', { 
                        cls: 'project-cards-remove-btn',
                        text: '×'
                    });
                    removeBtn.addEventListener('click', async () => {
                        const arr = getAliases();
                        arr.splice(index, 1);
                        await setAliases(arr);
                        rerenderAliases();
                    });
                });
            };
            rerenderAliases();

            const addAliasBtn = containerEl.createEl('button', {
                cls: 'project-cards-add-btn',
                text: '+ Add alias'
            });
            addAliasBtn.addEventListener('click', async () => {
                const arr = getAliases();
                arr.push({ tag: '', displayName: '' });
                await setAliases(arr);
                rerenderAliases();
            });

            // ========== Tag Colors Section ==========
            containerEl.createEl('div', { cls: 'project-cards-section-spacer' });
            
            const colorsHeader = containerEl.createEl('div', { cls: 'setting-item-heading' });
            colorsHeader.createEl('span', { text: 'Tag Colors' });
            
            containerEl.createEl('p', { 
                cls: 'setting-item-description',
                text: 'Define background and text colors for tags'
            });

            const colorsContainer = containerEl.createEl('div', { cls: 'project-cards-list-container' });

            const rerenderColors = () => {
                colorsContainer.empty();
                const colors = getColors();
                colors.forEach((entry, index) => {
                    const entryEl = colorsContainer.createEl('div', { cls: 'project-cards-list-entry' });
                    
                    const tagInput = entryEl.createEl('input', {
                        cls: 'project-cards-input project-cards-input-tag',
                        attr: { type: 'text', placeholder: 'Tag name' }
                    });
                    tagInput.value = entry.tag || '';
                    tagInput.addEventListener('change', async () => {
                        const arr = getColors();
                        arr[index].tag = tagInput.value;
                        await setColors(arr);
                    });

                    // Background color group
                    const bgGroup = entryEl.createEl('div', { cls: 'project-cards-color-group' });
                    bgGroup.createEl('span', { cls: 'project-cards-color-label', text: 'BG' });
                    const bgInput = bgGroup.createEl('input', {
                        cls: 'project-cards-color-input',
                        attr: { type: 'color', title: 'Background color' }
                    });
                    bgInput.value = entry.bg || '#666666';
                    bgInput.addEventListener('change', async () => {
                        const arr = getColors();
                        arr[index].bg = bgInput.value;
                        await setColors(arr);
                    });

                    // Text color group
                    const textGroup = entryEl.createEl('div', { cls: 'project-cards-color-group' });
                    textGroup.createEl('span', { cls: 'project-cards-color-label', text: 'Text' });
                    const textInput = textGroup.createEl('input', {
                        cls: 'project-cards-color-input',
                        attr: { type: 'color', title: 'Text color' }
                    });
                    textInput.value = entry.text || '#ffffff';
                    textInput.addEventListener('change', async () => {
                        const arr = getColors();
                        arr[index].text = textInput.value;
                        await setColors(arr);
                    });

                    const removeBtn = entryEl.createEl('button', { 
                        cls: 'project-cards-remove-btn',
                        text: '×'
                    });
                    removeBtn.addEventListener('click', async () => {
                        const arr = getColors();
                        arr.splice(index, 1);
                        await setColors(arr);
                        rerenderColors();
                    });
                });
            };
            rerenderColors();

            const addColorBtn = containerEl.createEl('button', {
                cls: 'project-cards-add-btn',
                text: '+ Add color'
            });
            addColorBtn.addEventListener('click', async () => {
                const arr = getColors();
                arr.push({ tag: '', bg: '#666666', text: '#ffffff' });
                await setColors(arr);
                rerenderColors();
            });
        }
    }
};
