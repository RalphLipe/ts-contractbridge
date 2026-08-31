// Side-effect CSS imports (theme.css) need a module declaration for TS to resolve them — this
// package deliberately doesn't depend on any particular bundler (unlike pbn-viewer, which uses
// Vite's own ambient types), since it's meant to be consumable by any bundler-based app.
declare module '*.css'
