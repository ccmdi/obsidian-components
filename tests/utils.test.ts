// utils.test.ts - Tests for utility functions

import './mocks/dom'; // Mock browser APIs
import { test, expect, expectThrows, runTests, exitWithStatus } from './test-utils';
import {
    parseArguments,
    validateArguments,
    escapeForSingleQuotes,
    resolvePath,
    camelToSentence,
    parseBoolean,
    usePropertyAccess,
    argsToSource,
    parseArgsAliases,
    matchesQuery
} from '../src/utils';

// Helper to create fake TFile for matchesQuery tests
function fakeFile(path: string): any {
    return { path };
}

// Helper to create fake CachedMetadata for matchesQuery tests
function fakeCache(opts: { frontmatter?: Record<string, any>; tags?: string[] } = {}): any {
    return {
        frontmatter: opts.frontmatter || {},
        tags: opts.tags?.map(tag => ({ tag: tag.startsWith('#') ? tag : `#${tag}` })) || []
    };
}

runTests('Utils Tests');

// --- parseArguments ---
console.log('\nparseArguments:');
test('basic key=value', () => {
    const result = parseArguments('key=value');
    expect(result).toEqual({ key: 'value' });
});

test('multiple lines', () => {
    const result = parseArguments('key1=value1\nkey2=value2');
    expect(result).toEqual({ key1: 'value1', key2: 'value2' });
});

test('quoted value with double quotes', () => {
    const result = parseArguments('key="value with spaces"');
    expect(result).toEqual({ key: '"value with spaces"' });
});

test('quoted value with single quotes', () => {
    const result = parseArguments("key='value with spaces'");
    expect(result).toEqual({ key: "'value with spaces'" });
});

test('ignores comments', () => {
    const result = parseArguments('key=value\n# this is a comment\nkey2=value2');
    expect(result).toEqual({ key: 'value', key2: 'value2' });
});

test('ignores empty lines', () => {
    const result = parseArguments('key1=value1\n\n\nkey2=value2');
    expect(result).toEqual({ key1: 'value1', key2: 'value2' });
});

test('handles key with underscore', () => {
    const result = parseArguments('my_key=value');
    expect(result).toEqual({ my_key: 'value' });
});

test('handles key with hyphen', () => {
    const result = parseArguments('my-key=value');
    expect(result).toEqual({ 'my-key': 'value' });
});

test('handles key with exclamation (CSS override)', () => {
    const result = parseArguments('color!=red');
    expect(result).toEqual({ 'color!': 'red' });
});

test('handles empty value', () => {
    const result = parseArguments('key=');
    expect(result).toEqual({ key: '' });
});

test('handles value with equals sign', () => {
    const result = parseArguments('equation=a=b+c');
    expect(result).toEqual({ equation: 'a=b+c' });
});

test('trims whitespace around key and value', () => {
    const result = parseArguments('  key  =  value  ');
    expect(result).toEqual({ key: 'value' });
});

test('ignores lines without equals', () => {
    const result = parseArguments('key=value\njust some text\nkey2=value2');
    expect(result).toEqual({ key: 'value', key2: 'value2' });
});

test('rejects invalid key characters', () => {
    const result = parseArguments('key.name=value');
    expect(result).toEqual({});
});

// --- validateArguments ---
console.log('\nvalidateArguments:');
test('passes when all required present', () => {
    validateArguments({ a: '1', b: '2' }, ['a', 'b']);
    expect(true).toBe(true);
});

test('throws when required missing', () => {
    expectThrows(() => validateArguments({ a: '1' }, ['a', 'b']), 'Missing required arguments: b');
});

test('throws with multiple missing', () => {
    expectThrows(() => validateArguments({}, ['a', 'b']), 'Missing required arguments: a, b');
});

// --- escapeForSingleQuotes ---
console.log('\nescapeForSingleQuotes:');
test('escapes single quotes', () => {
    expect(escapeForSingleQuotes("it's")).toBe("it\\'s");
});

test('escapes backslashes', () => {
    expect(escapeForSingleQuotes('path\\to')).toBe('path\\\\to');
});

test('escapes both', () => {
    expect(escapeForSingleQuotes("it's a path\\here")).toBe("it\\'s a path\\\\here");
});

test('leaves other characters alone', () => {
    expect(escapeForSingleQuotes('hello "world"')).toBe('hello "world"');
});

// --- resolvePath ---
console.log('\nresolvePath:');
test('simple relative path', () => {
    expect(resolvePath('base', 'sub')).toBe('base/sub');
});

test('parent directory (..)', () => {
    expect(resolvePath('base/sub', '..')).toBe('base');
});

test('multiple parent directories', () => {
    expect(resolvePath('a/b/c', '../..')).toBe('a');
});

test('current directory (.)', () => {
    expect(resolvePath('base', './sub')).toBe('base/sub');
});

test('mixed navigation', () => {
    expect(resolvePath('a/b/c', '../d/./e')).toBe('a/b/d/e');
});

test('absolute path stays absolute', () => {
    expect(resolvePath('/root/sub', '../other')).toBe('/root/other');
});

test('relative path stays relative', () => {
    expect(resolvePath('relative/path', 'sub')).toBe('relative/path/sub');
});

test('too many parent dirs stops at root', () => {
    expect(resolvePath('a', '../../..')).toBe('');
});

test('empty relative path', () => {
    expect(resolvePath('base', '')).toBe('base');
});

// --- camelToSentence ---
console.log('\ncamelToSentence:');
test('simple camelCase', () => {
    expect(camelToSentence('camelCase')).toBe('Camel case');
});

test('multiple words', () => {
    expect(camelToSentence('thisIsATest')).toBe('This is a test');
});

test('preserves acronym FM', () => {
    expect(camelToSentence('FM')).toBe('FM');
});

test('preserves acronym in middle', () => {
    expect(camelToSentence('showFMValue')).toBe('Show FM value');
});

test('preserves HTML acronym', () => {
    expect(camelToSentence('HTMLParser')).toBe('HTML parser');
});

test('preserves JSON at end', () => {
    expect(camelToSentence('parseJSON')).toBe('Parse JSON');
});

test('single word lowercase', () => {
    expect(camelToSentence('hello')).toBe('Hello');
});

test('single word uppercase', () => {
    expect(camelToSentence('HELLO')).toBe('HELLO');
});

test('already sentence case', () => {
    expect(camelToSentence('Already')).toBe('Already');
});

test('mixed acronyms', () => {
    expect(camelToSentence('convertHTMLToJSON')).toBe('Convert HTML to JSON');
});

// --- parseBoolean ---
console.log('\nparseBoolean:');
test('true string', () => expect(parseBoolean('true')).toBe(true));
test('false string', () => expect(parseBoolean('false')).toBe(false));
test('1 string', () => expect(parseBoolean('1')).toBe(true));
test('0 string', () => expect(parseBoolean('0')).toBe(false));
test('yes string', () => expect(parseBoolean('yes')).toBe(true));
test('no string', () => expect(parseBoolean('no')).toBe(false));
test('on string', () => expect(parseBoolean('on')).toBe(true));
test('off string', () => expect(parseBoolean('off')).toBe(false));
test('TRUE uppercase', () => expect(parseBoolean('TRUE')).toBe(true));
test('FALSE uppercase', () => expect(parseBoolean('FALSE')).toBe(false));
test('undefined returns default false', () => expect(parseBoolean(undefined)).toBe(false));
test('undefined returns custom default', () => expect(parseBoolean(undefined, true)).toBe(true));
test('empty string returns default', () => expect(parseBoolean('', true)).toBe(true));
test('invalid string returns default', () => expect(parseBoolean('invalid', false)).toBe(false));
test('whitespace is trimmed', () => expect(parseBoolean('  true  ')).toBe(true));

// --- usePropertyAccess ---
console.log('\nusePropertyAccess:');
test('simple property', () => {
    expect(usePropertyAccess({ a: 1 }, 'a')).toBe(1);
});

test('nested property', () => {
    expect(usePropertyAccess({ a: { b: { c: 'deep' } } }, 'a.b.c')).toBe('deep');
});

test('missing property returns undefined', () => {
    expect(usePropertyAccess({ a: 1 }, 'b')).toBe(undefined);
});

test('missing nested returns undefined', () => {
    expect(usePropertyAccess({ a: {} }, 'a.b.c')).toBe(undefined);
});

test('null intermediate returns undefined', () => {
    expect(usePropertyAccess({ a: null }, 'a.b')).toBe(undefined);
});

test('array index access', () => {
    expect(usePropertyAccess({ items: ['a', 'b', 'c'] }, 'items[1]')).toBe('b');
});

test('nested array access', () => {
    expect(usePropertyAccess({ data: { items: [10, 20, 30] } }, 'data.items[2]')).toBe(30);
});

test('array out of bounds', () => {
    expect(usePropertyAccess({ items: ['a'] }, 'items[5]')).toBe(undefined);
});

test('array on non-array returns undefined', () => {
    expect(usePropertyAccess({ items: 'string' }, 'items[0]')).toBe(undefined);
});

// --- argsToSource ---
console.log('\nargsToSource:');
test('basic conversion', () => {
    expect(argsToSource({ a: '1', b: '2' })).toBe('a=1\nb=2');
});

test('empty object', () => {
    expect(argsToSource({})).toBe('');
});

test('with transform function', () => {
    const result = argsToSource({ a: '1', b: '2' }, entries => entries.filter(([k]) => k !== 'a'));
    expect(result).toBe('b=2');
});

// --- parseArgsAliases ---
console.log('\nparseArgsAliases:');
test('resolves folder to query alias', () => {
    const result = parseArgsAliases({ folder: 'path' }, new Set(['query']));
    expect(result).toEqual({ query: 'path' });
});

test('does not override existing query', () => {
    const result = parseArgsAliases({ folder: 'path', query: 'existing' }, new Set(['query']));
    expect(result).toEqual({ folder: 'path', query: 'existing' });
});

test('ignores alias if target not in component args', () => {
    const result = parseArgsAliases({ folder: 'path' }, new Set(['other']));
    expect(result).toEqual({ folder: 'path' });
});

test('passes through non-aliased args', () => {
    const result = parseArgsAliases({ foo: 'bar', baz: 'qux' }, new Set(['query']));
    expect(result).toEqual({ foo: 'bar', baz: 'qux' });
});

// --- matchesQuery ---
console.log('\nmatchesQuery:');

// Empty/basic
test('empty query matches everything', () => {
    expect(matchesQuery(fakeFile('any/path.md'), fakeCache(), '')).toBe(true);
});

test('whitespace query matches everything', () => {
    expect(matchesQuery(fakeFile('any/path.md'), fakeCache(), '   ')).toBe(true);
});

// Tag queries
test('tag matches inline tag', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache({ tags: ['#project'] }), '#project')).toBe(true);
});

test('tag matches frontmatter tag', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache({ frontmatter: { tags: ['project'] } }), '#project')).toBe(true);
});

test('tag matches frontmatter tag with hash', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache({ frontmatter: { tags: ['#project'] } }), '#project')).toBe(true);
});

test('tag partial match', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache({ tags: ['#project/sub'] }), '#project')).toBe(true);
});

test('tag no match', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache({ tags: ['#other'] }), '#project')).toBe(false);
});

// Folder queries
test('quoted folder path matches', () => {
    expect(matchesQuery(fakeFile('folder/sub/note.md'), fakeCache(), '"folder/sub"')).toBe(true);
});

test('quoted folder path no match', () => {
    expect(matchesQuery(fakeFile('other/note.md'), fakeCache(), '"folder/sub"')).toBe(false);
});

test('unquoted path partial match', () => {
    expect(matchesQuery(fakeFile('folder/sub/note.md'), fakeCache(), 'sub')).toBe(true);
});

// Property filters
test('[prop] matches truthy property', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache({ frontmatter: { status: 'active' } }), '[status]')).toBe(true);
});

test('[prop] fails on missing property', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache(), '[status]')).toBe(false);
});

test('[prop] fails on null property', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache({ frontmatter: { status: null } }), '[status]')).toBe(false);
});

test('[prop] fails on false property', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache({ frontmatter: { active: false } }), '[active]')).toBe(false);
});

test('[prop] fails on empty string property', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache({ frontmatter: { status: '' } }), '[status]')).toBe(false);
});

test('[!prop] matches missing property', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache(), '[!status]')).toBe(true);
});

test('[!prop] matches null property', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache({ frontmatter: { status: null } }), '[!status]')).toBe(true);
});

test('[!prop] fails on truthy property', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache({ frontmatter: { status: 'active' } }), '[!status]')).toBe(false);
});

test('[prop=val] string equality', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache({ frontmatter: { status: 'done' } }), '[status=done]')).toBe(true);
});

test('[prop=val] case insensitive', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache({ frontmatter: { status: 'Done' } }), '[status=done]')).toBe(true);
});

test('[prop=val] quoted value', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache({ frontmatter: { status: 'in progress' } }), '[status="in progress"]')).toBe(true);
});

test('[prop!=val] not equal', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache({ frontmatter: { status: 'active' } }), '[status!=done]')).toBe(true);
});

test('[prop!=val] fails when equal', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache({ frontmatter: { status: 'done' } }), '[status!=done]')).toBe(false);
});

test('[prop!=val] missing property passes', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache(), '[status!=done]')).toBe(true);
});

test('[prop>n] greater than', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache({ frontmatter: { priority: 5 } }), '[priority>3]')).toBe(true);
});

test('[prop<n] less than', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache({ frontmatter: { priority: 2 } }), '[priority<5]')).toBe(true);
});

test('[prop>=n] greater or equal', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache({ frontmatter: { priority: 5 } }), '[priority>=5]')).toBe(true);
});

test('[prop<=n] less or equal', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache({ frontmatter: { priority: 5 } }), '[priority<=5]')).toBe(true);
});

test('[prop~=val] contains', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache({ frontmatter: { title: 'My Project Notes' } }), '[title~=project]')).toBe(true);
});

test('[prop~=val] contains case insensitive', () => {
    expect(matchesQuery(fakeFile('note.md'), fakeCache({ frontmatter: { title: 'My PROJECT Notes' } }), '[title~=project]')).toBe(true);
});

// AND operator
test('AND both conditions true', () => {
    expect(matchesQuery(
        fakeFile('folder/note.md'),
        fakeCache({ tags: ['#project'] }),
        '#project AND folder'
    )).toBe(true);
});

test('AND first condition false', () => {
    expect(matchesQuery(
        fakeFile('folder/note.md'),
        fakeCache({ tags: ['#other'] }),
        '#project AND folder'
    )).toBe(false);
});

test('AND second condition false', () => {
    expect(matchesQuery(
        fakeFile('other/note.md'),
        fakeCache({ tags: ['#project'] }),
        '#project AND folder'
    )).toBe(false);
});

// OR operator
test('OR first condition true', () => {
    expect(matchesQuery(
        fakeFile('note.md'),
        fakeCache({ tags: ['#project'] }),
        '#project OR #other'
    )).toBe(true);
});

test('OR second condition true', () => {
    expect(matchesQuery(
        fakeFile('note.md'),
        fakeCache({ tags: ['#other'] }),
        '#project OR #other'
    )).toBe(true);
});

test('OR both conditions false', () => {
    expect(matchesQuery(
        fakeFile('note.md'),
        fakeCache({ tags: ['#neither'] }),
        '#project OR #other'
    )).toBe(false);
});

// Combined AND/OR
test('OR has lower precedence than AND', () => {
    // "#a OR #b AND folder" = "#a OR (#b AND folder)"
    // If we have #a, it should match regardless of folder
    expect(matchesQuery(
        fakeFile('other/note.md'),
        fakeCache({ tags: ['#a'] }),
        '#a OR #b AND folder'
    )).toBe(true);
});

test('AND groups with OR', () => {
    // "#a OR #b AND folder" = "#a OR (#b AND folder)"
    // If we have #b but wrong folder, only the AND group is checked
    expect(matchesQuery(
        fakeFile('other/note.md'),
        fakeCache({ tags: ['#b'] }),
        '#a OR #b AND folder'
    )).toBe(false);
});

test('complex query with property and tag', () => {
    expect(matchesQuery(
        fakeFile('projects/note.md'),
        fakeCache({ frontmatter: { status: 'active', priority: 5 }, tags: ['#work'] }),
        '#work AND [status=active] AND [priority>3]'
    )).toBe(true);
});

// --- formatDate ---
console.log('\nformatDate:');
import { formatDate } from '../src/utils';

test('formatDate with YYYY-MM-DD', () => {
    const date = new Date('2025-03-15T12:00:00Z');
    expect(formatDate(date, 'YYYY-MM-DD')).toBe('2025-03-15');
});

test('formatDate with default (no format)', () => {
    const date = new Date('2025-03-15T12:00:00Z');
    const result = formatDate(date, '');
    expect(result).toBe('2025-03-15');
});

test('formatDate with MMMM Do YYYY', () => {
    const date = new Date('2025-03-15T12:00:00Z');
    const result = formatDate(date, 'MMMM Do YYYY');
    expect(result).toMatch(/March/);
});

// --- median ---
console.log('\nmedian:');
import { median } from '../src/utils';

test('median of odd-length array', () => {
    expect(median([1, 3, 5, 7, 9])).toBe(5);
});

test('median of even-length array', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
});

test('median of single element', () => {
    expect(median([42])).toBe(42);
});

test('median of empty array', () => {
    expect(median([])).toBe(0);
});

test('median of unsorted array', () => {
    expect(median([5, 1, 9, 3, 7])).toBe(5);
});

test('median with negative numbers', () => {
    expect(median([-5, -1, 0, 1, 5])).toBe(0);
});

// --- renderExternalLink ---
console.log('\nrenderExternalLink:');
import { renderExternalLink } from '../src/utils';

test('renders markdown link', () => {
    const result = renderExternalLink('[Google](https://google.com)');
    expect(result).toBe('<a href="https://google.com" target="_blank">Google</a>');
});

test('renders multiple links', () => {
    const result = renderExternalLink('Check [Google](https://google.com) and [GitHub](https://github.com)');
    expect(result).toContain('<a href="https://google.com" target="_blank">Google</a>');
    expect(result).toContain('<a href="https://github.com" target="_blank">GitHub</a>');
});

test('preserves text without links', () => {
    const result = renderExternalLink('Just plain text');
    expect(result).toBe('Just plain text');
});

test('handles empty string', () => {
    const result = renderExternalLink('');
    expect(result).toBe('');
});

// --- useTargetNoteProperty ---
console.log('\nuseTargetNoteProperty:');
import { useTargetNoteProperty } from '../src/utils';

test('accesses note.frontmatter.property', () => {
    const cache = { frontmatter: { title: 'Test Note' } };
    expect(useTargetNoteProperty(cache, 'note.frontmatter.title')).toBe('Test Note');
});

test('accesses note.tags', () => {
    const cache = { tags: [{ tag: '#project' }] };
    expect(useTargetNoteProperty(cache, 'note.tags')).toEqual([{ tag: '#project' }]);
});

test('returns undefined for non-note prefix', () => {
    const cache = { frontmatter: { title: 'Test' } };
    expect(useTargetNoteProperty(cache, 'frontmatter.title')).toBe(undefined);
});

test('returns undefined for null cache', () => {
    expect(useTargetNoteProperty(null, 'note.frontmatter.title')).toBe(undefined);
});

test('returns undefined for missing property', () => {
    const cache = { frontmatter: {} };
    expect(useTargetNoteProperty(cache, 'note.frontmatter.missing')).toBe(undefined);
});

// --- applyCssFromArgs ---
console.log('\napplyCssFromArgs:');
import { applyCssFromArgs } from '../src/utils';

test('applies CSS properties', () => {
    const element = document.createElement('div');
    applyCssFromArgs(element, { color: 'red', 'font-size': '16px' });
    expect(element.style.color).toBe('red');
    expect(element.style.fontSize).toBe('16px');
});

test('adds classes from class property', () => {
    const element = document.createElement('div');
    applyCssFromArgs(element, { class: 'class1 class2' });
    expect(element.hasClass('class1')).toBe(true);
    expect(element.hasClass('class2')).toBe(true);
});

test('adds classes from className property', () => {
    const element = document.createElement('div');
    applyCssFromArgs(element, { className: 'myclass' });
    expect(element.hasClass('myclass')).toBe(true);
});

test('skips handled keys', () => {
    const element = document.createElement('div');
    const handledKeys = new Set(['skipped']);
    applyCssFromArgs(element, { color: 'blue', skipped: 'ignored' }, handledKeys);
    expect(element.style.color).toBe('blue');
    expect(element.style.getPropertyValue('skipped')).toBe('');
});

test('throws on invalid CSS property', () => {
    const element = document.createElement('div');
    expectThrows(
        () => applyCssFromArgs(element, { 'invalid-prop-xyz': 'value' }),
        'invalid or not supported'
    );
});

// --- resolveSpecialVariables ---
console.log('\nresolveSpecialVariables:');
import { resolveSpecialVariables } from '../src/utils';

test('resolves path with ../', () => {
    const result = resolveSpecialVariables({ path: 'folder/../other' });
    expect(result.path).toBe('other');
});

test('resolves path with ./', () => {
    const result = resolveSpecialVariables({ path: './folder/file' });
    expect(result.path).toBe('folder/file');
});

test('preserves values without path navigation', () => {
    const result = resolveSpecialVariables({ name: 'test', value: '123' });
    expect(result.name).toBe('test');
    expect(result.value).toBe('123');
});

// --- Summary ---
exitWithStatus();
