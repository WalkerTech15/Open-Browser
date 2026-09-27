# Renderer

The toolbar UI. Runs as a sandboxed, no-Node Chromium renderer process (see
`docs/SECURITY.md`) — it can only talk to the rest of the app through
`window.openBrowser`, the API `src/main/security/preload.ts` exposes.

- `layout/index.html` — the page shell and toolbar markup.
- `styles/styles.css` — styling.
- `components/toolbar.ts` — wires the toolbar DOM to `window.openBrowser`
  and renders incoming `NavigationState` updates. Currently the only
  component; the folder exists so more can be added without reorganizing.
- `state/global.d.ts` — ambient typing for `window.openBrowser`.

**Important constraint:** `index.html` loads `components/toolbar.ts`'s
compiled output as a plain classic `<script>`, not a module — there is no
bundler and no module loader in this sandboxed context. Renderer `.ts` files
must not use `import`/`export` for runtime values (type-only imports, like
in `global.d.ts`, are fine — they're erased at compile time and never
produce a `require()` call). If the UI grows past one file, either add
`type="module"` script tags with real relative `import` paths (native
browser ES modules, no bundler needed), or keep splitting via ambient
globals like today.
