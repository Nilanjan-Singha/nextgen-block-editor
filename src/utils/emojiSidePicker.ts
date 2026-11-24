import { EMOJI_PRESETS } from '../blocks/richBlocks';

export interface EmojiSideMenuOptions {
  anchorRect: DOMRect;
  onSelect: (emoji: string) => void;
  onClose?: () => void;
}

let activeMenuCleanup: (() => void) | null = null;

export function openEmojiSideMenu({
  anchorRect,
  onSelect,
  onClose,
}: EmojiSideMenuOptions): () => void {
  if (activeMenuCleanup) {
    activeMenuCleanup();
    activeMenuCleanup = null;
  }

  const popover = document.createElement('div');
  popover.className = 'editor-emoji-side-popover';
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', 'Emoji picker');

  const menuW = 264;
  const menuH = 290;
  const gap = 8;

  const fitsRight = anchorRect.right + gap + menuW <= window.innerWidth - 8;
  const left = fitsRight
    ? anchorRect.right + gap
    : Math.max(8, anchorRect.left - menuW - gap);
  const top = Math.max(
    8,
    Math.min(anchorRect.top, window.innerHeight - menuH - 8)
  );

  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;

  const searchIn = document.createElement('input');
  searchIn.type = 'search';
  searchIn.className = 'cdx-input editor-form-input';
  searchIn.placeholder = 'Search emoji (fire, rocket...)';

  const grid = document.createElement('div');
  grid.className = 'editor-emoji-grid';

  const close = () => {
    document.removeEventListener('mousedown', onOutside, true);
    document.removeEventListener('keydown', onKey, true);
    popover.remove();
    activeMenuCleanup = null;
    onClose?.();
  };

  const renderGrid = (query = '') => {
    grid.innerHTML = '';
    const q = query.trim().toLowerCase();
    const filtered = q
      ? EMOJI_PRESETS.filter((p) => p.name.includes(q) || p.em.includes(q))
      : EMOJI_PRESETS;

    filtered.forEach(({ em, name }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.title = name;
      btn.className = 'editor-emoji-btn';
      btn.textContent = em;
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', () => {
        const cb = onSelect;
        close();
        cb(em);
      });
      grid.appendChild(btn);
    });
  };

  const onOutside = (e: MouseEvent) => {
    if (!popover.contains(e.target as Node)) {
      close();
    }
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  };

  searchIn.addEventListener('input', () => renderGrid(searchIn.value));
  renderGrid();

  popover.append(searchIn, grid);
  document.body.appendChild(popover);
  document.addEventListener('mousedown', onOutside, true);
  document.addEventListener('keydown', onKey, true);

  queueMicrotask(() => searchIn.focus());

  activeMenuCleanup = close;
  return close;
}

export function attachEmojiSidePicker(container: HTMLElement): () => void {
  const onInput = (e: Event) => {
    const target = e.target as HTMLElement | null;
    if (!target || !target.isContentEditable) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (
      range.startContainer.nodeType !== Node.TEXT_NODE ||
      !range.collapsed
    ) {
      return;
    }

    const textNode = range.startContainer as Text;
    const offset = range.startOffset;
    const before = textNode.data.slice(0, offset);

    if (!/(^|\s)\/emoji$/i.test(before)) return;

    const triggerStart = offset - '/emoji'.length;
    const triggerRange = document.createRange();
    triggerRange.setStart(textNode, triggerStart);
    triggerRange.setEnd(textNode, offset);
    const rect = triggerRange.getBoundingClientRect();

    openEmojiSideMenu({
      anchorRect: rect,
      onSelect: (emoji) => {
        if (!textNode.isConnected) return;
        const current = textNode.data;
        const nextText =
          current.slice(0, triggerStart) + emoji + current.slice(offset);
        textNode.data = nextText;

        const nextCaret = triggerStart + emoji.length;
        const newRange = document.createRange();
        newRange.setStart(textNode, nextCaret);
        newRange.setEnd(textNode, nextCaret);
        const s = window.getSelection();
        if (s) {
          s.removeAllRanges();
          s.addRange(newRange);
        }
        target.focus();
        target.dispatchEvent(new Event('input', { bubbles: true }));
      },
      onClose: () => {
        target.focus();
      },
    });
  };

  container.addEventListener('input', onInput);
  return () => {
    container.removeEventListener('input', onInput);
    if (activeMenuCleanup) {
      activeMenuCleanup();
      activeMenuCleanup = null;
    }
  };
}
