# CLAUDE.MD

## Project Overview

**Components** is an Obsidian plugin that adds custom, reusable widgets/components to Obsidian notes and sidebars. Users can embed these components using markdown code blocks (e.g., `` ```reminders ``) with configurable arguments.

- **Repository**: obsidian-components
- **Version**: 0.4.0
- **License**: MIT
- **Author**: ccmdi
- **Platform**: Cross-platform (not desktop-only)

## Core Concepts

### Components
Components are self-contained, configurable widgets that can be embedded in notes or sidebars. Each component:
- Has a unique `keyName` identifier
- Accepts arguments in `KEY=value` format
- Can have aliases for alternative invocation names
- May require specific permissions (READ/WRITE/EXTERNAL)
- Can be grouped (e.g., gym-related components)

### Component Invocation
Components are invoked using markdown code blocks:
```
```reminders
path=/daily
limit=5
```
```

### Argument Parsing
- **Standard args**: `KEY=value` - passed to component logic
- **CSS override**: `KEY!=value` - forces CSS styling instead of component behavior
- **Class names**: `class=my-class` or `class="foo bar"` - adds CSS classes to element
- **Reserved keyword**: `enabled=<expr>` - controls component visibility (see Expressions)

### Special Variables
Resolved before expression evaluation. Can be used standalone or within strings.

| Variable | Description | Example Output |
|----------|-------------|----------------|
| `__TODAY__` | Current date | `2024-01-15` |
| `__YESTERDAY__` | Yesterday's date | `2024-01-14` |
| `__TOMORROW__` | Tomorrow's date | `2024-01-16` |
| `__NOW__` | Current date and time | `2024-01-15 14:30:00` |
| `__TIME__` | Current time | `14:30:00` |
| `__TIMESTAMP__` | Unix timestamp (ms) | `1705312200000` |
| `__SELF__` | Current file path | `folder/note.md` |
| `__DIR__` | Current directory | `folder` |
| `__ROOT__` | Vault root | `` (empty string) |

### Expressions
Component arguments support a simple expression language for dynamic values.

#### Frontmatter References
Access frontmatter properties from the current note:
```
value=fm.property           # Simple property
value=fm.nested.property    # Nested property
value=file.property         # Same as fm.* (with recovery support)
```

#### Conditional Expressions
```
# Boolean condition (returns true/false)
enabled=if(fm.value > 1)
enabled=if(fm.active && fm.visible)
enabled=if(!fm.archived)

# Ternary condition (returns one of two values)
format=if(fm.use24h, 24, 12)
title=if(fm.type == "book", "Books", "Media")
```

#### Operators

| Category | Operators | Example |
|----------|-----------|---------|
| Comparison | `==` `!=` `>` `<` `>=` `<=` | `fm.count > 5` |
| Logical | `&&` `\|\|` `!` | `fm.a && !fm.b` |
| Arithmetic | `+` `-` `*` `/` | `fm.count + 1` |

#### Truthiness
Boolean evaluation (in `if()`, `&&`, `||`, `!`, and `enabled`) uses these rules:

**Falsy values:**
- `undefined` / `"undefined"` (missing frontmatter property)
- `null` / `"null"`
- `false` / `"false"`
- `0` / `"0"`
- `""` (empty string)

**Everything else is truthy.**

#### Expression Examples
```
# Show only if property exists and is truthy
enabled=fm.showWidget

# Show based on condition
enabled=if(fm.priority >= 1 && fm.status != "archived")

# Dynamic values
limit=if(fm.compact, 5, 10)
title=if(fm.type == "book", "Books", "Media")

# Arithmetic in conditions
enabled=if(fm.count + fm.extra > 10)

# String values require quotes
message=if(fm.error, "Error occurred", "All good")
```

## Architecture

### Directory Structure
```
obsidian-components/
├── src/
│   ├── main.ts                 # Plugin entry point
│   ├── components.ts           # Component interfaces & lifecycle
│   ├── components.register.ts  # Auto-generated component registry
│   ├── expression.ts           # Expression DSL parser & evaluator
│   ├── settings.ts             # Plugin settings types
│   ├── utils.ts                # Argument parsing & utilities
│   ├── groups.ts               # Component grouping logic
│   ├── debug.ts                # Debug logging utilities
│   ├── ojs.ts                  # JavaScript execution (ojs blocks)
│   ├── components/             # Individual component implementations
│   │   ├── analytics/
│   │   ├── anki-status/
│   │   ├── anthropic-usage/
│   │   ├── book-cards/
│   │   ├── calendar/
│   │   ├── clock/
│   │   ├── countdown/
│   │   ├── discord-status/
│   │   ├── github-stats/
│   │   ├── github-notifications/
│   │   ├── gym/               # Component group
│   │   ├── media/
│   │   ├── navigate/
│   │   ├── note-embed/
│   │   ├── places/
│   │   ├── progress-bar/
│   │   ├── project-cards/
│   │   ├── property-adder/
│   │   ├── property-status/
│   │   ├── reminders/
│   │   ├── stat-chart/
│   │   ├── timeline/
│   │   └── widget-space/
│   └── native/                 # Obsidian-specific UI
│       ├── autocomplete.ts     # Component autocomplete
│       ├── confirmation.ts     # Permission dialogs
│       ├── modal.ts           # Component selector modals
│       ├── settings.ts        # Settings UI
│       └── sidebar.ts         # Sidebar view
├── styles.css                  # Global styles
├── manifest.json              # Obsidian plugin manifest
├── package.json
└── tsconfig.json
```

### Key Files

#### `src/main.ts`
- Plugin entry point (`ComponentsPlugin` class)
- Registers markdown code block processors for each component
- Manages plugin lifecycle (load/unload)
- Handles settings persistence
- Registers commands and sidebar views
- Manages autocomplete feature
- Registers ojs processor if enabled

#### `src/components.ts`
- Defines `Component<TArgs>` interface
- Defines `ComponentInstance` for lifecycle management
- Exports refresh strategy types
- Provides `Component.render()` method that:
  1. Parses arguments from code block
  2. Resolves special variables (__TODAY__, __SELF__, etc.)
  3. Evaluates expressions (fm.*, file.*, if(), operators)
  4. Applies CSS overrides and class names
  5. Validates required arguments
  6. Creates component instance
  7. Sets up refresh handlers
  8. Renders component

#### `src/expression.ts`
- Tokenizer for expression DSL
- Recursive descent parser with proper operator precedence
- Expression evaluator with frontmatter context
- Exports: `evaluateExpression()`, `evaluateArgs()`, `isTruthy()`

#### `src/components.register.ts`
- **Auto-generated** by `scripts/auto-register-plugin.mjs`
- Imports and exports all components
- Do not edit manually - add/remove component files instead

#### `src/utils.ts`
- `parseArguments()`: Parses KEY=value pairs from code blocks
- `validateArguments()`: Checks for required arguments
- `parseFM()`: Resolves frontmatter references (fm.property)
- `parseFileContent()`: Resolves file content references (file.property)
- `resolveSpecialVariables()`: Resolves __TODAY__, __NOW__, etc.
- `applyCssFromArgs()`: Applies CSS and class names from arguments
- `parseBoolean()`: Converts string args to boolean

#### `src/ojs.ts`
- Executes JavaScript in `` ```ojs `` code blocks
- Provides `app`, `el`, `ctx`, `api`, and `obsidian` in scope
- Users can destructure: `const { MarkdownRenderer } = obsidian;`

### Component Interface

```typescript
interface Component<TArgs extends readonly string[]> {
    keyName: string;                    // Unique identifier
    name?: string;                      // Display name
    description?: string;               // Component description
    icon?: string;                      // Icon identifier
    enabled?: boolean;                  // Set false to disable (default true)
    args: Partial<Record<TArgs[number], ComponentArg>>;  // Argument definitions
    aliases?: string[];                 // Alternative names
    render: (args, el, ctx, app, instance, settings) => Promise<void>;
    renderRefresh?: RenderFunction;     // Optional optimized refresh render
    refresh?: RefreshStrategy;          // When to auto-refresh
    isMountable: boolean;              // Can be placed in sidebar
    settings?: ComponentSettings;       // Component-specific settings
    does?: ComponentAction[];          // Required permissions
    group?: ComponentGroup;            // Component grouping
    styles: string | null;             // Component-specific CSS
}
```

### Refresh Strategies

Components can specify when they should automatically re-render:

```typescript
type RefreshStrategy =
    | 'metadataChanged'    // When source file's metadata changes
    | 'fileModified'       // When source file is modified
    | 'anyMetadataChanged' // When any file's metadata changes
    | 'leafChanged'        // When active leaf changes (sidebar only)
    | 'daily'              // At midnight
    | 'hourly'             // At the top of each hour
    | { type: 'timeElapsed'; interval: number }  // Custom interval (ms)
    | RefreshStrategy[]    // Multiple strategies
    | null;
```

Strategies are also auto-inferred from argument usage:
- `fm.*` args add `metadataChanged` + `leafChanged` (in sidebar)
- `file.*` args add `fileModified` + `leafChanged` (in sidebar)

### Component Instance Lifecycle

```typescript
interface ComponentInstance {
    id: string;
    element: HTMLElement;
    data: {
        intervals?: NodeJS.Timeout[];     // Auto-cleared on destroy
        observers?: MutationObserver[];   // Auto-disconnected on destroy
        cleanup?: (() => void)[];         // Custom cleanup functions
        triggerRefresh?: () => void;      // Manual refresh trigger
        [key: string]: any;               // Component-specific data
    };
    destroy: () => void;
}
```

**Important**: Always use `ComponentInstance.addInterval()`, `ComponentInstance.addObserver()`, and `ComponentInstance.addCleanup()` to ensure proper cleanup when components are unloaded.

## Available Components

### Core Components
- **analytics** - Vault health metrics
- **anki-status** - Anki review status
- **anthropic-usage** - Anthropic API usage stats
- **book-cards** - Book display cards
- **calendar** - Calendar view
- **clock** - Real-time clock
- **countdown** - Countdown timer
- **discord-status** - Discord presence status
- **github-stats** - GitHub contribution streak
- **github-notifications** - GitHub notification inbox
- **media** - Media player
- **navigate** - Navigate between periodic notes
- **note-embed** - Embed note content
- **places** - Location/places display
- **progress-bar** - Progress visualization
- **project-cards** - Project display cards
- **property-adder** - Add properties to notes
- **property-status** - Display property status
- **reminders** - Due tasks from periodic notes
- **stat-chart** - Chart date-mapped array data
- **timeline** - Timeline of periodic notes
- **widget-space** - Container for multiple components

### Gym Component Group
- **gym-routine-menu** - Workout routine selection
- **gym-workout-tracker** - Track workout progress
- **gym-stats** - Workout statistics

## Adding a New Component

1. **Create component directory**: `src/components/my-component/`
2. **Create component file**: `myComponent.ts`
3. **Define component**:
```typescript
import { Component, ComponentInstance } from "components";

export const myComponent: Component<['arg1', 'arg2']> = {
    keyName: 'my-component',
    name: 'My Component',
    description: 'Does something useful',
    args: {
        arg1: {
            description: 'First argument',
            required: true
        },
        arg2: {
            description: 'Second argument',
            default: 'default-value'
        }
    },
    isMountable: true,
    styles: `/* Component-specific CSS */`,
    refresh: 'metadataChanged',  // or null, or array of strategies
    render: async (args, el, ctx, app, instance) => {
        const container = el.createDiv({ cls: 'my-component' });
        container.textContent = args.arg1;

        // Example: Add drift-free update interval
        ComponentInstance.createUpdateLoop(instance, () => {
            // Update logic
        }, 1000, true);  // true = sync to interval boundary
    }
};
```

4. **Run build** - Component is auto-registered via `scripts/auto-register-plugin.mjs`

To disable a component without removing it, set `enabled: false` in the component definition.

## OJS - JavaScript Execution

Enable in settings to allow `` ```ojs `` code blocks:

```js
const { MarkdownRenderer, Notice } = obsidian;

const container = el.createDiv();
await MarkdownRenderer.render(app, '**Hello**', container, ctx.sourcePath, ctx);

new Notice('Rendered!');
```

Available in scope:
- `app` - Obsidian App instance
- `el` - Container HTMLElement
- `ctx` - MarkdownPostProcessorContext
- `api` - Helper API (grid, card builders)
- `obsidian` - Full obsidian module (destructure what you need)

## Component Settings

Components can define settings that appear in the plugin settings tab:

```typescript
settings: {
    mySetting: {
        name: 'My Setting',
        desc: 'Description of setting',
        type: 'text',  // 'text' | 'number' | 'toggle' | 'dropdown'
        default: 'default-value',
        placeholder: 'Enter value...'
    },
    _render: async (containerEl, app, plugin) => {
        // Custom settings UI
    }
}
```

Access settings in `render()` via `componentSettings` parameter.

## Component Permissions

Components can declare required permissions via `does` property:
- `ComponentAction.READ` - Reads vault files
- `ComponentAction.WRITE` - Writes to vault files
- `ComponentAction.EXTERNAL` - Makes external API calls

Users are prompted to grant these permissions on first use.

## Testing & Building

### Development
```bash
npm run dev
```
Runs esbuild in watch mode, compiling changes on save.

### Production Build
```bash
npm run build
```
Runs TypeScript type checking and production build.

### Versioning
```bash
npm version [major|minor|patch]
```
Automatically updates `manifest.json` and `versions.json`.

## Common Patterns

### Drift-Free Periodic Updates
```typescript
ComponentInstance.createUpdateLoop(instance, () => {
    // Update UI
}, 1000, true);  // true = sync to interval boundary (no drift)
```

### Reading Files
```typescript
const file = app.vault.getAbstractFileByPath(args.path);
if (file instanceof TFile) {
    const content = await app.vault.read(file);
}
```

### Parsing Frontmatter
```typescript
const cache = app.metadataCache.getFileCache(file);
const frontmatter = cache?.frontmatter;
```

### CSS from Arguments
Non-component arguments automatically become inline CSS:
```
```my-component
color=red
font-size=16px
class=custom-class
```
```

### Obsidian API Access
The `app` parameter provides access to:
- `app.vault` - File system operations
- `app.workspace` - Workspace/UI operations
- `app.metadataCache` - Metadata and frontmatter
- `app.fileManager` - File management utilities

## Best Practices

1. **Always clean up**: Register intervals, observers, and cleanup functions with `ComponentInstance`
2. **Handle errors gracefully**: Wrap async operations in try-catch blocks
3. **Validate inputs**: Check file existence, parse JSON safely, validate URLs
4. **Use type safety**: Define component args in the generic type parameter
5. **Document arguments**: Provide clear descriptions and defaults
6. **Test permissions**: Always declare required permissions in `does` array
7. **Style isolation**: Use component-specific CSS classes to avoid conflicts
8. **Mobile considerations**: Test on mobile if component uses Node.js APIs
9. **Use renderRefresh**: For optimized re-renders that don't clear the element

## Dependencies

### Runtime
- `obsidian`: Obsidian API

### Development
- `typescript`: Type checking
- `esbuild`: Bundling
- `@typescript-eslint/*`: Linting

## Common Issues & Solutions

### Component Not Rendering
- Check if component is enabled in settings (`this.settings.componentStates[keyName]`)
- Verify component file exports correctly (auto-registration will skip malformed exports)
- Check for errors in console

### Arguments Not Parsing
- Ensure KEY=value format (no spaces around =)
- Use quotes for values with spaces: `KEY="value with spaces"`
- Check argument names match component definition

### Cleanup Not Working
- Always use `ComponentInstance.addInterval()` etc.
- Ensure cleanup is registered before async operations
- Use `MarkdownRenderChild` for reading view cleanup

### Style Conflicts
- Use specific class names (e.g., `.my-component-container`)
- Avoid generic selectors
- Inject component styles via `styles` property

## Additional Resources

- [Obsidian API Documentation](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [Obsidian Plugin Developer Docs](https://github.com/obsidianmd/obsidian-api)
- [Community Plugins Guidelines](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin)
