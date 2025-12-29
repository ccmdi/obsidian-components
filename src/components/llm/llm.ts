import { Component, ComponentAction, ComponentInstance } from "components";
import { Notice, TFile } from "obsidian";
import { matchesQuery } from "utils";
import { llmStyles } from "./styles";

interface Message {
    role: 'user' | 'assistant';
    content: string | ContentBlock[];
    timestamp: number;
}

interface ContentBlock {
    type: 'text' | 'tool_use' | 'tool_result';
    text?: string;
    id?: string;
    name?: string;
    input?: any;
    tool_use_id?: string;
    content?: string;
}

interface ToolResult {
    files?: string[];
    content?: string;
    tags?: string[];
    error?: string;
}

export const llm: Component<['apiKey', 'model', 'systemPrompt', 'maxTokens', 'temperature']> = {
    name: 'Claude',
    description: 'AI assistant powered by Claude',
    keyName: 'llm',
    icon: 'message-square',
    enabled: false,
    args: {
        apiKey: {
            description: 'Anthropic API key (or set in component settings)',
            default: ''
        },
        model: {
            description: 'Claude model to use',
            default: 'claude-sonnet-4-20250514'
        },
        systemPrompt: {
            description: 'System prompt for Claude',
            default: ''
        },
        maxTokens: {
            description: 'Maximum tokens in response',
            default: '4096'
        },
        temperature: {
            description: 'Temperature (0-1)',
            default: '1'
        }
    },
    isMountable: true,
    does: [ComponentAction.READ, ComponentAction.EXTERNAL],
    styles: llmStyles,
    render: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
        const apiKey = args.apiKey || componentSettings.apiKey as string || '';
        const model = args.model || componentSettings.model as string || 'claude-sonnet-4-20250514';
        const maxTokens = parseInt(args.maxTokens) || 4096;
        const temperature = parseFloat(args.temperature) || 1;

        // Build system prompt with current context
        const buildSystemPrompt = async () => {
            const activeFile = app.workspace.getActiveFile();
            let context = '';

            if (activeFile) {
                const content = await app.vault.read(activeFile);
                const cache = app.metadataCache.getFileCache(activeFile);
                const frontmatter = cache?.frontmatter || {};
                const tags = cache?.tags?.map(t => t.tag) || [];
                const fmTags = Array.isArray(frontmatter?.tags)
                    ? frontmatter.tags.map((t: string) => t.startsWith('#') ? t : `#${t}`)
                    : [];
                const allTags = [...new Set([...tags, ...fmTags])];

                context = `
CURRENT NOTE CONTEXT:
- Title: "${activeFile.basename}"
- Path: ${activeFile.path}
- Tags: ${allTags.length > 0 ? allTags.join(', ') : 'none'}
${Object.keys(frontmatter).length > 0 ? `- Properties: ${JSON.stringify(frontmatter, null, 2)}` : ''}

NOTE CONTENT:
${content}
`;
            }

            const customPrompt = args.systemPrompt || componentSettings.systemPrompt as string || '';

            return `You are Claude, an AI assistant integrated into Obsidian. You help users with their notes, answer questions, and assist with knowledge management.

${customPrompt}

You have access to tools to search and read files in the user's vault. Use them when the user asks about other notes or needs information from their vault.

When using search_by_tags, format tags with # prefix (e.g., #work, #project).
${context}`;
        };

        // Define tools
        const tools = [
            {
                name: "search_by_tags",
                description: "Search for notes matching a tag query. Supports #tags, folder paths, AND/OR operators. Returns matching file paths. Examples: '#work', '#project AND #active', '\"Daily/\" AND #important'",
                input_schema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "Tag query (e.g., '#work', '#project AND #active')"
                        },
                        limit: {
                            type: "number",
                            description: "Maximum number of results (default: 10)"
                        }
                    },
                    required: ["query"]
                }
            },
            {
                name: "read_file",
                description: "Read the full contents of a file in the vault.",
                input_schema: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                            description: "The file path to read (e.g., 'folder/note.md')"
                        }
                    },
                    required: ["path"]
                }
            },
            {
                name: "list_files",
                description: "List all markdown files in the vault or a specific folder.",
                input_schema: {
                    type: "object",
                    properties: {
                        folder: {
                            type: "string",
                            description: "Optional folder path to list files from"
                        },
                        limit: {
                            type: "number",
                            description: "Maximum number of results (default: 20)"
                        }
                    },
                    required: []
                }
            }
        ];

        // Execute tools
        const executeTool = async (name: string, input: any): Promise<ToolResult> => {
            try {
                if (name === 'search_by_tags') {
                    const query = input.query || '';
                    const limit = input.limit || 10;
                    const allFiles = app.vault.getMarkdownFiles();

                    const matches = allFiles
                        .filter(file => {
                            const cache = app.metadataCache.getFileCache(file);
                            return matchesQuery(file, cache, query);
                        })
                        .slice(0, limit)
                        .map(f => f.path);

                    // Extract tags from query for display
                    const tagMatches = query.match(/#[\w-]+/g) || [];

                    return { files: matches, tags: tagMatches };

                } else if (name === 'read_file') {
                    const file = app.vault.getAbstractFileByPath(input.path);
                    if (file instanceof TFile) {
                        const content = await app.vault.read(file);
                        return { content };
                    }
                    return { error: `File not found: ${input.path}` };

                } else if (name === 'list_files') {
                    const folder = input.folder || '';
                    const limit = input.limit || 20;
                    const allFiles = app.vault.getMarkdownFiles();

                    const matches = allFiles
                        .filter(f => folder ? f.path.startsWith(folder) : true)
                        .slice(0, limit)
                        .map(f => f.path);

                    return { files: matches };
                }

                return { error: `Unknown tool: ${name}` };
            } catch (error) {
                return { error: error.message };
            }
        };

        // Message history
        const historyPath = `${app.vault.configDir}/plugins/components/llm-history.json`;
        let messages: Message[] = [];

        try {
            if (await app.vault.adapter.exists(historyPath)) {
                messages = JSON.parse(await app.vault.adapter.read(historyPath));
            }
        } catch { /* start fresh */ }

        const saveMessages = async () => {
            try {
                await app.vault.adapter.write(historyPath, JSON.stringify(messages, null, 2));
            } catch { /* silent */ }
        };

        // Error state
        if (!apiKey) {
            const errorContainer = el.createEl('div', { cls: 'llm-error-container' });
            errorContainer.createEl('div', { cls: 'llm-error-icon', text: '🔑' });
            errorContainer.createEl('div', { cls: 'llm-error-title', text: 'API Key Required' });
            errorContainer.createEl('div', {
                cls: 'llm-error-desc',
                text: 'Add your Anthropic API key in the Components plugin settings.'
            });
            return;
        }

        // Build UI
        const container = el.createEl('div', { cls: 'llm-container' });

        // Header
        const header = container.createEl('div', { cls: 'llm-header' });
        header.createEl('div', { cls: 'llm-header-title', text: 'Claude' });
        const clearBtn = header.createEl('button', { cls: 'llm-header-clear', text: 'Clear' });

        // Messages
        const messagesEl = container.createEl('div', { cls: 'llm-messages' });

        // Input area
        const inputArea = container.createEl('div', { cls: 'llm-input-area' });
        const inputWrapper = inputArea.createEl('div', { cls: 'llm-input-wrapper' });
        const input = inputWrapper.createEl('textarea', {
            cls: 'llm-input',
            attr: { placeholder: 'Ask anything...', rows: '1' }
        });
        const sendBtn = inputWrapper.createEl('button', { cls: 'llm-send-btn' });
        sendBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;

        // Render message
        const renderMessage = (msg: Message, streaming = false) => {
            const msgEl = messagesEl.createEl('div', { cls: `llm-msg llm-msg-${msg.role}` });

            if (msg.role === 'user') {
                const bubble = msgEl.createEl('div', { cls: 'llm-bubble llm-bubble-user' });
                bubble.createEl('div', { cls: 'llm-bubble-content', text: msg.content as string });
            } else {
                const bubble = msgEl.createEl('div', { cls: 'llm-bubble llm-bubble-assistant' });
                const contentEl = bubble.createEl('div', { cls: 'llm-bubble-content' });

                if (typeof msg.content === 'string') {
                    contentEl.textContent = msg.content;
                } else if (Array.isArray(msg.content)) {
                    msg.content.forEach(block => {
                        if (block.type === 'text' && block.text) {
                            const textEl = contentEl.createEl('div', { cls: 'llm-text-block' });
                            textEl.textContent = block.text;
                        } else if (block.type === 'tool_use') {
                            renderToolUse(contentEl, block.name || '', block.input, false);
                        }
                    });
                }

                return { bubble, contentEl };
            }

            return { bubble: msgEl };
        };

        // Render tool use with animation
        const renderToolUse = (parent: HTMLElement, name: string, input: any, animated = true) => {
            const toolEl = parent.createEl('div', { cls: `llm-tool ${animated ? 'llm-tool-active' : ''}` });

            const toolHeader = toolEl.createEl('div', { cls: 'llm-tool-header' });
            const toolIcon = toolHeader.createEl('span', { cls: 'llm-tool-icon' });
            toolIcon.innerHTML = getToolIcon(name);

            toolHeader.createEl('span', { cls: 'llm-tool-name', text: getToolDisplayName(name) });

            if (animated) {
                toolHeader.createEl('span', { cls: 'llm-tool-status' });
            }

            // Show tags if this is a tag search
            if (name === 'search_by_tags' && input?.query) {
                const tagMatches = input.query.match(/#[\w-]+/g) || [];
                if (tagMatches.length > 0) {
                    const tagsEl = toolEl.createEl('div', { cls: 'llm-tool-tags' });
                    tagMatches.forEach((tag: string) => {
                        tagsEl.createEl('span', { cls: 'llm-tag', text: tag });
                    });
                }
            }

            return toolEl;
        };

        const getToolIcon = (name: string) => {
            switch (name) {
                case 'search_by_tags':
                    return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
                case 'read_file':
                    return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>';
                case 'list_files':
                    return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
                default:
                    return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle></svg>';
            }
        };

        const getToolDisplayName = (name: string) => {
            switch (name) {
                case 'search_by_tags': return 'Searching notes...';
                case 'read_file': return 'Reading file...';
                case 'list_files': return 'Listing files...';
                default: return name;
            }
        };

        // Render all messages
        const renderAllMessages = () => {
            messagesEl.empty();

            if (messages.length === 0) {
                const emptyState = messagesEl.createEl('div', { cls: 'llm-empty' });
                emptyState.createEl('div', { cls: 'llm-empty-icon', text: '💬' });
                emptyState.createEl('div', { cls: 'llm-empty-title', text: 'Start a conversation' });
                emptyState.createEl('div', { cls: 'llm-empty-desc', text: 'Ask questions about your notes or get help with anything.' });
            } else {
                messages.forEach(msg => {
                    // Skip tool_result messages in display
                    if (Array.isArray(msg.content) && msg.content.some(b => b.type === 'tool_result')) {
                        return;
                    }
                    renderMessage(msg);
                });
            }

            messagesEl.scrollTop = messagesEl.scrollHeight;
        };

        renderAllMessages();

        // Send message
        const sendMessage = async (text: string) => {
            if (text.trim()) {
                messages.push({ role: 'user', content: text, timestamp: Date.now() });
                await saveMessages();
                input.value = '';
                input.style.height = 'auto';
                renderAllMessages();
            }

            input.disabled = true;
            sendBtn.disabled = true;
            sendBtn.addClass('llm-sending');

            // Create assistant message placeholder
            const msgEl = messagesEl.createEl('div', { cls: 'llm-msg llm-msg-assistant' });
            const bubble = msgEl.createEl('div', { cls: 'llm-bubble llm-bubble-assistant' });
            const contentEl = bubble.createEl('div', { cls: 'llm-bubble-content' });

            // Add typing indicator
            const typingEl = contentEl.createEl('div', { cls: 'llm-typing' });
            typingEl.createEl('span', { cls: 'llm-typing-dot' });
            typingEl.createEl('span', { cls: 'llm-typing-dot' });
            typingEl.createEl('span', { cls: 'llm-typing-dot' });

            messagesEl.scrollTop = messagesEl.scrollHeight;

            try {
                const systemPrompt = await buildSystemPrompt();

                // Use fetch instead of https for browser compatibility
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'anthropic-dangerous-direct-browser-access': 'true'
                    },
                    body: JSON.stringify({
                        model,
                        max_tokens: maxTokens,
                        temperature,
                        system: systemPrompt,
                        tools,
                        messages: messages
                            .filter(m => !(Array.isArray(m.content) && m.content.length === 0))
                            .map(m => ({ role: m.role, content: m.content }))
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error?.message || 'API request failed');
                }

                const data = await response.json();

                // Remove typing indicator
                typingEl.remove();

                // Process response
                const contentBlocks: ContentBlock[] = data.content || [];
                for (const block of contentBlocks) {
                    if (block.type === 'text' && block.text) {
                        const textEl = contentEl.createEl('div', { cls: 'llm-text-block' });
                        // Animate text in
                        const chars = block.text.split('');
                        let i = 0;
                        const typeChar = () => {
                            if (i < chars.length) {
                                textEl.textContent += chars[i];
                                i++;
                                messagesEl.scrollTop = messagesEl.scrollHeight;
                                setTimeout(typeChar, 5);
                            }
                        };
                        typeChar();

                    } else if (block.type === 'tool_use' && block.name) {
                        const toolEl = renderToolUse(contentEl, block.name, block.input, true);
                        messagesEl.scrollTop = messagesEl.scrollHeight;

                        // Execute tool
                        const result = await executeTool(block.name, block.input as Record<string, unknown>);

                        // Update tool UI
                        toolEl.removeClass('llm-tool-active');
                        toolEl.addClass('llm-tool-done');

                        // Show results preview
                        if (result.files && result.files.length > 0) {
                            const resultsEl = toolEl.createEl('div', { cls: 'llm-tool-results' });
                            resultsEl.createEl('span', {
                                cls: 'llm-tool-result-count',
                                text: `${result.files.length} file${result.files.length === 1 ? '' : 's'} found`
                            });
                        } else if (result.content) {
                            const resultsEl = toolEl.createEl('div', { cls: 'llm-tool-results' });
                            resultsEl.createEl('span', { text: 'File loaded' });
                        } else if (result.error) {
                            const resultsEl = toolEl.createEl('div', { cls: 'llm-tool-results llm-tool-error' });
                            resultsEl.createEl('span', { text: result.error });
                        }

                        // Add tool result to messages for continuation
                        messages.push({
                            role: 'assistant',
                            content: contentBlocks,
                            timestamp: Date.now()
                        });

                        messages.push({
                            role: 'user',
                            content: [{
                                type: 'tool_result',
                                tool_use_id: block.id,
                                content: JSON.stringify(result)
                            }],
                            timestamp: Date.now()
                        });

                        await saveMessages();

                        // Continue conversation
                        msgEl.remove();
                        await sendMessage('');
                        return;
                    }
                }

                // Save assistant message
                messages.push({
                    role: 'assistant',
                    content: contentBlocks,
                    timestamp: Date.now()
                });
                await saveMessages();

            } catch (error) {
                console.error('LLM error:', error);
                typingEl?.remove();
                contentEl.createEl('div', {
                    cls: 'llm-error-inline',
                    text: `Error: ${error.message}`
                });
                new Notice(`Claude error: ${error.message}`);

            } finally {
                input.disabled = false;
                sendBtn.disabled = false;
                sendBtn.removeClass('llm-sending');
                input.focus();
            }
        };

        // Event handlers
        clearBtn.addEventListener('click', async () => {
            messages = [];
            await saveMessages();
            renderAllMessages();
            new Notice('Conversation cleared');
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (input.value.trim() && !input.disabled) {
                    sendMessage(input.value);
                }
            }
        });

        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 150) + 'px';
        });

        sendBtn.addEventListener('click', () => {
            if (input.value.trim() && !input.disabled) {
                sendMessage(input.value);
            }
        });

        // Focus input on mount
        setTimeout(() => input.focus(), 100);
    },
    settings: {
        apiKey: {
            name: "Anthropic API Key",
            desc: "Your Anthropic API key for Claude",
            type: "text",
            default: ""
        },
        model: {
            name: "Claude Model",
            desc: "Which Claude model to use",
            type: "dropdown",
            options: [
                { value: "claude-sonnet-4-20250514", text: "Claude Sonnet 4" },
                { value: "claude-3-5-sonnet-20241022", text: "Claude 3.5 Sonnet" },
                { value: "claude-3-5-haiku-20241022", text: "Claude 3.5 Haiku (fast)" }
            ],
            default: "claude-sonnet-4-20250514"
        },
        systemPrompt: {
            name: "Custom Instructions",
            desc: "Additional instructions for Claude (optional)",
            type: "text",
            default: "",
            placeholder: "e.g., Always respond in bullet points..."
        },
        maxTokens: {
            name: "Max Response Length",
            desc: "Maximum tokens in response",
            type: "number",
            default: 4096
        },
        temperature: {
            name: "Creativity",
            desc: "Higher = more creative, Lower = more focused (0-1)",
            type: "number",
            default: 1
        }
    }
};
