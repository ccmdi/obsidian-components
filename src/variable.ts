import { MarkdownPostProcessorContext } from "obsidian";
import { resolvePath } from "utils";

const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};

export interface Variable {
    name: string;
    group: 'note-context' | 'time';
    resolve: (args: Record<string, string>, ctx?: MarkdownPostProcessorContext) => string;
}

export const NOTE_CONTEXT_VARIABLES: Variable[] = [
    { name: '__SELF__', group: 'note-context', resolve: (args, ctx) => ctx?.sourcePath || '' },
    { name: '__DIR__', group: 'note-context', resolve: (args, ctx) => ctx?.sourcePath.substring(0, ctx?.sourcePath.lastIndexOf('/')) || '' },
    { name: '__TITLE__', group: 'note-context', resolve: (args, ctx) => ctx?.sourcePath.substring(ctx?.sourcePath.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '') || '' },
    { name: '__ROOT__', group: 'note-context', resolve: (args, ctx) => '' },
];

export const TIME_VARIABLES: Variable[] = [
    { name: '__TODAY__', group: 'time', resolve: (args, ctx) => formatDate(new Date()) },
    { name: '__YESTERDAY__', group: 'time', resolve: (args, ctx) => {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        return formatDate(date);
    } },
    { name: '__TOMORROW__', group: 'time', resolve: (args, ctx) => {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        return formatDate(date);
    } },
    { name: '__NOW__', group: 'time', resolve: (args, ctx) => `${formatDate(new Date())} ${formatTime(new Date())}` },
    { name: '__TIME__', group: 'time', resolve: (args, ctx) => formatTime(new Date()) },
    { name: '__TIMESTAMP__', group: 'time', resolve: (args, ctx) => String(Date.now()) },
];

export namespace Variable {
    export function replaceAll(value: string, ctx?: MarkdownPostProcessorContext): string {
        for (const variable of [...NOTE_CONTEXT_VARIABLES, ...TIME_VARIABLES]) {
            const replacement = variable.resolve({}, ctx);
            if (value === variable.name) {
                value = replacement;
            } else if (value.includes(variable.name)) {
                const quoted = `'${replacement.replace(/"/g, '\\"')}'`;
                value = value.replace(new RegExp(variable.name, 'g'), quoted);
            }
        }
        return value;
    }
}