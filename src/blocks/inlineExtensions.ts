import { generateAiText, loadAiConfig } from '../utils/aiClient';

export const TEXT_COLOR_SWATCHES = [
  { label: 'Default', value: '' },
  { label: 'Gray', value: '#71717a' },
  { label: 'Red', value: '#dc2626' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Green', value: '#16a34a' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Purple', value: '#9333ea' },
];

export const HIGHLIGHT_SWATCHES = [
  { label: 'None', value: '' },
  { label: 'Yellow', value: 'rgba(250, 204, 21, 0.35)' },
  { label: 'Green', value: 'rgba(74, 222, 128, 0.3)' },
  { label: 'Blue', value: 'rgba(96, 165, 250, 0.3)' },
  { label: 'Pink', value: 'rgba(244, 114, 182, 0.3)' },
  { label: 'Gray', value: 'rgba(161, 161, 170, 0.28)' },
];

const REWRITE_ACTIONS: Array<{ id: string; label: string; prompt: string }> = [
  {
    id: 'improve',
    label: 'Improve',
    prompt: 'Rewrite the following text to be clearer, smoother, and more engaging. Return only the rewritten text.',
  },
  {
    id: 'shorten',
    label: 'Shorten',
    prompt: 'Make the following text more concise while preserving its core meaning. Return only the shortened text.',
  },
  {
    id: 'grammar',
    label: 'Fix Grammar',
    prompt: 'Fix any spelling, punctuation, or grammar mistakes in the following text. Return only the corrected text.',
  },
  {
    id: 'professional',
    label: 'Professional',
    prompt: 'Rewrite the following text in a polished, professional tone. Return only the rewritten text.',
  },
  {
    id: 'translate',
    label: 'Translate (ES)',
    prompt: 'Translate the following text into natural Spanish. Return only the translated text.',
  },
];

/* ── 1. Inline AI Rewrite Tool ─────────────────────────────────── */
export class AiRewriteInline {
  private savedRange: Range | null = null;
  private actionsEl: HTMLElement | null = null;

  static get isInline() {
    return true;
  }

  static get title() {
    return 'AI Rewrite';
  }

  static get sanitize() {
    return {};
  }

  render(): HTMLElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ce-inline-tool';
    btn.title = 'AI Rewrite selection';
    btn.innerHTML =
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/></svg>';
    return btn;
  }

  surround(range: Range): void {
    this.savedRange = range.cloneRange();
  }

  renderActions(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'ng-inline-ai-actions';

    const status = document.createElement('span');
    status.className = 'ng-inline-ai-status';

    const row = document.createElement('div');
    row.className = 'ng-inline-ai-row';

    REWRITE_ACTIONS.forEach((act) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ng-inline-action-btn';
      b.textContent = act.label;
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', async () => {
        const range = this.savedRange;
        const selected = range?.toString().trim() || '';
        if (!range || !selected) {
          status.textContent = 'Select text first.';
          return;
        }
        status.textContent = 'Rewriting…';
        try {
          const rewritten = await generateAiText({
            config: loadAiConfig(),
            mode: 'ask',
            prompt: `${act.prompt}\n\nText:\n"${selected}"`,
            context: selected,
          });
          if (rewritten) {
            range.deleteContents();
            range.insertNode(document.createTextNode(rewritten));
            status.textContent = 'Done';
          } else {
            status.textContent = 'Empty response';
          }
        } catch (err) {
          status.textContent = err instanceof Error ? err.message : 'AI error';
        }
      });
      row.appendChild(b);
    });

    wrap.append(row, status);
    this.actionsEl = wrap;
    return wrap;
  }

  checkState(): boolean {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed) {
      this.savedRange = sel.getRangeAt(0).cloneRange();
    }
    return false;
  }
}

/* ── 2. Multi-Color Text & Highlight Inline Tool ───────────────── */
export class ColorInline {
  private savedRange: Range | null = null;
  private actionsEl: HTMLElement | null = null;

  static get isInline() {
    return true;
  }

  static get title() {
    return 'Color & Highlight';
  }

  static get sanitize() {
    return {
      span: {
        class: 'ng-inline-color',
        style: true,
      },
    };
  }

  render(): HTMLElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ce-inline-tool';
    btn.title = 'Text & Highlight Color';
    btn.innerHTML =
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16"/><path d="m6 16 6-12 6 12"/><path d="M8 12h8"/></svg>';
    return btn;
  }

  surround(range: Range): void {
    this.savedRange = range.cloneRange();
  }

  private applyStyle(prop: 'color' | 'backgroundColor', value: string) {
    const range = this.savedRange;
    if (!range || range.collapsed) return;
    if (!value) {
      const span = document.createElement('span');
      span.appendChild(range.extractContents());
      span.querySelectorAll('.ng-inline-color').forEach((el) => {
        (el as HTMLElement).style[prop] = '';
      });
      range.insertNode(span);
      return;
    }
    const span = document.createElement('span');
    span.className = 'ng-inline-color';
    span.style[prop] = value;
    try {
      range.surroundContents(span);
    } catch {
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
    }
  }

  renderActions(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'ng-inline-color-actions';

    const makeRow = (
      title: string,
      swatches: Array<{ label: string; value: string }>,
      prop: 'color' | 'backgroundColor'
    ) => {
      const row = document.createElement('div');
      row.className = 'ng-inline-swatch-row';
      const lbl = document.createElement('span');
      lbl.className = 'ng-inline-swatch-label';
      lbl.textContent = title;
      row.appendChild(lbl);

      swatches.forEach((sw) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'ng-inline-swatch';
        dot.title = sw.label;
        dot.style.background = sw.value || 'transparent';
        if (!sw.value) dot.textContent = '×';
        dot.addEventListener('mousedown', (e) => e.preventDefault());
        dot.addEventListener('click', (e) => {
          e.preventDefault();
          this.applyStyle(prop, sw.value);
        });
        row.appendChild(dot);
      });
      return row;
    };

    wrap.append(
      makeRow('Text', TEXT_COLOR_SWATCHES, 'color'),
      makeRow('Bg', HIGHLIGHT_SWATCHES, 'backgroundColor')
    );
    this.actionsEl = wrap;
    return wrap;
  }

  checkState(): boolean {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed) {
      this.savedRange = sel.getRangeAt(0).cloneRange();
    }
    return false;
  }
}

/* ── 3. /today Date Stamp Block ────────────────────────────────── */
export interface TodayData {
  date: string;
  label?: string;
}

export class TodayTool {
  private data: TodayData;

  static get toolbox() {
    return {
      title: 'Today Date',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<TodayData> }) {
    const now = new Date();
    this.data = {
      date:
        data?.date ??
        now.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      label: data?.label ?? 'Date',
    };
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-today-pill';

    const badge = document.createElement('span');
    badge.className = 'editor-today-badge';
    badge.textContent = `📅 ${this.data.date}`;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'editor-mermaid-preset-btn';
    toggle.textContent = 'ISO';
    toggle.addEventListener('click', () => {
      const now = new Date();
      const iso = now.toISOString().slice(0, 10);
      const long = now.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      this.data.date = this.data.date === iso ? long : iso;
      badge.textContent = `📅 ${this.data.date}`;
      toggle.textContent = this.data.date === iso ? 'Long' : 'ISO';
    });

    wrap.append(badge, toggle);
    return wrap;
  }

  save(): TodayData {
    return {
      date: this.data.date,
      label: this.data.label,
    };
  }
}

/* ── 4. /export Trigger Tool ───────────────────────────────────── */
export class ExportTriggerTool {
  static get toolbox() {
    return {
      title: 'Export / Import',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    };
  }

  render(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'editor-export-trigger';
    el.textContent = 'Opening Export & Markdown modal…';
    queueMicrotask(() => {
      el.dispatchEvent(new CustomEvent('nextgen-open-export', { bubbles: true }));
    });
    return el;
  }

  save() {
    return {};
  }
}
