import { escHtml, uploadFileToBucket } from '../utils/blocksToHtml';

function createInput(
  type: string,
  className: string,
  placeholder: string,
  value: string,
  onInput: (val: string) => void
): HTMLInputElement {
  const input = document.createElement('input');
  input.type = type;
  input.className = className;
  input.placeholder = placeholder;
  input.value = value;
  input.addEventListener('input', () => onInput(input.value));
  return input;
}

function createTextarea(
  className: string,
  rows: number,
  placeholder: string,
  value: string,
  onInput: (val: string) => void
): HTMLTextAreaElement {
  const ta = document.createElement('textarea');
  ta.className = className;
  ta.rows = rows;
  ta.placeholder = placeholder;
  ta.value = value;
  ta.addEventListener('input', () => onInput(ta.value));
  return ta;
}

/* ── 1. Bookmark Card (/bookmark) ──────────────────────────────── */
export interface BookmarkData {
  url: string;
  title: string;
  description: string;
  image?: string;
}

export class BookmarkTool {
  private data: BookmarkData;

  static get toolbox() {
    return {
      title: 'Bookmark',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<BookmarkData> }) {
    this.data = {
      url: data?.url ?? '',
      title: data?.title ?? '',
      description: data?.description ?? '',
      image: data?.image ?? '',
    };
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-extra-card';

    const head = document.createElement('div');
    head.className = 'editor-extra-head';
    head.textContent = 'URL Bookmark Card';

    const preview = document.createElement('div');
    preview.className = 'editor-bookmark-preview';

    const refreshPreview = () => {
      const host = (() => {
        try {
          return this.data.url ? new URL(this.data.url).hostname : 'example.com';
        } catch {
          return this.data.url || 'example.com';
        }
      })();
      preview.innerHTML = `
        <div class="editor-bookmark-card">
          <div class="editor-bookmark-body">
            <div class="editor-bookmark-title">${escHtml(this.data.title || host)}</div>
            ${this.data.description ? `<div class="editor-bookmark-desc">${escHtml(this.data.description)}</div>` : ''}
            <div class="editor-bookmark-url">${escHtml(host)}</div>
          </div>
          ${this.data.image ? `<img class="editor-bookmark-thumb" src="${escHtml(this.data.image)}" alt="" />` : ''}
        </div>`;
    };

    const grid = document.createElement('div');
    grid.className = 'editor-extra-grid';
    grid.append(
      createInput('url', 'cdx-input', 'https://example.com/article', this.data.url, (v) => {
        this.data.url = v;
        refreshPreview();
      }),
      createInput('text', 'cdx-input', 'Link title', this.data.title, (v) => {
        this.data.title = v;
        refreshPreview();
      }),
      createInput('text', 'cdx-input', 'Short description', this.data.description, (v) => {
        this.data.description = v;
        refreshPreview();
      }),
      createInput('url', 'cdx-input', 'Optional thumbnail URL', this.data.image || '', (v) => {
        this.data.image = v;
        refreshPreview();
      })
    );

    refreshPreview();
    wrap.append(head, grid, preview);
    return wrap;
  }

  save(): BookmarkData {
    return {
      url: this.data.url.trim(),
      title: this.data.title.trim(),
      description: this.data.description.trim(),
      image: this.data.image?.trim() || undefined,
    };
  }
}

/* ── 2. Step-by-Step Walkthrough (/steps) ──────────────────────── */
export interface StepItem {
  title: string;
  body: string;
}

export interface StepsData {
  items: StepItem[];
}

export class StepsTool {
  private data: StepsData;

  static get toolbox() {
    return {
      title: 'Steps',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" x2="21" y1="6" y2="6"/><line x1="10" x2="21" y1="12" y2="12"/><line x1="10" x2="21" y1="18" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<StepsData> }) {
    this.data = {
      items:
        Array.isArray(data?.items) && data.items.length > 0
          ? data.items.map((item) => ({ title: item.title || '', body: item.body || '' }))
          : [
              { title: 'Install dependencies', body: 'Run npm install to set up the package.' },
              { title: 'Configure & render', body: 'Pass initialData and onChange to BlockEditor.' },
            ],
    };
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-extra-card';

    const head = document.createElement('div');
    head.className = 'editor-extra-head';
    head.textContent = 'Step-by-Step Walkthrough';

    const list = document.createElement('div');
    list.className = 'editor-steps-editor-list';

    const renderList = () => {
      list.innerHTML = '';
      this.data.items.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'editor-step-editor-row';

        const badge = document.createElement('span');
        badge.className = 'editor-step-badge';
        badge.textContent = String(idx + 1);

        const fields = document.createElement('div');
        fields.className = 'editor-step-editor-fields';
        fields.append(
          createInput('text', 'cdx-input', `Step ${idx + 1} title`, item.title, (v) => {
            item.title = v;
          }),
          createTextarea('cdx-input', 2, 'Step details', item.body, (v) => {
            item.body = v;
          })
        );

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'excalidraw-btn';
        removeBtn.textContent = '×';
        removeBtn.title = 'Remove step';
        removeBtn.addEventListener('click', () => {
          if (this.data.items.length <= 1) return;
          this.data.items.splice(idx, 1);
          renderList();
        });

        row.append(badge, fields, removeBtn);
        list.appendChild(row);
      });
    };

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'excalidraw-btn';
    addBtn.textContent = '+ Add Step';
    addBtn.addEventListener('click', () => {
      this.data.items.push({ title: '', body: '' });
      renderList();
    });

    renderList();
    wrap.append(head, list, addBtn);
    return wrap;
  }

  save(): StepsData {
    return {
      items: this.data.items.filter((i) => i.title.trim() || i.body.trim()),
    };
  }
}

/* ── 3. Code Diff Viewer (/diff) ───────────────────────────────── */
export interface DiffData {
  filename?: string;
  before: string;
  after: string;
}

export interface DiffLine {
  kind: 'same' | 'del' | 'add';
  text: string;
}

export function computeSimpleDiff(before: string, after: string): DiffLine[] {
  const a = before.split('\n');
  const b = after.split('\n');
  const lines: DiffLine[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i += 1) {
    const left = a[i];
    const right = b[i];
    if (left === right) {
      if (left !== undefined) lines.push({ kind: 'same', text: left });
    } else {
      if (left !== undefined) lines.push({ kind: 'del', text: left });
      if (right !== undefined) lines.push({ kind: 'add', text: right });
    }
  }
  return lines;
}

export class DiffTool {
  private data: DiffData;

  static get toolbox() {
    return {
      title: 'Code Diff',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v14"/><path d="M5 10h14"/><path d="M5 21h14"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<DiffData> }) {
    this.data = {
      filename: data?.filename ?? 'example.ts',
      before: data?.before ?? 'const theme = "catppuccin";',
      after: data?.after ?? 'const theme = "dark";',
    };
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-extra-card';

    const head = document.createElement('div');
    head.className = 'editor-extra-head';
    head.textContent = 'Code Diff Viewer';

    const preview = document.createElement('pre');
    preview.className = 'editor-diff-preview';

    const refreshPreview = () => {
      const diffLines = computeSimpleDiff(this.data.before, this.data.after);
      preview.innerHTML = diffLines
        .map((line) => {
          const prefix = line.kind === 'del' ? '-' : line.kind === 'add' ? '+' : ' ';
          return `<span class="editor-diff-line is-${line.kind}">${prefix} ${escHtml(line.text)}</span>`;
        })
        .join('\n');
    };

    const cols = document.createElement('div');
    cols.className = 'editor-diff-inputs';
    cols.append(
      createTextarea('editor-mermaid-input', 4, 'Before code...', this.data.before, (v) => {
        this.data.before = v;
        refreshPreview();
      }),
      createTextarea('editor-mermaid-input', 4, 'After code...', this.data.after, (v) => {
        this.data.after = v;
        refreshPreview();
      })
    );

    const fileInput = createInput('text', 'cdx-input', 'Filename (optional)', this.data.filename || '', (v) => {
      this.data.filename = v;
    });

    refreshPreview();
    wrap.append(head, fileInput, cols, preview);
    return wrap;
  }

  save(): DiffData {
    return {
      filename: this.data.filename?.trim() || undefined,
      before: this.data.before,
      after: this.data.after,
    };
  }
}

/* ── 4. Video Player (/video) ──────────────────────────────────── */
export interface VideoData {
  url: string;
  poster?: string;
  caption?: string;
}

export class VideoTool {
  private data: VideoData;

  static get toolbox() {
    return {
      title: 'Video Player',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<VideoData> }) {
    this.data = {
      url: data?.url ?? '',
      poster: data?.poster ?? '',
      caption: data?.caption ?? '',
    };
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-extra-card';

    const head = document.createElement('div');
    head.className = 'editor-extra-head';
    head.textContent = 'Video Player (MP4 / WebM)';

    const preview = document.createElement('div');
    preview.className = 'editor-video-preview';

    const refreshPreview = () => {
      if (!this.data.url.trim()) {
        preview.innerHTML = '<div class="editor-mermaid-empty">Paste a video URL or upload a file</div>';
        return;
      }
      preview.innerHTML = `<video controls preload="metadata" class="editor-video-el"${
        this.data.poster ? ` poster="${escHtml(this.data.poster)}"` : ''
      }><source src="${escHtml(this.data.url)}" /></video>`;
    };

    const urlInput = createInput('url', 'cdx-input', 'https://.../video.mp4', this.data.url, (v) => {
      this.data.url = v;
      refreshPreview();
    });

    const uploadInput = document.createElement('input');
    uploadInput.type = 'file';
    uploadInput.accept = 'video/mp4,video/webm,video/ogg';
    uploadInput.className = 'cdx-input';
    uploadInput.addEventListener('change', async () => {
      const file = uploadInput.files?.[0];
      if (!file) return;
      const uploaded = await uploadFileToBucket(file, 'videos');
      if (uploaded) {
        this.data.url = uploaded;
        urlInput.value = uploaded;
        refreshPreview();
      }
    });

    const posterInput = createInput('url', 'cdx-input', 'Optional poster image URL', this.data.poster || '', (v) => {
      this.data.poster = v;
      refreshPreview();
    });

    const captionInput = createInput('text', 'cdx-input', 'Optional video caption', this.data.caption || '', (v) => {
      this.data.caption = v;
    });

    refreshPreview();
    wrap.append(head, urlInput, uploadInput, posterInput, captionInput, preview);
    return wrap;
  }

  save(): VideoData {
    return {
      url: this.data.url.trim(),
      poster: this.data.poster?.trim() || undefined,
      caption: this.data.caption?.trim() || undefined,
    };
  }
}

/* ── 5. Changelog Block (/changelog) ───────────────────────────── */
export interface ChangelogEntry {
  kind: 'added' | 'changed' | 'fixed';
  text: string;
}

export interface ChangelogData {
  version: string;
  date: string;
  items: ChangelogEntry[];
}

export class ChangelogTool {
  private data: ChangelogData;

  static get toolbox() {
    return {
      title: 'Changelog',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<ChangelogData> }) {
    this.data = {
      version: data?.version ?? 'v1.0.0',
      date: data?.date ?? new Date().toISOString().slice(0, 10),
      items:
        Array.isArray(data?.items) && data.items.length > 0
          ? data.items.map((i) => ({ kind: i.kind || 'added', text: i.text || '' }))
          : [{ kind: 'added', text: 'Initial release notes' }],
    };
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-extra-card';

    const head = document.createElement('div');
    head.className = 'editor-extra-head';
    head.textContent = 'Release Changelog';

    const meta = document.createElement('div');
    meta.className = 'editor-diff-inputs';
    meta.append(
      createInput('text', 'cdx-input', 'Version (e.g. v1.2.0)', this.data.version, (v) => {
        this.data.version = v;
      }),
      createInput('date', 'cdx-input', 'Release date', this.data.date, (v) => {
        this.data.date = v;
      })
    );

    const list = document.createElement('div');
    list.className = 'editor-steps-editor-list';

    const renderItems = () => {
      list.innerHTML = '';
      this.data.items.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'editor-changelog-row';

        const select = document.createElement('select');
        select.className = 'cdx-input editor-form-select';
        (['added', 'changed', 'fixed'] as const).forEach((k) => {
          const opt = document.createElement('option');
          opt.value = k;
          opt.textContent = k.toUpperCase();
          if (item.kind === k) opt.selected = true;
          select.appendChild(opt);
        });
        select.addEventListener('change', () => {
          item.kind = select.value as ChangelogEntry['kind'];
        });

        const text = createInput('text', 'cdx-input', 'Change description', item.text, (v) => {
          item.text = v;
        });

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'excalidraw-btn';
        del.textContent = '×';
        del.addEventListener('click', () => {
          if (this.data.items.length <= 1) return;
          this.data.items.splice(idx, 1);
          renderItems();
        });

        row.append(select, text, del);
        list.appendChild(row);
      });
    };

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'excalidraw-btn';
    addBtn.textContent = '+ Add Entry';
    addBtn.addEventListener('click', () => {
      this.data.items.push({ kind: 'added', text: '' });
      renderItems();
    });

    renderItems();
    wrap.append(head, meta, list, addBtn);
    return wrap;
  }

  save(): ChangelogData {
    return {
      version: this.data.version.trim() || 'v1.0.0',
      date: this.data.date,
      items: this.data.items.filter((i) => i.text.trim()),
    };
  }
}

/* ── 6. Social Post Quote Card (/social) ───────────────────────── */
export interface SocialData {
  author: string;
  handle: string;
  date?: string;
  text: string;
  url?: string;
}

export class SocialTool {
  private data: SocialData;

  static get toolbox() {
    return {
      title: 'Social Post',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<SocialData> }) {
    this.data = {
      author: data?.author ?? 'Alex Rivera',
      handle: data?.handle ?? '@alexrivera',
      date: data?.date ?? new Date().toISOString().slice(0, 10),
      text: data?.text ?? '',
      url: data?.url ?? '',
    };
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-extra-card';

    const head = document.createElement('div');
    head.className = 'editor-extra-head';
    head.textContent = 'Social Post Quote Card';

    const meta = document.createElement('div');
    meta.className = 'editor-diff-inputs';
    meta.append(
      createInput('text', 'cdx-input', 'Author name', this.data.author, (v) => {
        this.data.author = v;
      }),
      createInput('text', 'cdx-input', '@handle', this.data.handle, (v) => {
        this.data.handle = v;
      })
    );

    const text = createTextarea('cdx-input', 3, 'Quoted post content...', this.data.text, (v) => {
      this.data.text = v;
    });

    const extra = document.createElement('div');
    extra.className = 'editor-diff-inputs';
    extra.append(
      createInput('text', 'cdx-input', 'Date (optional)', this.data.date || '', (v) => {
        this.data.date = v;
      }),
      createInput('url', 'cdx-input', 'Original post URL (optional)', this.data.url || '', (v) => {
        this.data.url = v;
      })
    );

    wrap.append(head, meta, text, extra);
    return wrap;
  }

  save(): SocialData {
    return {
      author: this.data.author.trim(),
      handle: this.data.handle.trim(),
      date: this.data.date?.trim() || undefined,
      text: this.data.text.trim(),
      url: this.data.url?.trim() || undefined,
    };
  }
}
