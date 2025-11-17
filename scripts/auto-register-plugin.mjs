import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * esbuild plugin to auto-discover and register components
 * Scans src/components/ and generates imports + COMPONENTS array
 */
export const autoRegisterComponents = {
	name: 'auto-register-components',
	setup(build) {
		build.onLoad({ filter: /src\/components\.ts$/ }, async (args) => {
			const originalContent = readFileSync(args.path, 'utf-8');

			// Discover all component files
			const components = discoverComponents();

			// Generate import statements
			const imports = components.map(c =>
				`import { ${c.exportName} } from "components/${c.importPath}";`
			).join('\n');

			// Generate COMPONENTS array
			const componentsArray = `export const COMPONENTS: Component<readonly string[]>[] = [\n\t${
				components.map(c => c.exportName).join(',\n\t')
			}\n];`;

			// Replace the auto-generated section
			const modifiedContent = originalContent
				// Remove existing component imports (lines 6-27 in original)
				.replace(
					/\/\/ AUTO-REGISTER-START[\s\S]*?\/\/ AUTO-REGISTER-END/,
					`// AUTO-REGISTER-START\n${imports}\n// AUTO-REGISTER-END`
				)
				// Replace COMPONENTS array
				.replace(
					/export const COMPONENTS: Component<readonly string\[\]>\[\] = \[[\s\S]*?\];/,
					componentsArray
				);

			return {
				contents: modifiedContent,
				loader: 'ts'
			};
		});
	}
};

/**
 * Scan src/components/ directory and discover all component files
 */
function discoverComponents() {
	const componentsDir = 'src/components';
	const entries = readdirSync(componentsDir, { withFileTypes: true });
	const components = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;

		const dirPath = join(componentsDir, entry.name);
		const files = readdirSync(dirPath);

		// Find .ts files (excluding styles.ts)
		for (const file of files) {
			if (!file.endsWith('.ts') || file === 'styles.ts') continue;

			const filePath = join(dirPath, file);
			const content = readFileSync(filePath, 'utf-8');

			// Extract the exported component name
			// Look for: export const componentName: Component = { ... }
			const match = content.match(/export\s+const\s+(\w+)\s*:\s*Component/);
			if (match) {
				const exportName = match[1];
				const importPath = `${entry.name}/${file.replace('.ts', '')}`;

				components.push({
					exportName,
					importPath,
					dirName: entry.name,
					fileName: file
				});
			}
		}
	}

	// Sort by export name for consistency
	return components.sort((a, b) => a.exportName.localeCompare(b.exportName));
}
