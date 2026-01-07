// Mock obsidian module for testing
export class TFile {
    path: string = '';
    basename: string = '';
    extension: string = 'md';
    stat = { ctime: 0, mtime: 0, size: 0 };
}

export class TFolder {
    path: string = '';
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
