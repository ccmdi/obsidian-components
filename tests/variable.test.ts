// variable.test.ts - Tests for variable replacement

import { test, expect, runTests, exitWithStatus } from './test-utils';
import { Variable, NOTE_CONTEXT_VARIABLES, TIME_VARIABLES } from '../src/variable';

runTests('Variable Tests');

// Mock context for testing
function mockContext(sourcePath: string): any {
    return { sourcePath };
}

// --- Note Context Variables ---
console.log('\nNote Context Variables:');

test('__SELF__ returns full source path', () => {
    const ctx = mockContext('folder/subfolder/note.md');
    const resolved = Variable.replaceAll('path is __SELF__', ctx);
    expect(resolved).toBe('path is folder/subfolder/note.md');
});

test('__DIR__ returns directory path', () => {
    const ctx = mockContext('folder/subfolder/note.md');
    const resolved = Variable.replaceAll('dir is __DIR__', ctx);
    expect(resolved).toBe('dir is folder/subfolder');
});

test('__TITLE__ returns note name without extension', () => {
    const ctx = mockContext('folder/my-note.md');
    const resolved = Variable.replaceAll('title is __TITLE__', ctx);
    expect(resolved).toBe('title is my-note');
});

test('__TITLE__ handles notes with multiple dots', () => {
    const ctx = mockContext('folder/note.backup.md');
    const resolved = Variable.replaceAll('__TITLE__', ctx);
    expect(resolved).toBe('note.backup');
});

test('__ROOT__ returns empty string', () => {
    const ctx = mockContext('folder/note.md');
    const resolved = Variable.replaceAll('root is __ROOT__', ctx);
    expect(resolved).toBe('root is ');
});

test('__SELF__ with no context returns empty', () => {
    const resolved = Variable.replaceAll('path is __SELF__');
    expect(resolved).toBe('path is ');
});

test('__DIR__ at root returns empty', () => {
    const ctx = mockContext('note.md');
    const resolved = Variable.replaceAll('__DIR__', ctx);
    expect(resolved).toBe('');
});

// --- Time Variables ---
console.log('\nTime Variables:');

test('__TODAY__ returns current date in YYYY-MM-DD', () => {
    const resolved = Variable.replaceAll('today is __TODAY__');
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(resolved).toBe(`today is ${expected}`);
});

test('__YESTERDAY__ returns yesterday date', () => {
    const resolved = Variable.replaceAll('__YESTERDAY__');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const expected = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    expect(resolved).toBe(expected);
});

test('__TOMORROW__ returns tomorrow date', () => {
    const resolved = Variable.replaceAll('__TOMORROW__');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expected = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    expect(resolved).toBe(expected);
});

test('__NOW__ returns date and time', () => {
    const resolved = Variable.replaceAll('__NOW__');
    expect(resolved).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
});

test('__TIME__ returns current time in HH:MM:SS', () => {
    const resolved = Variable.replaceAll('__TIME__');
    expect(resolved).toMatch(/^\d{2}:\d{2}:\d{2}$/);
});

test('__TIMESTAMP__ returns Unix timestamp', () => {
    const resolved = Variable.replaceAll('__TIMESTAMP__');
    const timestamp = parseInt(resolved);
    expect(timestamp).toBeGreaterThan(1700000000000); // After 2023
    expect(timestamp).toBeLessThan(2000000000000); // Before 2033
});

// --- Multiple Variables ---
console.log('\nMultiple Variable Replacement:');

test('replaces multiple variables in one string', () => {
    const ctx = mockContext('projects/work.md');
    const resolved = Variable.replaceAll('file: __SELF__, dir: __DIR__, title: __TITLE__', ctx);
    expect(resolved).toBe('file: projects/work.md, dir: projects, title: work');
});

test('replaces same variable multiple times', () => {
    const ctx = mockContext('note.md');
    const resolved = Variable.replaceAll('__TITLE__ and __TITLE__ again', ctx);
    expect(resolved).toBe('note and note again');
});

test('mixes note context and time variables', () => {
    const ctx = mockContext('daily/note.md');
    const resolved = Variable.replaceAll('__TITLE__ on __TODAY__', ctx);
    expect(resolved).toContain('note on ');
    expect(resolved).toMatch(/note on \d{4}-\d{2}-\d{2}/);
});

// --- Edge Cases ---
console.log('\nEdge Cases:');

test('no variables returns original string', () => {
    const resolved = Variable.replaceAll('just plain text');
    expect(resolved).toBe('just plain text');
});

test('empty string returns empty', () => {
    const resolved = Variable.replaceAll('');
    expect(resolved).toBe('');
});

test('partial variable names not replaced', () => {
    const resolved = Variable.replaceAll('__SELF is not a variable');
    expect(resolved).toBe('__SELF is not a variable');
});

test('case sensitive variable names', () => {
    const resolved = Variable.replaceAll('__today__ __Today__ __TODAY__');
    expect(resolved).toMatch(/__today__ __Today__ \d{4}-\d{2}-\d{2}/);
});

// --- Variable Structure ---
console.log('\nVariable Structure:');

test('NOTE_CONTEXT_VARIABLES contains expected variables', () => {
    const names = NOTE_CONTEXT_VARIABLES.map(v => v.name);
    expect(names).toContain('__SELF__');
    expect(names).toContain('__DIR__');
    expect(names).toContain('__TITLE__');
    expect(names).toContain('__ROOT__');
});

test('TIME_VARIABLES contains expected variables', () => {
    const names = TIME_VARIABLES.map(v => v.name);
    expect(names).toContain('__TODAY__');
    expect(names).toContain('__YESTERDAY__');
    expect(names).toContain('__TOMORROW__');
    expect(names).toContain('__NOW__');
    expect(names).toContain('__TIME__');
    expect(names).toContain('__TIMESTAMP__');
});

test('all variables have correct structure', () => {
    const allVars = [...NOTE_CONTEXT_VARIABLES, ...TIME_VARIABLES];
    for (const variable of allVars) {
        expect(typeof variable.name).toBe('string');
        expect(variable.name).toMatch(/^__[A-Z]+__$/);
        expect(['note-context', 'time']).toContain(variable.group);
        expect(typeof variable.resolve).toBe('function');
    }
});

// --- Summary ---
exitWithStatus();
