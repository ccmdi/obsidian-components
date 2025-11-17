#!/usr/bin/env node

/**
 * Generic validation script for build-time checks
 * Outputs GitHub Actions compatible warnings
 * Add new validators to the VALIDATORS array below
 */

import { readFileSync, readdirSync } from 'fs';
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
 * Get all component files by scanning the components directory
 */
function getComponentFiles() {
	const componentsDir = join(projectRoot, 'src/components');
	const entries = readdirSync(componentsDir, { withFileTypes: true });

	const componentFiles = [];

	for (const entry of entries) {
		if (entry.isDirectory()) {
			const dirPath = join(componentsDir, entry.name);
			const files = readdirSync(dirPath);

			// Find .ts files (excluding styles.ts)
			for (const file of files) {
				if (file.endsWith('.ts') && file !== 'styles.ts') {
					componentFiles.push({
						name: file.replace('.ts', ''),
						path: join(dirPath, file),
						relativePath: `src/components/${entry.name}/${file}`
					});
				}
			}
		}
	}

	return componentFiles;
}

/**
 * Check for components missing icon property
 */
function validateComponentIcons() {
	const warnings = [];
	const componentFiles = getComponentFiles();

	for (const component of componentFiles) {
		const content = readFileSync(component.path, 'utf-8');

		// Check if the component object has an icon property
		// Look for: icon: 'something' or icon: "something"
		const hasIcon = /icon\s*:\s*['"`]/.test(content);

		if (!hasIcon) {
			warnings.push({
				message: `Component "${component.name}" is missing an icon property`,
				file: component.relativePath,
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
