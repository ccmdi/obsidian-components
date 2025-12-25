import { Component, ComponentAction, ComponentInstance } from "components";
import { TFile, TFolder } from "obsidian";
import { useNavigation } from "utils";
import { bookCardsStyles } from "./styles";

interface BookData {
    noteTitle: string;
    notePath: string;
    bookTitle: string;
    author?: string;
    pageCount?: number;
    cover?: string;
    progress?: number;
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
 * Check if a value looks like book data (array) rather than a folder path
 */
function isBookData(value: any): boolean {
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

export const bookCards: Component<['source', 'limit']> = {
    name: 'Book Cards',
    description: 'Display book cards from a folder or frontmatter data',
    keyName: 'book-cards',
    icon: 'book-open',
    refresh: 'anyMetadataChanged',
    args: {
        source: {
            description: 'Folder path to find books, OR use file.books to read from frontmatter',
            required: true
        },
        limit: {
            description: 'Maximum number of books to show',
            default: ''
        }
    },
    isMountable: true,
    does: [ComponentAction.READ],
    styles: bookCardsStyles,

    render: async (args, el, ctx, app, instance: ComponentInstance) => {
        const source = args.source;
        const limit = args.limit ? parseInt(args.limit) : undefined;

        let books: BookData[] = [];

        // Check if source is already book data (array from frontmatter)
        if (isBookData(source)) {
            let bookList: any[] = [];

            if (Array.isArray(source)) {
                bookList = source;
            } else if (typeof source === 'string') {
                try {
                    bookList = JSON.parse(source);
                } catch { /* ignore */ }
            }

            books = bookList.map((b: any) => ({
                noteTitle: b.noteTitle || '',
                notePath: b.notePath || b.path || '',
                bookTitle: b.bookTitle || b.title || '',
                author: b.author,
                pageCount: b.pageCount || b.pages,
                cover: b.bookCover || b.cover,
                progress: b.progress || b.currentpage
            }));
        } else {
            // Dynamic mode: resolve source as folder path
            let folderPath = source.trim();
            if (folderPath.startsWith('"') && folderPath.endsWith('"')) {
                folderPath = folderPath.slice(1, -1);
            }

            const folder = app.vault.getFolderByPath(folderPath);

            if (!folder) {
                el.createEl('div', {
                    cls: 'book-cards-error',
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

            const files = collectFiles(folder);

            for (const file of files) {
                const cache = app.metadataCache.getFileCache(file);
                const fm = cache?.frontmatter;
                if (!fm) continue;

                // Only include books with status "reading"
                if (fm.status !== 'reading') continue;

                books.push({
                    noteTitle: file.basename,
                    notePath: file.path,
                    bookTitle: fm.title || file.basename,
                    author: fm.author,
                    pageCount: fm.pages,
                    cover: fm.cover,
                    progress: fm.currentpage
                });
            }
        }

        // Apply limit
        if (limit && limit > 0) {
            books = books.slice(0, limit);
        }

        // Store for potential refresh
        instance.data.allBooks = books;

        const createBookCard = (book: BookData, container: HTMLElement, isLast: boolean) => {
            const coverUrl = resolveCoverUrl(app, book.cover, ctx.sourcePath);

            const card = container.createEl('div', { cls: 'book-card' });

            // Click handler to open book note
            if (book.notePath) {
                card.addEventListener('click', async () => {
                    await useNavigation(app, book.notePath, false);
                });

                card.addEventListener('mousedown', async (e) => {
                    if (e.button === 1) {
                        e.preventDefault();
                        e.stopPropagation();
                        await useNavigation(app, book.notePath, true);
                    }
                });

                // Also stop auxclick to prevent widget-space's internal-link handler
                card.addEventListener('auxclick', (e) => {
                    if (e.button === 1) {
                        e.stopPropagation();
                    }
                });
            }

            // Cover image
            if (coverUrl) {
                card.createEl('img', {
                    cls: 'book-cover',
                    attr: {
                        src: coverUrl,
                        alt: `${book.bookTitle} cover`
                    }
                });
            }

            // Details section
            const details = card.createEl('div', { cls: 'book-details' });

            // Title
            const title = details.createEl('h2', { cls: 'book-title' });
            title.createEl('a', {
                cls: 'internal-link',
                text: book.bookTitle,
                attr: {
                    'data-href': book.notePath,
                    href: book.notePath
                }
            });

            // Author
            if (book.author) {
                details.createEl('h4', {
                    cls: 'book-author',
                    text: `by ${book.author}`
                });
            }

            // Progress
            if (book.progress && book.pageCount) {
                const progressEl = details.createEl('p', { cls: 'book-progress' });
                const percentage = Math.round((book.progress / book.pageCount) * 100);

                progressEl.createEl('span', {
                    cls: 'progress-amount',
                    text: `${book.progress}/${book.pageCount}`
                });
                progressEl.appendText(' pages ');
                progressEl.createEl('span', {
                    cls: 'progress-percentage',
                    text: `(${percentage}%)`
                });
            }

            // Separator (except for last item)
            if (!isLast) {
                container.createEl('hr', { cls: 'book-separator' });
            }
        };

        // Build UI
        const booksContainer = el.createEl('div', { cls: 'books-container' });

        instance.data.booksContainer = booksContainer;

        if (books.length === 0) {
            booksContainer.createEl('div', {
                cls: 'book-cards-empty',
                text: 'No books found'
            });
        } else {
            books.forEach((book, index) => {
                createBookCard(book, booksContainer, index === books.length - 1);
            });
        }

    }
};
