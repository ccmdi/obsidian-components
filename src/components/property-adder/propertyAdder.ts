import { Component, ComponentArgs, ComponentAction, ComponentInstance } from "components";
import propertyAdderStyles from "./styles";
import { App, MarkdownPostProcessorContext } from "obsidian";

const renderPropertyAdder = async (
    args: ComponentArgs<['property', 'action', 'value', 'buttonText', 'increment']>,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
    app: App,
    instance: ComponentInstance,
    componentSettings: Record<string, any> = {}
) => {
    const propertyName = args.property;
    const action = args.action || 'push';
    const value = args.value;
    const buttonText = args.buttonText || 'Add Property';
    const incrementAmount = parseFloat(args.increment) || 1;

    if (!propertyName) {
        el.textContent = "Error: 'property' argument is required";
        return;
    }

    // Validate action type
    const validActions = ['push', 'increment', 'set', 'toggle', 'pushUnique'];
    if (!validActions.includes(action)) {
        el.textContent = `Error: Invalid action '${action}'. Valid actions: ${validActions.join(', ')}`;
        return;
    }

    // Validate required value for certain actions
    if ((action === 'push' || action === 'pushUnique' || action === 'set') && !value) {
        el.textContent = `Error: 'value' argument is required for action '${action}'`;
        return;
    }

    const container = el.createEl('div', { cls: 'property-adder-container' });

    const btn = container.createEl('button', {
        text: buttonText,
        cls: 'property-adder-btn'
    });
    btn.type = 'button';
    btn.tabIndex = 0;

    const handleClick = async (e: Event) => {
        e.preventDefault();
        e.stopPropagation();

        const currentFile = app.workspace.getActiveFile();
        if (!currentFile) {
            container.empty();
            const errorMsg = container.createEl('div', { text: 'No active file found' });
            errorMsg.style.color = 'var(--text-error)';
            return;
        }

        try {
            await app.fileManager.processFrontMatter(currentFile, (frontmatter) => {
                switch (action) {
                    case 'push':
                        // Add to array
                        if (!frontmatter[propertyName]) {
                            frontmatter[propertyName] = [];
                        }
                        if (!Array.isArray(frontmatter[propertyName])) {
                            frontmatter[propertyName] = [frontmatter[propertyName]];
                        }
                        frontmatter[propertyName].push(value);
                        break;

                    case 'pushUnique':
                        // Add to array only if not already present
                        if (!frontmatter[propertyName]) {
                            frontmatter[propertyName] = [];
                        }
                        if (!Array.isArray(frontmatter[propertyName])) {
                            frontmatter[propertyName] = [frontmatter[propertyName]];
                        }
                        if (!frontmatter[propertyName].includes(value)) {
                            frontmatter[propertyName].push(value);
                        }
                        break;

                    case 'increment':
                        // Increment number
                        if (!frontmatter[propertyName]) {
                            frontmatter[propertyName] = 0;
                        }
                        const currentValue = parseFloat(frontmatter[propertyName]) || 0;
                        frontmatter[propertyName] = currentValue + incrementAmount;
                        break;

                    case 'set':
                        // Set value directly
                        frontmatter[propertyName] = value;
                        break;

                    case 'toggle':
                        // Toggle boolean
                        frontmatter[propertyName] = !frontmatter[propertyName];
                        break;
                }
            });
        } catch (error) {
            console.error('Failed to modify property:', error);
            container.empty();
            const errorMsg = container.createEl('div', { text: 'Failed to modify property. Please try again.' });
            errorMsg.style.color = 'var(--text-error)';
        }
    };

    btn.addEventListener('click', handleClick);

    el.appendChild(container);
};

export const propertyButton: Component<['property', 'action', 'value', 'buttonText', 'increment']> = {
    name: 'Property Button',
    description: 'Add or modify frontmatter properties',
    keyName: 'property-button',
    icon: 'plus-circle',
    args: {
        property: {
            description: 'The property name to modify',
            required: true
        },
        action: {
            description: 'Action type: push, pushUnique, increment, set, toggle',
            default: 'push'
        },
        value: {
            description: 'Value to add or set (required for push, pushUnique, set). Supports: __TODAY__, __YESTERDAY__, __TOMORROW__, __NOW__, __TIME__, __TIMESTAMP__',
            default: ''
        },
        buttonText: {
            description: 'Text to display on the button',
            default: 'Add property'
        },
        increment: {
            description: 'Amount to increment by (for increment action)',
            default: '1'
        }
    },
    isMountable: true,
    render: renderPropertyAdder,
    refresh: null,
    does: [ComponentAction.READ, ComponentAction.WRITE],
    aliases: ['property-adder', 'prop-button'],
    styles: propertyAdderStyles
};
