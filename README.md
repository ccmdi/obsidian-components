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

## Special Variables

Components support special variables that are resolved at runtime:

| Variable | Description | Example Output |
|----------|-------------|----------------|
| `__TODAY__` | Today's date | `2024-12-24` |
| `__YESTERDAY__` | Yesterday's date | `2024-12-23` |
| `__TOMORROW__` | Tomorrow's date | `2024-12-25` |
| `__NOW__` | Current date and time | `2024-12-24 14:30:00` |
| `__TIME__` | Current time | `14:30:00` |
| `__TIMESTAMP__` | Unix timestamp (ms) | `1703430600000` |
| `__SELF__` | Current file path | `Notes/Daily/2024-12-24.md` |
| `__DIR__` | Current directory | `Notes/Daily` |
| `__ROOT__` | Vault root | *(empty string)* |

These can be used in any argument value:
````
```reminders
path=Daily/__TODAY__
```
````

## Frontmatter Access

Reference frontmatter properties from the current note using `fm.` or `file.` prefix:

````
```navigate
date=fm.date
format=fm.dateFormat
```
````

Nested properties are supported: `fm.metadata.priority`

## Expressions

Arguments support a simple expression language for dynamic values.

### Conditionals

```
# Boolean condition - returns true/false
enabled=if(fm.value > 1)

# Ternary condition - returns one of two values
format=if(fm.use24h, 24, 12)
title=if(fm.type == "book", "Books", "Media")
```

### Operators

| Category | Operators | Example |
|----------|-----------|---------|
| Comparison | `==` `!=` `>` `<` `>=` `<=` | `fm.count > 5` |
| Logical | `&&` `\|\|` `!` | `fm.a && !fm.b` |
| Arithmetic | `+` `-` `*` `/` | `fm.count + 1` |

### Truthiness

Boolean evaluation (in `if()`, `&&`, `||`, `!`, and `enabled`) treats these as **falsy**:
- `undefined` (missing frontmatter property)
- `null`, `false`, `0`, `""` (empty string)

Everything else is **truthy**.

```
# Show only if property exists and is truthy
enabled=fm.showWidget

# Logical operators use truthiness
enabled=if(fm.active && fm.visible)
visible=if(fm.count || fm.fallback)
```

## Query Syntax

Some components support querying notes with a flexible syntax:

| Pattern | Description |
|---------|-------------|
| `#tagname` | Match notes with tag |
| `folder/path` | Match notes in folder |
| `"folder/path"` | Match notes in folder (quoted) |
| `#tag1 AND folder/` | Both conditions must match |
| `#tag1 OR #tag2` | Either condition matches |

Example:
````
```reminders
query=#tasks AND Daily/
```
````

## Tips
- This plugin is best used with "Default view for new tabs" as "Reading view".
- Some components make use of templates, and thus integrate with the very popular Templater plugin. If you plan on using templates, template creation will be much more seamless with Templater installed.
- Use `enabled=false` to temporarily disable a component, or `enabled=fm.property` to control visibility via frontmatter.

[^1]: If you want to be more declarative or if there is future namespace collision.