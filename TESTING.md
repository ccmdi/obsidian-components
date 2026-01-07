# Manual Testing Checklist

## Smoke Tests
- [ ] Plugin loads without errors in console
- [ ] Settings tab opens and displays correctly

## Component Rendering
- [ ] A component renders in a note (e.g., `clock`, `calendar`)
- [ ] A component renders in the sidebar
- [ ] Component with `fm.*` arg updates when frontmatter changes
- [ ] Component with expression (`if()`, `contains()`) evaluates correctly

## Widget Space
- [ ] Double-click to add widget works
- [ ] Drag to reorder widgets works
- [ ] Right-click to remove widget works
- [ ] Layout persists after closing/reopening sidebar
- [ ] Disabled components don't break widget-space layout

## Edge Cases
- [ ] Component with missing required arg shows error
- [ ] Component pointing to non-existent folder shows error gracefully
- [ ] Disabling a component in settings hides it
