// Standalone script to generate components.register.ts
// Used by prebuild to ensure the file exists before tsc runs

import { autoRegisterComponents } from './auto-register-plugin.mjs';

// Mock the esbuild build object and trigger onStart
const callbacks = [];
autoRegisterComponents.setup({
    onStart: (cb) => callbacks.push(cb)
});
callbacks.forEach(cb => cb());
