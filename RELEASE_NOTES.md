# `nextgen-block-editor` v0.2.0 Release Notes

> **Package:** `nextgen-block-editor` (`0.1.0` → `0.2.0`)  
> **Commits:** `6c81c64` → `b60044b`  
> **Repository:** `Nilanjan-Singha/nextgen-block-editor`

---

## Overview

Version `0.2.0` transforms `nextgen-block-editor` into a full-featured, modular Editor.js + React block suite with **real third-party canvas/charting integrations** (`@excalidraw/excalidraw`, `chart.js`), **interactive mini-sidebar block inspectors** (Bento Grid & Spoiler), **inline slash/selection tools** (Telegram-style Spoilers & inline `/emoji` side picker), **AI slash commands** (`Continue Writing` & `Ask AI`), and **major UX/layout fixes** for the command center, headings, and settings persistence.

---

## 1. New Slash Commands & Blocks

| Command | Class / File | Category | What Was Built & How |
| :--- | :--- | :--- | :--- |
| `/h1`, `/h2`, `/h3`, `/paragraph` | `makeHeadingTool` in `src/editorTools.ts`, `src/utils/popoverCategories.ts`, `src/utils/blocksToHtml.ts` | **Text & Style** | Replaced the generic `Heading` tool with dedicated **Heading 1**, **Heading 2**, and **Heading 3** tools (`makeHeadingTool(level)`), renamed `Text` to **Paragraph** placed directly after headings, and kept legacy `header` block rendering backwards-compatible. |
| `/callout` | `CalloutTool` in `src/blocks/richBlocks.ts` | **Text & Style** | Added callout cards with customizable emoji icon, title, body text, and tone presets (`info`, `warning`, `danger`, etc.) rendered cleanly in both editor and `BlockRenderer`. |
| `/hotkey` | `HotkeyTool` in `src/blocks/richBlocks.ts` | **Text & Style** | Added a keyboard shortcut block supporting live key recording or manual shortcut entry, rendered as styled `<kbd>` chips. |
| `/emoji` (Inline Side Picker) | `openEmojiSideMenu` & `attachEmojiSidePicker` in `src/utils/emojiSidePicker.ts`, `EmojiTool` in `src/blocks/richBlocks.ts` | **Text & Style** | Typing `/emoji` anywhere in text (even mid-sentence) or selecting **Emoji** from the `/` menu opens a floating searchable side picker next to the cursor and inserts the chosen emoji inline so you can keep typing without occupying a whole-line block. |
| `/scratch` | `ScratchTool` in `src/blocks/richBlocks.ts` | **Text & Style** | Added a mini scratchpad block with an editable title, quick-dump textarea, live word/character counter (`w · c`), **Copy**, and **Clear** actions, plus `.editor-scratch-card` preview rendering. |
| `/upload` & `/delimiter` | `UploadTool` in `src/blocks/richBlocks.ts`, `DelimiterTool` in `src/editorTools.ts` | **Media / Text & Style** | Added drag-and-drop/file-upload cards with local preview/download metadata and clean horizontal content delimiters. |
| `/masonry` | `MasonryTool` in `src/blocks/mediaBlocks.ts`, `src/styles/blocks.css` | **Media** | Added a responsive CSS-column Masonry image grid supporting **2, 3, or 4 columns**, image URLs or uploads, optional captions, and live editor preview. |
| `/dialogue` | `DialogueTool` in `src/blocks/richBlocks.ts`, `src/hooks/useInteractiveArticle.ts` | **Interactive & Data** | Added a configurable modal dialog block with customizable trigger button label, dialog title, message body, and confirm button—opening an accessible modal overlay in both editor preview and `BlockRenderer`. |

---

## 2. Major Component Upgrades & Library Integrations

### Excalidraw Whiteboard (`/excalidraw`)
- **What changed:** Installed `@excalidraw/excalidraw` (`^0.18.1`), removed the legacy `/drawing` / `Whiteboard` canvas tool from the `/` menu, and upgraded `ExcalidrawTool` (`src/blocks/richBlocks.ts`) to mount the real `<Excalidraw />` React component via `createRoot`.
- **How it works:**
  - Persists `elements`, serializable `appState`, `files`, and debounced PNG snapshots (`exportToCanvas`) into `dataUrl` for `blocksToHtml` preview.
  - Added a **top-right full-screen toggle button** (`.excalidraw-fullscreen-btn`) in the editor (supporting `Esc` to exit) and a **top-right full-screen lightbox button** (`.editor-excalidraw-preview-fs`) in `BlockRenderer` via `useInteractiveArticle.ts`.
  - Bundled `@excalidraw/excalidraw/dist/prod/index.css` into `dist/styles.css` via `scripts/copy-css.mjs`.

### Chart.js Data Charts (`/chart`)
- **What changed:** Installed `chart.js` and replaced the static hand-coded SVG renderer with live interactive Chart.js canvases in both `ChartTool` (`src/blocks/richBlocks.ts`) and `BlockRenderer` (`src/hooks/useInteractiveArticle.ts`).
- **Supported chart types:** **Bar**, **Line**, **Area** (`line` with fill), **Pie**, **Doughnut**, **Radar**, and **Polar Area**—all driven by a shared `buildChartJsConfig()` helper.

### Bento Grid + Mini Sidebar (`/bento`)
- **What changed:** Upgraded `BentoTool` (`src/blocks/mediaBlocks.ts`) from raw form rows into a live visual Bento Grid canvas paired with a toggleable **Mini Sidebar**.
- **How it works:**
  - Supports **Hero Left**, **Hero Top**, **3-Col (Equal)**, **2×2**, and **Spotlight** layout presets.
  - Clicking any Bento card highlights it and loads its inspector in the mini sidebar: switch card type (**Image**, **Text**, **Stat**), set an optional **Badge**, pick an **Accent** color (`default`, `indigo`, `emerald`, `amber`, `rose`), reorder/remove cards, or upload images.

### Telegram-Style Spoilers (Inline + `/spoiler` + Mini Sidebar)
- **What changed:** Replaced the old `<details>` accordion spoiler with Telegram-style blurred spoilers for both **inline text** and **block-level text/images**.
- **How it works:**
  - **Inline (`SpoilerInline`):** Added `spoilerInline` to the selection toolbar in `src/editorTools.ts` wrapping text in `<span class="editor-inline-spoiler">` and updated `sanitizeInlineHtml` in `src/utils/blocksToHtml.ts` to preserve it.
  - **Slash `/spoiler` (`SpoilerTool`):** Features a live blurred preview canvas with a toggleable **Mini Sidebar** to switch between **Text** and **Image** spoilers, set warning labels, and test **Reveal / Hide Blur**.
  - **Preview interactivity:** `useInteractiveArticle.ts` toggles `.is-revealed` on click for both `.editor-inline-spoiler` and `[data-spoiler]` cards.

---

## 3. AI Commands, Settings Modal & Categorized Slash Menu

- **Categorized `/` Command Center (`src/utils/popoverCategories.ts`):** Groups tools cleanly under **Text & Style**, **Layout**, **Media**, **Interactive & Data**, **AI**, and **Settings** via `MutationObserver` (`attachPopoverCategoryHeaders`).
- **AI in the Slash Menu (`ContinueWritingTool` & `AskAiTool`):**
  - Moved **Continue Writing** and **Ask AI** out of the top editor bar (`showAiBar` defaults to `false` in `BlockEditor.tsx`) and into the **AI** section of the `/` menu.
  - Built via a shared `createActionTriggerTool()` factory in `src/blocks/richBlocks.ts` using Editor.js's `rendered()` lifecycle hook to dispatch `nextgen-ai-continue` / `nextgen-ai-ask` and remove the temporary trigger block.
- **Settings Modal (`SettingsModal.tsx` & `/settings`):** Supports theme presets, Simple vs. Block mode switching, stats toggle, and AI provider configuration (OpenAI, Codex, OpenRouter, OpenCode, Anthropic, Gemini, Custom).

---

## 4. Bug Fixes & Polish

1. **Settings Panel Auto-Reopening Fixed (`BlockEditor.tsx`, `richBlocks.ts`):**
   - Triggered action tools in `rendered()` and filtered transient action blocks (`settings`, `continueWriting`, `askAi`) out of `initialData`, `onChange`, and `save()` so switching between `BlockEditor` and `BlockRenderer` (or refreshing the page) never re-opens Settings.
2. **Command Center & Toolbar Alignment Fixed (`src/styles/shadcn.css`):**
   - Overrode Editor.js's runtime-injected `max-width: 650px; margin: 0 auto` on `.ce-block__content` and `.ce-toolbar__content` with `.nextgen-editor-shell` specificity, anchoring `+`, drag handles, and `.ce-popover` directly beside the active block.
3. **Inline Formatting & Marker Highlight Fixed (`src/editorTools.ts`, `src/utils/blocksToHtml.ts`):**
   - Preserved `<mark>`, `<b>`, `<i>`, `<u>`, `<s>` tags across editor save and `BlockRenderer` preview.
4. **TypeScript Build Fixes:**
   - Resolved `TS2509` in `makeHeadingTool` (`object` constructor return type) and `TS4094` in `createActionTriggerTool`.

---

## 5. Verification & Demo Integration

- **`nextgen-block-editor` (`d:\antigravity-projects\nextgen-editor`):** `npm run typecheck` (`tsc --noEmit`) and `npm run build` (`tsup` ESM/CJS/DTS + `copy-css.mjs`) pass with exit code `0`; tagged `v0.2.0` and pushed to `origin/main` (npm publish requires 2FA OTP in terminal).
- **`editor-demo` (`d:\antigravity-projects\editor-demo`):** Linked to local `v0.2.0` (`file:../nextgen-editor`), updated `SHOWCASE_DATA` in `src/App.tsx` with `bento`, `chart`, `spoiler`, and `dialogue` examples, and verified `npm run build` (`tsc -b && vite build`) passes cleanly.
