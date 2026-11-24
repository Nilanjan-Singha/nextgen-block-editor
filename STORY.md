# The Story Behind `nextgen-block-editor`

## How It Started: Building a Personal Blog

`nextgen-block-editor` didn't start as an npm library—it started while building a personal portfolio and blog (`portfolio-react`).

When it came time to build the writing experience for the portfolio's CMS, the goal was a clean, Notion-style block editor where every paragraph, heading, image, and media element felt modular and distraction-free.

Looking at the existing React ecosystem revealed a gap:
- Classic rich-text editors felt like **Microsoft Word**—heavy top toolbars, rigid HTML blobs, and little structural flexibility.
- Modern frameworks like **TipTap** offered great primitives, but many Notion-like blocks and collaborative features lived behind paid tiers or required extensive custom wiring.
- **Editor.js** stood out because of its clean JSON block architecture (`{ blocks: [...] }`) and open plugin ecosystem—the exact kind of block-first mental model behind Notion.

---

## The Problem with Fragmented Packages

Diving into the Editor.js ecosystem and its community repositories solved the core editing problem, but introduced a new developer-experience headache: **package sprawl**.

To build a complete modern editor, a developer had to:
1. Install `@editorjs/editorjs` plus 10–15 separate `@editorjs/*` and community packages (`header`, `list`, `quote`, `table`, `code`, `underline`, `drag-drop`, `undo`, etc.).
2. Write custom React wrappers to handle **React 19 StrictMode** double-mounting without crashing Editor.js.
3. Build custom block plugins for rich layouts (Bento grids, carousels, galleries, comparison sliders, callouts).
4. Write a separate HTML/React renderer (`blocksToHtml`) and interactive event hooks so saved JSON blocks actually work on public blog pages.

The core question became obvious:
> **Why force developers to install and wire up 20 fragmented packages when a single `npm install nextgen-block-editor` can give them everything pre-configured, typed, and ready to customize?**

---

## Design Philosophy: Mixing Typography, UI Design & Writing

The initial design principle was **pure, distraction-free text editing**. Over time, that principle evolved:

- **Writing deserves visual flair**: Documents shouldn't just be static walls of text. Equations (`LaTeX`), charts, interactive quizzes, flashcards, forms, Kanban boards, focus timers, audio players, and Notion-style page covers belong right inside the document flow.
- **UI design meets editorial typography**: By styling the entire editor and renderer with **shadcn/ui** Zinc design tokens (with automatic light/dark mode and CSS-variable theming), every block looks like a cohesive product UI rather than mismatched third-party widgets.
- **One install, configurable out of the box**: Everything ships in one package, while props like `enabledTools` and `showStats` let consumers pare it down or extend it for any project.

---

## Milestones

- **Phase 1**: Built the custom Editor.js workspace inside `portfolio-react` with 20+ blocks and a dual `BlockRenderer`.
- **Phase 2**: Extracted the editor into a standalone npm library (`nextgen-block-editor`), bundled with `tsup` (ESM, CJS, `.d.ts`, and `dist/styles.css`).
- **Phase 3**: Styled the entire system with shadcn/ui tokens and expanded the block suite with LaTeX, Whiteboard, Forms, Audio Player, Music Carousel, To-Do, Eisenhower Matrix, Poll, FAQ, Quiz, Kanban, Focus Timer, Smart Code, TOC, Charts, Footnotes, Page Cover, and Flashcards.
- **Phase 4**: Published `nextgen-block-editor@0.1.0` to npm and integrated it into both `portfolio-react` and the interactive `editor-demo` playground.
