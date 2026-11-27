export interface ToolCategoryGroup {
  label: string;
  tools: string[];
}

export const TOOL_CATEGORIES: ToolCategoryGroup[] = [
  {
    label: 'AI',
    tools: ['continueWriting', 'askAi'],
  },
  {
    label: 'Text & Style',
    tools: [
      'h1',
      'h2',
      'h3',
      'paragraph',
      'list',
      'nestedlist',
      'quote',
      'pullquote',
      'delimiter',
      'callout',
      'hotkey',
      'emoji',
      'today',
      'scratch',
      'alert',
      'badges',
      'tags',
    ],
  },
  {
    label: 'Layout',
    tools: [
      'cover',
      'toc',
      'bento',
      'layout',
      'tabs',
      'accordion',
      'toggleh1',
      'toggleh2',
      'toggleh3',
      'collapsible',
      'spoiler',
      'cards',
      'timeline',
      'proscons',
    ],
  },
  {
    label: 'Media',
    tools: [
      'upload',
      'image',
      'simpleImage',
      'gif',
      'gallery',
      'masonry',
      'carousel',
      'compare',
      'audio',
      'musicCarousel',
      'embed',
      'bookmark',
      'video',
      'attaches',
      'excalidraw',
    ],
  },
  {
    label: 'Interactive & Data',
    tools: [
      'code',
      'latex',
      'mermaid',
      'diff',
      'steps',
      'changelog',
      'social',
      'chart',
      'table',
      'stats',
      'form',
      'poll',
      'quiz',
      'flashcards',
      'todo',
      'eisenhower',
      'kanban',
      'timer',
      'faq',
      'footnotes',
      'button',
      'dialogue',
      'slides',
    ],
  },
  {
    label: 'Settings',
    tools: ['settings'],
  },
];

export const SIMPLE_MODE_TOOLS = [
  'h1',
  'h2',
  'h3',
  'paragraph',
  'list',
  'quote',
  'code',
  'image',
  'delimiter',
  'continueWriting',
  'askAi',
  'settings',
];

export const ALL_TOOL_NAMES: string[] = Array.from(
  new Set(TOOL_CATEGORIES.flatMap((g) => g.tools))
);

export const TOOL_LABELS: Record<string, string> = {
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  paragraph: 'Paragraph',
  list: 'List (Ordered / Unordered / Checklist)',
  nestedlist: 'Nested List',
  quote: 'Quote',
  pullquote: 'Pull Quote',
  delimiter: 'Delimiter',
  callout: 'Callout',
  hotkey: 'Hotkey',
  emoji: 'Emoji',
  scratch: 'Scratchpad',
  alert: 'Alert',
  badges: 'Badges',
  tags: 'Tags',
  cover: 'Page Cover',
  toc: 'Table of Contents',
  bento: 'Bento Grid',
  layout: 'Multi-Column Layout',
  tabs: 'Tabs',
  accordion: 'Accordion',
  toggleh1: 'Toggle H1',
  toggleh2: 'Toggle H2',
  toggleh3: 'Toggle H3',
  collapsible: 'Collapsible',
  spoiler: 'Spoiler',
  cards: 'Cards',
  timeline: 'Timeline',
  proscons: 'Pros & Cons',
  upload: 'Upload',
  image: 'Image',
  simpleImage: 'Simple Image',
  gif: 'GIF',
  gallery: 'Lightbox Gallery',
  masonry: 'Masonry Grid',
  carousel: 'Carousel',
  compare: 'Before / After',
  audio: 'Audio Player',
  musicCarousel: 'Music Carousel',
  embed: 'Embed',
  attaches: 'Attachment',
  excalidraw: 'Excalidraw',
  code: 'Code Block',
  latex: 'LaTeX Math',
  mermaid: 'Mermaid Diagram',
  bookmark: 'Bookmark Card',
  steps: 'Steps Walkthrough',
  diff: 'Code Diff',
  video: 'Video Player',
  changelog: 'Changelog',
  social: 'Social Quote',
  today: 'Today Date',
  chart: 'Data Chart',
  table: 'Table',
  stats: 'Stats',
  form: 'Form Builder',
  poll: 'Poll',
  quiz: 'Quiz',
  flashcards: 'Flashcards',
  todo: 'To-Do List',
  eisenhower: 'Eisenhower Matrix',
  kanban: 'Kanban Board',
  timer: 'Focus Timer',
  faq: 'FAQ',
  footnotes: 'Footnotes',
  button: 'Button',
  dialogue: 'Dialogue Box',
  slides: 'Slides',
  continueWriting: 'Continue Writing',
  askAi: 'Ask AI',
  settings: 'Settings',
};

export function attachPopoverCategoryHeaders(container: HTMLElement): () => void {
  const applyCategories = () => {
    const popovers = container.querySelectorAll<HTMLElement>('.ce-popover__items');
    popovers.forEach((itemsEl) => {
      const popoverRoot = itemsEl.closest('.ce-popover');
      const searchInput = popoverRoot?.querySelector<HTMLInputElement>(
        '.ce-popover__search input'
      );
      const isSearching = Boolean(searchInput && searchInput.value.trim().length > 0);

      // Remove old category labels before re-evaluating
      itemsEl.querySelectorAll('.ng-popover-group-label').forEach((el) => el.remove());
      if (isSearching) return;

      const itemEls = Array.from(
        itemsEl.querySelectorAll<HTMLElement>(':scope > .ce-popover-item')
      );
      if (itemEls.length < 3) return;

      const byName = new Map<string, HTMLElement[]>();
      const uncategorized: HTMLElement[] = [];

      itemEls.forEach((el) => {
        const name = el.dataset.itemName || '';
        if (name === 'paragraph') {
          const titleEl = el.querySelector<HTMLElement>('.ce-popover-item__title');
          if (titleEl && titleEl.textContent?.trim() === 'Text') {
            titleEl.textContent = 'Paragraph';
          }
        }
        if (name) {
          const arr = byName.get(name) || [];
          arr.push(el);
          byName.set(name, arr);
        } else {
          uncategorized.push(el);
        }
      });

      const frag = document.createDocumentFragment();
      const placed = new Set<HTMLElement>();

      for (const group of TOOL_CATEGORIES) {
        const matched: HTMLElement[] = [];
        for (const toolName of group.tools) {
          const els = byName.get(toolName) || [];
          for (const el of els) {
            if (!placed.has(el)) {
              matched.push(el);
              placed.add(el);
            }
          }
        }
        if (matched.length > 0) {
          const heading = document.createElement('div');
          heading.className = 'ng-popover-group-label';
          heading.textContent = group.label;
          frag.appendChild(heading);
          matched.forEach((el) => frag.appendChild(el));
        }
      }

      itemEls.forEach((el) => {
        if (!placed.has(el)) frag.appendChild(el);
      });
      uncategorized.forEach((el) => {
        if (!placed.has(el)) frag.appendChild(el);
      });

      itemsEl.appendChild(frag);
    });
  };

  const observer = new MutationObserver(() => {
    observer.disconnect();
    applyCategories();
    observer.observe(container, { childList: true, subtree: true });
  });

  observer.observe(container, { childList: true, subtree: true });
  return () => observer.disconnect();
}
