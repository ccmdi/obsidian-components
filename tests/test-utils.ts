// test-utils.ts - Shared test utilities
// Lightweight test framework that doesn't require external dependencies

let passed = 0;
let failed = 0;
let currentSuite = '';

export function describe(name: string, fn: () => void) {
    currentSuite = name;
    console.log(`\n${name} ${currentSuite}:`);
    fn();
}

export function test(name: string, fn: () => void) {
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

// Alias for test
export const it = test;

export function expect<T>(actual: T) {
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
        },
        toBeTruthy() {
            if (!actual) {
                throw new Error(`Expected truthy value, got ${JSON.stringify(actual)}`);
            }
        },
        toBeFalsy() {
            if (actual) {
                throw new Error(`Expected falsy value, got ${JSON.stringify(actual)}`);
            }
        },
        toBeUndefined() {
            if (actual !== undefined) {
                throw new Error(`Expected undefined, got ${JSON.stringify(actual)}`);
            }
        },
        toBeNull() {
            if (actual !== null) {
                throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
            }
        },
        toContain(expected: any) {
            if (typeof actual === 'string' && typeof expected === 'string') {
                if (!actual.includes(expected)) {
                    throw new Error(`Expected "${actual}" to contain "${expected}"`);
                }
            } else if (Array.isArray(actual)) {
                if (!actual.includes(expected)) {
                    throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`);
                }
            } else {
                throw new Error(`toContain expects string or array, got ${typeof actual}`);
            }
        },
        toMatch(pattern: RegExp) {
            if (typeof actual !== 'string') {
                throw new Error(`toMatch expects string, got ${typeof actual}`);
            }
            if (!pattern.test(actual)) {
                throw new Error(`Expected "${actual}" to match ${pattern}`);
            }
        },
        toBeGreaterThan(expected: number) {
            if (typeof actual !== 'number' || typeof expected !== 'number') {
                throw new Error(`toBeGreaterThan expects numbers`);
            }
            if (!(actual > expected)) {
                throw new Error(`Expected ${actual} to be greater than ${expected}`);
            }
        },
        toBeLessThan(expected: number) {
            if (typeof actual !== 'number' || typeof expected !== 'number') {
                throw new Error(`toBeLessThan expects numbers`);
            }
            if (!(actual < expected)) {
                throw new Error(`Expected ${actual} to be less than ${expected}`);
            }
        },
        toThrow(expectedMessage?: string) {
            throw new Error(`Expected function to throw, but it returned a value`);
        }
    };
}

export function expectThrows(fn: () => void, expectedMessage?: string) {
    try {
        fn();
        throw new Error(`Expected function to throw, but it didn't`);
    } catch (e: any) {
        if (e.message === `Expected function to throw, but it didn't`) {
            throw e;
        }
        if (expectedMessage && !e.message.includes(expectedMessage)) {
            throw new Error(`Expected error containing "${expectedMessage}", got "${e.message}"`);
        }
    }
}

export function runTests(suiteName: string) {
    console.log(`\n=== ${suiteName} ===`);
}

export function summarize() {
    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
    return { passed, failed };
}

export function exitWithStatus() {
    const { failed } = summarize();
    process.exit(failed > 0 ? 1 : 0);
}

// Reset counters (useful if running multiple test files)
export function resetCounters() {
    passed = 0;
    failed = 0;
}
