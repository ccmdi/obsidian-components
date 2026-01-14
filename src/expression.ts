export interface ExpressionContext {
    frontmatter: Record<string, unknown>;
}

type TokenType =
    | 'NUMBER' | 'STRING' | 'BOOLEAN' | 'IDENTIFIER' | 'FM_REF' | 'FILE_REF'
    | 'PLUS' | 'MINUS' | 'STAR' | 'SLASH'
    | 'EQ' | 'NEQ' | 'GT' | 'LT' | 'GTE' | 'LTE'
    | 'AND' | 'OR' | 'NOT' | 'NULLISH'
    | 'LPAREN' | 'RPAREN' | 'COMMA'
    | 'IF' | 'CONTAINS' | 'LENGTH' | 'EOF';

interface Token {
    type: TokenType;
    value: string | number | boolean;
    raw: string;
}

function tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    const peek = (offset = 0) => input[i + offset];
    const advance = () => input[i++];
    const isAtEnd = () => i >= input.length;
    const isDigit = (c: string) => c >= '0' && c <= '9';
    const isAlpha = (c: string) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
    const isAlphaNumeric = (c: string) => isAlpha(c) || isDigit(c);

    while (!isAtEnd()) {
        const c = peek();

        if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
            advance();
            continue;
        }

        if (c === '=' && peek(1) === '=') {
            tokens.push({ type: 'EQ', value: '==', raw: '==' });
            i += 2;
            continue;
        }
        if (c === '!' && peek(1) === '=') {
            tokens.push({ type: 'NEQ', value: '!=', raw: '!=' });
            i += 2;
            continue;
        }
        if (c === '>' && peek(1) === '=') {
            tokens.push({ type: 'GTE', value: '>=', raw: '>=' });
            i += 2;
            continue;
        }
        if (c === '<' && peek(1) === '=') {
            tokens.push({ type: 'LTE', value: '<=', raw: '<=' });
            i += 2;
            continue;
        }
        if (c === '&' && peek(1) === '&') {
            tokens.push({ type: 'AND', value: '&&', raw: '&&' });
            i += 2;
            continue;
        }
        if (c === '|' && peek(1) === '|') {
            tokens.push({ type: 'OR', value: '||', raw: '||' });
            i += 2;
            continue;
        }
        if (c === '?' && peek(1) === '?') {
            tokens.push({ type: 'NULLISH', value: '??', raw: '??' });
            i += 2;
            continue;
        }

        if (c === '>') { tokens.push({ type: 'GT', value: '>', raw: '>' }); advance(); continue; }
        if (c === '<') { tokens.push({ type: 'LT', value: '<', raw: '<' }); advance(); continue; }
        if (c === '!') { tokens.push({ type: 'NOT', value: '!', raw: '!' }); advance(); continue; }
        if (c === '+') { tokens.push({ type: 'PLUS', value: '+', raw: '+' }); advance(); continue; }
        if (c === '-') { tokens.push({ type: 'MINUS', value: '-', raw: '-' }); advance(); continue; }
        if (c === '*') { tokens.push({ type: 'STAR', value: '*', raw: '*' }); advance(); continue; }
        if (c === '/') { tokens.push({ type: 'SLASH', value: '/', raw: '/' }); advance(); continue; }
        if (c === '(') { tokens.push({ type: 'LPAREN', value: '(', raw: '(' }); advance(); continue; }
        if (c === ')') { tokens.push({ type: 'RPAREN', value: ')', raw: ')' }); advance(); continue; }
        if (c === ',') { tokens.push({ type: 'COMMA', value: ',', raw: ',' }); advance(); continue; }

        if (c === '"' || c === "'") {
            const quote = c;
            advance();
            let str = '';
            while (!isAtEnd() && peek() !== quote) {
                if (peek() === '\\' && peek(1)) {
                    advance();
                    const escaped = advance();
                    if (escaped === 'n') str += '\n';
                    else if (escaped === 't') str += '\t';
                    else if (escaped === 'r') str += '\r';
                    else str += escaped;
                } else {
                    str += advance();
                }
            }
            if (!isAtEnd()) advance();
            tokens.push({ type: 'STRING', value: str, raw: `${quote}${str}${quote}` });
            continue;
        }

        if (isDigit(c) || (c === '.' && isDigit(peek(1)))) {
            let num = '';
            let seenDot = false;
            while (!isAtEnd() && (isDigit(peek()) || (peek() === '.' && !seenDot))) {
                if (peek() === '.') seenDot = true;
                num += advance();
            }
            tokens.push({ type: 'NUMBER', value: parseFloat(num), raw: num });
            continue;
        }

        if (isAlpha(c)) {
            let ident = '';
            while (!isAtEnd() && (isAlphaNumeric(peek()) || peek() === '.')) {
                ident += advance();
            }

            if (ident.startsWith('fm.')) {
                tokens.push({ type: 'FM_REF', value: ident.slice(3), raw: ident });
            } else if (ident.startsWith('file.')) {
                tokens.push({ type: 'FILE_REF', value: ident.slice(5), raw: ident });
            } else if (ident === 'true') {
                tokens.push({ type: 'BOOLEAN', value: true, raw: 'true' });
            } else if (ident === 'false') {
                tokens.push({ type: 'BOOLEAN', value: false, raw: 'false' });
            } else if (ident === 'if') {
                tokens.push({ type: 'IF', value: 'if', raw: 'if' });
            } else if (ident === 'contains') {
                tokens.push({ type: 'CONTAINS', value: 'contains', raw: 'contains' });
            } else if (ident === 'length') {
                tokens.push({ type: 'LENGTH', value: 'length', raw: 'length' });
            } else {
                tokens.push({ type: 'IDENTIFIER', value: ident, raw: ident });
            }
            continue;
        }

        throw new Error(`Unexpected character: ${c} at position ${i}`);
    }

    tokens.push({ type: 'EOF', value: '', raw: '' });
    return tokens;
}

type Expr =
    | { type: 'literal'; value: string | number | boolean | null | undefined }
    | { type: 'fmRef'; key: string }
    | { type: 'fileRef'; key: string }
    | { type: 'unary'; operator: '!' | '-'; operand: Expr }
    | { type: 'binary'; operator: string; left: Expr; right: Expr }
    | { type: 'if'; condition: Expr; thenBranch: Expr; elseBranch: Expr | null }
    | { type: 'contains'; haystack: Expr; needle: Expr }
    | { type: 'length'; operand: Expr };

class Parser {
    private tokens: Token[];
    private current = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    parse(): Expr {
        const expr = this.expression();
        if (!this.isAtEnd()) {
            throw new Error(`Unexpected token after expression: ${this.peek().raw}`);
        }
        return expr;
    }

    private expression(): Expr {
        return this.or();
    }

    private or(): Expr {
        let expr = this.and();
        while (this.match('OR', 'NULLISH')) {
            const operator = this.previous().raw;
            const right = this.and();
            expr = { type: 'binary', operator, left: expr, right };
        }
        return expr;
    }

    private and(): Expr {
        let expr = this.equality();
        while (this.match('AND')) {
            const right = this.equality();
            expr = { type: 'binary', operator: '&&', left: expr, right };
        }
        return expr;
    }

    private equality(): Expr {
        let expr = this.comparison();
        while (this.match('EQ', 'NEQ')) {
            const operator = this.previous().raw;
            const right = this.comparison();
            expr = { type: 'binary', operator, left: expr, right };
        }
        return expr;
    }

    private comparison(): Expr {
        let expr = this.term();
        while (this.match('GT', 'GTE', 'LT', 'LTE')) {
            const operator = this.previous().raw;
            const right = this.term();
            expr = { type: 'binary', operator, left: expr, right };
        }
        return expr;
    }

    private term(): Expr {
        let expr = this.factor();
        while (this.match('PLUS', 'MINUS')) {
            const operator = this.previous().raw;
            const right = this.factor();
            expr = { type: 'binary', operator, left: expr, right };
        }
        return expr;
    }

    private factor(): Expr {
        let expr = this.unary();
        while (this.match('STAR', 'SLASH')) {
            const operator = this.previous().raw;
            const right = this.unary();
            expr = { type: 'binary', operator, left: expr, right };
        }
        return expr;
    }

    private unary(): Expr {
        if (this.match('NOT')) {
            return { type: 'unary', operator: '!', operand: this.unary() };
        }
        if (this.match('MINUS')) {
            return { type: 'unary', operator: '-', operand: this.unary() };
        }
        return this.call();
    }

    private call(): Expr {
        if (this.match('IF')) {
            this.consume('LPAREN', "Expected '(' after 'if'");
            const condition = this.expression();

            let thenBranch: Expr;
            let elseBranch: Expr | null = null;

            if (this.match('COMMA')) {
                thenBranch = this.expression();
                if (this.match('COMMA')) {
                    elseBranch = this.expression();
                }
            } else {
                thenBranch = { type: 'literal', value: true };
                elseBranch = { type: 'literal', value: false };
            }

            this.consume('RPAREN', "Expected ')' after if arguments");
            return { type: 'if', condition, thenBranch, elseBranch };
        }

        if (this.match('CONTAINS')) {
            this.consume('LPAREN', "Expected '(' after 'contains'");
            const haystack = this.expression();
            this.consume('COMMA', "Expected ',' after first argument");
            const needle = this.expression();
            this.consume('RPAREN', "Expected ')' after contains arguments");
            return { type: 'contains', haystack, needle };
        }

        if (this.match('LENGTH')) {
            this.consume('LPAREN', "Expected '(' after 'length'");
            const operand = this.expression();
            this.consume('RPAREN', "Expected ')' after length argument");
            return { type: 'length', operand };
        }

        return this.primary();
    }

    private primary(): Expr {
        if (this.match('BOOLEAN', 'NUMBER', 'STRING')) {
            return { type: 'literal', value: this.previous().value as string | number | boolean };
        }

        if (this.match('FM_REF')) {
            return { type: 'fmRef', key: this.previous().value as string };
        }

        if (this.match('FILE_REF')) {
            return { type: 'fileRef', key: this.previous().value as string };
        }

        if (this.match('IDENTIFIER')) {
            return { type: 'literal', value: this.previous().value as string };
        }

        if (this.match('LPAREN')) {
            const expr = this.expression();
            this.consume('RPAREN', "Expected ')' after expression");
            return expr;
        }

        throw new Error(`Unexpected token: ${this.peek().raw}`);
    }

    private match(...types: TokenType[]): boolean {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    private check(type: TokenType): boolean {
        if (this.isAtEnd()) return false;
        return this.peek().type === type;
    }

    private advance(): Token {
        if (!this.isAtEnd()) this.current++;
        return this.previous();
    }

    private isAtEnd(): boolean {
        return this.peek().type === 'EOF';
    }

    private peek(): Token {
        return this.tokens[this.current];
    }

    private previous(): Token {
        return this.tokens[this.current - 1];
    }

    private consume(type: TokenType, message: string): Token {
        if (this.check(type)) return this.advance();
        throw new Error(message);
    }
}

function evaluate(expr: Expr, context: ExpressionContext): unknown {
    switch (expr.type) {
        case 'literal':
            return expr.value;

        case 'fmRef': {
            const value = getNestedProperty(context.frontmatter, expr.key);
            return value;
        }

        case 'fileRef': {
            const value = getNestedProperty(context.frontmatter, expr.key);
            return value;
        }

        case 'unary': {
            const operand = evaluate(expr.operand, context);
            if (expr.operator === '!') {
                return !isTruthy(operand);
            }
            if (expr.operator === '-') {
                return -toNumber(operand);
            }
            return operand;
        }

        case 'binary': {
            const left = evaluate(expr.left, context);
            const right = evaluate(expr.right, context);

            switch (expr.operator) {
                case '&&': return isTruthy(left) ? right : left;
                case '||': return isTruthy(left) ? left : right;
                case '??': return (left !== null && left !== undefined) ? left : right;
                case '==': return looseEquals(left, right);
                case '!=': return !looseEquals(left, right);
                case '>': return toNumber(left) > toNumber(right);
                case '>=': return toNumber(left) >= toNumber(right);
                case '<': return toNumber(left) < toNumber(right);
                case '<=': return toNumber(left) <= toNumber(right);
                case '+': {
                    if (typeof left === 'string' || typeof right === 'string') {
                        return String(left ?? '') + String(right ?? '');
                    }
                    return toNumber(left) + toNumber(right);
                }
                case '-': return toNumber(left) - toNumber(right);
                case '*': return toNumber(left) * toNumber(right);
                case '/': return toNumber(left) / toNumber(right);
            }
            return null;
        }

        case 'if': {
            const condition = evaluate(expr.condition, context);
            if (isTruthy(condition)) {
                return evaluate(expr.thenBranch, context);
            } else if (expr.elseBranch) {
                return evaluate(expr.elseBranch, context);
            }
            return false;
        }

        case 'contains': {
            const haystack = evaluate(expr.haystack, context);
            const needle = evaluate(expr.needle, context);

            if (Array.isArray(haystack)) {
                return haystack.some(item => looseEquals(item, needle));
            }
            if (typeof haystack === 'string' && needle != null) {
                return haystack.toLowerCase().includes(String(needle).toLowerCase());
            }
            return false;
        }

        case 'length': {
            const value = evaluate(expr.operand, context);
            if (Array.isArray(value)) {
                return value.length;
            }
            if (typeof value === 'string') {
                return value.length;
            }
            return 0;
        }
    }
}

function getNestedProperty(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        current = (current as Record<string, unknown>)[part];
    }
    return current;
}

function toNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const n = parseFloat(value);
        return isNaN(n) ? 0 : n;
    }
    if (typeof value === 'boolean') return value ? 1 : 0;
    return 0;
}

function looseEquals(a: unknown, b: unknown): boolean {
    if (a === null || a === undefined) {
        return b === null || b === undefined;
    }
    if (b === null || b === undefined) {
        return false;
    }

    const numA = typeof a === 'number' ? a : parseFloat(String(a));
    const numB = typeof b === 'number' ? b : parseFloat(String(b));
    if (!isNaN(numA) && !isNaN(numB)) {
        return numA === numB;
    }

    return String(a).toLowerCase() === String(b).toLowerCase();
}

/**
 * Check if a value is truthy.
 * Falsy: undefined, null, false, 0, "", "undefined", "null", "false", "0"
 */
export function isTruthy(value: unknown): boolean {
    if (value === undefined || value === null) return false;
    if (value === false) return false;
    if (value === 0) return false;
    if (value === '') return false;
    if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'undefined' || lower === 'null' || lower === 'false' || lower === '0') {
            return false;
        }
    }
    return true;
}

/**
 * Evaluate an expression string and return the result.
 * Handles plain values, fm.* and file.* references, functions, and operators.
 *
 * Strategy: Try to parse as expression. If parsing fails, return as plain string.
 * This avoids needing to maintain a list of "expression-like" patterns.
 */
export function evaluateExpression(
    input: string,
    context: ExpressionContext
): { value: unknown; referencedKeys: { fmKeys: string[]; fileKeys: string[] } } {
    const fmKeys: string[] = [];
    const fileKeys: string[] = [];

    try {
        const tokens = tokenize(input);

        // Collect referenced keys from tokens
        for (const token of tokens) {
            if (token.type === 'FM_REF') {
                fmKeys.push(token.value as string);
            } else if (token.type === 'FILE_REF') {
                fileKeys.push(token.value as string);
            }
        }

        const parser = new Parser(tokens);
        const ast = parser.parse();
        const value = evaluate(ast, context);

        return { value, referencedKeys: { fmKeys, fileKeys } };
    } catch {
        return { value: input, referencedKeys: { fmKeys, fileKeys } };
    }
}

/**
 * Evaluate all argument values that may contain expressions.
 * Returns the evaluated args and collected fm/file keys for refresh tracking.
 */
export function evaluateArgs(
    args: Record<string, string>,
    context: ExpressionContext
): { args: Record<string, string>; fmKeys: string[]; fileKeys: string[] } {
    const result: Record<string, string> = {};
    const allFmKeys: string[] = [];
    const allFileKeys: string[] = [];

    for (const [key, value] of Object.entries(args)) {
        const { value: evaluated, referencedKeys } = evaluateExpression(value, context);

        if (evaluated === null || evaluated === undefined) {
            result[key] = 'undefined';
        } else if (typeof evaluated === 'object') {
            result[key] = JSON.stringify(evaluated);
        } else {
            result[key] = String(evaluated);
        }

        allFmKeys.push(...referencedKeys.fmKeys);
        allFileKeys.push(...referencedKeys.fileKeys);
    }

    return {
        args: result,
        fmKeys: [...new Set(allFmKeys)],
        fileKeys: [...new Set(allFileKeys)]
    };
}
