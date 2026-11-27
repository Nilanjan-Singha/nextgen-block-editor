# Changelog — `nextgen-block-editor` v0.4.0

## Summary of Changes

Version **0.4.0** expands `nextgen-block-editor` with diagramming, technical/editorial blocks, inline AI rewriting, Markdown import/export, embed & Mermaid sizing/alignment controls, and developer-controlled command gating, while streamlining themes to clean black & white Light/Dark presets.

---

## 1. Added Features & Slash Commands

- **`/mermaid` (`src/blocks/mermaidBlock.ts`)**
  - Built using the `mermaid` package with Flowchart, Sequence, and Mindmap quick presets, live SVG preview, caption support, and `useInteractiveArticle` hydration in `BlockRenderer`.
  - Includes Block Tunes (`renderSettings()`) for **Align Left / Center / Right** and **Small / Medium / Large / Full Page** sizing (defaults to compact `small`).
- **`/bookmark` (`src/blocks/extraBlocks.ts`)**
  - Rich URL bookmark preview card with title, description, hostname, and optional thumbnail.
- **`/steps` (`src/blocks/extraBlocks.ts`)**
  - Numbered step-by-step tutorial walkthrough builder and styled `<ol>` renderer.
- **`/diff` (`src/blocks/extraBlocks.ts`)**
  - Side-by-side Before/After code inputs with a computed line-by-line unified diff preview.
- **`/video` (`src/blocks/extraBlocks.ts`)**
  - HTML5 `<video controls>` block with URL input, file upload (`uploadFileToBucket`), optional poster image, and caption.
- **`/changelog` (`src/blocks/extraBlocks.ts`)**
  - Release notes block with version, date, and `ADDED` / `CHANGED` / `FIXED` entries.
- **`/social` (`src/blocks/extraBlocks.ts`)**
  - Social post quote card with author, `@handle`, date, post text, and optional source link.
- **`/today` (`src/blocks/inlineExtensions.ts`)**
  - Quick date-stamp pill with Long / ISO format toggle.
- **`/export` (`src/components/ExportModal.tsx`, `src/utils/markdown.ts`)**
  - Exports document blocks to **Markdown (`.md`)**, **HTML (`.html`)**, or **Print/PDF**, and imports pasted Markdown back into Editor.js blocks via `markdownToBlocks()`.
  - Exports `blocksToMarkdown` and `markdownToBlocks` from the package root (`src/index.ts`).

---

## 2. Inline Toolbar & AI Extensions

- **Inline AI Rewrite (`AiRewriteInline` in `src/blocks/inlineExtensions.ts`)**: Select text to **Improve**, **Shorten**, **Fix Grammar**, **Professional**, or **Translate (ES)** in-place using `generateAiText` (`src/utils/aiClient.ts`).
- **Multi-Color Text & Highlight Swatches (`ColorInline` + `ClassicToolbar.tsx`)**: Added inline text and background highlight color pickers and preserved `.ng-inline-color` styles in `sanitizeInlineHtml()`.
- **Smart `@mention` Popover (`MentionInline` in `src/editorTools.ts`)**: Replaced `window.prompt` with an inline popover inside the toolbar.
- **Inline Tool Preservation (`getEditorTools` in `src/editorTools.ts`)**: Ensured inline tools (`marker`, `inlineCode`, `textColor`, `aiRewrite`, `spoilerInline`, `underline`, `strikethrough`, `hyperlink`, `mention`) remain enabled even when `enabledTools` filters block tools.

---

## 3. Formatting, Layout & Developer Controls

- **Black & White Themes Only (`SettingsModal.tsx`, `shadcn.css`)**: Removed multi-color Catppuccin presets, leaving **Inherit**, **Light (White)**, and **Dark (Black)**.
- **Embed Alignment & Sizing (`CustomEmbedTool` in `src/editorTools.ts`)**: Added **Align Left / Center / Right** and **Small / Medium / Large / Full Page** options in the block's **More options** (`renderSettings()`) menu.
- **Spotify Music Carousel Support (`renderAudioCard` in `src/utils/blocksToHtml.ts`)**: Automatically embeds `open.spotify.com` URLs as Spotify iframe players and hides the horizontal scrollbar on `.editor-music-carousel-track`.
- **Slash Menu Cleanup (`shadcn.css`)**: Removed the horizontal scrollbar and separator line below the slash command popover.
- **Document Width Presets, Reading Progress & `Ctrl/Cmd+D`**: Added `Narrow` / `Standard` / `Full-Width` presets, top scroll reading-progress bar in `BlockRenderer`, and `Ctrl/Cmd+D` block duplication.
- **Developer Command Access Gating (`types.ts`, `BlockEditor.tsx`, `SettingsModal.tsx`)**: Added `allowToolConfiguration` and `accessNoticeText` props so developers can restrict available commands via `enabledTools`, hide ungranted commands in Settings, and display a developer-managed access notice bar.
