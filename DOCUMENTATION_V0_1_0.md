# `nextgen-block-editor` v0.1.0 Documentation

`nextgen-block-editor` is a modular, block-based React and TypeScript rich-text editor and renderer built on top of Editor.js, styled with shadcn/ui Zinc design tokens, and packaged for npm with ESM, CJS, TypeScript declarations, and a single bundled stylesheet.

---

## Why `nextgen-block-editor` Exists (The Backstory)

`nextgen-block-editor` started while building a personal portfolio and blog. The goal was simple: write posts in a clean, Notion-style block editor rather than a cluttered, MS Word–style toolbar.

Looking at the existing React ecosystem revealed two common friction points:
- Many rich-text editors either feel like traditional word processors or lock advanced block experiences behind paid tiers.
- Open block frameworks like **Editor.js** have a great underlying architecture and an active plugin ecosystem, but using them in a real project usually means installing, configuring, styling, and maintaining **dozens of separate npm packages**—plus writing your own HTML renderer from scratch.

The idea behind `nextgen-block-editor` was to fix that with a **single install**:

```bash
npm install nextgen-block-editor
```

One package gives you a complete, pre-configured block editor, a matching interactive renderer, TypeScript types, and a unified stylesheet—while still letting you pick and choose which tools appear via `enabledTools`.

### Design Philosophy: Mixing Typography & UI Design

What began as a pure text-writing tool evolved into a broader principle: **the text you write should have visual flair.** Instead of treating articles as plain walls of paragraphs, `nextgen-block-editor` blends clean editorial typography with interactive UI components—so equations, charts, quizzes, flashcards, audio players, forms, Kanban boards, and Notion-style covers live naturally inside the document flow.

---

## 1. Installation

```bash
npm install nextgen-block-editor
```

Peer dependencies: `react >= 18.0.0`, `react-dom >= 18.0.0`.

Import the bundled stylesheet once in your app entry or editor/reader page:

```tsx
import 'nextgen-block-editor/styles.css';
```

This single CSS file bundles KaTeX math styles, core Editor.js layout, custom block styles, and shadcn/ui light/dark theme tokens.

---

## 2. Architecture Overview

`nextgen-block-editor` separates **authoring** from **rendering** so public reader pages never have to boot Editor.js:

| Export | Purpose |
| :--- | :--- |
| `BlockEditor` | React `forwardRef` wrapper around Editor.js with StrictMode-safe lifecycle management, drag-and-drop, undo/redo, `/` command menu, and optional live word/block stats. |
| `BlockRenderer` | Lightweight read-only renderer that converts saved `EditorJSData` JSON into HTML via `blocksToHtml()` and attaches interactive listeners via `useInteractiveArticle()`. |
| `DocumentHeader` | Standalone banner component (`coverUrl` or `gradient`, `icon`, `title`, `subtitle`) for mounting Notion-style page headers above an editor or article. |
| `blocksToHtml` | Pure function converting `EditorJSData` JSON into HTML (also usable on the server or in helpers). |
| `useInteractiveArticle` | React hook that activates sliders, lightboxes, tabs, accordions, forms, polls, quizzes, timers, flashcards, audio players, code copy buttons, and table-of-contents links. |
| `getEditorTools` | Returns the registered Editor.js tool map (supports filtering via `enabledTools`). |

---

## 3. Quick Start

### Authoring (`BlockEditor`)

```tsx
import { useRef, useState } from 'react';
import {
  BlockEditor,
  type BlockEditorHandle,
  type EditorJSData,
} from 'nextgen-block-editor';
import 'nextgen-block-editor/styles.css';

export function EditorView() {
  const editorRef = useRef<BlockEditorHandle>(null);
  const [initialDoc] = useState<EditorJSData>({
    blocks: [{ type: 'paragraph', data: { text: '' } }],
  });

  const handleSave = async () => {
    const data = await editorRef.current?.save();
    console.log(data);
  };

  return (
    <div>
      <button onClick={() => editorRef.current?.undo()}>Undo</button>
      <button onClick={() => editorRef.current?.redo()}>Redo</button>
      <button onClick={() => void handleSave()}>Save</button>

      <BlockEditor
        ref={editorRef}
        initialData={initialDoc}
        placeholder="Press / to insert blocks..."
        onChange={(data) => console.log('Updated:', data)}
      />
    </div>
  );
}
```

### Rendering (`BlockRenderer`)

```tsx
import { BlockRenderer, type EditorJSData } from 'nextgen-block-editor';
import 'nextgen-block-editor/styles.css';

export function ArticleView({ data }: { data: EditorJSData }) {
  return <BlockRenderer data={data} />;
}
```

---

## 4. Component Props & Ref API

### `BlockEditorProps`
- `initialData?: EditorJSData` — Initial JSON blocks loaded when the editor mounts. Keep this reference stable while typing (or pass a `key` only when intentionally resetting the document).
- `placeholder?: string` — Placeholder text for empty paragraphs.
- `enabledTools?: string[]` — Optional allowlist of tool keys (e.g., `['header', 'list', 'image', 'code', 'latex']`) to customize which blocks appear in the `/` menu.
- `showStats?: boolean` — Displays the live block count, word count, and estimated reading time footer bar (default: `true`).
- `className?: string` — Optional class added alongside `.nextgen-editor-shell`.
- `onReady?: () => void` — Fires once Editor.js finishes initializing.
- `onChange?: (data: EditorJSData) => void` — Fires on document edits with the latest saved `EditorJSData`.

### `BlockEditorHandle` (via `ref`)
- `save(): Promise<EditorJSData | null>` — Saves and returns the current JSON document.
- `undo(): void` — Steps backward in the undo stack.
- `redo(): void` — Steps forward in the redo stack.

### `BlockRendererProps`
- `data: EditorJSData | null | undefined` — Saved Editor.js JSON payload.
- `className?: string` — Optional class added alongside `.article.nextgen-editor-article`.

---

## 5. Available Blocks (Slash `/` Menu)

### Core & Structural
- `cover` — Page Cover & Header (preset gradients or image URL, icon badge, title, subtitle)
- `header` — Headings (`H1`–`H3`)
- `toc` — Auto-generated Table of Contents (`H2`–`H4` smooth-scroll links)
- `list` / `nestedlist` — Bulleted, numbered, and nested lists
- `checklist` — Simple inline checklist
- `quote` / `pullquote` — Standard and editorial pull quotes
- `delimiter` — Section divider
- `table` — Data table with optional heading row
- `alert` — Callout banners (`info`, `tip`, `warning`, `danger`)

### Code, Math & Data
- `code` — Smart Code Block with automatic language detection (TypeScript, JavaScript, Python, Rust, Go, SQL, HTML, CSS, JSON, Bash), live syntax highlighting, manual language override, and Copy button
- `latex` — KaTeX math equations with live preview and Block/Inline toggle
- `chart` — Zero-dependency SVG Bar, Line, and Pie charts
- `footnotes` — Numbered citations and references card

### Interactive, Productivity & Learning
- `form` — Form Builder with `text`, `email`, `textarea`, `select`, `checkbox`, and `number` fields; emits `nextgen-form-submit` `CustomEvent` (or POSTs JSON to an optional `actionUrl`)
- `poll` — Live voting poll with animated percentage bars; emits `nextgen-poll-vote` `CustomEvent`
- `quiz` — Multiple-choice quiz with instant green/red grading, score counter, explanations, and Reset button
- `flashcards` — Interactive front/back study deck with Flip, Prev, and Next controls
- `todo` — Task checklist card with priority tags (`low`, `medium`, `high`) and live completion badge
- `eisenhower` — 2×2 Priority Matrix (*Do First*, *Schedule*, *Delegate*, *Eliminate*)
- `kanban` — Multi-column Kanban board with movable task cards
- `timer` — Focus / Pomodoro countdown timer with Start/Pause, Reset, and progress bar
- `faq` — Mutually exclusive FAQ accordion
- `tabs` / `accordion` / `toggleh1` / `toggleh2` / `toggleh3` / `spoiler` / `collapsible`

### Media & Layout
- `image` / `simpleImage` / `gif` — Images and GIFs
- `gallery` — Lightbox image gallery
- `carousel` — Horizontal image carousel with dots and prev/next buttons
- `bento` — Bento grid (`hero-left`, `hero-top`, `equal`)
- `compare` — Before/After image comparison slider
- `audio` / `musicCarousel` — Embedded audio player cards with play/pause and seek bar
- `excalidraw` — Whiteboard canvas (Pen, Rect, Circle, Arrow, color swatches, Undo/Clear)
- `drawing` / `embed` / `linkTool` / `attaches` / `slides` / `cards` / `badges` / `tags` / `button` / `proscons` / `stats` / `timeline` / `layout`

### Inline Toolbar Tools
- `inlineCode`, `marker`, `underline`, `strikethrough`, `hyperlink`, `mention`

---

## 6. Theming & Customization

`nextgen-block-editor` ships with shadcn/ui Zinc tokens for light mode and dark mode (activated via `.dark` or `[data-theme="dark"]` on `<html>` or a parent container).

You can override any `--ng-*` CSS variable in your app stylesheet to match your own design system (e.g., Catppuccin, brand colors, or custom border radii):

```css
.nextgen-editor-shell,
.nextgen-editor-article {
  --ng-background: var(--bg);
  --ng-foreground: var(--ink);
  --ng-card: var(--surface);
  --ng-popover: var(--surface);
  --ng-primary: var(--accent);
  --ng-muted: var(--tint);
  --ng-border: var(--line);
}
```
