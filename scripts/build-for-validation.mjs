import * as esbuild from 'esbuild';

// Plugin to stub out obsidian imports
const obsidianStubPlugin = {
	name: 'obsidian-stub',
	setup(build) {
		build.onResolve({ filter: /^obsidian$/ }, args => ({
			path: args.path,
			namespace: 'obsidian-stub'
		}));

		build.onLoad({ filter: /.*/, namespace: 'obsidian-stub' }, () => ({
			contents: `
				// Stub exports for obsidian module
				export class App {}
				export class MarkdownPostProcessorContext {}
				export class TAbstractFile {}
				export class TFile {}
				export class MarkdownRenderChild {}
				export class Modal {}
				export class Setting {}
				export class Notice {}
				export class MarkdownRenderer {}
				export class TextComponent {}
				export class FuzzySuggestModal {}
				export const setIcon = () => {};
				export const requestUrl = () => {};
				// Add any other exports as needed
			`,
			loader: 'js'
		}));
	}
};

await esbuild.build({
	entryPoints: ['src/components.ts'],
	bundle: true,
	platform: 'node',
	format: 'esm',
	outfile: 'scripts/.components-bundle.mjs',
	plugins: [obsidianStubPlugin],
	logLevel: 'warning'
});
