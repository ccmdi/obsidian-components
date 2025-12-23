# Components

Adds 25+ clean, lightweight, and modular components to Obsidian notes and sidebars.

![](images/preview.png)

![](images/permissions.png)

## Usage
### Inside notes
Typing a codeblock and whichever component you want to use inside a note (e.g. \`\`\`reminders) will prompt autocomplete by default, which will guide you through all the possible arguments for that component.

If you want to configure the codeblock manually,
each component accepts arguments in `KEY=value` format. Use `KEY!=value` to force CSS styling instead of component behavior[^1].

### In the sidebar
You can open individual components in the sidebar with the "Open component in sidebar" command.

### As a widget
Opening the `widget-space` component in the sidebar allows you to stack components and drag them around (as shown above, on the right). Double clicking in empty space prompts the creation of a component in the widget space. Middle clicking can edit a component's arguments, and right clicking prompts deletion.

## Tips
- This plugin is best used with "Default view for new tabs" as "Reading view".
- Some components make use of templates, and thus integrate with the very popular Templater plugin. If you plan on using templates, template creation will be much more seamless with Templater installed.

[^1]: If you want to be more declarative or if there is future namespace collision.