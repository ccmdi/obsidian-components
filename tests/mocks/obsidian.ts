// Mock obsidian module for testing
export class TFile {
    path = '';
    basename = '';
    extension = 'md';
    stat = { ctime: 0, mtime: 0, size: 0 };
}

export class TFolder {
    path = '';
    children: (TFile | TFolder)[] = [];
}

export class App {}
export class Modal {}
export class Notice {}

export interface CachedMetadata {
    frontmatter?: Record<string, any>;
    tags?: { tag: string }[];
}

export interface MarkdownPostProcessorContext {
    sourcePath: string;
}
