export interface ToolCategoryGroup {
  label: string;
  tools: string[];
}

export const TOOL_CATEGORIES: ToolCategoryGroup[] = [
  {
    label: 'Text & Style',
    tools: [
      'h1',
      'h2',
      'h3',
      'paragraph',
      'list',
      'nestedlist',
      'checklist',
      'quote',
      'pullquote',
      'delimiter',
      'callout',
      'hotkey',
      'emoji',
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
      'attaches',
      'excalidraw',
    ],
  },
  {
    label: 'Interactive & Data',
    tools: [
      'code',
      'latex',
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
  'settings',
];

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

      const byName = new Map<string, HTMLElement>();
      const uncategorized: HTMLElement[] = [];

      itemEls.forEach((el) => {
        const name = el.dataset.itemName || '';
        if (name === 'paragraph') {
          const titleEl = el.querySelector<HTMLElement>('.ce-popover-item__title');
          if (titleEl && titleEl.textContent?.trim() === 'Text') {
            titleEl.textContent = 'Paragraph';
          }
        }
        if (name) byName.set(name, el);
        else uncategorized.push(el);
      });

      const frag = document.createDocumentFragment();
      const placed = new Set<HTMLElement>();

      for (const group of TOOL_CATEGORIES) {
        const matched: HTMLElement[] = [];
        for (const toolName of group.tools) {
          const el = byName.get(toolName);
          if (el && !placed.has(el)) {
            matched.push(el);
            placed.add(el);
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
