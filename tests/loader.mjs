// ESM loader to redirect obsidian imports to mock
import { fileURLToPath } from 'url';
import { dirname, resolve as pathResolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function resolve(specifier, context, nextResolve) {
    if (specifier === 'obsidian') {
        return {
            shortCircuit: true,
            url: `file://${pathResolve(__dirname, 'mocks/obsidian.ts').replace(/\\/g, '/')}`
        };
    }
    return nextResolve(specifier, context);
}
