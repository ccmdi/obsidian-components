---
created: 2026-01-10
modified: 2026-01-10
app_version: 0.6.0-alpha
commit: eb98256636d669972e15f377a8e7b8b064b89160
---

# Architecture

This document describes the internal architecture and systematics of the Components plugin for Obsidian.

## Overview

Components is an Obsidian plugin that provides a framework for embedding custom, reusable widgets in notes and sidebars via markdown code blocks. The plugin architecture is built around:

1. **Component Registry** - Auto-generated registration system
2. **Argument Parser** - Flexible KEY=value parsing with expression support
3. **Expression Engine** - DSL for dynamic values and conditions
4. **Instance Lifecycle** - Automatic cleanup and refresh management
5. **Settings & Permissions** - User preferences and security controls

## Core Architecture

### Plugin Entry Point (`src/main.ts`)

The `ComponentsPlugin` class extends Obsidian's `Plugin` base class and orchestrates:

- **Component Registration**: Loops through all exported components from `components.register.ts` and registers markdown code block processors for each component's `keyName` and aliases
- **Settings Management**: Loads/saves plugin settings, including component states and permissions
- **Autocomplete**: Registers autocomplete provider for component code blocks
- **Sidebar Views**: Registers custom sidebar view for mountable components
- **Commands**: Registers component selector and sidebar commands
- **OJS Processor**: Optionally registers JavaScript execution blocks

#### Lifecycle Hooks

```typescript
async onload() {
    // 1. Load settings from disk
    await this.loadSettings();

    // 2. Register all components as code block processors
    for (const component of components) {
        this.registerMarkdownCodeBlockProcessor(
            component.keyName,
            Component.render(component, ...)
        );
    }

    // 3. Register UI elements (autocomplete, sidebar, commands)
    // 4. Set up refresh listeners (metadata changes, file edits, etc.)
}

async onunload() {
    // Destroy all component instances
    componentInstances.forEach(instance => instance.destroy());
}
```

### Component System (`src/components.ts`)

#### Component Interface

```typescript
interface Component<TArgs extends readonly string[]> {
    keyName: string;              // Unique identifier for code block
    name?: string;                // Display name
    description?: string;         // User-facing description
    icon?: string;                // Icon for UI
    enabled?: boolean;            // Can be disabled without removing code
    args: Record<TArgs[number], ComponentArg>;  // Typed argument definitions
    aliases?: string[];           // Alternative invocation names
    render: RenderFunction;       // Main render logic
    renderRefresh?: RenderFunction;  // Optional optimized refresh
    refresh?: RefreshStrategy;    // Auto-refresh triggers
    isMountable: boolean;         // Can be placed in sidebar
    settings?: ComponentSettings; // Component-specific settings
    does?: ComponentAction[];     // Required permissions
    group?: ComponentGroup;       // Grouping for related components
    styles: string | null;        // Component-specific CSS
}
```

#### Component Render Flow

```
User writes code block → Component.render() → Parse args → Resolve variables
    → Evaluate expressions → Check permissions → Create instance
    → Execute component render() → Set up refresh handlers
```

**Detailed steps:**

1. **Parse Arguments** (`utils.ts:parseArguments`)
   - Extract KEY=value pairs from code block content
   - Support `KEY!=value` for CSS-only overrides
   - Handle quoted values with spaces

2. **Resolve Special Variables** (`utils.ts:resolveSpecialVariables`)
   - Replace `__TODAY__`, `__NOW__`, `__SELF__`, etc.
   - Happens before expression evaluation

3. **Evaluate Expressions** (`expression.ts:evaluateArgs`)
   - Parse `fm.property` frontmatter references
   - Evaluate `if()` conditions and ternary expressions
   - Apply operators (`==`, `&&`, `+`, etc.)

4. **Apply CSS & Classes** (`utils.ts:applyCssFromArgs`)
   - Non-component args become inline CSS
   - `class=...` adds CSS classes
   - `KEY!=value` forces CSS override

5. **Validate Required Args** (`utils.ts:validateArguments`)
   - Check for missing required arguments
   - Show user-friendly error if validation fails

6. **Check `enabled` Expression**
   - If `enabled=...` arg provided, evaluate as boolean
   - Skip render if result is falsy

7. **Permission Check**
   - If component declares `does: [READ/WRITE/EXTERNAL]`
   - Prompt user for permission on first use
   - Skip render if permission denied

8. **Create Component Instance** (`ComponentInstance.create`)
   - Generate unique instance ID
   - Initialize cleanup tracking (intervals, observers, functions)
   - Register in global `componentInstances` map

9. **Execute Component Render**
   - Call component's `render()` function
   - Pass: args, element, context, app, instance, settings

10. **Set Up Refresh Handlers**
    - Infer refresh strategies from arg usage (`fm.*` → metadataChanged)
    - Register event listeners based on `refresh` property
    - Auto-refresh when triggers fire

#### Component Instance Lifecycle

```typescript
interface ComponentInstance {
    id: string;
    element: HTMLElement;
    data: {
        intervals?: NodeJS.Timeout[];    // Auto-cleared on destroy
        observers?: MutationObserver[];  // Auto-disconnected on destroy
        cleanup?: (() => void)[];        // Custom cleanup functions
        triggerRefresh?: () => void;     // Manual refresh trigger
        [key: string]: any;              // Component-specific state
    };
    destroy: () => void;
}
```

**Cleanup on destroy:**
1. Clear all registered intervals
2. Disconnect all mutation observers
3. Execute all cleanup functions
4. Remove from global registry
5. Clear element reference

**Helper methods:**
- `ComponentInstance.addInterval(instance, interval)` - Track interval for cleanup
- `ComponentInstance.addObserver(instance, observer)` - Track observer for cleanup
- `ComponentInstance.addCleanup(instance, fn)` - Register cleanup function
- `ComponentInstance.createUpdateLoop(instance, fn, ms, sync)` - Drift-free periodic updates

### Expression Engine (`src/expression.ts`)

The expression engine provides a simple DSL for dynamic component arguments.

#### Tokenizer

Converts input string into tokens:
```typescript
"fm.count > 5 && fm.active"
→ [
    {type: 'IDENTIFIER', value: 'fm'},
    {type: 'DOT', value: '.'},
    {type: 'IDENTIFIER', value: 'count'},
    {type: 'OPERATOR', value: '>'},
    {type: 'NUMBER', value: '5'},
    {type: 'OPERATOR', value: '&&'},
    {type: 'IDENTIFIER', value: 'fm'},
    {type: 'DOT', value: '.'},
    {type: 'IDENTIFIER', value: 'active'}
]
```

#### Parser

Recursive descent parser with operator precedence:
```
Expression
├── LogicalOr       (||)
│   └── LogicalAnd  (&&)
│       └── Equality (==, !=)
│           └── Comparison (>, <, >=, <=)
│               └── Additive (+, -)
│                   └── Multiplicative (*, /)
│                       └── Unary (!)
│                           └── Primary (literals, identifiers, if())
```

#### Evaluator

Evaluates parsed AST with context:
```typescript
evaluateExpression(
    "if(fm.priority > 1, 'High', 'Low')",
    {fm: {priority: 3}}
) → "High"
```

**Frontmatter Resolution:**
- `fm.property` → reads from current file's frontmatter
- `file.property` → reads with recovery (checks content if frontmatter missing)
- Nested properties: `fm.nested.deep.property`

**Truthiness Rules:**
- Falsy: `undefined`, `null`, `false`, `0`, `""`, `"undefined"`, `"null"`, `"false"`, `"0"`
- Everything else is truthy

### Argument Parser (`src/utils.ts`)

#### parseArguments

Parses KEY=value pairs from code block content:

```typescript
parseArguments(`
path=/daily
limit=5
color!=red
class="custom-class"
`) → {
    path: "/daily",
    limit: "5",
    "color!": "red",
    class: "custom-class"
}
```

**Features:**
- Handles quoted values with spaces
- Supports `KEY!=value` for CSS overrides
- Trims whitespace
- Skips empty lines

#### applyCssFromArgs

Applies CSS and classes to element:

```typescript
applyCssFromArgs(element, {
    "color!": "red",      // Force CSS override
    "font-size": "16px",  // Not a component arg → CSS
    class: "foo bar"      // Add CSS classes
}, ["path", "limit"])     // Known component args
```

**Logic:**
1. If key ends with `!`, strip `!` and apply as CSS
2. If key is `class`, add CSS classes
3. If key not in component args, apply as CSS property
4. Component args are passed to render function

### Auto-Registration System (`scripts/register.mjs`)

Automatically generates `src/components.register.ts` by:

1. **Scanning** `src/components/` for TypeScript files
2. **Importing** all exported components
3. **Generating** import statements and export array
4. **Writing** to `components.register.ts`

**Example output:**
```typescript
import { analytics } from './components/analytics/analytics';
import { clock } from './components/clock/clock';
// ... more imports

export const components = [
    analytics,
    clock,
    // ... more components
];
```

**Runs automatically** on `npm run dev` and `npm run build` via predev/prebuild scripts.

### Refresh System

Components can auto-refresh on various triggers:

#### Refresh Strategies

```typescript
type RefreshStrategy =
    | 'metadataChanged'    // Source file frontmatter changed
    | 'fileModified'       // Source file content changed
    | 'anyMetadataChanged' // Any vault file frontmatter changed
    | 'leafChanged'        // Active leaf changed (sidebar only)
    | 'daily'              // Midnight
    | 'hourly'             // Top of each hour
    | { type: 'timeElapsed'; interval: number }  // Custom interval
    | RefreshStrategy[]    // Multiple strategies
    | null;
```

#### Auto-Inferred Strategies

The system automatically infers refresh needs from argument usage:

- **`fm.*` in args** → adds `metadataChanged` + `leafChanged` (in sidebar)
- **`file.*` in args** → adds `fileModified` + `leafChanged` (in sidebar)

#### Refresh vs. RenderRefresh

- **`render()`**: Full re-render, clears element and rebuilds from scratch
- **`renderRefresh()`**: Optimized update, modifies existing DOM (faster, less flicker)

**Best practice:** Use `renderRefresh()` for time-based updates (clock, countdown) to avoid visual flickering.

### Settings System

#### Plugin Settings

Stored in `.obsidian/plugins/components/data.json`:

```typescript
interface ComponentsSettings {
    componentStates: Record<string, boolean>;  // Enabled/disabled
    permissions: Record<string, PermissionState>;  // Granted permissions
    componentSettings: Record<string, any>;    // Component-specific settings
    lastDailyRefresh: string;                  // Daily refresh tracking
    enableAutoComplete: boolean;               // Autocomplete feature
    showComponentsView: boolean;               // Sidebar view
    enableOjs: boolean;                        // JavaScript execution
}
```

#### Component-Specific Settings

Components can define custom settings:

```typescript
settings: {
    apiKey: {
        name: 'API Key',
        desc: 'Your API key',
        type: 'text',
        default: '',
        placeholder: 'Enter key...'
    },
    _render: async (containerEl, app, plugin) => {
        // Custom settings UI rendering
    }
}
```

Accessed in component via `componentSettings` parameter.

### Permission System

Components declare required permissions:

```typescript
does: [
    ComponentAction.READ,     // Read vault files
    ComponentAction.WRITE,    // Write to vault
    ComponentAction.EXTERNAL  // External API calls
]
```

**Workflow:**
1. First time component renders, check if permission granted
2. If not, show confirmation modal with component details
3. User approves/denies
4. Store decision in settings
5. Future renders skip permission check if already granted

### OJS - JavaScript Execution

Optional feature (disabled by default) that allows `` ```ojs `` code blocks:

```javascript
const { MarkdownRenderer, Notice } = obsidian;

const container = el.createDiv();
await MarkdownRenderer.render(app, '**Hello**', container, ctx.sourcePath, ctx);

new Notice('Rendered!');
```

**Available in scope:**
- `app` - Obsidian App instance
- `el` - Container HTMLElement
- `ctx` - MarkdownPostProcessorContext
- `api` - Helper API (grid, card builders)
- `obsidian` - Full obsidian module

**Security:** Disabled by default, requires explicit user opt-in via settings.

## Component Groups

Components can be grouped for organization:

```typescript
export const gymGroup: ComponentGroup = {
    keyName: 'gym',
    name: 'Gym',
    description: 'Workout tracking components',
    does: [ComponentAction.READ, ComponentAction.WRITE]
};

export const gymRoutineMenu: Component<...> = {
    keyName: 'gym-routine-menu',
    group: gymGroup,
    // ...
};
```

**Benefits:**
- Shared permission requests (all gym components approved together)
- Visual grouping in component selector
- Shared settings namespace

## Data Flow

### Component Rendering Data Flow

```
Markdown Code Block
    ↓
Code Block Processor (main.ts)
    ↓
Component.render() (components.ts)
    ↓
┌─────────────────────┐
│ Parse Arguments     │ (utils.ts:parseArguments)
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Resolve Variables   │ (utils.ts:resolveSpecialVariables)
│ __TODAY__, __SELF__ │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Evaluate Expressions│ (expression.ts:evaluateArgs)
│ fm.*, if(), etc.    │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Apply CSS & Classes │ (utils.ts:applyCssFromArgs)
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Validate Args       │ (utils.ts:validateArguments)
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Check Permissions   │ (main.ts)
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Create Instance     │ (ComponentInstance.create)
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Execute Render      │ (component's render())
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Set Up Refresh      │ (main.ts)
└─────────────────────┘
```

### Refresh Event Flow

```
Event Trigger (metadata change, file edit, timer, etc.)
    ↓
Refresh Handler (main.ts)
    ↓
Find Affected Instances
    ↓
For Each Instance:
    ↓
    Has renderRefresh()?
    ├─ Yes → Call renderRefresh() (optimized update)
    └─ No  → Clear element + re-call Component.render() (full re-render)
```

## File Organization

### Source Structure

```
src/
├── main.ts                    # Plugin entry, registration, lifecycle
├── components.ts              # Component interface, instance lifecycle
├── components.register.ts     # AUTO-GENERATED component registry
├── expression.ts              # Expression DSL (tokenizer, parser, evaluator)
├── utils.ts                   # Argument parsing, validation, CSS application
├── settings.ts                # Settings types and defaults
├── groups.ts                  # Component grouping logic
├── debug.ts                   # Debug logging utilities
├── ojs.ts                     # JavaScript execution for ojs blocks
├── variable.ts                # Special variable definitions
├── components/                # Component implementations
│   ├── analytics/
│   │   ├── analytics.ts
│   │   └── styles.ts
│   ├── clock/
│   │   ├── clock.ts
│   │   └── styles.ts
│   └── ... (more components)
└── native/                    # Obsidian-specific UI
    ├── autocomplete.ts        # Component autocomplete
    ├── confirmation.ts        # Permission dialogs
    ├── modal.ts              # Component selector
    ├── settings.ts           # Settings UI
    └── sidebar.ts            # Sidebar view
```

### Build Process

```
npm run dev/build
    ↓
1. scripts/register.mjs (auto-register components)
    ↓
2. esbuild.config.mjs (bundle TypeScript)
    ↓
3. Output: main.js + styles.css
```

## Key Patterns

### Drift-Free Time Updates

```typescript
ComponentInstance.createUpdateLoop(instance, () => {
    // Update time display
}, 1000, true);  // true = sync to second boundary
```

**Benefits:**
- No accumulated drift over time
- Updates happen exactly on interval boundaries
- Useful for clocks, countdowns, timers

### Conditional Rendering

```typescript
// In component args:
enabled=if(fm.showWidget && fm.priority > 1)
```

Component only renders when expression is truthy.

### Dynamic Values

```typescript
// In component args:
limit=if(fm.compact, 5, 10)
title=if(fm.type == "book", "Books", "Media")
```

Argument values adapt based on frontmatter.

### CSS Customization

```typescript
// In code block:
```my-component
color=red
font-size=16px
class="custom-class another-class"
```

Non-component args automatically become inline CSS.

### Reading Files

```typescript
const file = app.vault.getAbstractFileByPath(args.path);
if (file instanceof TFile) {
    const content = await app.vault.read(file);
    const cache = app.metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter;
}
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

All registered resources are automatically cleaned up when component is destroyed.

## Performance Considerations

### Lazy Rendering

Components only render when:
1. Code block is visible in viewport (Obsidian's default behavior)
2. All conditions pass (enabled, permissions, required args)

### Optimized Refreshes

Use `renderRefresh()` instead of full re-render when possible:
- Faster DOM updates
- No visual flicker
- Preserves element references

### Efficient Change Detection

```typescript
if (ComponentInstance.hasDataChanged(instance, 'myData', data)) {
    // Only update when data actually changed
}
```

Skips unnecessary re-renders in `renderRefresh()`.

## Security Model

### Permission Levels

1. **READ**: Read vault files (requires user approval)
2. **WRITE**: Modify vault files (requires user approval)
3. **EXTERNAL**: Make external API calls (requires user approval)

### Sandboxing

- Components run in plugin context (no network sandboxing)
- OJS feature disabled by default
- All external API calls require explicit EXTERNAL permission
- Permissions stored per-component/group in settings

## Testing

### Unit Tests

Located in `tests/`:
- `expression.test.ts` - Expression engine tests
- `utils.test.ts` - Utility function tests

Run with: `npm test`

### Manual Testing

1. Build plugin: `npm run build`
2. Copy to test vault: `.obsidian/plugins/components/`
3. Enable plugin in Obsidian settings
4. Create test notes with component code blocks

## Common Extension Points

### Adding a New Component

1. Create `src/components/my-component/myComponent.ts`
2. Define component interface with args
3. Implement `render()` function
4. Run build (auto-registration handles the rest)

### Adding a New Refresh Strategy

1. Define new strategy type in `components.ts`
2. Implement event listener in `main.ts:onload()`
3. Add to refresh handler logic

### Adding a New Expression Operator

1. Add token type in `expression.ts:tokenize()`
2. Add parsing logic in appropriate precedence level
3. Add evaluation logic in `evaluateNode()`

### Adding Special Variables

1. Define variable in `variable.ts`
2. Add resolution logic in `utils.ts:resolveSpecialVariables()`
3. Document in CLAUDE.md

## Debugging

### Debug Mode

Enable debug logging in settings or via component arg:
```
```component
debug=true
```

### Console Inspection

```javascript
// In browser console:
app.plugins.plugins.components  // Access plugin instance
componentInstances              // View all active instances
```

### Common Issues

**Component not rendering:**
- Check if enabled in settings
- Verify component registration
- Check browser console for errors
- Verify required args are provided

**Arguments not parsing:**
- Ensure KEY=value format (no spaces around =)
- Use quotes for values with spaces
- Check argument names match component definition

**Cleanup not working:**
- Always use ComponentInstance helper methods
- Ensure cleanup registered before async operations
- Check that destroy() is called on unload

## Future Architecture Considerations

- **Component hot-reloading**: Reload components without plugin restart
- **Component versioning**: Handle component API changes
- **Component marketplace**: Share community components
- **Performance profiling**: Built-in performance monitoring
- **Visual component builder**: GUI for creating components
