import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base only matters for `vite build` (asset URLs baked into the built HTML/JS need to match
// wherever the static output actually gets served from — bigdealbridge.com/pbnviewer/, not the
// domain root). Left at "/" for `vite dev` so the local dev server keeps working exactly as
// before (http://localhost:5173/), matching .claude/launch.json's existing config.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/pbnviewer/' : '/',
}))
