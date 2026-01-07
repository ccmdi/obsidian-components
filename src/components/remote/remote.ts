import { MarkdownRenderer, MarkdownRenderChild } from 'obsidian';
import type { Component } from 'components';
import { ComponentAction } from 'components';
import { remoteStyles } from './styles';

export const remote: Component<['endpoint', 'key']> = {
	keyName: 'remote',
	name: 'Remote',
	description: 'Fetch, render, and sync remote markdown',
	icon: 'check-square',
	enabled: 'extended',
	args: {
		endpoint: {
			description: 'HTTP endpoint (GET to fetch, PUT to save)',
			required: true,
		},
		key: {
			description: 'Bearer token for Authorization header',
		},
	},
	isMountable: true,
	aliases: ['remote-md'],
	styles: remoteStyles,
	does: [ComponentAction.EXTERNAL],

	render: async (args, el, ctx, app, instance) => {
		const { endpoint, key } = args;
		const headers: Record<string, string> = key ? { Authorization: `Bearer ${key}` } : {};

		const sync = () => {
			fetch(endpoint, {
				method: 'PUT',
				headers: { ...headers, 'Content-Type': 'text/plain' },
				body: instance.data.markdown
			}).catch(() => {});
		};

		// Fetch
		try {
			const res = await fetch(endpoint, { headers });
			if (!res.ok) throw new Error(`${res.status}`);
			instance.data.markdown = await res.text();
		} catch (e) {
			el.createDiv({ cls: 'remote-error', text: `Failed to load: ${e}` });
			return;
		}

		const wrapper = el.createDiv({ cls: 'remote-wrapper' });
		const rendered = wrapper.createDiv({ cls: 'remote-content markdown-rendered' });
		const textarea = wrapper.createEl('textarea', { cls: 'remote-editor' });
		textarea.style.display = 'none';

		const renderMarkdown = async () => {
			rendered.empty();
			const child = new MarkdownRenderChild(rendered);
			ctx.addChild(child);
			await MarkdownRenderer.render(app, instance.data.markdown, rendered, ctx.sourcePath, child);
			wireCheckboxes();
		};

		const wireCheckboxes = () => {
			rendered.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((input, i) => {
				input.addEventListener('change', () => {
					const li = input.closest('li');
					if (li) {
						li.setAttribute('data-task', input.checked ? 'x' : ' ');
						li.classList.toggle('is-checked', input.checked);
					}
					let idx = 0;
					instance.data.markdown = instance.data.markdown.replace(
						/^(\s*[-*]\s*\[)([ xX])(\])/gm,
						(m, pre, check, suf) => idx++ === i ? `${pre}${check === ' ' ? 'x' : ' '}${suf}` : m
					);
					sync();
				});
			});
		};

		const enterEditMode = () => {
			textarea.value = instance.data.markdown;
			rendered.style.display = 'none';
			textarea.style.display = 'block';
			textarea.focus();
		};

		const exitEditMode = async () => {
			instance.data.markdown = textarea.value;
			textarea.style.display = 'none';
			rendered.style.display = 'block';
			await renderMarkdown();
			sync();
		};

		rendered.addEventListener('click', (e) => {
			// Don't enter edit mode when clicking checkboxes
			if ((e.target as HTMLElement).tagName === 'INPUT') return;
			enterEditMode();
		});

		textarea.addEventListener('blur', exitEditMode);
		textarea.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') {
				textarea.blur();
			}
		});

		await renderMarkdown();
	},
};
