---
created: 2026-01-10
modified: 2026-01-10
app_version: 0.6.0-alpha
commit: eb98256636d669972e15f377a8e7b8b064b89160
---

# CLAUDE.MD

## Documentation Standards

**IMPORTANT:** All documentation in this codebase MUST follow these standards.

### YAML Frontmatter Requirements

Every documentation file (including this one) MUST include YAML frontmatter with the following required keys:

```yaml
---
created: YYYY-MM-DD       # Date the file was created
modified: YYYY-MM-DD      # Date of last modification
app_version: X.Y.Z        # Current app version (from package.json)
commit: <hash>            # Current git commit hash
---
```

**How to create new documentation:**

1. **Create the file** in the appropriate location (see structure below)
2. **Add YAML frontmatter** at the top with all required keys:
   - `created`: Use today's date in YYYY-MM-DD format
   - `modified`: Use today's date in YYYY-MM-DD format
   - `app_version`: Copy from `package.json` version field
   - `commit`: Get current commit hash via `git log -1 --format='%H'`
3. **Write the content** following markdown best practices
4. **Update `modified` date** whenever you edit the file

**How to update existing documentation:**

1. **Update the `modified` field** to today's date
2. **Update the `app_version` field** if the app version has changed
3. **Update the `commit` field** to the current commit hash
4. **Make your content changes**

### Documentation Structure

All documentation files (except CLAUDE.md) MUST be located in the `docs/` directory:

```
/
├── CLAUDE.md              # This file - development guidelines
└── docs/
    ├── ARCHITECTURE.md    # Technical architecture and systematics
    ├── COMPONENT_IDEAS.md # Component ideas and feature requests
    └── TODO.md           # Task tracking
```

**File purposes:**

- **CLAUDE.md** (root): Development guidelines, workflows, and how to work with the codebase
- **docs/ARCHITECTURE.md**: Technical architecture, how the codebase works internally
- **docs/COMPONENT_IDEAS.md**: Ideas for new components and features
- **docs/TODO.md**: Task tracking for development work

## Project Overview

**Components** is an Obsidian plugin that adds custom, reusable widgets/components to Obsidian notes and sidebars. Users can embed these components using markdown code blocks (e.g., `` ```reminders ``) with configurable arguments.

- **Repository**: obsidian-components
- **Version**: 0.6.0-alpha
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

## Development Workflows

### Setting Up Development Environment

```bash
# Install dependencies
npm install

# Start development build (watch mode)
npm run dev
```

The dev build runs `scripts/register.mjs` to auto-register components, then starts esbuild in watch mode.

### Adding a New Component

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

4. **Create styles file** (optional): `styles.ts`
```typescript
export const styles = `
.my-component {
    /* Component styles */
}
`;
```

5. **Run build** - Component is auto-registered via `scripts/register.mjs`

To disable a component without removing it, set `enabled: false` in the component definition.

### Component Development Best Practices

1. **Always clean up**: Register intervals, observers, and cleanup functions with `ComponentInstance`
   ```typescript
   const interval = setInterval(() => { ... }, 1000);
   ComponentInstance.addInterval(instance, interval);
   ```

2. **Handle errors gracefully**: Wrap async operations in try-catch blocks
   ```typescript
   try {
       const data = await fetchData();
   } catch (error) {
       el.createDiv({ text: 'Error loading data' });
   }
   ```

3. **Validate inputs**: Check file existence, parse JSON safely, validate URLs
   ```typescript
   const file = app.vault.getAbstractFileByPath(args.path);
   if (!(file instanceof TFile)) {
       el.createDiv({ text: 'File not found' });
       return;
   }
   ```

4. **Use type safety**: Define component args in the generic type parameter
   ```typescript
   export const myComponent: Component<['path', 'limit']> = {
       // TypeScript will enforce these arg names
   }
   ```

5. **Document arguments**: Provide clear descriptions and defaults
   ```typescript
   args: {
       path: {
           description: 'Path to the note (relative to vault root)',
           required: true
       }
   }
   ```

6. **Test permissions**: Always declare required permissions in `does` array
   ```typescript
   does: [ComponentAction.READ, ComponentAction.EXTERNAL]
   ```

7. **Style isolation**: Use component-specific CSS classes to avoid conflicts
   ```typescript
   el.createDiv({ cls: 'my-component-container' });
   ```

8. **Mobile considerations**: Test on mobile if component uses Node.js APIs
   - Some APIs are desktop-only
   - Use `Platform.isMobile` to check

9. **Use renderRefresh**: For optimized re-renders that don't clear the element
   ```typescript
   renderRefresh: async (args, el, ctx, app, instance) => {
       // Update existing DOM instead of rebuilding
       if (ComponentInstance.hasDataChanged(instance, 'data', data)) {
           // Only update when data changed
       }
   }
   ```

### Testing

#### Running Tests

```bash
npm test
```

Runs unit tests for:
- Expression engine (`tests/expression.test.ts`)
- Utility functions (`tests/utils.test.ts`)

#### Manual Testing

1. Build the plugin:
   ```bash
   npm run build
   ```

2. Copy to test vault:
   ```bash
   cp main.js styles.css manifest.json /path/to/vault/.obsidian/plugins/components/
   ```

3. Enable plugin in Obsidian settings

4. Create test notes with component code blocks

#### Adding Tests

Create test files in `tests/` directory:

```typescript
import { describe, test, expect } from './utils';
import { myFunction } from '../src/myModule';

describe('myFunction', () => {
    test('should do something', () => {
        const result = myFunction('input');
        expect(result).toBe('expected');
    });
});
```

### Building for Production

```bash
npm run build
```

This runs:
1. TypeScript type checking (`tsc -noEmit -skipLibCheck`)
2. Component auto-registration (`scripts/register.mjs`)
3. Production build with esbuild (minified, no source maps)

Output:
- `main.js` - Bundled plugin code
- `styles.css` - Compiled styles

### Versioning

```bash
npm version [major|minor|patch]
```

This automatically:
1. Updates `package.json` version
2. Updates `manifest.json` version
3. Updates `versions.json` with compatibility info
4. Creates git tag

**Version format:** `X.Y.Z` or `X.Y.Z-alpha/beta`

### Release Process

1. **Update version**:
   ```bash
   npm version patch  # or minor/major
   ```

2. **Build for production**:
   ```bash
   npm run build
   ```

3. **Test thoroughly** in a test vault

4. **Commit changes**:
   ```bash
   git add .
   git commit -m "chore: release vX.Y.Z"
   ```

5. **Push with tags**:
   ```bash
   git push && git push --tags
   ```

6. **Create GitHub release** with:
   - Release notes
   - Attached files: `main.js`, `styles.css`, `manifest.json`

## Code Organization

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
│   ├── variable.ts             # Special variable definitions
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
├── tests/                      # Unit tests
├── scripts/                    # Build scripts
│   └── register.mjs           # Auto-registration script
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md        # Technical architecture
│   ├── COMPONENT_IDEAS.md     # Component ideas
│   └── TODO.md               # Task tracking
├── styles.css                  # Global styles
├── manifest.json              # Obsidian plugin manifest
├── package.json
├── tsconfig.json
└── CLAUDE.md                  # This file
```

### Key Files

See `docs/ARCHITECTURE.md` for detailed technical architecture documentation.

**Important files for developers:**

- `src/main.ts` - Plugin entry point, registration, lifecycle
- `src/components.ts` - Component interface and instance management
- `src/components.register.ts` - **AUTO-GENERATED** (do not edit manually)
- `src/expression.ts` - Expression DSL implementation
- `src/utils.ts` - Argument parsing and utilities

## Common Patterns

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

### Drift-Free Periodic Updates

```typescript
ComponentInstance.createUpdateLoop(instance, () => {
    // Update UI
}, 1000, true);  // true = sync to interval boundary (no drift)
```

### Conditional Rendering

```typescript
// Component only renders if expression is truthy
enabled=if(fm.showWidget && fm.priority > 1)
```

### Proper Cleanup

```typescript
// Register cleanup handlers
const interval = setInterval(() => { ... }, 1000);
ComponentInstance.addInterval(instance, interval);

const observer = new MutationObserver(() => { ... });
ComponentInstance.addObserver(instance, observer);

ComponentInstance.addCleanup(instance, () => {
    // Custom cleanup logic
});
```

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

## OJS - JavaScript Execution

Enable in settings to allow `` ```ojs `` code blocks:

```javascript
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

**Security:** Disabled by default, requires explicit user opt-in via settings.

## Obsidian API Access

The `app` parameter provides access to:
- `app.vault` - File system operations
- `app.workspace` - Workspace/UI operations
- `app.metadataCache` - Metadata and frontmatter
- `app.fileManager` - File management utilities

**Documentation:**
- [Obsidian API Documentation](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [Obsidian Plugin Developer Docs](https://github.com/obsidianmd/obsidian-api)

## Troubleshooting

### Component Not Rendering

1. Check if component is enabled in settings
2. Verify component file exports correctly
3. Check browser console for errors
4. Verify required arguments are provided
5. Check permissions have been granted

### Arguments Not Parsing

1. Ensure KEY=value format (no spaces around =)
2. Use quotes for values with spaces: `KEY="value with spaces"`
3. Check argument names match component definition
4. Verify expressions are valid

### Cleanup Not Working

1. Always use `ComponentInstance.addInterval()` etc.
2. Ensure cleanup is registered before async operations
3. Use `MarkdownRenderChild` for reading view cleanup
4. Check that `destroy()` is called on unload

### Style Conflicts

1. Use specific class names (e.g., `.my-component-container`)
2. Avoid generic selectors
3. Inject component styles via `styles` property
4. Use CSS modules or scoped styles

## Additional Resources

For technical architecture details, see `docs/ARCHITECTURE.md`.

For component ideas and feature requests, see `docs/COMPONENT_IDEAS.md`.

For task tracking, see `docs/TODO.md`.

**External Resources:**
- [Obsidian API Documentation](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [Obsidian Plugin Developer Docs](https://github.com/obsidianmd/obsidian-api)
- [Community Plugins Guidelines](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin)
