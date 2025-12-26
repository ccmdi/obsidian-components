declare const __DEV__: boolean;

/**
 * Debug logging utility - only logs in development builds
 * In production builds, __DEV__ is replaced with `false` by esbuild,
 * and the entire function body is tree-shaken away.
 *
 * @param color - Optional CSS color for the message (e.g., 'green', '#00ff00')
 */
export function debug(...args: unknown[]): void;
export function debug(color: string, ...args: unknown[]): void;
export function debug(...args: unknown[]): void {
    if (__DEV__) {
        // Check if first arg looks like a color (starts with # or is a color name)
        const first = args[0];
        if (typeof first === 'string' && (first.startsWith('#') || /^(green|red|blue|orange|yellow|cyan|magenta|gray|grey)$/i.test(first))) {
            const color = args[0] as string;
            console.debug(`%c[Components]`, `color: ${color}`, ...args.slice(1));
        } else {
            console.debug("[Components]", ...args);
        }
    }
}