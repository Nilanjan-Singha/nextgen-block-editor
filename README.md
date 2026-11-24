# nextgen-block-editor

A modular, block-based React + TypeScript rich text editor built on Editor.js with 20+ blocks including Bento grids, Image Carousels, Before/After comparison sliders, Lightbox galleries, Slide decks, Tabs, Accordions, Toggle headings, Pull-quotes, Timelines, Stats, Pros & Cons, Alerts, Badges, Tags, `@mention`, and more.

## Installation

```bash
npm install nextgen-block-editor
```

## Usage

```tsx
import { useState } from 'react';
import { BlockEditor, BlockRenderer, type EditorJSData } from 'nextgen-block-editor';
import 'nextgen-block-editor/styles.css';

export function MyEditorPage() {
  const [data, setData] = useState<EditorJSData>({ blocks: [] });

  return (
    <div>
      <BlockEditor
        initialData={data}
        onChange={setData}
        linkEndpoint="/api/fetchUrl"
        gifEndpoint="/api/gifs"
      />
      <BlockRenderer data={data} />
    </div>
  );
}
```
