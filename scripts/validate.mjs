#!/usr/bin/env node

/**
 * Generic validation script for build-time checks
 * Outputs GitHub Actions compatible warnings
 * Add new validators to the VALIDATORS array below
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// ============================================================================
// VALIDATORS
// ============================================================================

/**
 * Validator function type
 * @returns {Array<{message: string, file?: string, line?: number}>} Array of warnings
 */

/**
 * Parse component files to extract component definitions and their import paths
 */
function getComponentDefinitions() {
	const componentsFile = join(projectRoot, 'src/components.ts');
	const componentsContent = readFileSync(componentsFile, 'utf-8');

	// Find the COMPONENTS array
	const componentsArrayMatch = componentsContent.match(/export const COMPONENTS[^=]*=\s*\[([\s\S]*?)\];/);
	if (!componentsArrayMatch) {
		return [];
	}

	// Extract component names from the array
	const arrayContent = componentsArrayMatch[1];
	const componentNames = arrayContent
		.split(',')
		.map(line => line.trim())
		.filter(line => line && !line.startsWith('//'));

	// Build a map of component names to their import paths
	const componentMap = new Map();
	const importRegex = /import\s*\{\s*(\w+)\s*\}\s*from\s*["']components\/([^"']+)["']/g;
	let match;

	while ((match = importRegex.exec(componentsContent)) !== null) {
		const [, componentName, importPath] = match;
		componentMap.set(componentName, importPath);
	}

	return componentNames.map(name => ({
		name,
		importPath: componentMap.get(name)
	}));
}

/**
 * Convert camelCase to kebab-case
 */
function camelToKebab(str) {
	return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

/**
 * Check for components missing icon property
 */
function validateComponentIcons() {
	const warnings = [];
	const components = getComponentDefinitions();

	for (const component of components) {
		if (!component.importPath) {
			warnings.push({
				message: `Component "${component.name}" has no import path found`,
				file: 'src/components.ts',
				line: 1
			});
			continue;
		}

		// Use the import path from components.ts (imports use "components/..." which maps to "src/components/...")
		const componentFile = join(projectRoot, `src/components/${component.importPath}.ts`);

		try {
			const content = readFileSync(componentFile, 'utf-8');

			// Check if the component object has an icon property
			// Look for: icon: 'something'
			const hasIcon = /icon\s*:\s*['"`]/.test(content);

			if (!hasIcon) {
				warnings.push({
					message: `Component "${component.name}" is missing an icon property`,
					file: `src/components/${component.importPath}.ts`,
					line: 1
				});
			}
		} catch (error) {
			// Component file doesn't exist or can't be read
			warnings.push({
				message: `Component "${component.name}" file not found or unreadable: ${error.message}`,
				file: `src/components/${component.importPath}.ts`,
				line: 1
			});
		}
	}

	return warnings;
}

// ============================================================================
// ADD YOUR VALIDATORS HERE
// ============================================================================

const VALIDATORS = [
	{ name: 'Component Icons', fn: validateComponentIcons },
	// Add more validators here:
	// { name: 'My Validator', fn: myValidatorFunction },
];

// ============================================================================
// MAIN
// ============================================================================

function formatGitHubWarning(warning) {
	if (warning.file && warning.line) {
		return `::warning file=${warning.file},line=${warning.line}::${warning.message}`;
	} else if (warning.file) {
		return `::warning file=${warning.file}::${warning.message}`;
	} else {
		return `::warning ::${warning.message}`;
	}
}

function main() {
	let totalWarnings = 0;

	console.log('Running validations...\n');

	for (const validator of VALIDATORS) {
		const warnings = validator.fn();

		if (warnings.length > 0) {
			console.log(`⚠️  ${validator.name}: ${warnings.length} warning(s)`);

			for (const warning of warnings) {
				// Output GitHub Actions format
				console.log(formatGitHubWarning(warning));
				// Also output human-readable format for local development
				console.log(`   - ${warning.message}`);
			}

			console.log('');
			totalWarnings += warnings.length;
		} else {
			console.log(`✓ ${validator.name}: OK`);
		}
	}

	console.log(`\nValidation complete: ${totalWarnings} warning(s) found`);

	// Exit with 0 (success) even with warnings - we don't want to fail the build
	process.exit(0);
}

main();
