# `nextgen-block-editor` — Modules, Architecture & Release Notes

This document is the technical reference for what is inside the `nextgen-block-editor` npm package, how its modules are organized, what was included (and intentionally deferred) in `v0.1.0`, and a changelog template for tracking future versions (`v0.1.1`, `v0.2.0`, etc.).

---

## 1. Package & Build Outputs (`package.json`)

- **Package Name**: `nextgen-block-editor`
- **Current Version**: `0.1.0`
- **Build Tool**: `tsup` + `scripts/copy-css.mjs`
- **Published Files (`"files": ["dist", "README.md"]`)**:
  - `dist/index.js` — ESM bundle
  - `dist/index.cjs` — CommonJS bundle
  - `dist/index.d.ts` / `dist/index.d.cts` — TypeScript declarations
  - `dist/styles.css` — Combined stylesheet (`katex.min.css` + `editor.css` + `blocks.css` + `shadcn.css`)
- **Tree-Shaking**: `"sideEffects": ["*.css"]` configured in `package.json`.

---

## 2. Source Module Map (`src/`)

| File | Responsibility |
| :--- | :--- |
| `src/index.ts` | Public API exports (`BlockEditor`, `BlockRenderer`, `DocumentHeader`, `getEditorTools`, `blocksToHtml`, `useInteractiveArticle`, types). |
| `src/types.ts` | TypeScript interfaces: `EditorJSBlock`, `EditorJSData`, `BlockEditorHandle`, `BlockEditorProps`, `BlockRendererProps`. |
| `src/components/BlockEditor.tsx` | React `forwardRef` wrapper around Editor.js with StrictMode-safe mount/destroy serialization, `DragDrop`, `Undo`/`Redo`, `enabledTools` filtering, and live `showStats` footer. |
| `src/components/BlockRenderer.tsx` | Lightweight read-only renderer using `blocksToHtml()` + `useInteractiveArticle()` (no Editor.js runtime required). |
| `src/components/DocumentHeader.tsx` | Standalone Notion-style page header component (`coverUrl`, `gradient`, `icon`, `title`, `subtitle`). |
| `src/editorTools.ts` | Registers all Editor.js block & inline tools in frequency order and supports `enabledTools` filtering. |
| `src/blocks/mediaBlocks.ts` | Rich media tools: `LightboxGalleryTool`, `CarouselTool`, `BentoTool`, `CompareTool`. |
| `src/blocks/richBlocks.ts` | Extended interactive & document blocks: `LatexTool`, `ExcalidrawTool` (Whiteboard), `FormBuilderTool`, `AudioPlayerTool`, `MusicCarouselTool`, `TaskChecklistTool`, `EisenhowerMatrixTool`, `PollTool`, `FaqTool`, `QuizTool`, `KanbanTool`, `FocusTimerTool`, `SmartCodeTool`, `TableOfContentsTool`, `ChartTool`, `FootnotesTool`, `PageCoverTool`, `FlashcardTool`. |
| `src/utils/blocksToHtml.ts` | Pure JSON-to-HTML serializer for every block type, plus `escHtml`, `sanitizeInlineHtml`, `slugify`, and `uploadFileToBucket`. |
| `src/utils/syntaxHighlight.ts` | Zero-dependency language auto-detector (`detectCodeLanguage`) and tokenizer (`highlightCodeHtml`). |
| `src/hooks/useInteractiveArticle.ts` | Attaches client-side interactivity inside `BlockRenderer` (carousels, lightboxes, comparison sliders, tabs, accordions, forms, audio players, to-do/Eisenhower checkboxes, polls, quizzes, timers, TOC, code copy, flashcards). |
| `src/styles/editor.css` | Base Editor.js & document layout styles. |
| `src/styles/blocks.css` | Custom block styles (Bento, Gallery, Carousel, LaTeX, Whiteboard, Alerts, etc.). |
| `src/styles/shadcn.css` | shadcn/ui Zinc light/dark tokens (`--ng-*`) and component styling for all blocks, popovers, and toolbars. |

---

## 3. What Was Done vs. Intentionally Deferred in `v0.1.0`

### Included in `v0.1.0`
- Single-install bundle of Editor.js core + 30+ custom blocks + `BlockRenderer`.
- shadcn/ui light/dark theme tokens (`--ng-*`) overridable by host apps.
- KaTeX math (`latex`), zero-dependency syntax highlighting (`code`), SVG charts (`chart`), Whiteboard (`excalidraw`), interactive Forms/Polls/Quizzes/Flashcards, Kanban, Focus Timer, Audio Player/Carousel, Page Cover, Table of Contents, and Footnotes.

### Intentionally Deferred (Good Candidates for `v0.2.0+`)
- **Subpath exports** (`nextgen-block-editor/renderer`, `nextgen-block-editor/editor`) with `tsup --splitting` so reader-only pages don't bundle Editor.js authoring classes.
- **Unit & component tests** (Vitest + React Testing Library) for `blocksToHtml`, `detectCodeLanguage`, and interactive hooks.
- **Additional blocks**: Calculated Table (spreadsheet formulas) or Poetry/Paywall blocks if needed.

---

## 4. Release & Changelog Log (Update This for Future Versions)

### `v0.1.0` — Initial Public Release
- Published initial package to npm (`npm publish --access public`).
- Core `BlockEditor`, `BlockRenderer`, `DocumentHeader`, and bundled `dist/styles.css`.

### `v0.1.1` — Pending Local Fixes (Ready to Publish)
- **Fix (`BlockEditor.tsx`)**: Removed `[initialData]` from the mount `useEffect` dependency array so passing state updated by `onChange` no longer destroys and remounts Editor.js on every keystroke.
- **New (`FlashcardTool`)**: Added interactive front/back study flashcards (`flashcards`).
- **New (`showStats`)**: Added live block count, word count, and reading time footer to `BlockEditor`.
- **Chore (`package.json`)**: Added `"sideEffects": ["*.css"]` for cleaner bundler tree-shaking.

*(To publish `v0.1.1`: run `npm version patch && npm publish` inside `d:\antigravity-projects\nextgen-editor`.)*

### `[Next Version]` — Template
- **Added**:
- **Changed**:
- **Fixed**:
