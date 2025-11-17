#!/usr/bin/env node

/**
 * Generic validation script for build-time checks
 * Outputs GitHub Actions compatible warnings
 * Add new validators to the VALIDATORS array below
 */

import { execSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Build components.ts into an importable bundle
console.log('Building components bundle for validation...');
execSync('node scripts/build-for-validation.mjs', {
	cwd: dirname(__dirname),
	stdio: 'inherit'
});

// Import the bundled COMPONENTS array
const { COMPONENTS } = await import('./.components-bundle.mjs');

// ============================================================================
// VALIDATORS
// ============================================================================

/**
 * Validator function type
 * @returns {Array<{message: string, file?: string, line?: number}>} Array of warnings
 */

/**
 * Check for components missing icon property
 */
function validateComponentIcons() {
	const warnings = [];

	for (const component of COMPONENTS) {
		if (!component.icon) {
			warnings.push({
				message: `Component "${component.id}" is missing an icon property`,
				file: 'src/components.ts',
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
