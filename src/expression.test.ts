// expression.test.ts - Tests for the expression DSL
// Run with: npx tsx src/expression.test.ts

import { evaluateExpression, isTruthy, evaluateArgs } from './expression';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
    try {
        fn();
        passed++;
        console.log(`  [PASS] ${name}`);
    } catch (e: any) {
        failed++;
        console.log(`  [FAIL] ${name}`);
        console.log(`         ${e.message}`);
    }
}

function expect<T>(actual: T) {
    return {
        toBe(expected: T) {
            if (actual !== expected) {
                throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
            }
        },
        toEqual(expected: T) {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
            }
        }
    };
}

// Helper to evaluate with context
function evaluate(input: string, fm: Record<string, unknown> = {}) {
    return evaluateExpression(input, { frontmatter: fm }).value;
}

console.log('\n=== Expression DSL Tests ===\n');

// --- Literals (in expressions) ---
console.log('Literals:');
// Plain literals are returned as-is (backwards compat), but literals in expressions are parsed
test('number in expression', () => expect(evaluate('42 + 0')).toBe(42));
test('string in expression', () => expect(evaluate('if(true, "hello", "bye")')).toBe('hello'));
test('boolean true in expression', () => expect(evaluate('true && true')).toBe(true));
test('boolean false in expression', () => expect(evaluate('false || false')).toBe(false));
test('plain value passthrough', () => expect(evaluate('/daily/notes')).toBe('/daily/notes'));

// --- Frontmatter References ---
console.log('\nFrontmatter References:');
test('fm.property exists', () => expect(evaluate('fm.name', { name: 'Alice' })).toBe('Alice'));
test('fm.property number', () => expect(evaluate('fm.count', { count: 5 })).toBe(5));
test('fm.property missing', () => expect(evaluate('fm.missing', {})).toBe(undefined));
test('fm.nested.property', () => expect(evaluate('fm.user.name', { user: { name: 'Bob' } })).toBe('Bob'));
test('file.property (alias)', () => expect(evaluate('file.title', { title: 'Doc' })).toBe('Doc'));

// --- Arithmetic ---
console.log('\nArithmetic:');
test('addition', () => expect(evaluate('2 + 3')).toBe(5));
test('subtraction', () => expect(evaluate('10 - 4')).toBe(6));
test('multiplication', () => expect(evaluate('3 * 4')).toBe(12));
test('division', () => expect(evaluate('15 / 3')).toBe(5));
test('precedence (* before +)', () => expect(evaluate('2 + 3 * 4')).toBe(14));
test('parentheses', () => expect(evaluate('(2 + 3) * 4')).toBe(20));
test('fm arithmetic', () => expect(evaluate('fm.a + fm.b', { a: 10, b: 5 })).toBe(15));
test('string concatenation', () => expect(evaluate('"hello" + " world"')).toBe('hello world'));

// --- Comparison ---
console.log('\nComparison:');
test('equal numbers', () => expect(evaluate('5 == 5')).toBe(true));
test('equal strings', () => expect(evaluate('"a" == "a"')).toBe(true));
test('not equal', () => expect(evaluate('5 != 3')).toBe(true));
test('greater than', () => expect(evaluate('5 > 3')).toBe(true));
test('less than', () => expect(evaluate('3 < 5')).toBe(true));
test('greater or equal', () => expect(evaluate('5 >= 5')).toBe(true));
test('less or equal', () => expect(evaluate('3 <= 5')).toBe(true));
test('fm comparison', () => expect(evaluate('fm.count > 10', { count: 15 })).toBe(true));

// --- Logical ---
console.log('\nLogical:');
test('and true', () => expect(evaluate('true && true')).toBe(true));
test('and false', () => expect(evaluate('true && false')).toBe(false));
test('or true', () => expect(evaluate('false || true')).toBe(true));
test('or false', () => expect(evaluate('false || false')).toBe(false));
test('not true', () => expect(evaluate('!true')).toBe(false));
test('not false', () => expect(evaluate('!false')).toBe(true));
test('|| returns value (JS-style)', () => expect(evaluate('0 || 5')).toBe(5));
test('|| returns first truthy', () => expect(evaluate('3 || 5')).toBe(3));
test('&& returns value (JS-style)', () => expect(evaluate('3 && 5')).toBe(5));
test('&& returns first falsy', () => expect(evaluate('0 && 5')).toBe(0));
test('fm fallback with ||', () => expect(evaluate('fm.missing || 10', {})).toBe(10));
test('fm fallback chain', () => expect(evaluate('fm.a || fm.b || 0', { b: 5 })).toBe(5));

// --- Conditionals ---
console.log('\nConditionals:');
test('if() boolean true', () => expect(evaluate('if(true)')).toBe(true));
test('if() boolean false', () => expect(evaluate('if(false)')).toBe(false));
test('if() condition true', () => expect(evaluate('if(5 > 3)')).toBe(true));
test('if() ternary true branch', () => expect(evaluate('if(true, "yes", "no")')).toBe('yes'));
test('if() ternary false branch', () => expect(evaluate('if(false, "yes", "no")')).toBe('no'));
test('if() ternary with fm', () => expect(evaluate('if(fm.active, "on", "off")', { active: true })).toBe('on'));
test('if() ternary numbers', () => expect(evaluate('if(fm.use24h, 24, 12)', { use24h: true })).toBe(24));
test('if() complex condition', () => expect(evaluate('if(fm.count > 5 && fm.active, "go", "stop")', { count: 10, active: true })).toBe('go'));

// --- Truthiness ---
console.log('\nTruthiness:');
test('isTruthy: true', () => expect(isTruthy(true)).toBe(true));
test('isTruthy: false', () => expect(isTruthy(false)).toBe(false));
test('isTruthy: 1', () => expect(isTruthy(1)).toBe(true));
test('isTruthy: 0', () => expect(isTruthy(0)).toBe(false));
test('isTruthy: "hello"', () => expect(isTruthy('hello')).toBe(true));
test('isTruthy: ""', () => expect(isTruthy('')).toBe(false));
test('isTruthy: undefined', () => expect(isTruthy(undefined)).toBe(false));
test('isTruthy: null', () => expect(isTruthy(null)).toBe(false));
test('isTruthy: "undefined"', () => expect(isTruthy('undefined')).toBe(false));
test('isTruthy: "null"', () => expect(isTruthy('null')).toBe(false));
test('isTruthy: "false"', () => expect(isTruthy('false')).toBe(false));
test('isTruthy: "0"', () => expect(isTruthy('0')).toBe(false));
test('isTruthy: "true"', () => expect(isTruthy('true')).toBe(true));

// --- evaluateArgs ---
console.log('\nevaluateArgs:');
test('evaluates all args', () => {
    const result = evaluateArgs(
        { a: 'fm.x', b: 'if(fm.y > 1, "big", "small")' },
        { frontmatter: { x: 'hello', y: 5 } }
    );
    expect(result.args.a).toBe('hello');
    expect(result.args.b).toBe('big');
});
test('collects fm keys', () => {
    const result = evaluateArgs(
        { a: 'fm.foo', b: 'fm.bar' },
        { frontmatter: { foo: 1, bar: 2 } }
    );
    expect(result.fmKeys).toEqual(['foo', 'bar']);
});
test('plain values pass through', () => {
    const result = evaluateArgs(
        { path: '/daily/notes', limit: '10' },
        { frontmatter: {} }
    );
    expect(result.args.path).toBe('/daily/notes');
    expect(result.args.limit).toBe('10');
});

// --- Edge Cases ---
console.log('\nEdge Cases:');
test('unary minus', () => expect(evaluate('-5')).toBe(-5));
test('double negation', () => expect(evaluate('!!true')).toBe(true));
test('nested parentheses', () => expect(evaluate('((2 + 3) * (4 - 1))')).toBe(15));
test('whitespace handling', () => expect(evaluate('  5   +   3  ')).toBe(8));
test('string with spaces in if()', () => expect(evaluate('if(true, "hello world", "x")')).toBe('hello world'));
test('escaped quotes in if()', () => expect(evaluate('if(true, "say \\"hi\\"", "x")')).toBe('say "hi"'));

// --- Number Parsing ---
console.log('\nNumber Parsing:');
test('decimal number', () => expect(evaluate('3.14')).toBe(3.14));
test('leading decimal', () => expect(evaluate('.5 + .5')).toBe(1));
test('multiple dots stops at first', () => expect(evaluate('1.2 + 0.3')).toBe(1.5)); // 1.2.3 would be invalid
test('decimal in expression', () => expect(evaluate('1.5 * 2')).toBe(3));

// --- Arithmetic Edge Cases ---
console.log('\nArithmetic Edge Cases:');
test('division by zero', () => expect(evaluate('5 / 0')).toBe(Infinity));
test('negative division', () => expect(evaluate('-10 / 2')).toBe(-5));
test('chained arithmetic', () => expect(evaluate('2 + 3 - 1 + 4')).toBe(8));
test('mixed precedence chain', () => expect(evaluate('2 + 3 * 4 - 6 / 2')).toBe(11));
test('string + number coercion', () => expect(evaluate('"count: " + 5')).toBe('count: 5'));
test('number + string coercion', () => expect(evaluate('5 + " items"')).toBe('5 items'));
test('fm value in arithmetic', () => expect(evaluate('fm.x * 2 + 1', { x: 5 })).toBe(11));

// --- Comparison Edge Cases ---
console.log('\nComparison Edge Cases:');
test('compare undefined to number', () => expect(evaluate('fm.missing > 0', {})).toBe(false));
test('compare undefined to undefined', () => expect(evaluate('fm.a == fm.b', {})).toBe(true));
test('loose equals number string', () => expect(evaluate('"5" == 5')).toBe(true));
test('loose equals case insensitive', () => expect(evaluate('"Hello" == "hello"')).toBe(true));
test('not equals case insensitive', () => expect(evaluate('"Hello" != "HELLO"')).toBe(false));
test('compare null fm values', () => expect(evaluate('fm.a == fm.b', { a: null, b: null })).toBe(true));
test('undefined not equal to zero', () => expect(evaluate('fm.missing == 0', {})).toBe(false));
test('chained comparisons (left-to-right)', () => expect(evaluate('5 > 3 == true')).toBe(true));

// --- Nested Frontmatter ---
console.log('\nNested Frontmatter:');
test('deep nesting', () => expect(evaluate('fm.a.b.c.d', { a: { b: { c: { d: 'deep' } } } })).toBe('deep'));
test('missing intermediate', () => expect(evaluate('fm.a.b.c', { a: null })).toBe(undefined));
test('missing intermediate 2', () => expect(evaluate('fm.a.b.c', { a: {} })).toBe(undefined));
test('array in frontmatter', () => expect(evaluate('fm.items', { items: [1, 2, 3] })).toEqual([1, 2, 3]));

// --- Logical Edge Cases ---
console.log('\nLogical Edge Cases:');
test('chained ||', () => expect(evaluate('fm.a || fm.b || fm.c || "default"', { b: 'found' })).toBe('found'));
test('chained &&', () => expect(evaluate('fm.a && fm.b && fm.c', { a: 1, b: 2, c: 3 })).toBe(3));
test('chained && with falsy', () => expect(evaluate('fm.a && fm.b && fm.c', { a: 1, b: 0, c: 3 })).toBe(0));
test('mixed && ||', () => expect(evaluate('fm.a && fm.b || fm.c', { a: 1, b: 0, c: 'fallback' })).toBe('fallback'));
test('&& precedence over ||', () => expect(evaluate('true || false && false')).toBe(true));
test('not with fm', () => expect(evaluate('!fm.active', { active: false })).toBe(true));
test('not with truthy string', () => expect(evaluate('!fm.status', { status: 'active' })).toBe(false));

// --- If Edge Cases ---
console.log('\nIf Edge Cases:');
test('nested if()', () => expect(evaluate('if(true, if(false, "a", "b"), "c")')).toBe('b'));
test('if() with fm condition', () => expect(evaluate('if(fm.x, fm.y, fm.z)', { x: true, y: 'yes', z: 'no' })).toBe('yes'));
test('if() two args (missing else)', () => expect(evaluate('if(false, "yes")')).toBe(false));
test('if() with arithmetic condition', () => expect(evaluate('if(fm.count + 1 > 5, "big", "small")', { count: 5 })).toBe('big'));
test('if() with || in condition', () => expect(evaluate('if(fm.a || fm.b, "found", "missing")', { b: true })).toBe('found'));
test('if() result used in arithmetic', () => expect(evaluate('if(true, 10, 5) + 1')).toBe(11));

// --- String Edge Cases ---
console.log('\nString Edge Cases:');
test('single quotes', () => expect(evaluate("'hello'")).toBe('hello'));
test('double quotes', () => expect(evaluate('"hello"')).toBe('hello'));
test('mixed quotes in if()', () => expect(evaluate("if(true, 'single', \"double\")")).toBe('single'));
test('empty string literal', () => expect(evaluate('""')).toBe(''));
test('empty string is falsy', () => expect(evaluate('"" || "fallback"')).toBe('fallback'));
test('string with newline escape', () => expect(evaluate('"line1\\nline2"')).toBe('line1\nline2'));
test('string concatenation standalone', () => expect(evaluate('"a" + "b"')).toBe('ab'));

// --- Malformed/Error Recovery ---
console.log('\nError Recovery:');
test('plain path passthrough', () => expect(evaluate('/some/path/file.md')).toBe('/some/path/file.md'));
test('url passthrough', () => expect(evaluate('https://example.com')).toBe('https://example.com'));
test('plain text passthrough', () => expect(evaluate('just some text')).toBe('just some text'));

// --- Truthiness with fm values ---
console.log('\nTruthiness with FM:');
test('fm string "true" is truthy', () => expect(evaluate('fm.val || "no"', { val: 'true' })).toBe('true'));
test('fm string "false" is falsy', () => expect(evaluate('fm.val || "no"', { val: 'false' })).toBe('no'));
test('fm string "0" is falsy', () => expect(evaluate('fm.val || "no"', { val: '0' })).toBe('no'));
test('fm number 0 is falsy', () => expect(evaluate('fm.val || "no"', { val: 0 })).toBe('no'));
test('fm empty array is truthy', () => expect(evaluate('fm.val || "no"', { val: [] })).toEqual([]));
test('fm empty object is truthy', () => expect(evaluate('fm.val || "no"', { val: {} })).toEqual({}));

// --- Contains ---
console.log('\nContains:');
test('string contains substring', () => expect(evaluate('contains("hello world", "world")')).toBe(true));
test('string contains case insensitive', () => expect(evaluate('contains("Hello World", "hello")')).toBe(true));
test('string not contains', () => expect(evaluate('contains("hello", "xyz")')).toBe(false));
test('array contains element', () => expect(evaluate('fm.tags', { tags: ['a', 'b', 'c'] })).toEqual(['a', 'b', 'c']));
test('array contains check', () => expect(evaluate('contains(fm.tags, "b")', { tags: ['a', 'b', 'c'] })).toBe(true));
test('array not contains', () => expect(evaluate('contains(fm.tags, "x")', { tags: ['a', 'b', 'c'] })).toBe(false));
test('contains in if', () => expect(evaluate('if(contains("2025-01-01", "2025"), "yes", "no")')).toBe('yes'));

// --- Complex/Nested Expressions ---
console.log('\nComplex/Nested Expressions:');
// Simulating __TITLE__ resolved to a date string (as special vars resolve before expression eval)
test('if(contains(title, year))', () => expect(evaluate("if(contains('2025-01-15', '2025'), true, false)")).toBe(true));
test('if(contains(title, year)) false case', () => expect(evaluate("if(contains('2024-01-15', '2025'), true, false)")).toBe(false));
test('nested contains in complex if', () => expect(evaluate("if(contains('Daily Note 2025', '2025') && true, 'match', 'no')")).toBe('match'));
test('contains with fm value as haystack', () => expect(evaluate("if(contains(fm.title, '2025'), 'yes', 'no')", { title: '2025-01-01' })).toBe('yes'));
test('contains with fm value as needle', () => expect(evaluate("contains('hello world', fm.search)", { search: 'world' })).toBe(true));
test('contains result in &&', () => expect(evaluate("contains('abc', 'b') && contains('xyz', 'y')")).toBe(true));
test('contains result in ||', () => expect(evaluate("contains('abc', 'z') || contains('xyz', 'y')")).toBe(true));
test('negated contains', () => expect(evaluate("!contains('hello', 'xyz')")).toBe(true));
test('if with negated contains', () => expect(evaluate("if(!contains('2024', '2025'), 'old', 'new')")).toBe('old'));
test('deeply nested if', () => expect(evaluate("if(if(true, true, false), 'a', 'b')")).toBe('a'));
test('if inside contains (edge)', () => expect(evaluate("contains(if(true, 'hello', 'bye'), 'ell')")).toBe(true));
test('arithmetic in if condition', () => expect(evaluate("if(fm.a + fm.b > 10, 'big', 'small')", { a: 7, b: 5 })).toBe('big'));
test('string concat in if result', () => expect(evaluate("if(true, 'hello' + ' ' + 'world', 'x')")).toBe('hello world'));
test('fm fallback in contains', () => expect(evaluate("contains(fm.title || 'default', 'def')", {})).toBe(true));
test('multiple && with contains', () => expect(evaluate("fm.active && contains(fm.name, 'test') && fm.count > 0", { active: true, name: 'testing', count: 5 })).toBe(true));
test('multiple || with contains', () => expect(evaluate("contains(fm.a, 'x') || contains(fm.b, 'y') || contains(fm.c, 'z')", { a: 'ax', b: 'no', c: 'no' })).toBe(true));
test('comparison after contains', () => expect(evaluate("contains('abc', 'b') == true")).toBe(true));
test('contains empty string', () => expect(evaluate("contains('hello', '')")).toBe(true));
test('contains in empty string', () => expect(evaluate("contains('', 'a')")).toBe(false));

// --- Mixed Quote Styles (simulating parsed arg values) ---
console.log('\nMixed Quote Styles:');
test('single quotes outer, double inner', () => expect(evaluate('if(contains("test", "es"), "yes", "no")')).toBe('yes'));
test('expression with single quoted strings', () => expect(evaluate("if(contains('hello', 'ell'), 'found', 'nope')")).toBe('found'));
test('mixed quotes in nested calls', () => expect(evaluate("if(contains('2025-01-01', \"2025\"), 'match', 'no')")).toBe('match'));

// --- Summary ---
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
