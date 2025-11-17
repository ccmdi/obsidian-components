import type { App, MarkdownPostProcessorContext } from 'obsidian';
import { MarkdownRenderer, MarkdownRenderChild, TFile } from 'obsidian';
import type { Component } from 'components';
import { ComponentInstance, ComponentAction } from 'components';
import { noteEmbedStyles } from './styles';

export const noteEmbed: Component<['target']> = {
	keyName: 'note-embed',
	name: 'Note Embed',
	description: 'Embed another note using Obsidian\'s native rendering',
	icon: 'file-text',
	args: {
		target: {
			description: 'Target note name or path (with or without .md extension)',
			required: true,
		},
	},
	isMountable: true,
	aliases: ['embed'],
	styles: noteEmbedStyles,
	does: [ComponentAction.READ],
	render: async (
		args,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext,
		app: App,
		instance: ComponentInstance,
	) => {
		const targetPath = args.target;

		// Try to find the file
		let file: TFile | null = null;

		// First try as direct path
		const abstractFile = app.vault.getAbstractFileByPath(targetPath);
		if (abstractFile instanceof TFile) {
			file = abstractFile;
		}

		// Try with .md extension if not found
		if (!file) {
			const withExtension = targetPath.endsWith('.md') ? targetPath : `${targetPath}.md`;
			const abstractFileWithExt = app.vault.getAbstractFileByPath(withExtension);
			if (abstractFileWithExt instanceof TFile) {
				file = abstractFileWithExt;
			}
		}

		// Try to find by basename
		if (!file) {
			const files = app.vault.getMarkdownFiles();
			file = files.find(f => f.basename === targetPath || f.path === targetPath) || null;
		}

		if (!file) {
			const errorEl = el.createDiv({ cls: 'note-embed-error' });
			errorEl.textContent = `Note not found: ${targetPath}`;
			return;
		}

		// Check for circular references by traversing up the DOM tree
		let parent = el.parentElement;
		const targetFilePath = file.path;
		while (parent) {
			if (parent.hasClass('note-embed-container')) {
				const parentTarget = parent.dataset.embedTarget;
				if (parentTarget === targetFilePath) {
					const errorEl = el.createDiv({ cls: 'note-embed-error' });
					errorEl.textContent = `Circular embed detected: ${file.basename}`;
					return;
				}
			}
			parent = parent.parentElement;
		}

		const container = el.createDiv({ cls: 'note-embed-container' });
		// Store the target path for circular reference detection in children
		container.dataset.embedTarget = targetFilePath;

		// Read the file content
		const content = await app.vault.read(file);

		// Create a MarkdownRenderChild for proper lifecycle management
		// This allows nested components, wikilinks, embeds, etc. to work properly
		const embedComponent = new MarkdownRenderChild(container);
		ctx.addChild(embedComponent);

		// Use Obsidian's native markdown renderer to render the content
		// This provides full Obsidian context including wikilinks, embeds, etc.
		await MarkdownRenderer.renderMarkdown(
			content,
			container,
			file.path,
			embedComponent
		);

		// Wait for DOM to settle before showing the container (prevents layout shift)
		const waitForSettle = new Promise<void>((resolve) => {
			let timeoutId: NodeJS.Timeout;

			const observer = new MutationObserver(() => {
				// Reset timeout every time DOM changes
				clearTimeout(timeoutId);
				timeoutId = setTimeout(() => {
					observer.disconnect();
					resolve();
				}, 50); // No mutations for 50ms = settled
			});

			observer.observe(container, {
				childList: true,
				subtree: true,
				attributes: true
			});

			// Trigger initial timeout in case there are no mutations
			timeoutId = setTimeout(() => {
				observer.disconnect();
				resolve();
			}, 50);
		});

		await waitForSettle;
		container.addClass('note-embed-ready');
	},
};
