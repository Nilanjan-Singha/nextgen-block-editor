# How Bundling, `npm install`, and Tree-Shaking Work in `nextgen-block-editor`

When you build a reusable npm library like `nextgen-block-editor`, there are **two very different stages**:

1. **Installing the package (`npm install nextgen-block-editor`)** — what gets downloaded onto the developer's machine.
2. **Bundling the website (`vite build` / `next build`)** — what actually gets sent to the end user's browser.

---

## 1. What happens during `npm install`?

When someone runs:

```bash
npm install nextgen-block-editor
```

npm downloads the published tarball from the npm registry into `node_modules/nextgen-block-editor/` along with the packages listed in `dependencies` (like `@editorjs/editorjs`, `katex`, etc.).

In `package.json`, the `"files"` field controls what gets packed into that tarball:

```json
"files": [
  "dist",
  "README.md"
]
```

So consumers do **not** download your raw TypeScript source (`src/`) or dev config — only the compiled `dist/` folder:

- `dist/index.js` — **ESM** (ES Modules) build for modern bundlers (Vite, Next.js, Rollup, esbuild)
- `dist/index.cjs` — **CJS** (CommonJS) build for older Node/Webpack setups
- `dist/index.d.ts` / `dist/index.d.cts` — TypeScript type definitions
- `dist/styles.css` — Combined KaTeX, Editor.js, block, and shadcn/ui styles

---

## 2. What is Tree-Shaking, and how does it work?

**Tree-shaking** is a bundler optimization (used by Vite, Rollup, Webpack, and esbuild) that removes unused JavaScript exports from the final website bundle.

Think of your library as a tree:
- Only the branches the website **actually imports** stay on the tree.
- Unused exports get shaken off before the code is sent to the browser.

For tree-shaking to work reliably, two things are required:

1. **ES Modules (`import` / `export`)**: Static `import { BlockRenderer } from 'nextgen-block-editor'` lets bundlers trace exactly what is used. (`tsup` outputs this in `dist/index.js`.)
2. **`"sideEffects"` in `package.json`**:
   ```json
   "sideEffects": ["*.css"]
   ```
   This tells bundlers: *"Importing JS files from this package has no hidden global side effects — if an export isn't used, you can safely drop it. Only `.css` files have side effects (they apply styles)."*

---

## 3. What gets bundled in a consuming website right now?

### Scenario A: Using `BlockEditor` (Authoring / Admin / CMS)
When a page imports `BlockEditor`:
- It loads `@editorjs/editorjs` and `getEditorTools()`, which currently registers all block classes (Bento, Carousel, LaTeX, Whiteboard, Form Builder, Audio Player, Music Carousel, etc.) into the Editor.js toolbox.
- **Customizing the menu**: You can pass `enabledTools={['header', 'list', 'image', 'latex', 'form']}` to `BlockEditor` to control which tools appear in the `/` menu.
- **Note on bundle size**: Because `getEditorTools()` statically imports every block class in one object, `BlockEditor` includes all tool definitions in the editor bundle (~114 KB ESM before gzip, plus Editor.js & KaTeX). That's normal for an admin/CMS page, and you can lazy-load `BlockEditor` with `React.lazy()` so visitors reading articles never download the editor at all.

### Scenario B: Using `BlockRenderer` (Public Reader / Blog Page)
`BlockRenderer` does **not** import `@editorjs/editorjs` or any Editor.js authoring classes (`FormBuilderTool`, `ExcalidrawTool`, etc.). It only uses:
- `blocksToHtml()` (converts JSON blocks to HTML, using `katex` for math)
- `useInteractiveArticle()` (attaches click/submit/play listeners for carousels, tabs, accordions, forms, and audio player cards)

---

## 4. How to make the library even smaller as you add more blocks

If `nextgen-block-editor` grows to 40+ heavy blocks, here are the standard npm library patterns to keep consumer bundles tiny:

1. **Subpath Exports (`package.json` `"exports"`)**:
   Split the library into separate entry points:
   - `nextgen-block-editor/editor` (only `BlockEditor`)
   - `nextgen-block-editor/renderer` (only `BlockRenderer`, zero Editor.js dependency)
   - `nextgen-block-editor/blocks/excalidraw` (opt-in heavy blocks)
2. **Code Splitting in `tsup` (`--splitting`)**:
   Allows shared helpers (like `escHtml` or `katex`) to live in a shared chunk instead of being duplicated across entry points.
3. **Dynamic Imports (`import(...)`) inside heavy tools**:
   Load large third-party libraries (e.g., full `@excalidraw/excalidraw` or `mermaid`) only when the user actually inserts that block.
4. **Peer Dependencies**:
   Keep `react` and `react-dom` in `"peerDependencies"` (already configured!) so the library reuses the host app's React instead of bundling a second copy.
