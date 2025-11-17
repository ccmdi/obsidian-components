# CLAUDE.MD

## Project Overview

**Components** is an Obsidian plugin that adds custom, reusable widgets/components to Obsidian notes and sidebars. Users can embed these components using markdown code blocks (e.g., ````reminders``) with configurable arguments.

- **Repository**: obsidian-components
- **Version**: 0.2.0
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
- **Standard args**: `KEY=value` → passed to component logic
- **CSS override**: `KEY!=value` → forces CSS styling instead of component behavior
- **Special keyword**: `enabled=false` → disables component rendering
- **Special variables**: `$today`, `$now`, etc. → resolved at runtime
- **Frontmatter support**: `path=@property` → reads from note's frontmatter

## Architecture

### Directory Structure
```
obsidian-components/
├── src/
│   ├── main.ts                 # Plugin entry point
│   ├── components.ts           # Component registry & base interfaces
│   ├── settings.ts             # Plugin settings types
│   ├── utils.ts                # Argument parsing & utilities
│   ├── components/             # Individual component implementations
│   │   ├── analytics/
│   │   ├── anki-status/
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
│   │   ├── progress-bar/
│   │   ├── property-adder/
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

#### `src/components.ts`
- Exports `COMPONENTS` array (all registered components)
- Defines `Component<TArgs>` interface
- Defines `ComponentInstance` for lifecycle management
- Provides `Component.render()` method that:
  1. Parses arguments from code block
  2. Resolves special variables and frontmatter
  3. Applies CSS overrides
  4. Validates required arguments
  5. Creates component instance
  6. Renders component
  7. Sets up cleanup hooks

#### `src/utils.ts`
- `parseArguments()`: Parses KEY=value pairs from code blocks
- `validateArguments()`: Checks for required arguments
- `parseFM()`: Resolves frontmatter references (@property)
- `resolveSpecialVariables()`: Resolves $today, $now, etc.
- `applyCssFromArgs()`: Applies CSS from arguments

### Component Interface

```typescript
interface Component<TArgs extends readonly string[]> {
    keyName: string;                    // Unique identifier
    name?: string;                      // Display name
    description?: string;               // Component description
    args: Partial<Record<TArgs[number], ComponentArg>>;  // Argument definitions
    aliases?: string[];                 // Alternative names
    render: (args, el, ctx, app, instance, settings) => Promise<void>;
    refresh?: boolean;                  // Auto-refresh on file changes
    isMountable: boolean;              // Can be placed in sidebar
    settings?: ComponentSetting[];      // Component-specific settings
    does?: ComponentAction[];          // Required permissions
    group?: ComponentGroup;            // Component grouping
    styles: string | null;             // Component-specific CSS
}
```

### Component Instance Lifecycle

```typescript
interface ComponentInstance {
    id: string;
    element: HTMLElement;
    data: {
        intervals?: NodeJS.Timeout[];     // Auto-cleared on destroy
        observers?: MutationObserver[];   // Auto-disconnected on destroy
        cleanup?: (() => void)[];         // Custom cleanup functions
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
- **calendar** - Calendar view
- **clock** - Real-time clock
- **countdown** - Countdown timer
- **discord-status** - Discord presence status
- **github-stats** - GitHub contribution streak
- **github-notifications** - GitHub notification inbox
- **media** - Media player
- **navigate** - Navigate between periodic notes
- **note-embed** - Embed note content
- **progress-bar** - Progress visualization
- **property-adder** - Add properties to notes
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
import { Component } from "components";

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
    render: async (args, el, ctx, app, instance) => {
        // Component logic here
        const container = el.createDiv({ cls: 'my-component' });
        container.textContent = args.arg1;

        // Example: Add update interval
        ComponentInstance.createUpdateLoop(instance, () => {
            // Update logic
        }, 1000);
    }
};
```

4. **Register component**: Add to `COMPONENTS` array in `src/components.ts`
5. **Import component**: Add import statement in `src/components.ts`

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

### Periodic Updates
```typescript
ComponentInstance.createUpdateLoop(instance, () => {
    // Update UI
}, 1000, true);  // true = sync to interval boundary
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
Arguments automatically become CSS custom properties:
```
```my-component
color=red
font-size=16px
```
```
These can be accessed in CSS as `var(--color)` and `var(--font-size)`.

### Obsidian API Access
The `app` parameter provides access to:
- `app.vault` - File system operations
- `app.workspace` - Workspace/UI operations
- `app.metadataCache` - Metadata and frontmatter
- `app.fileManager` - File management utilities

## Integration with Templater

Some components support Templater integration for template creation. This is optional but enhances the user experience when working with templates.

## Best Practices

1. **Always clean up**: Register intervals, observers, and cleanup functions with `ComponentInstance`
2. **Handle errors gracefully**: Wrap async operations in try-catch blocks
3. **Validate inputs**: Check file existence, parse JSON safely, validate URLs
4. **Use type safety**: Define component args in the generic type parameter
5. **Document arguments**: Provide clear descriptions and defaults
6. **Test permissions**: Always declare required permissions in `does` array
7. **Style isolation**: Use component-specific CSS classes to avoid conflicts
8. **Mobile considerations**: Test on mobile if component uses Node.js APIs

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
- Verify markdown processor is registered
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

## Git Workflow

This project uses feature branches:
- **Development branch**: `claude/create-claude-md-01ToyWyF39LjfqUmAM86dxt2`
- **Main branch**: (check git remote for production branch)

## Additional Resources

- [Obsidian API Documentation](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [Obsidian Plugin Developer Docs](https://github.com/obsidianmd/obsidian-api)
- [Community Plugins Guidelines](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin)

## Future Roadmap

- Explicit mobile support
- Custom aliases/alias management
- Multiple column widget space
- Additional components based on user needs

---

**For AI Assistants**: This document provides context for understanding and modifying the codebase. When adding features, follow the established patterns and always consider component lifecycle, permissions, and cleanup.
