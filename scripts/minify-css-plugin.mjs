import { readFileSync } from 'fs';

/**
 * Minify CSS string by removing comments, extra whitespace, and newlines
 */
function minifyCSS(css) {
    return css
        // Remove CSS comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove newlines and collapse whitespace
        .replace(/\s+/g, ' ')
        // Remove space around special characters
        .replace(/\s*([{}:;,>+~])\s*/g, '$1')
        // Remove trailing semicolons before closing braces
        .replace(/;}/g, '}')
        // Remove leading/trailing whitespace
        .trim();
}

/**
 * esbuild plugin to minify CSS in template literals tagged with /*css*\/`
 */
export const minifyCSSPlugin = {
    name: 'minify-css-literals',
    setup(build) {
        // Only run in production mode
        const isProduction = build.initialOptions.minify;
        if (!isProduction) return;

        build.onLoad({ filter: /\.ts$/ }, async (args) => {
            let contents = readFileSync(args.path, 'utf8');

            // Match /*css*/` ... ` template literals
            const cssLiteralRegex = /\/\*\s*css\s*\*\/\s*`([\s\S]*?)`/g;

            contents = contents.replace(cssLiteralRegex, (match, cssContent) => {
                const minified = minifyCSS(cssContent);
                return `/*css*/\`${minified}\``;
            });

            return {
                contents,
                loader: 'ts',
            };
        });
    }
};
