import { Component, ComponentAction, ComponentInstance } from "../../components";
import { Notice, TFile } from "obsidian";
import * as https from "https";

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

export const llm: Component<['apiKey', 'model', 'systemPrompt', 'maxTokens', 'temperature']> = {
    name: 'LLM',
    description: 'Chat interface powered by Claude (Anthropic API)',
    keyName: 'llm',
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
            default: 'You are a helpful assistant integrated into Obsidian. Be concise and clear.'
        },
        maxTokens: {
            description: 'Maximum tokens in response',
            default: '2048'
        },
        temperature: {
            description: 'Temperature (0-1)',
            default: '1'
        }
    },
    isMountable: true,
    does: [ComponentAction.EXTERNAL],
    render: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
        const apiKey = args.apiKey || componentSettings.apiKey || '';
        const model = args.model || 'claude-sonnet-4-20250514';
        const baseSystemPrompt = args.systemPrompt || 'You are a helpful assistant integrated into Obsidian. Be concise and clear.';
        const maxTokens = parseInt(args.maxTokens) || 2048;
        const temperature = parseFloat(args.temperature) || 1;

        if (!apiKey) {
            el.createEl('div', {
                text: 'API key required. Set it in component settings or via apiKey argument.',
                cls: 'llm-error'
            });
            return;
        }

        // Get current file context
        const activeFile = app.workspace.getActiveFile();
        let fileContext = '';

        if (activeFile) {
            const content = await app.vault.read(activeFile);
            const cache = app.metadataCache.getFileCache(activeFile);
            const frontmatter = cache?.frontmatter || {};

            fileContext = `\n\nCurrent Context:
- You are running inside an Obsidian note titled: "${activeFile.basename}"
- File path: ${activeFile.path}
- Frontmatter: ${JSON.stringify(frontmatter, null, 2)}
- Note content (first 1000 chars):\n${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}

The user can ask you questions about this note, request summaries, or general assistance.`;
        } else {
            fileContext = '\n\nYou are running in Obsidian but no file is currently active.';
        }

        const systemPrompt = baseSystemPrompt + fileContext;

        // Define tools
        const tools = [
            {
                name: "query",
                description: "Get a list of all files in the vault. Returns an array of file paths.",
                input_schema: {
                    type: "object",
                    properties: {},
                    required: []
                }
            },
            {
                name: "read_file",
                description: "Read the contents of a specific file in the vault.",
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
            }
        ];

        // Message history path
        const historyPath = `${app.vault.configDir}/plugins/components/llm.json`;

        // Load message history from file
        let messages: Message[] = [];
        try {
            const exists = await app.vault.adapter.exists(historyPath);
            if (exists) {
                const data = await app.vault.adapter.read(historyPath);
                messages = JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading LLM history:', error);
        }

        // Save messages to file
        const saveMessages = async () => {
            try {
                await app.vault.adapter.write(historyPath, JSON.stringify(messages, null, 2));
            } catch (error) {
                console.error('Error saving LLM history:', error);
            }
        };

        // Create container
        const container = el.createEl('div', { cls: 'llm-container' });

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .llm-container {
                display: flex;
                flex-direction: column;
                height: 100%;
                background: var(--background-secondary);
                border-radius: 8px;
                overflow: hidden;
            }
            .llm-header {
                padding: 12px 16px;
                background: var(--background-modifier-border);
                border-bottom: 1px solid var(--background-modifier-border);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .llm-title {
                font-weight: 600;
                font-size: 0.9em;
                color: var(--text-normal);
            }
            .llm-clear {
                padding: 6px 12px;
                font-size: 0.8em;
                cursor: pointer;
                color: var(--text-muted);
                background: var(--background-primary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                margin-bottom: 12px;
                align-self: center;
            }
            .llm-clear:hover {
                color: var(--text-normal);
                background: var(--background-modifier-hover);
            }
            .llm-messages {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .llm-message {
                display: flex;
                flex-direction: column;
                gap: 4px;
                max-width: 85%;
            }
            .llm-message.user {
                align-self: flex-end;
            }
            .llm-message.assistant {
                align-self: flex-start;
            }
            .llm-message-role {
                font-size: 0.75em;
                color: var(--text-muted);
                font-weight: 500;
            }
            .llm-message-content {
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 0.9em;
                line-height: 1.4;
                white-space: pre-wrap;
                word-wrap: break-word;
            }
            .llm-token {
                display: inline;
                animation: fadeInToken 0.3s ease-out;
            }
            @keyframes fadeInToken {
                from {
                    opacity: 0;
                    transform: translateY(2px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .llm-message.user .llm-message-content {
                background: var(--color-accent);
                color: var(--text-on-accent);
            }
            .llm-message.assistant .llm-message-content {
                background: var(--background-primary);
                color: var(--text-normal);
                border: 1px solid var(--background-modifier-border);
            }
            .llm-input-container {
                padding: 12px 16px;
                padding-bottom: 50px;
                border-top: 1px solid var(--background-modifier-border);
            }
            .llm-input {
                width: 100%;
                padding: 8px 12px;
                background: var(--background-primary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                color: var(--text-normal);
                font-size: 0.9em;
                resize: none;
                min-height: 36px;
                max-height: 120px;
            }
            .llm-input:focus {
                outline: none;
                border-color: var(--color-accent);
            }
            .llm-input:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            .llm-loading {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: var(--background-primary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 8px;
                font-size: 0.9em;
                color: var(--text-muted);
                max-width: 85%;
                align-self: flex-start;
            }
            .llm-error {
                padding: 16px;
                color: var(--text-error);
                text-align: center;
            }
            .llm-tool-use {
                margin-top: 8px;
                padding: 8px 12px;
                background: var(--background-modifier-border);
                border-left: 3px solid var(--color-accent);
                border-radius: 4px;
                font-size: 0.85em;
            }
            .llm-tool-name {
                font-weight: 600;
                margin-bottom: 4px;
                color: var(--text-accent);
            }
            .llm-tool-input {
                font-family: var(--font-monospace);
                color: var(--text-muted);
                white-space: pre-wrap;
            }
        `;
        el.appendChild(style);

        // Messages area
        const messagesContainer = container.createEl('div', { cls: 'llm-messages' });

        // Input area
        const inputContainer = container.createEl('div', { cls: 'llm-input-container' });
        const input = inputContainer.createEl('textarea', { cls: 'llm-input', attr: { placeholder: 'Type a message...' } });

        // Prevent input from stealing focus from main editor
        // input.addEventListener('mousedown', (e) => {
        //     e.preventDefault();
        //     input.focus();
        // });

        // Render existing messages
        const renderMessages = () => {
            messagesContainer.empty();
            messagesContainer.createEl('button', { text: 'Clear History', cls: 'llm-clear' }).addEventListener('click', async () => {
                messages.length = 0;
                await saveMessages();
                renderMessages();
                new Notice('Chat history cleared');
            });
            messages.forEach(msg => {
                const messageEl = messagesContainer.createEl('div', { cls: `llm-message ${msg.role}` });
                messageEl.createEl('div', { text: msg.role === 'user' ? 'You' : 'Claude', cls: 'llm-message-role' });

                if (typeof msg.content === 'string') {
                    messageEl.createEl('div', { text: msg.content, cls: 'llm-message-content' });
                } else {
                    // Handle content blocks (text + tool calls)
                    msg.content.forEach(block => {
                        if (block.type === 'text') {
                            const textEl = messageEl.createEl('div', { text: block.text, cls: 'llm-message-content' });
                        } else if (block.type === 'tool_use') {
                            const toolEl = messageEl.createEl('div', { cls: 'llm-tool-use' });
                            toolEl.createEl('div', { text: `🔧 ${block.name}`, cls: 'llm-tool-name' });
                            toolEl.createEl('div', { text: JSON.stringify(block.input, null, 2), cls: 'llm-tool-input' });
                        }
                    });
                }
            });
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        };

        renderMessages();

        // Stream response from Anthropic API
        const sendMessage = async (userMessage: string) => {
            // Only add user message if not empty (empty means continuing after tool use)
            if (userMessage.trim()) {
                messages.push({
                    role: 'user',
                    content: userMessage,
                    timestamp: Date.now()
                });

                await saveMessages();

                input.value = '';
                renderMessages();
            }

            input.disabled = true;

            // Create streaming assistant message placeholder
            const streamingMessage: Message = {
                role: 'assistant',
                content: '',
                timestamp: Date.now()
            };
            messages.push(streamingMessage);

            // Create message element for streaming
            const messageEl = messagesContainer.createEl('div', { cls: 'llm-message assistant' });
            messageEl.createEl('div', { text: 'Claude', cls: 'llm-message-role' });
            const contentEl = messageEl.createEl('div', { cls: 'llm-message-content' });

            try {
                // Use Node.js https module (bypasses CORS in Electron)
                const postData = JSON.stringify({
                    model: model,
                    max_tokens: maxTokens,
                    temperature: temperature,
                    system: systemPrompt,
                    stream: true,
                    tools: tools,
                    messages: messages.slice(0, -1).map(m => ({
                        role: m.role,
                        content: m.content
                    }))
                });

                const options = {
                    hostname: 'api.anthropic.com',
                    path: '/v1/messages',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                };

                const req = https.request(options, (res) => {
                    let accumulatedText = '';
                    let buffer = '';
                    let currentToolUse: any = null;
                    let contentBlocks: ContentBlock[] = [];
                    let currentBlockIndex = -1;

                    if (res.statusCode !== 200) {
                        res.on('data', (chunk) => {
                            buffer += chunk.toString();
                        });
                        res.on('end', async () => {
                            try {
                                const error = JSON.parse(buffer);
                                new Notice(`Error: ${error.error?.message || 'API request failed'}`);
                            } catch {
                                new Notice('API request failed');
                            }
                            messages.pop();
                            await saveMessages();
                            messageEl.remove();
                            input.disabled = false;
                        });
                        return;
                    }

                    res.on('data', (chunk) => {
                        const text = chunk.toString();
                        const lines = text.split('\n');

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const data = line.slice(6);

                                if (data === '[DONE]') continue;

                                try {
                                    const parsed = JSON.parse(data);

                                    // Handle content block start
                                    if (parsed.type === 'content_block_start') {
                                        currentBlockIndex = parsed.index;
                                        const block = parsed.content_block;

                                        if (block.type === 'text') {
                                            contentBlocks[currentBlockIndex] = { type: 'text', text: '' };
                                        } else if (block.type === 'tool_use') {
                                            contentBlocks[currentBlockIndex] = {
                                                type: 'tool_use',
                                                id: block.id,
                                                name: block.name,
                                                input: {}
                                            };
                                            currentToolUse = contentBlocks[currentBlockIndex];

                                            // Display tool use in UI
                                            const toolEl = messageEl.createEl('div', { cls: 'llm-tool-use' });
                                            toolEl.createEl('div', { text: `🔧 ${block.name}`, cls: 'llm-tool-name' });
                                            const inputEl = toolEl.createEl('div', { cls: 'llm-tool-input' });
                                            currentToolUse._inputEl = inputEl;
                                        }
                                    }

                                    // Handle text delta
                                    if (parsed.type === 'content_block_delta') {
                                        const deltaText = parsed.delta?.text || '';
                                        if (deltaText && contentBlocks[parsed.index]?.type === 'text') {
                                            accumulatedText += deltaText;
                                            contentBlocks[parsed.index].text += deltaText;

                                            // Wrap new text in animated span
                                            const tokenSpan = document.createElement('span');
                                            tokenSpan.className = 'llm-token';
                                            tokenSpan.textContent = deltaText;
                                            contentEl.appendChild(tokenSpan);

                                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                                        }

                                        // Handle tool input delta
                                        if (parsed.delta?.type === 'input_json_delta' && currentToolUse) {
                                            const partialJson = parsed.delta.partial_json;
                                            try {
                                                currentToolUse.input = JSON.parse(partialJson);
                                                if (currentToolUse._inputEl) {
                                                    currentToolUse._inputEl.textContent = JSON.stringify(currentToolUse.input, null, 2);
                                                }
                                            } catch (e) {
                                                // Partial JSON may not be complete yet
                                            }
                                        }
                                    }

                                    // Handle content block stop
                                    if (parsed.type === 'content_block_stop') {
                                        currentToolUse = null;
                                    }
                                } catch (e) {
                                    // Ignore parse errors for incomplete chunks
                                }
                            }
                        }
                    });

                    res.on('end', async () => {
                        // Update streaming message with content blocks
                        streamingMessage.content = contentBlocks.length > 0 ? contentBlocks : accumulatedText;

                        // Check if there are tool calls to execute
                        const toolCalls = contentBlocks.filter(b => b.type === 'tool_use');

                        if (toolCalls.length > 0) {
                            await saveMessages();

                            // Execute tools and add results
                            for (const toolCall of toolCalls) {
                                let result: any;
                                try {
                                    if (toolCall.name === 'query') {
                                        const files = app.vault.getMarkdownFiles();
                                        result = files.map(f => f.path);
                                    } else if (toolCall.name === 'read_file') {
                                        const file = app.vault.getAbstractFileByPath(toolCall.input.path);
                                        if (file instanceof TFile) {
                                            result = await app.vault.read(file);
                                        } else {
                                            result = `Error: File not found: ${toolCall.input.path}`;
                                        }
                                    }
                                } catch (error) {
                                    result = `Error: ${error.message}`;
                                }

                                // Add tool result to messages
                                messages.push({
                                    role: 'user',
                                    content: [{
                                        type: 'tool_result',
                                        tool_use_id: toolCall.id,
                                        content: typeof result === 'string' ? result : JSON.stringify(result)
                                    }],
                                    timestamp: Date.now()
                                });
                            }

                            await saveMessages();

                            // Continue conversation with tool results
                            sendMessage('');
                        } else {
                            await saveMessages();
                            input.disabled = false;
                        }
                    });
                });

                req.on('error', async (error) => {
                    new Notice(`Error: ${error.message}`);
                    console.error('LLM API error:', error);
                    messages.pop();
                    await saveMessages();
                    messageEl.remove();
                    input.disabled = false;
                });

                req.write(postData);
                req.end();

            } catch (error) {
                new Notice(`Error: ${error.message}`);
                console.error('LLM API error:', error);

                // Remove failed message
                messages.pop();
                messageEl.remove();
                input.disabled = false;
            }
        };

        // Event listeners
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input.value);
            }
        });

        // Auto-resize textarea
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        });
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
            type: "text",
            default: "claude-sonnet-4-20250514"
        },
        systemPrompt: {
            name: "System Prompt",
            desc: "Default system prompt for Claude",
            type: "text",
            default: "You are a helpful assistant integrated into Obsidian. Be concise and clear."
        },
        maxTokens: {
            name: "Max Tokens",
            desc: "Maximum tokens in response",
            type: "number",
            default: 2048
        },
        temperature: {
            name: "Temperature",
            desc: "Randomness (0-1, higher = more creative)",
            type: "number",
            default: 1
        }
    }
};
