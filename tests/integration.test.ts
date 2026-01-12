// integration.test.ts - Tests for the full component arg processing pipeline
// Simulates: code block → parseArguments → resolveSpecialVariables → evaluateArgs

import { test, expect, runTests, exitWithStatus } from './test-utils';
import { parseArguments } from '../src/utils';
import { evaluateArgs } from '../src/expression';

// Mock date for consistent testing
const MOCK_TODAY = '2026-01-12';

/**
 * Mock variable replacement (simulates resolveSpecialVariables from utils.ts)
 * Uses fixed dates for predictable testing
 */
function mockResolveVariables(args: Record<string, string>, ctx?: { sourcePath?: string }): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(args)) {
        let resolved = value;
        resolved = resolved.replace(/__TODAY__/g, MOCK_TODAY);
        resolved = resolved.replace(/__YESTERDAY__/g, '2026-01-11');
        resolved = resolved.replace(/__TOMORROW__/g, '2026-01-13');
        resolved = resolved.replace(/__SELF__/g, ctx?.sourcePath || 'test/note.md');
        resolved = resolved.replace(/__DIR__/g, 'test');
        resolved = resolved.replace(/__TITLE__/g, 'note');
        result[key] = resolved;
    }
    return result;
}

/**
 * Simulates the component arg processing pipeline from components.ts:
 * 1. parseArguments - extract key=value from code block
 * 2. resolveSpecialVariables - replace __TODAY__, __SELF__, etc.
 * 3. evaluateArgs - evaluate expressions (fm.*, if(), operators)
 */
function processComponentArgs(
    source: string,
    frontmatter: Record<string, unknown> = {},
    ctx?: { sourcePath: string }
): Record<string, string> {
    // Step 1: Parse arguments from code block
    let args = parseArguments(source);

    // Step 2: Resolve special variables (mocked for testing)
    args = mockResolveVariables(args, ctx);

    // Step 3: Evaluate expressions
    const result = evaluateArgs(args, { frontmatter });

    return result.args;
}

runTests('Integration Tests - Component Arg Pipeline');

// =============================================================================
// QUOTING BEHAVIOR - The bug that started this
// =============================================================================
console.log('\nQuoting Behavior (The Original Bug):');

test('quoted variable: value="__TODAY__" should resolve to date without extra quotes', () => {
    const result = processComponentArgs('value="__TODAY__"');
    expect(result.value).toBe(MOCK_TODAY);
});

test('unquoted variable: value=__TODAY__ becomes arithmetic (user error)', () => {
    const result = processComponentArgs('value=__TODAY__');
    // 2026 - 01 - 12 = 2013
    expect(result.value).toBe('2013');
});

test('single quoted variable: value=\'__TODAY__\' should resolve to date', () => {
    const result = processComponentArgs("value='__TODAY__'");
    expect(result.value).toBe(MOCK_TODAY);
});

test('variable in expression context should work', () => {
    const result = processComponentArgs('enabled=if("__TODAY__" == "2026-01-12", true, false)');
    expect(result.enabled).toBe('true');
});

// =============================================================================
// STRING LITERALS
// =============================================================================
console.log('\nString Literals:');

test('double quoted string extracts content', () => {
    const result = processComponentArgs('value="hello world"');
    expect(result.value).toBe('hello world');
});

test('single quoted string extracts content', () => {
    const result = processComponentArgs("value='hello world'");
    expect(result.value).toBe('hello world');
});

test('date-like string in quotes stays as string', () => {
    const result = processComponentArgs('value="2025-01-15"');
    expect(result.value).toBe('2025-01-15');
});

test('unquoted date-like value becomes arithmetic', () => {
    const result = processComponentArgs('value=2025-01-15');
    // 2025 - 1 - 15 = 2009
    expect(result.value).toBe('2009');
});

// =============================================================================
// PLAIN VALUES (no quotes, no expressions)
// =============================================================================
console.log('\nPlain Values:');

test('plain path passes through', () => {
    const result = processComponentArgs('path=/daily/notes');
    expect(result.path).toBe('/daily/notes');
});

test('plain number passes through as string', () => {
    const result = processComponentArgs('limit=10');
    expect(result.limit).toBe('10');
});

test('plain text with spaces (unquoted) - error recovery', () => {
    // This will fail to parse as expression and return as-is
    const result = processComponentArgs('value=hello world');
    expect(result.value).toBe('hello world');
});

// =============================================================================
// FRONTMATTER REFERENCES
// =============================================================================
console.log('\nFrontmatter References:');

test('fm.property resolves from frontmatter', () => {
    const result = processComponentArgs('value=fm.name', { name: 'Alice' });
    expect(result.value).toBe('Alice');
});

test('fm.property with missing key returns undefined', () => {
    const result = processComponentArgs('value=fm.missing', {});
    expect(result.value).toBe('undefined');
});

test('fm.property in quoted string is NOT resolved (literal)', () => {
    const result = processComponentArgs('value="fm.name"', { name: 'Alice' });
    // Inside quotes, fm.name is just a string, not a reference
    expect(result.value).toBe('fm.name');
});

// =============================================================================
// EXPRESSIONS WITH VARIABLES
// =============================================================================
console.log('\nExpressions with Variables:');

test('if() with quoted variable', () => {
    const result = processComponentArgs('show=if(contains("__TODAY__", "2026"), "yes", "no")');
    expect(result.show).toBe('yes');
});

test('comparison with quoted date variable', () => {
    const result = processComponentArgs('valid=if("__TODAY__" == "2026-01-12", true, false)');
    expect(result.valid).toBe('true');
});

test('string concatenation with variable', () => {
    const result = processComponentArgs('msg="Date: " + "__TODAY__"');
    expect(result.msg).toBe('Date: 2026-01-12');
});

// =============================================================================
// COMPONENT SIMULATION - property-button scenario
// =============================================================================
console.log('\nComponent Simulation (property-button):');

test('property-button with quoted __TODAY__ value', () => {
    const source = `property=attempts
action=push
value="__TODAY__"
buttonText=Log Attempt`;

    const result = processComponentArgs(source);

    expect(result.property).toBe('attempts');
    expect(result.action).toBe('push');
    expect(result.value).toBe(MOCK_TODAY);
    expect(result.buttonText).toBe('Log Attempt');
});

test('property-button with unquoted __TODAY__ (arithmetic bug)', () => {
    const source = `property=count
action=set
value=__TODAY__`;

    const result = processComponentArgs(source);
    // This demonstrates the bug when users forget quotes
    expect(result.value).toBe('2013');
});

// =============================================================================
// EDGE CASES
// =============================================================================
console.log('\nEdge Cases:');

test('empty quoted string', () => {
    const result = processComponentArgs('value=""');
    expect(result.value).toBe('');
});

test('quoted string with internal quotes (escaped)', () => {
    const result = processComponentArgs('value="say \\"hello\\""');
    expect(result.value).toBe('say "hello"');
});

test('multiple args with mixed quoting', () => {
    const source = `a="quoted"
b=unquoted
c='single'
d=fm.test`;

    const result = processComponentArgs(source, { test: 'from-fm' });

    expect(result.a).toBe('quoted');
    expect(result.b).toBe('unquoted');
    expect(result.c).toBe('single');
    expect(result.d).toBe('from-fm');
});

test('CSS override key with value', () => {
    const result = processComponentArgs('color!=red');
    expect(result['color!']).toBe('red');
});

test('value with equals sign', () => {
    const result = processComponentArgs('equation=a=b+c');
    expect(result.equation).toBe('a=b+c');
});

// =============================================================================
// SPECIAL VARIABLES
// =============================================================================
console.log('\nSpecial Variables:');

test('__SELF__ unquoted becomes NaN (division) - must quote paths', () => {
    const result = processComponentArgs('path=__SELF__', {}, { sourcePath: 'folder/my-note.md' });
    // folder/my-note.md is parsed as folder / my - note.md = NaN
    expect(result.path).toBe('NaN');
});

test('__SELF__ quoted preserves path', () => {
    const result = processComponentArgs('path="__SELF__"', {}, { sourcePath: 'test/note.md' });
    expect(result.path).toBe('test/note.md');
});

test('__DIR__ resolves to directory', () => {
    const result = processComponentArgs('dir=__DIR__', {}, { sourcePath: 'folder/note.md' });
    expect(result.dir).toBe('test'); // mocked
});

test('__TITLE__ resolves to note title', () => {
    const result = processComponentArgs('title=__TITLE__', {}, { sourcePath: 'folder/note.md' });
    expect(result.title).toBe('note'); // mocked
});

test('quoted __SELF__ in expression', () => {
    const result = processComponentArgs('show=if(contains("__SELF__", "note"), true, false)', {}, { sourcePath: 'test/note.md' });
    expect(result.show).toBe('true');
});

// =============================================================================
exitWithStatus();
