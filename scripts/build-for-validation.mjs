import * as esbuild from 'esbuild';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

// Auto-discover all obsidian imports used in the codebase
const getObsidianExports = () => {
	const exports = new Set();
	const importRegex = /import\s*\{([^}]+)\}\s*from\s+['"]obsidian['"]/g;

	const scanDir = (dir) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				scanDir(fullPath);
			} else if (entry.name.endsWith('.ts')) {
				const content = readFileSync(fullPath, 'utf-8');
				let match;
				while ((match = importRegex.exec(content)) !== null) {
					// Extract individual imports
					match[1].split(',').forEach(name => {
						const trimmed = name.trim();
						if (trimmed) exports.add(trimmed);
					});
				}
			}
		}
	};

	scanDir('src');
	return Array.from(exports).sort();
};

// Plugin to stub out obsidian imports
const obsidianStubPlugin = {
	name: 'obsidian-stub',
	setup(build) {
		build.onResolve({ filter: /^obsidian$/ }, args => ({
			path: args.path,
			namespace: 'obsidian-stub'
		}));

		build.onLoad({ filter: /.*/, namespace: 'obsidian-stub' }, () => {
			const exports = getObsidianExports();
			const exportStatements = exports.map(name => {
				// Export classes for capitalized names, functions for others
				return /^[A-Z]/.test(name)
					? `export class ${name} {}`
					: `export const ${name} = () => {}`;
			}).join('\n');

			return {
				contents: exportStatements,
				loader: 'js'
			};
		});
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
