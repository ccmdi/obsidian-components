#!/usr/bin/env node

/**
 * Generic validation script for build-time checks
 * Outputs GitHub Actions compatible warnings
 * Parses component files statically - no bundling required
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Scan component files and extract metadata statically
 */
function discoverComponents() {
	const componentsDir = 'src/components';
	const entries = readdirSync(componentsDir, { withFileTypes: true });
	const components = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;

		const dirPath = join(componentsDir, entry.name);
		const files = readdirSync(dirPath);

		for (const file of files) {
			if (!file.endsWith('.ts') || file.includes('styles.ts') || file.includes('Styles.ts')) continue;

			const filePath = join(dirPath, file);
			const content = readFileSync(filePath, 'utf-8');

			// Check if this is a component file
			const componentMatch = content.match(/export\s+const\s+(\w+)\s*:\s*Component/);
			if (!componentMatch) continue;

			const exportName = componentMatch[1];

			// Check if disabled
			const enabledMatch = content.match(/enabled\s*:\s*(true|false)/);
			const enabled = enabledMatch ? enabledMatch[1] === 'true' : true;
			if (!enabled) continue;

			// Extract keyName
			const keyNameMatch = content.match(/keyName\s*:\s*['"]([^'"]+)['"]/);
			const keyName = keyNameMatch ? keyNameMatch[1] : exportName;

			// Check for icon property
			const hasIcon = /icon\s*:/.test(content);

			components.push({
				exportName,
				keyName,
				filePath,
				hasIcon
			});
		}
	}

	return components;
}

// ============================================================================
// VALIDATORS
// ============================================================================

function validateComponentIcons(components) {
	const warnings = [];

	for (const component of components) {
		if (!component.hasIcon) {
			warnings.push({
				message: `Component "${component.keyName}" is missing an icon property`,
				file: component.filePath,
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
	const components = discoverComponents();
	console.log(`Found ${components.length} enabled components\n`);

	let totalWarnings = 0;

	console.log('Running validations...\n');

	for (const validator of VALIDATORS) {
		const warnings = validator.fn(components);

		if (warnings.length > 0) {
			console.log(`[!] ${validator.name}: ${warnings.length} warning(s)`);

			for (const warning of warnings) {
				console.log(formatGitHubWarning(warning));
				console.log(`   - ${warning.message}`);
			}

			console.log('');
			totalWarnings += warnings.length;
		} else {
			console.log(`[ok] ${validator.name}`);
		}
	}

	console.log(`\nValidation complete: ${totalWarnings} warning(s) found`);
	process.exit(0);
}

main();
