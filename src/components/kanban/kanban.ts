import { Component, ComponentAction, ComponentInstance } from "components";
import { App, TFile, TFolder } from "obsidian";
import { parseBoolean, matchesQuery, useNavigation } from "utils";
import { kanbanStyles } from "./styles";

interface KanbanItem {
    name: string;
    path: string;
    status: string;
    description?: string;
    priority?: number;
    tags?: string[];
    dueDate?: string;
    cover?: string;
}

interface ColumnConfig {
    id: string;
    title: string;
    color?: string;
}

/**
 * Parse columns configuration from string.
 * Supports formats:
 * - Simple: "todo,in-progress,done"
 * - With titles: "todo:To Do,in-progress:In Progress,done:Done"
 * - With colors: "todo:To Do:#ff6b6b,in-progress:In Progress:#ffd93d,done:Done:#6bcb77"
 */
function parseColumns(columnsStr: string): ColumnConfig[] {
    if (!columnsStr.trim()) {
        // Default columns
        return [
            { id: 'todo', title: 'To Do', color: 'var(--text-error)' },
            { id: 'in-progress', title: 'In Progress', color: 'var(--text-warning)' },
            { id: 'done', title: 'Done', color: 'var(--text-success)' }
        ];
    }

    return columnsStr.split(',').map(col => {
        const parts = col.trim().split(':');
        const id = parts[0].trim();
        const title = parts[1]?.trim() || id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ');
        const color = parts[2]?.trim();
        return { id, title, color };
    });
}

/**
 * Resolve cover image URL from frontmatter value.
 */
function resolveCoverUrl(app: App, cover: unknown, sourcePath: string): string | null {
    try {
        if (!cover) return null;

        if (typeof cover === 'object' && cover !== null) {
            const coverObj = cover as Record<string, unknown>;
            const fileObj = coverObj.file as Record<string, unknown> | undefined;
            const linkPath = (coverObj.path as string) || (fileObj?.path as string);
            if (linkPath) {
                const tfile = app.vault.getAbstractFileByPath(linkPath);
                return tfile instanceof TFile ? app.vault.getResourcePath(tfile) : null;
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
            if (abs instanceof TFile) return app.vault.getResourcePath(abs);
        }
    } catch (e) {
        console.warn('Failed to resolve cover URL', e);
    }
    return null;
}

export const kanban: Component<[
    'source', 'query', 'statusProperty', 'columns', 'showTags', 'showDescription',
    'showPriority', 'showDueDate', 'sortBy', 'limit', 'showCount', 'showCover', 'scrollable'
]> = {
    name: 'Kanban',
    description: 'Display a kanban board from notes with status frontmatter',
    keyName: 'kanban',
    icon: 'kanban',
    refresh: 'anyMetadataChanged',
    args: {
        source: {
            description: 'Folder path to find items (e.g., "Projects" or "Tasks")',
            required: true
        },
        query: {
            description: 'Additional query filter (supports #tags, AND/OR operators, property filters)',
            default: ''
        },
        statusProperty: {
            description: 'Frontmatter property to use for status (default: "status")',
            default: 'status'
        },
        columns: {
            description: 'Column config: "id:Title:color,..." or simple "todo,doing,done"',
            default: ''
        },
        showTags: {
            description: 'Show tags on cards',
            default: 'true'
        },
        showDescription: {
            description: 'Show description on cards',
            default: 'true'
        },
        showPriority: {
            description: 'Show priority badge on cards',
            default: 'true'
        },
        showDueDate: {
            description: 'Show due date on cards',
            default: 'true'
        },
        sortBy: {
            description: 'Sort cards by: "priority", "dueDate", "name", "mtime"',
            default: 'priority'
        },
        limit: {
            description: 'Maximum cards per column (0 = no limit)',
            default: '0'
        },
        showCount: {
            description: 'Show item count in column headers',
            default: 'true'
        },
        showCover: {
            description: 'Show cover images on cards',
            default: 'false'
        },
        scrollable: {
            description: 'Allow horizontal scroll when columns overflow (false = columns shrink to fit)',
            default: 'true'
        }
    },
    isMountable: true,
    does: [ComponentAction.READ, ComponentAction.WRITE],
    styles: kanbanStyles,

    render: async (args, el, ctx, app, instance: ComponentInstance) => {
        const source = args.source;
        const query = args.query;
        const statusProperty = args.statusProperty;
        const columns = parseColumns(args.columns);
        const showTags = parseBoolean(args.showTags, true);
        const showDescription = parseBoolean(args.showDescription, true);
        const showPriority = parseBoolean(args.showPriority, true);
        const showDueDate = parseBoolean(args.showDueDate, true);
        const sortBy = args.sortBy;
        const limit = parseInt(args.limit);
        const showCount = parseBoolean(args.showCount, true);
        const showCover = parseBoolean(args.showCover, false);
        const scrollable = parseBoolean(args.scrollable, true);

        // Collect items from folder
        let items: KanbanItem[] = [];

        let folderPath = source.trim();
        if (folderPath.startsWith('"') && folderPath.endsWith('"')) {
            folderPath = folderPath.slice(1, -1);
        }

        const isPureQuery = source.startsWith('#') || source.includes(' AND ') || source.includes(' OR ');
        const folder = isPureQuery ? null : app.vault.getFolderByPath(folderPath);

        if (!isPureQuery && !folder) {
            el.createEl('div', {
                cls: 'kanban-error',
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

            if (fullQuery && !matchesQuery(file, cache, fullQuery)) continue;

            const fm = cache?.frontmatter;
            if (!fm) continue;

            const status = fm[statusProperty];
            if (!status) continue;

            // Extract tags
            const inlineTags = cache?.tags?.map(t => t.tag.replace(/^#/, '')) || [];
            const fmTags = Array.isArray(fm.tags) ? fm.tags : (fm.tags ? [fm.tags] : []);
            const allTags = [...new Set([...fmTags, ...inlineTags])];

            items.push({
                name: fm.name || fm.title || file.basename,
                path: file.path,
                status: String(status).toLowerCase().replace(/\s+/g, '-'),
                description: fm.description,
                priority: fm.priority,
                tags: allTags,
                dueDate: fm.dueDate || fm.due,
                cover: fm.cover
            });
        }

        // Store data for drag operations
        instance.data.statusProperty = statusProperty;
        instance.data.items = items;

        // Sort items
        const sortItems = (itemList: KanbanItem[]): KanbanItem[] => {
            return [...itemList].sort((a, b) => {
                switch (sortBy) {
                    case 'priority':
                        return (b.priority ?? 0) - (a.priority ?? 0);
                    case 'dueDate':
                        if (!a.dueDate && !b.dueDate) return 0;
                        if (!a.dueDate) return 1;
                        if (!b.dueDate) return -1;
                        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                    case 'name':
                        return a.name.localeCompare(b.name);
                    case 'mtime':
                        const fileA = app.vault.getAbstractFileByPath(a.path);
                        const fileB = app.vault.getAbstractFileByPath(b.path);
                        if (fileA instanceof TFile && fileB instanceof TFile) {
                            return fileB.stat.mtime - fileA.stat.mtime;
                        }
                        return 0;
                    default:
                        return (b.priority ?? 0) - (a.priority ?? 0);
                }
            });
        };

        // Group items by status
        const itemsByStatus: Record<string, KanbanItem[]> = {};
        for (const col of columns) {
            itemsByStatus[col.id] = [];
        }

        for (const item of items) {
            const normalizedStatus = item.status.toLowerCase().replace(/\s+/g, '-');
            if (itemsByStatus[normalizedStatus]) {
                itemsByStatus[normalizedStatus].push(item);
            } else {
                // Put in first column if status doesn't match any column
                const firstCol = columns[0];
                if (firstCol) {
                    itemsByStatus[firstCol.id].push(item);
                }
            }
        }

        // Sort items in each column
        for (const colId of Object.keys(itemsByStatus)) {
            itemsByStatus[colId] = sortItems(itemsByStatus[colId]);
            if (limit > 0) {
                itemsByStatus[colId] = itemsByStatus[colId].slice(0, limit);
            }
        }

        // Build UI
        const wrapper = el.createEl('div', { cls: 'kanban-wrapper' });
        if (!scrollable) {
            wrapper.addClass('kanban-no-scroll');
        }
        const board = wrapper.createEl('div', { cls: 'kanban-board' });

        // Track dragged item
        let draggedCard: HTMLElement | null = null;
        let draggedItem: KanbanItem | null = null;

        const createCard = (item: KanbanItem, container: HTMLElement) => {
            const coverUrl = showCover ? resolveCoverUrl(app, item.cover, ctx.sourcePath) : null;

            const card = container.createEl('div', {
                cls: 'kanban-card',
                attr: { draggable: 'true' }
            });
            card.dataset.path = item.path;

            if (coverUrl) {
                card.addClass('has-cover');
                const coverEl = card.createEl('div', { cls: 'kanban-card-cover' });
                coverEl.style.backgroundImage = `url('${coverUrl.replace(/'/g, "\\'")}')`;
            }

            const content = card.createEl('div', { cls: 'kanban-card-content' });

            // Header with title and priority
            const header = content.createEl('div', { cls: 'kanban-card-header' });

            const title = header.createEl('div', { cls: 'kanban-card-title' });
            title.createEl('a', {
                cls: 'internal-link',
                text: item.name,
                attr: { href: item.path }
            });

            if (showPriority && item.priority !== undefined) {
                header.createEl('span', {
                    cls: 'kanban-card-priority',
                    text: String(item.priority)
                });
            }

            // Description
            if (showDescription && item.description) {
                content.createEl('p', {
                    cls: 'kanban-card-description',
                    text: item.description
                });
            }

            // Footer with tags and due date
            const footer = content.createEl('div', { cls: 'kanban-card-footer' });

            if (showTags && item.tags && item.tags.length > 0) {
                const tagsContainer = footer.createEl('div', { cls: 'kanban-card-tags' });
                for (const tag of item.tags.slice(0, 3)) {
                    tagsContainer.createEl('span', {
                        cls: 'kanban-card-tag',
                        text: tag.split('/').pop() || tag
                    });
                }
                if (item.tags.length > 3) {
                    tagsContainer.createEl('span', {
                        cls: 'kanban-card-tag kanban-card-tag-more',
                        text: `+${item.tags.length - 3}`
                    });
                }
            }

            if (showDueDate && item.dueDate) {
                const dueDate = new Date(item.dueDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isOverdue = dueDate < today;
                const isSoon = !isOverdue && dueDate.getTime() - today.getTime() < 3 * 24 * 60 * 60 * 1000;

                const dueDateStr = dueDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                });

                footer.createEl('span', {
                    cls: `kanban-card-due ${isOverdue ? 'overdue' : ''} ${isSoon ? 'soon' : ''}`,
                    text: dueDateStr
                });
            }

            // Click to open note
            card.addEventListener('click', async (e) => {
                if ((e.target as HTMLElement).classList.contains('internal-link')) return;
                await useNavigation(app, item.path, false);
            });

            card.addEventListener('mousedown', async (e) => {
                if (e.button === 1) {
                    e.preventDefault();
                    await useNavigation(app, item.path, true);
                }
            });

            // Drag events - stopPropagation prevents widget-space muuri from intercepting
            card.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                draggedCard = card;
                draggedItem = item;
                card.addClass('dragging');
                e.dataTransfer?.setData('text/plain', item.path);
            });

            card.addEventListener('dragend', (e) => {
                e.stopPropagation();
                card.removeClass('dragging');
                draggedCard = null;
                draggedItem = null;

                // Remove all drag-over classes
                board.querySelectorAll('.drag-over').forEach(el => el.removeClass('drag-over'));
            });
        };

        // Create columns
        for (const col of columns) {
            const column = board.createEl('div', { cls: 'kanban-column' });
            column.dataset.columnId = col.id;

            const columnHeader = column.createEl('div', { cls: 'kanban-column-header' });

            if (col.color) {
                columnHeader.createEl('span', {
                    cls: 'kanban-column-indicator',
                    attr: { style: `background-color: ${col.color}` }
                });
            }

            columnHeader.createEl('span', {
                cls: 'kanban-column-title',
                text: col.title
            });

            if (showCount) {
                columnHeader.createEl('span', {
                    cls: 'kanban-column-count',
                    text: String(itemsByStatus[col.id]?.length || 0)
                });
            }

            const columnContent = column.createEl('div', { cls: 'kanban-column-content' });

            // Create cards
            for (const item of itemsByStatus[col.id] || []) {
                createCard(item, columnContent);
            }

            // Drop zone events - stopPropagation prevents widget-space muuri from intercepting
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                column.addClass('drag-over');
            });

            column.addEventListener('dragleave', (e) => {
                e.stopPropagation();
                const relatedTarget = e.relatedTarget as HTMLElement | null;
                if (!relatedTarget || !column.contains(relatedTarget)) {
                    column.removeClass('drag-over');
                }
            });

            column.addEventListener('drop', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                column.removeClass('drag-over');

                if (!draggedItem || !draggedCard) return;

                const newStatus = col.id;
                const oldStatus = draggedItem.status;

                if (newStatus === oldStatus) return;

                // Update frontmatter
                const file = app.vault.getAbstractFileByPath(draggedItem.path);
                if (!(file instanceof TFile)) return;

                try {
                    await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
                        fm[statusProperty] = newStatus;
                    });

                    // Move card to new column
                    columnContent.appendChild(draggedCard);

                    // Update count badges
                    const oldColumn = board.querySelector(`[data-column-id="${oldStatus}"]`);
                    if (oldColumn) {
                        const oldCount = oldColumn.querySelector('.kanban-column-count');
                        if (oldCount) {
                            oldCount.textContent = String(parseInt(oldCount.textContent || '0') - 1);
                        }
                    }

                    const newCount = columnHeader.querySelector('.kanban-column-count');
                    if (newCount) {
                        newCount.textContent = String(parseInt(newCount.textContent || '0') + 1);
                    }

                    // Update item status in memory
                    draggedItem.status = newStatus;
                } catch (error) {
                    console.error('Failed to update status:', error);
                }
            });
        }

        // Empty state
        if (items.length === 0) {
            board.empty();
            board.createEl('div', {
                cls: 'kanban-empty',
                text: 'No items found. Add notes with a status property to see them here.'
            });
        }
    }
};
