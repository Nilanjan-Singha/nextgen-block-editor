import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Excalidraw, exportToCanvas } from '@excalidraw/excalidraw';
import katex from 'katex';

export interface LatexData {
  tex: string;
  displayMode: boolean;
}

export class LatexTool {
  private data: LatexData;
  private wrapper: HTMLElement | null = null;

  static get toolbox() {
    return {
      title: 'LaTeX Math',
      icon: '<span style="font-family:serif;font-weight:700;font-size:13px;">Σ</span>',
    };
  }

  constructor({ data }: { data?: Partial<LatexData> }) {
    this.data = {
      tex: data?.tex ?? 'E = mc^2',
      displayMode: data?.displayMode ?? true,
    };
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-latex-tool';

    const header = document.createElement('div');
    header.className = 'editor-latex-header';

    const label = document.createElement('span');
    label.className = 'editor-latex-label';
    label.textContent = 'LaTeX Equation';

    const modeBtn = document.createElement('button');
    modeBtn.type = 'button';
    modeBtn.className = 'editor-latex-mode-btn';
    modeBtn.textContent = this.data.displayMode ? 'Block' : 'Inline';

    header.append(label, modeBtn);

    const input = document.createElement('textarea');
    input.className = 'editor-latex-input';
    input.rows = 2;
    input.placeholder = 'e.g. \\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}';
    input.value = this.data.tex;

    const preview = document.createElement('div');
    preview.className = 'editor-latex-preview';

    const updatePreview = () => {
      const expr = this.data.tex.trim();
      if (!expr) {
        preview.innerHTML = '<span class="editor-latex-empty">Equation preview</span>';
        return;
      }
      try {
        preview.innerHTML = katex.renderToString(expr, {
          throwOnError: false,
          displayMode: this.data.displayMode,
        });
      } catch {
        preview.textContent = expr;
      }
    };

    input.addEventListener('input', () => {
      this.data.tex = input.value;
      updatePreview();
    });

    modeBtn.addEventListener('click', () => {
      this.data.displayMode = !this.data.displayMode;
      modeBtn.textContent = this.data.displayMode ? 'Block' : 'Inline';
      updatePreview();
    });

    updatePreview();
    wrap.append(header, input, preview);
    this.wrapper = wrap;
    return wrap;
  }

  save(): LatexData {
    return {
      tex: this.data.tex,
      displayMode: this.data.displayMode,
    };
  }
}

export interface ExcalidrawData {
  elements: unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
  dataUrl: string;
  caption?: string;
}

const EXPAND_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';

const COLLAPSE_ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';

export class ExcalidrawTool {
  private data: ExcalidrawData;
  private root: Root | null = null;
  private isFullscreen = false;
  private exportTimer: number | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  static get toolbox() {
    return {
      title: 'Excalidraw',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/><path d="M14 4l6 6M20 4l-6 6"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<ExcalidrawData> }) {
    this.data = {
      elements: Array.isArray(data?.elements) ? data.elements : [],
      appState: data?.appState && typeof data.appState === 'object' ? data.appState : {},
      files: data?.files && typeof data.files === 'object' ? data.files : {},
      dataUrl: data?.dataUrl ?? '',
      caption: data?.caption ?? '',
    };
  }

  private scheduleExport(
    elements: readonly unknown[],
    appState: Record<string, unknown>,
    files: Record<string, unknown>
  ) {
    if (this.exportTimer !== null) {
      window.clearTimeout(this.exportTimer);
    }
    this.exportTimer = window.setTimeout(async () => {
      try {
        if (!elements.length) {
          this.data.dataUrl = '';
          return;
        }
        const canvas = await exportToCanvas({
          elements: elements as never,
          appState: {
            exportBackground: true,
            viewBackgroundColor:
              (appState.viewBackgroundColor as string) || '#ffffff',
          } as never,
          files: files as never,
          getDimensions: (w: number, h: number) => ({
            width: Math.max(w, 400),
            height: Math.max(h, 240),
            scale: 1,
          }),
        });
        this.data.dataUrl = canvas.toDataURL('image/png');
      } catch {
        // Ignore transient export errors while editing
      }
    }, 350);
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'excalidraw-tool';

    const stage = document.createElement('div');
    stage.className = 'excalidraw-stage';

    const mountNode = document.createElement('div');
    mountNode.className = 'excalidraw-mount';

    const fsBtn = document.createElement('button');
    fsBtn.type = 'button';
    fsBtn.className = 'excalidraw-fullscreen-btn';
    fsBtn.title = 'Full screen canvas';
    fsBtn.setAttribute('aria-label', 'Full screen canvas');
    fsBtn.innerHTML = EXPAND_ICON;

    const setFullscreen = (next: boolean) => {
      this.isFullscreen = next;
      wrap.classList.toggle('is-fullscreen', next);
      fsBtn.innerHTML = next ? COLLAPSE_ICON : EXPAND_ICON;
      fsBtn.title = next ? 'Exit full screen (Esc)' : 'Full screen canvas';
      fsBtn.setAttribute(
        'aria-label',
        next ? 'Exit full screen' : 'Full screen canvas'
      );
      window.dispatchEvent(new Event('resize'));
    };

    fsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setFullscreen(!this.isFullscreen);
    });

    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isFullscreen) {
        setFullscreen(false);
      }
    };
    document.addEventListener('keydown', this.keyHandler);

    stage.append(mountNode, fsBtn);

    this.root = createRoot(mountNode);
    const initialAppState: Record<string, unknown> = {
      ...(this.data.appState || {}),
    };
    delete initialAppState.collaborators;

    this.root.render(
      React.createElement(Excalidraw, {
        initialData: {
          elements: (this.data.elements || []) as never,
          appState: initialAppState as never,
          files: (this.data.files || {}) as never,
        },
        onChange: (elements, appState, files) => {
          this.data.elements = Array.from(elements as readonly unknown[]);
          this.data.appState = {
            viewBackgroundColor: appState.viewBackgroundColor,
            theme: appState.theme,
            gridSize: appState.gridSize,
          };
          this.data.files = (files || {}) as Record<string, unknown>;
          this.scheduleExport(
            elements as readonly unknown[],
            this.data.appState,
            this.data.files
          );
        },
      })
    );

    const captionInput = document.createElement('input');
    captionInput.type = 'text';
    captionInput.className = 'excalidraw-caption';
    captionInput.placeholder = 'Excalidraw diagram caption (optional)...';
    captionInput.value = this.data.caption || '';
    captionInput.addEventListener('input', () => {
      this.data.caption = captionInput.value;
    });

    wrap.append(stage, captionInput);
    return wrap;
  }

  destroy() {
    if (this.exportTimer !== null) {
      window.clearTimeout(this.exportTimer);
      this.exportTimer = null;
    }
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    if (this.root) {
      const r = this.root;
      this.root = null;
      queueMicrotask(() => r.unmount());
    }
  }

  save(): ExcalidrawData {
    return {
      elements: this.data.elements,
      appState: this.data.appState,
      files: this.data.files,
      dataUrl: this.data.dataUrl,
      caption: this.data.caption,
    };
  }
}

export type FormFieldType = 'text' | 'email' | 'textarea' | 'select' | 'checkbox' | 'number';

export interface FormFieldConfig {
  id: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

export interface FormBuilderData {
  title: string;
  description?: string;
  submitLabel: string;
  actionUrl?: string;
  fields: FormFieldConfig[];
}

export class FormBuilderTool {
  private data: FormBuilderData;
  private listEl: HTMLElement | null = null;

  static get toolbox() {
    return {
      title: 'Form',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h6M7 17h4"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<FormBuilderData> }) {
    this.data = {
      title: data?.title ?? 'Contact Form',
      description: data?.description ?? 'Fill out the fields below and submit.',
      submitLabel: data?.submitLabel ?? 'Submit',
      actionUrl: data?.actionUrl ?? '',
      fields:
        Array.isArray(data?.fields) && data.fields.length > 0
          ? data.fields
          : [
              { id: 'name', label: 'Name', type: 'text', placeholder: 'Jane Doe', required: true },
              { id: 'email', label: 'Email', type: 'email', placeholder: 'jane@example.com', required: true },
              { id: 'message', label: 'Message', type: 'textarea', placeholder: 'Write your message...', required: false },
            ],
    };
  }

  private renderFields() {
    const list = this.listEl;
    if (!list) return;
    list.innerHTML = '';

    this.data.fields.forEach((field, idx) => {
      const row = document.createElement('div');
      row.className = 'editor-form-field-row';

      const labelInput = document.createElement('input');
      labelInput.type = 'text';
      labelInput.className = 'cdx-input editor-form-input';
      labelInput.placeholder = 'Field label';
      labelInput.value = field.label;
      labelInput.addEventListener('input', () => {
        field.label = labelInput.value;
        field.id =
          labelInput.value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '') || `field_${idx + 1}`;
      });

      const typeSelect = document.createElement('select');
      typeSelect.className = 'cdx-input editor-form-select';
      (['text', 'email', 'textarea', 'select', 'checkbox', 'number'] as FormFieldType[]).forEach(
        (t) => {
          const opt = document.createElement('option');
          opt.value = t;
          opt.textContent = t;
          if (field.type === t) opt.selected = true;
          typeSelect.appendChild(opt);
        }
      );

      const placeholderInput = document.createElement('input');
      placeholderInput.type = 'text';
      placeholderInput.className = 'cdx-input editor-form-input';
      placeholderInput.placeholder =
        field.type === 'select' ? 'Options (comma-separated)' : 'Placeholder';
      placeholderInput.value =
        field.type === 'select'
          ? (field.options || []).join(', ')
          : field.placeholder || '';
      placeholderInput.addEventListener('input', () => {
        if (field.type === 'select') {
          field.options = placeholderInput.value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        } else {
          field.placeholder = placeholderInput.value;
        }
      });

      typeSelect.addEventListener('change', () => {
        field.type = typeSelect.value as FormFieldType;
        placeholderInput.placeholder =
          field.type === 'select' ? 'Options (comma-separated)' : 'Placeholder';
      });

      const reqLabel = document.createElement('label');
      reqLabel.className = 'editor-form-req-toggle';
      const reqCheck = document.createElement('input');
      reqCheck.type = 'checkbox';
      reqCheck.checked = Boolean(field.required);
      reqCheck.addEventListener('change', () => {
        field.required = reqCheck.checked;
      });
      reqLabel.append(reqCheck, document.createTextNode('Req'));

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'excalidraw-btn editor-form-remove';
      removeBtn.textContent = '×';
      removeBtn.title = 'Remove field';
      removeBtn.addEventListener('click', () => {
        this.data.fields.splice(idx, 1);
        this.renderFields();
      });

      row.append(labelInput, typeSelect, placeholderInput, reqLabel, removeBtn);
      list.appendChild(row);
    });
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-form-builder';

    const header = document.createElement('div');
    header.className = 'editor-form-builder-header';

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'cdx-input editor-form-title-input';
    titleInput.placeholder = 'Form title';
    titleInput.value = this.data.title;
    titleInput.addEventListener('input', () => {
      this.data.title = titleInput.value;
    });

    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.className = 'cdx-input editor-form-input';
    descInput.placeholder = 'Short form description (optional)';
    descInput.value = this.data.description || '';
    descInput.addEventListener('input', () => {
      this.data.description = descInput.value;
    });

    header.append(titleInput, descInput);

    const listEl = document.createElement('div');
    listEl.className = 'editor-form-fields-list';
    this.listEl = listEl;
    this.renderFields();

    const footer = document.createElement('div');
    footer.className = 'editor-form-builder-footer';

    const addFieldBtn = document.createElement('button');
    addFieldBtn.type = 'button';
    addFieldBtn.className = 'excalidraw-btn';
    addFieldBtn.textContent = '+ Add Field';
    addFieldBtn.addEventListener('click', () => {
      this.data.fields.push({
        id: `field_${this.data.fields.length + 1}`,
        label: `Field ${this.data.fields.length + 1}`,
        type: 'text',
        placeholder: '',
        required: false,
      });
      this.renderFields();
    });

    const submitInput = document.createElement('input');
    submitInput.type = 'text';
    submitInput.className = 'cdx-input editor-form-input';
    submitInput.placeholder = 'Submit button text';
    submitInput.value = this.data.submitLabel;
    submitInput.addEventListener('input', () => {
      this.data.submitLabel = submitInput.value || 'Submit';
    });

    const actionInput = document.createElement('input');
    actionInput.type = 'url';
    actionInput.className = 'cdx-input editor-form-input';
    actionInput.placeholder = 'POST endpoint URL (optional)';
    actionInput.value = this.data.actionUrl || '';
    actionInput.addEventListener('input', () => {
      this.data.actionUrl = actionInput.value;
    });

    footer.append(addFieldBtn, submitInput, actionInput);

    wrap.append(header, listEl, footer);
    return wrap;
  }

  save(): FormBuilderData {
    return {
      title: this.data.title,
      description: this.data.description,
      submitLabel: this.data.submitLabel || 'Submit',
      actionUrl: this.data.actionUrl,
      fields: this.data.fields,
    };
  }
}

export interface AudioPlayerData {
  url: string;
  title: string;
  artist?: string;
  coverUrl?: string;
}

export class AudioPlayerTool {
  private data: AudioPlayerData;

  static get toolbox() {
    return {
      title: 'Audio Player',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<AudioPlayerData> }) {
    this.data = {
      url: data?.url ?? '',
      title: data?.title ?? '',
      artist: data?.artist ?? '',
      coverUrl: data?.coverUrl ?? '',
    };
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-audio-builder';

    const grid = document.createElement('div');
    grid.className = 'editor-audio-inputs';

    const urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.className = 'cdx-input editor-form-input';
    urlInput.placeholder = 'Audio URL (.mp3, .wav, .ogg)...';
    urlInput.value = this.data.url;

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'cdx-input editor-form-input';
    titleInput.placeholder = 'Episode or track title';
    titleInput.value = this.data.title;

    const artistInput = document.createElement('input');
    artistInput.type = 'text';
    artistInput.className = 'cdx-input editor-form-input';
    artistInput.placeholder = 'Artist or podcast name (optional)';
    artistInput.value = this.data.artist || '';

    const coverInput = document.createElement('input');
    coverInput.type = 'url';
    coverInput.className = 'cdx-input editor-form-input';
    coverInput.placeholder = 'Cover art URL (optional)';
    coverInput.value = this.data.coverUrl || '';

    const preview = document.createElement('div');
    preview.className = 'editor-audio-preview';

    const renderPreview = () => {
      preview.innerHTML = '';
      if (!this.data.url.trim()) {
        const empty = document.createElement('span');
        empty.className = 'editor-latex-empty';
        empty.textContent = 'Paste an audio URL above to preview the player';
        preview.appendChild(empty);
        return;
      }
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.preload = 'metadata';
      audio.src = this.data.url.trim();
      audio.style.width = '100%';
      preview.appendChild(audio);
    };

    urlInput.addEventListener('input', () => {
      this.data.url = urlInput.value;
      renderPreview();
    });
    titleInput.addEventListener('input', () => {
      this.data.title = titleInput.value;
    });
    artistInput.addEventListener('input', () => {
      this.data.artist = artistInput.value;
    });
    coverInput.addEventListener('input', () => {
      this.data.coverUrl = coverInput.value;
    });

    grid.append(urlInput, titleInput, artistInput, coverInput);
    renderPreview();
    wrap.append(grid, preview);
    return wrap;
  }

  save(): AudioPlayerData {
    return {
      url: this.data.url.trim(),
      title: this.data.title.trim(),
      artist: this.data.artist?.trim() || '',
      coverUrl: this.data.coverUrl?.trim() || '',
    };
  }
}

export interface MusicCarouselData {
  heading?: string;
  tracks: AudioPlayerData[];
}

export class MusicCarouselTool {
  private data: MusicCarouselData;
  private listEl: HTMLElement | null = null;

  static get toolbox() {
    return {
      title: 'Music Carousel',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="9" height="12" rx="2"/><rect x="13" y="6" width="9" height="12" rx="2"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<MusicCarouselData> }) {
    this.data = {
      heading: data?.heading ?? 'Featured Tracks',
      tracks:
        Array.isArray(data?.tracks) && data.tracks.length > 0
          ? data.tracks
          : [
              { url: '', title: 'Track 1', artist: 'Artist', coverUrl: '' },
              { url: '', title: 'Track 2', artist: 'Artist', coverUrl: '' },
            ],
    };
  }

  private renderTracks() {
    const list = this.listEl;
    if (!list) return;
    list.innerHTML = '';

    this.data.tracks.forEach((track, idx) => {
      const row = document.createElement('div');
      row.className = 'editor-music-track-row';

      const titleIn = document.createElement('input');
      titleIn.type = 'text';
      titleIn.className = 'cdx-input editor-form-input';
      titleIn.placeholder = 'Track title';
      titleIn.value = track.title;
      titleIn.addEventListener('input', () => {
        track.title = titleIn.value;
      });

      const artistIn = document.createElement('input');
      artistIn.type = 'text';
      artistIn.className = 'cdx-input editor-form-input';
      artistIn.placeholder = 'Artist';
      artistIn.value = track.artist || '';
      artistIn.addEventListener('input', () => {
        track.artist = artistIn.value;
      });

      const urlIn = document.createElement('input');
      urlIn.type = 'url';
      urlIn.className = 'cdx-input editor-form-input';
      urlIn.placeholder = 'Audio URL (.mp3, .wav, .ogg)';
      urlIn.value = track.url;
      urlIn.addEventListener('input', () => {
        track.url = urlIn.value;
      });

      const coverIn = document.createElement('input');
      coverIn.type = 'url';
      coverIn.className = 'cdx-input editor-form-input';
      coverIn.placeholder = 'Cover art URL';
      coverIn.value = track.coverUrl || '';
      coverIn.addEventListener('input', () => {
        track.coverUrl = coverIn.value;
      });

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'excalidraw-btn editor-form-remove';
      removeBtn.textContent = '×';
      removeBtn.title = 'Remove track';
      removeBtn.addEventListener('click', () => {
        this.data.tracks.splice(idx, 1);
        this.renderTracks();
      });

      row.append(titleIn, artistIn, urlIn, coverIn, removeBtn);
      list.appendChild(row);
    });
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-audio-builder';

    const headInput = document.createElement('input');
    headInput.type = 'text';
    headInput.className = 'cdx-input editor-form-title-input';
    headInput.placeholder = 'Carousel heading (e.g. Featured Tracks)';
    headInput.value = this.data.heading || '';
    headInput.style.marginBottom = '10px';
    headInput.addEventListener('input', () => {
      this.data.heading = headInput.value;
    });

    const listEl = document.createElement('div');
    listEl.className = 'editor-form-fields-list';
    this.listEl = listEl;
    this.renderTracks();

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'excalidraw-btn';
    addBtn.textContent = '+ Add Track Card';
    addBtn.addEventListener('click', () => {
      this.data.tracks.push({
        url: '',
        title: `Track ${this.data.tracks.length + 1}`,
        artist: '',
        coverUrl: '',
      });
      this.renderTracks();
    });

    wrap.append(headInput, listEl, addBtn);
    return wrap;
  }

  save(): MusicCarouselData {
    return {
      heading: this.data.heading?.trim() || '',
      tracks: this.data.tracks.map((t) => ({
        url: t.url.trim(),
        title: t.title.trim(),
        artist: t.artist?.trim() || '',
        coverUrl: t.coverUrl?.trim() || '',
      })),
    };
  }
}

export interface TaskItem {
  text: string;
  done: boolean;
  priority?: 'low' | 'medium' | 'high';
}

export interface TaskChecklistData {
  title: string;
  items: TaskItem[];
}

export class TaskChecklistTool {
  private data: TaskChecklistData;
  private listEl: HTMLElement | null = null;

  static get toolbox() {
    return {
      title: 'To-Do List',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<TaskChecklistData> }) {
    this.data = {
      title: data?.title ?? 'Tasks',
      items:
        Array.isArray(data?.items) && data.items.length > 0
          ? data.items
          : [
              { text: 'Define project scope', done: true, priority: 'high' },
              { text: 'Build core components', done: false, priority: 'medium' },
            ],
    };
  }

  private renderItems() {
    const list = this.listEl;
    if (!list) return;
    list.innerHTML = '';

    this.data.items.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'editor-todo-row';

      const check = document.createElement('input');
      check.type = 'checkbox';
      check.checked = Boolean(item.done);
      check.addEventListener('change', () => {
        item.done = check.checked;
      });

      const textIn = document.createElement('input');
      textIn.type = 'text';
      textIn.className = 'cdx-input editor-form-input';
      textIn.placeholder = 'Task description...';
      textIn.value = item.text;
      textIn.addEventListener('input', () => {
        item.text = textIn.value;
      });

      const prioSelect = document.createElement('select');
      prioSelect.className = 'cdx-input editor-form-select';
      (['low', 'medium', 'high'] as const).forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        if ((item.priority || 'medium') === p) opt.selected = true;
        prioSelect.appendChild(opt);
      });
      prioSelect.addEventListener('change', () => {
        item.priority = prioSelect.value as TaskItem['priority'];
      });

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'excalidraw-btn editor-form-remove';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => {
        this.data.items.splice(idx, 1);
        this.renderItems();
      });

      row.append(check, textIn, prioSelect, removeBtn);
      list.appendChild(row);
    });
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-form-builder';

    const titleIn = document.createElement('input');
    titleIn.type = 'text';
    titleIn.className = 'cdx-input editor-form-title-input';
    titleIn.placeholder = 'To-Do list title';
    titleIn.value = this.data.title;
    titleIn.style.marginBottom = '10px';
    titleIn.addEventListener('input', () => {
      this.data.title = titleIn.value;
    });

    const listEl = document.createElement('div');
    listEl.className = 'editor-form-fields-list';
    this.listEl = listEl;
    this.renderItems();

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'excalidraw-btn';
    addBtn.textContent = '+ Add Task';
    addBtn.addEventListener('click', () => {
      this.data.items.push({ text: '', done: false, priority: 'medium' });
      this.renderItems();
    });

    wrap.append(titleIn, listEl, addBtn);
    return wrap;
  }

  save(): TaskChecklistData {
    return {
      title: this.data.title.trim() || 'Tasks',
      items: this.data.items.filter((i) => i.text.trim().length > 0),
    };
  }
}

export interface EisenhowerQuadrantItem {
  text: string;
  done: boolean;
}

export interface EisenhowerMatrixData {
  title?: string;
  doFirst: EisenhowerQuadrantItem[];
  schedule: EisenhowerQuadrantItem[];
  delegate: EisenhowerQuadrantItem[];
  eliminate: EisenhowerQuadrantItem[];
}

type QuadrantKey = 'doFirst' | 'schedule' | 'delegate' | 'eliminate';

const QUADRANTS: Array<{ key: QuadrantKey; label: string; hint: string }> = [
  { key: 'doFirst', label: 'Do First', hint: 'Urgent & Important' },
  { key: 'schedule', label: 'Schedule', hint: 'Not Urgent & Important' },
  { key: 'delegate', label: 'Delegate', hint: 'Urgent & Not Important' },
  { key: 'eliminate', label: 'Eliminate', hint: 'Not Urgent & Not Important' },
];

export class EisenhowerMatrixTool {
  private data: EisenhowerMatrixData;

  static get toolbox() {
    return {
      title: 'Eisenhower Matrix',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<EisenhowerMatrixData> }) {
    this.data = {
      title: data?.title ?? 'Priority Matrix',
      doFirst: Array.isArray(data?.doFirst) ? data.doFirst : [{ text: 'Critical bug fix', done: false }],
      schedule: Array.isArray(data?.schedule) ? data.schedule : [{ text: 'Roadmap planning', done: false }],
      delegate: Array.isArray(data?.delegate) ? data.delegate : [{ text: 'Routine emails', done: false }],
      eliminate: Array.isArray(data?.eliminate) ? data.eliminate : [{ text: 'Low-value meetings', done: false }],
    };
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-eisenhower-builder';

    const titleIn = document.createElement('input');
    titleIn.type = 'text';
    titleIn.className = 'cdx-input editor-form-title-input';
    titleIn.placeholder = 'Matrix title (optional)';
    titleIn.value = this.data.title || '';
    titleIn.style.marginBottom = '10px';
    titleIn.addEventListener('input', () => {
      this.data.title = titleIn.value;
    });

    const grid = document.createElement('div');
    grid.className = 'editor-eisenhower-grid';

    for (const q of QUADRANTS) {
      const card = document.createElement('div');
      card.className = `editor-eisenhower-card is-${q.key}`;

      const head = document.createElement('div');
      head.className = 'editor-eisenhower-head';
      head.innerHTML = `<strong>${q.label}</strong><span>${q.hint}</span>`;

      const listEl = document.createElement('div');
      listEl.className = 'editor-eisenhower-list';

      const renderList = () => {
        listEl.innerHTML = '';
        this.data[q.key].forEach((item, idx) => {
          const row = document.createElement('div');
          row.className = 'editor-eisenhower-item-row';

          const check = document.createElement('input');
          check.type = 'checkbox';
          check.checked = Boolean(item.done);
          check.addEventListener('change', () => {
            item.done = check.checked;
          });

          const textIn = document.createElement('input');
          textIn.type = 'text';
          textIn.className = 'cdx-input editor-form-input';
          textIn.placeholder = 'Task...';
          textIn.value = item.text;
          textIn.addEventListener('input', () => {
            item.text = textIn.value;
          });

          const rm = document.createElement('button');
          rm.type = 'button';
          rm.className = 'excalidraw-btn editor-form-remove';
          rm.textContent = '×';
          rm.addEventListener('click', () => {
            this.data[q.key].splice(idx, 1);
            renderList();
          });

          row.append(check, textIn, rm);
          listEl.appendChild(row);
        });
      };

      renderList();

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'excalidraw-btn';
      addBtn.textContent = '+ Add';
      addBtn.style.marginTop = '6px';
      addBtn.addEventListener('click', () => {
        this.data[q.key].push({ text: '', done: false });
        renderList();
      });

      card.append(head, listEl, addBtn);
      grid.appendChild(card);
    }

    wrap.append(titleIn, grid);
    return wrap;
  }

  save(): EisenhowerMatrixData {
    const clean = (arr: EisenhowerQuadrantItem[]) =>
      arr.filter((i) => i.text.trim().length > 0);
    return {
      title: this.data.title?.trim() || '',
      doFirst: clean(this.data.doFirst),
      schedule: clean(this.data.schedule),
      delegate: clean(this.data.delegate),
      eliminate: clean(this.data.eliminate),
    };
  }
}

export interface PollOption {
  label: string;
  votes: number;
}

export interface PollData {
  question: string;
  options: PollOption[];
}

export class PollTool {
  private data: PollData;
  private listEl: HTMLElement | null = null;

  static get toolbox() {
    return {
      title: 'Poll',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<PollData> }) {
    this.data = {
      question: data?.question ?? 'Which feature do you want next?',
      options:
        Array.isArray(data?.options) && data.options.length > 0
          ? data.options
          : [
              { label: 'Option A', votes: 0 },
              { label: 'Option B', votes: 0 },
            ],
    };
  }

  private renderOptions() {
    const list = this.listEl;
    if (!list) return;
    list.innerHTML = '';

    this.data.options.forEach((opt, idx) => {
      const row = document.createElement('div');
      row.className = 'editor-eisenhower-item-row';

      const num = document.createElement('span');
      num.className = 'editor-poll-idx';
      num.textContent = `${idx + 1}.`;

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'cdx-input editor-form-input';
      input.placeholder = `Choice ${idx + 1}`;
      input.value = opt.label;
      input.addEventListener('input', () => {
        opt.label = input.value;
      });

      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'excalidraw-btn editor-form-remove';
      rm.textContent = '×';
      rm.addEventListener('click', () => {
        this.data.options.splice(idx, 1);
        this.renderOptions();
      });

      row.append(num, input, rm);
      list.appendChild(row);
    });
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-form-builder';

    const qInput = document.createElement('input');
    qInput.type = 'text';
    qInput.className = 'cdx-input editor-form-title-input';
    qInput.placeholder = 'Ask a poll question...';
    qInput.value = this.data.question;
    qInput.style.marginBottom = '10px';
    qInput.addEventListener('input', () => {
      this.data.question = qInput.value;
    });

    const listEl = document.createElement('div');
    listEl.className = 'editor-form-fields-list';
    this.listEl = listEl;
    this.renderOptions();

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'excalidraw-btn';
    addBtn.textContent = '+ Add Option';
    addBtn.addEventListener('click', () => {
      this.data.options.push({
        label: `Option ${this.data.options.length + 1}`,
        votes: 0,
      });
      this.renderOptions();
    });

    wrap.append(qInput, listEl, addBtn);
    return wrap;
  }

  save(): PollData {
    return {
      question: this.data.question.trim() || 'Poll',
      options: this.data.options.filter((o) => o.label.trim().length > 0),
    };
  }
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqData {
  title?: string;
  items: FaqItem[];
}

export class FaqTool {
  private data: FaqData;
  private listEl: HTMLElement | null = null;

  static get toolbox() {
    return {
      title: 'FAQ Accordion',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<FaqData> }) {
    this.data = {
      title: data?.title ?? 'Frequently Asked Questions',
      items:
        Array.isArray(data?.items) && data.items.length > 0
          ? data.items
          : [
              {
                question: 'How does this component work?',
                answer: 'Click any question to expand or collapse its answer.',
              },
            ],
    };
  }

  private renderItems() {
    const list = this.listEl;
    if (!list) return;
    list.innerHTML = '';

    this.data.items.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'editor-faq-editor-item';

      const top = document.createElement('div');
      top.className = 'editor-eisenhower-item-row';

      const qIn = document.createElement('input');
      qIn.type = 'text';
      qIn.className = 'cdx-input editor-form-input';
      qIn.placeholder = 'Question...';
      qIn.value = item.question;
      qIn.addEventListener('input', () => {
        item.question = qIn.value;
      });

      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'excalidraw-btn editor-form-remove';
      rm.textContent = '×';
      rm.addEventListener('click', () => {
        this.data.items.splice(idx, 1);
        this.renderItems();
      });

      top.append(document.createTextNode('Q:'), qIn, rm);

      const aIn = document.createElement('textarea');
      aIn.className = 'cdx-input editor-form-input';
      aIn.rows = 2;
      aIn.placeholder = 'Answer...';
      aIn.value = item.answer;
      aIn.addEventListener('input', () => {
        item.answer = aIn.value;
      });

      card.append(top, aIn);
      list.appendChild(card);
    });
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-form-builder';

    const titleIn = document.createElement('input');
    titleIn.type = 'text';
    titleIn.className = 'cdx-input editor-form-title-input';
    titleIn.placeholder = 'FAQ section title (optional)';
    titleIn.value = this.data.title || '';
    titleIn.style.marginBottom = '10px';
    titleIn.addEventListener('input', () => {
      this.data.title = titleIn.value;
    });

    const listEl = document.createElement('div');
    listEl.className = 'editor-form-fields-list';
    this.listEl = listEl;
    this.renderItems();

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'excalidraw-btn';
    addBtn.textContent = '+ Add FAQ Item';
    addBtn.addEventListener('click', () => {
      this.data.items.push({ question: '', answer: '' });
      this.renderItems();
    });

    wrap.append(titleIn, listEl, addBtn);
    return wrap;
  }

  save(): FaqData {
    return {
      title: this.data.title?.trim() || '',
      items: this.data.items.filter((i) => i.question.trim().length > 0),
    };
  }
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface QuizData {
  title?: string;
  questions: QuizQuestion[];
}

export class QuizTool {
  private data: QuizData;
  private listEl: HTMLElement | null = null;

  static get toolbox() {
    return {
      title: 'Quiz',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><rect x="3" y="3" width="18" height="18" rx="3"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<QuizData> }) {
    this.data = {
      title: data?.title ?? 'Knowledge Check',
      questions:
        Array.isArray(data?.questions) && data.questions.length > 0
          ? data.questions
          : [
              {
                question: 'Which answer is correct?',
                options: ['First option', 'Second option', 'Third option'],
                correctIndex: 0,
                explanation: '',
              },
            ],
    };
  }

  private renderQuestions() {
    const list = this.listEl;
    if (!list) return;
    list.innerHTML = '';

    this.data.questions.forEach((q, qIdx) => {
      const card = document.createElement('div');
      card.className = 'editor-faq-editor-item';

      const qHead = document.createElement('div');
      qHead.className = 'editor-eisenhower-item-row';

      const qIn = document.createElement('input');
      qIn.type = 'text';
      qIn.className = 'cdx-input editor-form-input';
      qIn.placeholder = `Question ${qIdx + 1}...`;
      qIn.value = q.question;
      qIn.addEventListener('input', () => {
        q.question = qIn.value;
      });

      const rmQ = document.createElement('button');
      rmQ.type = 'button';
      rmQ.className = 'excalidraw-btn editor-form-remove';
      rmQ.textContent = '×';
      rmQ.addEventListener('click', () => {
        this.data.questions.splice(qIdx, 1);
        this.renderQuestions();
      });

      qHead.append(document.createTextNode(`Q${qIdx + 1}`), qIn, rmQ);

      const optsWrap = document.createElement('div');
      optsWrap.className = 'editor-form-fields-list';
      optsWrap.style.marginBottom = '6px';

      const renderOpts = () => {
        optsWrap.innerHTML = '';
        q.options.forEach((opt, oIdx) => {
          const row = document.createElement('div');
          row.className = 'editor-eisenhower-item-row';

          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = `quiz_correct_${qIdx}_${Math.random().toString(36).slice(2, 6)}`;
          radio.checked = q.correctIndex === oIdx;
          radio.title = 'Mark as correct answer';
          radio.addEventListener('change', () => {
            if (radio.checked) q.correctIndex = oIdx;
          });

          const optIn = document.createElement('input');
          optIn.type = 'text';
          optIn.className = 'cdx-input editor-form-input';
          optIn.placeholder = `Option ${oIdx + 1}`;
          optIn.value = opt;
          optIn.addEventListener('input', () => {
            q.options[oIdx] = optIn.value;
          });

          const rmOpt = document.createElement('button');
          rmOpt.type = 'button';
          rmOpt.className = 'excalidraw-btn editor-form-remove';
          rmOpt.textContent = '×';
          rmOpt.addEventListener('click', () => {
            q.options.splice(oIdx, 1);
            if (q.correctIndex >= q.options.length) {
              q.correctIndex = Math.max(0, q.options.length - 1);
            }
            renderOpts();
          });

          row.append(radio, optIn, rmOpt);
          optsWrap.appendChild(row);
        });
      };

      renderOpts();

      const addOptBtn = document.createElement('button');
      addOptBtn.type = 'button';
      addOptBtn.className = 'excalidraw-btn';
      addOptBtn.textContent = '+ Option';
      addOptBtn.addEventListener('click', () => {
        q.options.push(`Option ${q.options.length + 1}`);
        renderOpts();
      });

      const expIn = document.createElement('input');
      expIn.type = 'text';
      expIn.className = 'cdx-input editor-form-input';
      expIn.placeholder = 'Explanation shown after answering (optional)';
      expIn.value = q.explanation || '';
      expIn.addEventListener('input', () => {
        q.explanation = expIn.value;
      });

      card.append(qHead, optsWrap, addOptBtn, expIn);
      list.appendChild(card);
    });
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-form-builder';

    const titleIn = document.createElement('input');
    titleIn.type = 'text';
    titleIn.className = 'cdx-input editor-form-title-input';
    titleIn.placeholder = 'Quiz title (optional)';
    titleIn.value = this.data.title || '';
    titleIn.style.marginBottom = '10px';
    titleIn.addEventListener('input', () => {
      this.data.title = titleIn.value;
    });

    const listEl = document.createElement('div');
    listEl.className = 'editor-form-fields-list';
    this.listEl = listEl;
    this.renderQuestions();

    const addQBtn = document.createElement('button');
    addQBtn.type = 'button';
    addQBtn.className = 'excalidraw-btn';
    addQBtn.textContent = '+ Add Question';
    addQBtn.addEventListener('click', () => {
      this.data.questions.push({
        question: '',
        options: ['Option 1', 'Option 2'],
        correctIndex: 0,
        explanation: '',
      });
      this.renderQuestions();
    });

    wrap.append(titleIn, listEl, addQBtn);
    return wrap;
  }

  save(): QuizData {
    return {
      title: this.data.title?.trim() || '',
      questions: this.data.questions
        .filter((q) => q.question.trim().length > 0 && q.options.length > 0)
        .map((q) => ({
          question: q.question.trim(),
          options: q.options.map((o) => o.trim()).filter(Boolean),
          correctIndex: Math.min(q.correctIndex, Math.max(0, q.options.length - 1)),
          explanation: q.explanation?.trim() || '',
        })),
    };
  }
}

export interface KanbanColumn {
  title: string;
  cards: string[];
}

export interface KanbanData {
  heading?: string;
  columns: KanbanColumn[];
}

export class KanbanTool {
  private data: KanbanData;
  private boardEl: HTMLElement | null = null;

  static get toolbox() {
    return {
      title: 'Kanban Board',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="4" height="14" rx="1"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<KanbanData> }) {
    this.data = {
      heading: data?.heading ?? 'Project Board',
      columns:
        Array.isArray(data?.columns) && data.columns.length > 0
          ? data.columns
          : [
              { title: 'To Do', cards: ['Outline milestones', 'Draft specs'] },
              { title: 'In Progress', cards: ['Build core blocks'] },
              { title: 'Done', cards: ['Initial setup'] },
            ],
    };
  }

  private renderBoard() {
    const board = this.boardEl;
    if (!board) return;
    board.innerHTML = '';

    this.data.columns.forEach((col, colIdx) => {
      const colEl = document.createElement('div');
      colEl.className = 'editor-kanban-col';

      const head = document.createElement('div');
      head.className = 'editor-kanban-col-head';

      const colTitle = document.createElement('input');
      colTitle.type = 'text';
      colTitle.className = 'cdx-input editor-form-input';
      colTitle.value = col.title;
      colTitle.placeholder = 'Column';
      colTitle.addEventListener('input', () => {
        col.title = colTitle.value;
      });

      const rmCol = document.createElement('button');
      rmCol.type = 'button';
      rmCol.className = 'excalidraw-btn editor-form-remove';
      rmCol.textContent = '×';
      rmCol.title = 'Remove column';
      rmCol.addEventListener('click', () => {
        this.data.columns.splice(colIdx, 1);
        this.renderBoard();
      });

      head.append(colTitle, rmCol);

      const cardsWrap = document.createElement('div');
      cardsWrap.className = 'editor-kanban-cards';

      col.cards.forEach((cardText, cardIdx) => {
        const cardRow = document.createElement('div');
        cardRow.className = 'editor-kanban-card-edit';

        const cardIn = document.createElement('input');
        cardIn.type = 'text';
        cardIn.className = 'cdx-input editor-form-input';
        cardIn.value = cardText;
        cardIn.placeholder = 'Task card...';
        cardIn.addEventListener('input', () => {
          col.cards[cardIdx] = cardIn.value;
        });

        const moveR = document.createElement('button');
        moveR.type = 'button';
        moveR.className = 'excalidraw-btn editor-form-remove';
        moveR.textContent = '→';
        moveR.title = 'Move right';
        moveR.disabled = colIdx >= this.data.columns.length - 1;
        moveR.addEventListener('click', () => {
          const [moved] = col.cards.splice(cardIdx, 1);
          this.data.columns[colIdx + 1]?.cards.push(moved);
          this.renderBoard();
        });

        const rmCard = document.createElement('button');
        rmCard.type = 'button';
        rmCard.className = 'excalidraw-btn editor-form-remove';
        rmCard.textContent = '×';
        rmCard.addEventListener('click', () => {
          col.cards.splice(cardIdx, 1);
          this.renderBoard();
        });

        cardRow.append(cardIn, moveR, rmCard);
        cardsWrap.appendChild(cardRow);
      });

      const addCardBtn = document.createElement('button');
      addCardBtn.type = 'button';
      addCardBtn.className = 'excalidraw-btn';
      addCardBtn.textContent = '+ Card';
      addCardBtn.addEventListener('click', () => {
        col.cards.push('');
        this.renderBoard();
      });

      colEl.append(head, cardsWrap, addCardBtn);
      board.appendChild(colEl);
    });
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-form-builder';

    const headRow = document.createElement('div');
    headRow.className = 'editor-kanban-topbar';

    const titleIn = document.createElement('input');
    titleIn.type = 'text';
    titleIn.className = 'cdx-input editor-form-title-input';
    titleIn.placeholder = 'Board title (optional)';
    titleIn.value = this.data.heading || '';
    titleIn.addEventListener('input', () => {
      this.data.heading = titleIn.value;
    });

    const addColBtn = document.createElement('button');
    addColBtn.type = 'button';
    addColBtn.className = 'excalidraw-btn';
    addColBtn.textContent = '+ Column';
    addColBtn.addEventListener('click', () => {
      this.data.columns.push({ title: 'New Column', cards: [] });
      this.renderBoard();
    });

    headRow.append(titleIn, addColBtn);

    const boardEl = document.createElement('div');
    boardEl.className = 'editor-kanban-board-edit';
    this.boardEl = boardEl;
    this.renderBoard();

    wrap.append(headRow, boardEl);
    return wrap;
  }

  save(): KanbanData {
    return {
      heading: this.data.heading?.trim() || '',
      columns: this.data.columns.map((c) => ({
        title: c.title.trim() || 'Column',
        cards: c.cards.map((t) => t.trim()).filter(Boolean),
      })),
    };
  }
}

export interface FocusTimerData {
  label: string;
  minutes: number;
}

export class FocusTimerTool {
  private data: FocusTimerData;

  static get toolbox() {
    return {
      title: 'Focus Timer',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<FocusTimerData> }) {
    this.data = {
      label: data?.label ?? 'Deep Work Session',
      minutes: typeof data?.minutes === 'number' && data.minutes > 0 ? data.minutes : 25,
    };
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-form-builder';

    const row = document.createElement('div');
    row.className = 'editor-timer-edit-row';

    const labelIn = document.createElement('input');
    labelIn.type = 'text';
    labelIn.className = 'cdx-input editor-form-input';
    labelIn.placeholder = 'Session label (e.g. Deep Work)';
    labelIn.value = this.data.label;
    labelIn.addEventListener('input', () => {
      this.data.label = labelIn.value;
    });

    const minIn = document.createElement('input');
    minIn.type = 'number';
    minIn.min = '1';
    minIn.max = '180';
    minIn.className = 'cdx-input editor-form-input';
    minIn.value = String(this.data.minutes);
    minIn.addEventListener('input', () => {
      const val = parseInt(minIn.value, 10);
      this.data.minutes = Number.isFinite(val) && val > 0 ? val : 25;
    });

    row.append(labelIn, minIn, document.createTextNode('min'));
    wrap.appendChild(row);
    return wrap;
  }

  save(): FocusTimerData {
    return {
      label: this.data.label.trim() || 'Focus Timer',
      minutes: this.data.minutes,
    };
  }
}

import {
  SUPPORTED_LANGUAGES,
  detectCodeLanguage,
  highlightCodeHtml,
} from '../utils/syntaxHighlight';

export interface SmartCodeData {
  code: string;
  language: string;
}

export class SmartCodeTool {
  private data: SmartCodeData;

  static get toolbox() {
    return {
      title: 'Code',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    };
  }

  static get enableLineBreaks() {
    return true;
  }

  constructor({ data }: { data?: Partial<SmartCodeData> }) {
    this.data = {
      code: data?.code ?? '',
      language: data?.language ?? 'auto',
    };
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-code-tool';

    const header = document.createElement('div');
    header.className = 'editor-code-header';

    const badge = document.createElement('span');
    badge.className = 'editor-code-badge';

    const select = document.createElement('select');
    select.className = 'cdx-input editor-code-select';
    const autoOpt = document.createElement('option');
    autoOpt.value = 'auto';
    autoOpt.textContent = 'Auto-detect';
    select.appendChild(autoOpt);
    for (const lang of SUPPORTED_LANGUAGES) {
      const opt = document.createElement('option');
      opt.value = lang.id;
      opt.textContent = lang.label;
      select.appendChild(opt);
    }
    select.value = this.data.language || 'auto';

    header.append(badge, select);

    const stage = document.createElement('div');
    stage.className = 'editor-code-stage';

    const pre = document.createElement('pre');
    pre.className = 'editor-code-highlight';
    pre.setAttribute('aria-hidden', 'true');

    const textarea = document.createElement('textarea');
    textarea.className = 'editor-code-textarea';
    textarea.placeholder = 'Write or paste code... (language auto-detects)';
    textarea.spellcheck = false;
    textarea.value = this.data.code;

    const syncHighlight = () => {
      const detected =
        this.data.language && this.data.language !== 'auto'
          ? this.data.language
          : detectCodeLanguage(this.data.code);
      const labelObj = SUPPORTED_LANGUAGES.find((l) => l.id === detected);
      const label = labelObj ? labelObj.label : detected;
      badge.textContent =
        this.data.language === 'auto' ? `Auto: ${label}` : label;

      const highlighted = highlightCodeHtml(this.data.code + '\n', detected);
      pre.innerHTML = highlighted;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(96, textarea.scrollHeight)}px`;
      pre.style.height = textarea.style.height;
    };

    textarea.addEventListener('input', () => {
      this.data.code = textarea.value;
      syncHighlight();
    });

    textarea.addEventListener('scroll', () => {
      pre.scrollTop = textarea.scrollTop;
      pre.scrollLeft = textarea.scrollLeft;
    });

    select.addEventListener('change', () => {
      this.data.language = select.value;
      syncHighlight();
    });

    stage.append(pre, textarea);
    wrap.append(header, stage);
    requestAnimationFrame(syncHighlight);
    return wrap;
  }

  save(): SmartCodeData {
    const resolved =
      this.data.language && this.data.language !== 'auto'
        ? this.data.language
        : detectCodeLanguage(this.data.code);
    return {
      code: this.data.code,
      language: resolved,
    };
  }
}

export interface TocData {
  title: string;
  maxDepth: number;
}

export class TableOfContentsTool {
  private data: TocData;

  static get toolbox() {
    return {
      title: 'Table of Contents',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<TocData> }) {
    this.data = {
      title: data?.title ?? 'Table of Contents',
      maxDepth: typeof data?.maxDepth === 'number' ? data.maxDepth : 3,
    };
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-form-builder';

    const row = document.createElement('div');
    row.className = 'editor-timer-edit-row';

    const titleIn = document.createElement('input');
    titleIn.type = 'text';
    titleIn.className = 'cdx-input editor-form-input';
    titleIn.placeholder = 'Table of Contents title';
    titleIn.value = this.data.title;
    titleIn.addEventListener('input', () => {
      this.data.title = titleIn.value;
    });

    const depthSel = document.createElement('select');
    depthSel.className = 'cdx-input editor-form-select';
    [
      { v: 2, label: 'Up to H2' },
      { v: 3, label: 'Up to H3' },
      { v: 4, label: 'Up to H4' },
    ].forEach((opt) => {
      const o = document.createElement('option');
      o.value = String(opt.v);
      o.textContent = opt.label;
      if (this.data.maxDepth === opt.v) o.selected = true;
      depthSel.appendChild(o);
    });
    depthSel.addEventListener('change', () => {
      this.data.maxDepth = Number(depthSel.value) || 3;
    });

    const note = document.createElement('span');
    note.className = 'editor-poll-total';
    note.style.marginTop = '0';
    note.textContent = 'Auto-generated from headings';

    row.append(titleIn, depthSel, note);
    wrap.appendChild(row);
    return wrap;
  }

  save(): TocData {
    return {
      title: this.data.title.trim() || 'Table of Contents',
      maxDepth: this.data.maxDepth,
    };
  }
}

export type ChartType = 'bar' | 'line' | 'pie';

export interface ChartPoint {
  label: string;
  value: number;
}

export interface ChartData {
  title?: string;
  chartType: ChartType;
  points: ChartPoint[];
}

const CHART_PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

export function renderChartSvg(data: {
  chartType?: string;
  points?: Array<{ label?: string; value?: number }>;
}): string {
  const type = (data.chartType || 'bar') as ChartType;
  const points = (data.points || []).map((p) => ({
    label: String(p.label || ''),
    value: Number(p.value) || 0,
  }));
  if (!points.length) return '';

  const w = 560;
  const h = 240;

  if (type === 'pie') {
    const total = points.reduce((s, p) => s + Math.max(0, p.value), 0) || 1;
    const cx = 120;
    const cy = 120;
    const r = 88;
    let angle = -Math.PI / 2;

    const slices = points
      .map((p, idx) => {
        const val = Math.max(0, p.value);
        const sliceAngle = (val / total) * Math.PI * 2;
        const x1 = cx + r * Math.cos(angle);
        const y1 = cy + r * Math.sin(angle);
        angle += sliceAngle;
        const x2 = cx + r * Math.cos(angle);
        const y2 = cy + r * Math.sin(angle);
        const largeArc = sliceAngle > Math.PI ? 1 : 0;
        const color = CHART_PALETTE[idx % CHART_PALETTE.length];
        if (points.length === 1) {
          return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" />`;
        }
        return `<path d="M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(
          2
        )} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(
          2
        )} Z" fill="${color}" />`;
      })
      .join('');

    const legend = points
      .map((p, idx) => {
        const y = 38 + idx * 26;
        const color = CHART_PALETTE[idx % CHART_PALETTE.length];
        const pct = Math.round((Math.max(0, p.value) / total) * 100);
        return `<rect x="250" y="${y - 10}" width="12" height="12" rx="3" fill="${color}" /><text x="270" y="${y}" font-size="12" fill="currentColor">${p.label.replace(
          /</g,
          '&lt;'
        )} (${pct}%)</text>`;
      })
      .join('');

    return `<svg viewBox="0 0 ${w} ${h}" class="editor-chart-svg" role="img" aria-label="Pie chart">${slices}${legend}</svg>`;
  }

  const padL = 42;
  const padR = 20;
  const padT = 20;
  const padB = 36;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const maxVal = Math.max(1, ...points.map((p) => p.value));

  const gridLines = [0, 0.5, 1]
    .map((ratio) => {
      const y = padT + plotH * (1 - ratio);
      const val = Math.round(maxVal * ratio);
      return `<line x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" stroke="currentColor" stroke-opacity="0.12" /><text x="${
        padL - 8
      }" y="${y + 4}" font-size="10" text-anchor="end" fill="currentColor" opacity="0.6">${val}</text>`;
    })
    .join('');

  if (type === 'line') {
    const step = points.length > 1 ? plotW / (points.length - 1) : plotW / 2;
    const coords = points.map((p, i) => ({
      x: points.length > 1 ? padL + i * step : padL + plotW / 2,
      y: padT + plotH - (Math.max(0, p.value) / maxVal) * plotH,
      label: p.label,
    }));
    const poly = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
    const dots = coords
      .map(
        (c) =>
          `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(
            1
          )}" r="4.5" fill="#3b82f6" /><text x="${c.x.toFixed(
            1
          )}" y="${h - 12}" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">${c.label.replace(
            /</g,
            '&lt;'
          )}</text>`
      )
      .join('');
    return `<svg viewBox="0 0 ${w} ${h}" class="editor-chart-svg" role="img" aria-label="Line chart">${gridLines}<polyline fill="none" stroke="#3b82f6" stroke-width="2.5" points="${poly}" />${dots}</svg>`;
  }

  // Bar chart
  const slotW = plotW / points.length;
  const barW = Math.min(48, slotW * 0.62);
  const bars = points
    .map((p, i) => {
      const barH = (Math.max(0, p.value) / maxVal) * plotH;
      const x = padL + i * slotW + (slotW - barW) / 2;
      const y = padT + plotH - barH;
      const color = CHART_PALETTE[i % CHART_PALETTE.length];
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(
        1
      )}" height="${barH.toFixed(
        1
      )}" rx="4" fill="${color}" /><text x="${(x + barW / 2).toFixed(
        1
      )}" y="${h - 12}" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">${p.label.replace(
        /</g,
        '&lt;'
      )}</text>`;
    })
    .join('');

  return `<svg viewBox="0 0 ${w} ${h}" class="editor-chart-svg" role="img" aria-label="Bar chart">${gridLines}${bars}</svg>`;
}

export class ChartTool {
  private data: ChartData;
  private listEl: HTMLElement | null = null;
  private previewEl: HTMLElement | null = null;

  static get toolbox() {
    return {
      title: 'Data Chart',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="7"/><rect x="12" y="6" width="3" height="11"/><rect x="17" y="13" width="3" height="4"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<ChartData> }) {
    this.data = {
      title: data?.title ?? 'Quarterly Metrics',
      chartType: (data?.chartType as ChartType) || 'bar',
      points:
        Array.isArray(data?.points) && data.points.length > 0
          ? data.points
          : [
              { label: 'Q1', value: 42 },
              { label: 'Q2', value: 68 },
              { label: 'Q3', value: 55 },
              { label: 'Q4', value: 91 },
            ],
    };
  }

  private updatePreview() {
    if (!this.previewEl) return;
    this.previewEl.innerHTML = renderChartSvg(this.data);
  }

  private renderRows() {
    const list = this.listEl;
    if (!list) return;
    list.innerHTML = '';

    this.data.points.forEach((pt, idx) => {
      const row = document.createElement('div');
      row.className = 'editor-chart-row';

      const labelIn = document.createElement('input');
      labelIn.type = 'text';
      labelIn.className = 'cdx-input editor-form-input';
      labelIn.placeholder = 'Label';
      labelIn.value = pt.label;
      labelIn.addEventListener('input', () => {
        pt.label = labelIn.value;
        this.updatePreview();
      });

      const valIn = document.createElement('input');
      valIn.type = 'number';
      valIn.className = 'cdx-input editor-form-input';
      valIn.placeholder = 'Value';
      valIn.value = String(pt.value);
      valIn.addEventListener('input', () => {
        pt.value = Number(valIn.value) || 0;
        this.updatePreview();
      });

      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'excalidraw-btn editor-form-remove';
      rm.textContent = '×';
      rm.addEventListener('click', () => {
        this.data.points.splice(idx, 1);
        this.renderRows();
        this.updatePreview();
      });

      row.append(labelIn, valIn, rm);
      list.appendChild(row);
    });
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-form-builder';

    const top = document.createElement('div');
    top.className = 'editor-kanban-topbar';

    const titleIn = document.createElement('input');
    titleIn.type = 'text';
    titleIn.className = 'cdx-input editor-form-title-input';
    titleIn.placeholder = 'Chart title';
    titleIn.value = this.data.title || '';
    titleIn.addEventListener('input', () => {
      this.data.title = titleIn.value;
    });

    const typeSel = document.createElement('select');
    typeSel.className = 'cdx-input editor-form-select';
    (['bar', 'line', 'pie'] as ChartType[]).forEach((t) => {
      const o = document.createElement('option');
      o.value = t;
      o.textContent = t.toUpperCase();
      if (this.data.chartType === t) o.selected = true;
      typeSel.appendChild(o);
    });
    typeSel.addEventListener('change', () => {
      this.data.chartType = typeSel.value as ChartType;
      this.updatePreview();
    });

    top.append(titleIn, typeSel);

    const listEl = document.createElement('div');
    listEl.className = 'editor-form-fields-list';
    this.listEl = listEl;
    this.renderRows();

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'excalidraw-btn';
    addBtn.textContent = '+ Add Data Point';
    addBtn.style.marginBottom = '10px';
    addBtn.addEventListener('click', () => {
      this.data.points.push({ label: `Item ${this.data.points.length + 1}`, value: 25 });
      this.renderRows();
      this.updatePreview();
    });

    const previewEl = document.createElement('div');
    previewEl.className = 'editor-chart-preview';
    this.previewEl = previewEl;
    this.updatePreview();

    wrap.append(top, listEl, addBtn, previewEl);
    return wrap;
  }

  save(): ChartData {
    return {
      title: this.data.title?.trim() || '',
      chartType: this.data.chartType,
      points: this.data.points.filter((p) => p.label.trim().length > 0),
    };
  }
}

export interface FootnoteItem {
  text: string;
  url?: string;
}

export interface FootnotesData {
  title?: string;
  items: FootnoteItem[];
}

export class FootnotesTool {
  private data: FootnotesData;
  private listEl: HTMLElement | null = null;

  static get toolbox() {
    return {
      title: 'Footnotes',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<FootnotesData> }) {
    this.data = {
      title: data?.title ?? 'References & Footnotes',
      items:
        Array.isArray(data?.items) && data.items.length > 0
          ? data.items
          : [{ text: 'Primary source or citation note', url: '' }],
    };
  }

  private renderItems() {
    const list = this.listEl;
    if (!list) return;
    list.innerHTML = '';

    this.data.items.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'editor-footnote-row';

      const num = document.createElement('span');
      num.className = 'editor-poll-idx';
      num.textContent = `[${idx + 1}]`;

      const textIn = document.createElement('input');
      textIn.type = 'text';
      textIn.className = 'cdx-input editor-form-input';
      textIn.placeholder = 'Citation or footnote text...';
      textIn.value = item.text;
      textIn.addEventListener('input', () => {
        item.text = textIn.value;
      });

      const urlIn = document.createElement('input');
      urlIn.type = 'url';
      urlIn.className = 'cdx-input editor-form-input';
      urlIn.placeholder = 'Source URL (optional)';
      urlIn.value = item.url || '';
      urlIn.addEventListener('input', () => {
        item.url = urlIn.value;
      });

      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'excalidraw-btn editor-form-remove';
      rm.textContent = '×';
      rm.addEventListener('click', () => {
        this.data.items.splice(idx, 1);
        this.renderItems();
      });

      row.append(num, textIn, urlIn, rm);
      list.appendChild(row);
    });
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-form-builder';

    const titleIn = document.createElement('input');
    titleIn.type = 'text';
    titleIn.className = 'cdx-input editor-form-title-input';
    titleIn.placeholder = 'Footnotes heading';
    titleIn.value = this.data.title || '';
    titleIn.style.marginBottom = '10px';
    titleIn.addEventListener('input', () => {
      this.data.title = titleIn.value;
    });

    const listEl = document.createElement('div');
    listEl.className = 'editor-form-fields-list';
    this.listEl = listEl;
    this.renderItems();

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'excalidraw-btn';
    addBtn.textContent = '+ Add Footnote';
    addBtn.addEventListener('click', () => {
      this.data.items.push({ text: '', url: '' });
      this.renderItems();
    });

    wrap.append(titleIn, listEl, addBtn);
    return wrap;
  }

  save(): FootnotesData {
    return {
      title: this.data.title?.trim() || 'References & Footnotes',
      items: this.data.items.filter((i) => i.text.trim().length > 0),
    };
  }
}

export interface PageCoverData {
  coverUrl?: string;
  gradient?: string;
  icon?: string;
  title: string;
  subtitle?: string;
}

const COVER_GRADIENTS: Array<{ id: string; label: string; css: string }> = [
  { id: 'zinc', label: 'Zinc', css: 'linear-gradient(135deg, #27272a 0%, #52525b 100%)' },
  { id: 'indigo', label: 'Indigo', css: 'linear-gradient(135deg, #312e81 0%, #6366f1 100%)' },
  { id: 'emerald', label: 'Emerald', css: 'linear-gradient(135deg, #064e3b 0%, #10b981 100%)' },
  { id: 'amber', label: 'Warm', css: 'linear-gradient(135deg, #78350f 0%, #f59e0b 100%)' },
  { id: 'rose', label: 'Rose', css: 'linear-gradient(135deg, #881337 0%, #f43f5e 100%)' },
];

export class PageCoverTool {
  private data: PageCoverData;
  private bannerEl: HTMLElement | null = null;
  private iconEl: HTMLElement | null = null;

  static get toolbox() {
    return {
      title: 'Page Cover & Header',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="10" rx="2"/><path d="M3 18h12M3 21h8"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<PageCoverData> }) {
    this.data = {
      coverUrl: data?.coverUrl ?? '',
      gradient: data?.gradient ?? COVER_GRADIENTS[0].css,
      icon: data?.icon ?? '📄',
      title: data?.title ?? 'Untitled Document',
      subtitle: data?.subtitle ?? '',
    };
  }

  private syncBanner() {
    if (this.bannerEl) {
      if (this.data.coverUrl?.trim()) {
        this.bannerEl.style.background = `url("${this.data.coverUrl.trim()}") center / cover no-repeat`;
      } else {
        this.bannerEl.style.background = this.data.gradient || COVER_GRADIENTS[0].css;
      }
    }
    if (this.iconEl) {
      this.iconEl.textContent = this.data.icon || '📄';
    }
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-cover-builder';

    const banner = document.createElement('div');
    banner.className = 'editor-cover-banner';
    this.bannerEl = banner;

    const iconBadge = document.createElement('div');
    iconBadge.className = 'editor-cover-icon';
    this.iconEl = iconBadge;

    const controls = document.createElement('div');
    controls.className = 'editor-cover-controls';

    const presets = document.createElement('div');
    presets.className = 'editor-cover-presets';
    for (const g of COVER_GRADIENTS) {
      const sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'excalidraw-swatch';
      sw.style.background = g.css;
      sw.title = g.label;
      sw.addEventListener('click', () => {
        this.data.coverUrl = '';
        urlIn.value = '';
        this.data.gradient = g.css;
        this.syncBanner();
      });
      presets.appendChild(sw);
    }

    const iconIn = document.createElement('input');
    iconIn.type = 'text';
    iconIn.className = 'cdx-input editor-form-input';
    iconIn.placeholder = 'Icon';
    iconIn.value = this.data.icon || '';
    iconIn.style.width = '56px';
    iconIn.style.textAlign = 'center';
    iconIn.addEventListener('input', () => {
      this.data.icon = iconIn.value;
      this.syncBanner();
    });

    const urlIn = document.createElement('input');
    urlIn.type = 'url';
    urlIn.className = 'cdx-input editor-form-input';
    urlIn.placeholder = 'Cover image URL (or pick a gradient)';
    urlIn.value = this.data.coverUrl || '';
    urlIn.addEventListener('input', () => {
      this.data.coverUrl = urlIn.value;
      this.syncBanner();
    });

    controls.append(presets, iconIn, urlIn);

    const meta = document.createElement('div');
    meta.className = 'editor-cover-meta';

    const titleIn = document.createElement('input');
    titleIn.type = 'text';
    titleIn.className = 'editor-cover-title-input';
    titleIn.placeholder = 'Document title...';
    titleIn.value = this.data.title;
    titleIn.addEventListener('input', () => {
      this.data.title = titleIn.value;
    });

    const subIn = document.createElement('input');
    subIn.type = 'text';
    subIn.className = 'editor-cover-sub-input';
    subIn.placeholder = 'Optional subtitle or summary...';
    subIn.value = this.data.subtitle || '';
    subIn.addEventListener('input', () => {
      this.data.subtitle = subIn.value;
    });

    meta.append(titleIn, subIn);
    this.syncBanner();
    wrap.append(banner, iconBadge, controls, meta);
    return wrap;
  }

  save(): PageCoverData {
    return {
      coverUrl: this.data.coverUrl?.trim() || '',
      gradient: this.data.gradient || COVER_GRADIENTS[0].css,
      icon: this.data.icon?.trim() || '📄',
      title: this.data.title.trim() || 'Untitled Document',
      subtitle: this.data.subtitle?.trim() || '',
    };
  }
}

export interface FlashcardItem {
  front: string;
  back: string;
}

export interface FlashcardData {
  title?: string;
  cards: FlashcardItem[];
}

export class FlashcardTool {
  private data: FlashcardData;
  private listEl: HTMLElement | null = null;

  static get toolbox() {
    return {
      title: 'Flashcards',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h6"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<FlashcardData> }) {
    this.data = {
      title: data?.title ?? 'Study Flashcards',
      cards:
        Array.isArray(data?.cards) && data.cards.length > 0
          ? data.cards
          : [
              { front: 'What is tree-shaking?', back: 'Eliminating unused exports during bundling.' },
              { front: 'What does BlockRenderer do?', back: 'Converts Editor.js JSON blocks into interactive HTML.' },
            ],
    };
  }

  private renderCards() {
    const list = this.listEl;
    if (!list) return;
    list.innerHTML = '';

    this.data.cards.forEach((card, idx) => {
      const row = document.createElement('div');
      row.className = 'editor-flashcard-edit-row';

      const frontIn = document.createElement('input');
      frontIn.type = 'text';
      frontIn.className = 'cdx-input editor-form-input';
      frontIn.placeholder = `Card ${idx + 1} front`;
      frontIn.value = card.front;
      frontIn.addEventListener('input', () => {
        card.front = frontIn.value;
      });

      const backIn = document.createElement('input');
      backIn.type = 'text';
      backIn.className = 'cdx-input editor-form-input';
      backIn.placeholder = `Card ${idx + 1} back`;
      backIn.value = card.back;
      backIn.addEventListener('input', () => {
        card.back = backIn.value;
      });

      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'excalidraw-btn editor-form-remove';
      rm.textContent = '×';
      rm.addEventListener('click', () => {
        this.data.cards.splice(idx, 1);
        this.renderCards();
      });

      row.append(frontIn, backIn, rm);
      list.appendChild(row);
    });
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-form-builder';

    const titleIn = document.createElement('input');
    titleIn.type = 'text';
    titleIn.className = 'cdx-input editor-form-title-input';
    titleIn.placeholder = 'Flashcard deck title';
    titleIn.value = this.data.title || '';
    titleIn.style.marginBottom = '10px';
    titleIn.addEventListener('input', () => {
      this.data.title = titleIn.value;
    });

    const listEl = document.createElement('div');
    listEl.className = 'editor-form-fields-list';
    this.listEl = listEl;
    this.renderCards();

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'excalidraw-btn';
    addBtn.textContent = '+ Add Flashcard';
    addBtn.addEventListener('click', () => {
      this.data.cards.push({ front: '', back: '' });
      this.renderCards();
    });

    wrap.append(titleIn, listEl, addBtn);
    return wrap;
  }

  save(): FlashcardData {
    return {
      title: this.data.title?.trim() || '',
      cards: this.data.cards.filter((c) => c.front.trim().length > 0),
    };
  }
}

export class SettingsTriggerTool {
  private api: { blocks: { getCurrentBlockIndex: () => number; delete: (index?: number) => void } };

  static get toolbox() {
    return {
      title: 'Settings',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    };
  }

  constructor({ api }: { api: SettingsTriggerTool['api'] }) {
    this.api = api;
  }

  render(): HTMLElement {
    const el = document.createElement('div');
    el.style.display = 'none';
    queueMicrotask(() => {
      el.dispatchEvent(new CustomEvent('nextgen-open-settings', { bubbles: true }));
      try {
        const idx = this.api.blocks.getCurrentBlockIndex();
        if (idx >= 0) this.api.blocks.delete(idx);
      } catch {
        // ignore
      }
    });
    return el;
  }

  save() {
    return {};
  }
}

export interface UploadBlockData {
  url: string;
  name: string;
  size: number;
  mime?: string;
}

export class UploadTool {
  private data: UploadBlockData;
  private statusEl: HTMLElement | null = null;
  private previewEl: HTMLElement | null = null;

  static get toolbox() {
    return {
      title: 'Upload',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<UploadBlockData> }) {
    this.data = {
      url: data?.url ?? '',
      name: data?.name ?? '',
      size: typeof data?.size === 'number' ? data.size : 0,
      mime: data?.mime ?? '',
    };
  }

  private formatBytes(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private updatePreview() {
    if (!this.previewEl) return;
    this.previewEl.innerHTML = '';
    if (!this.data.url) return;

    const card = document.createElement('div');
    card.className = 'editor-upload-file-row';

    const meta = document.createElement('div');
    meta.className = 'editor-upload-meta';
    const title = document.createElement('strong');
    title.textContent = this.data.name || 'Uploaded file';
    const sub = document.createElement('span');
    sub.textContent = [this.data.mime, this.formatBytes(this.data.size)]
      .filter(Boolean)
      .join(' • ');
    meta.append(title, sub);

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'excalidraw-btn';
    clearBtn.textContent = 'Remove';
    clearBtn.addEventListener('click', () => {
      this.data = { url: '', name: '', size: 0, mime: '' };
      this.updatePreview();
    });

    card.append(meta, clearBtn);
    this.previewEl.appendChild(card);

    if (this.data.mime?.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = this.data.url;
      img.alt = this.data.name;
      img.className = 'editor-upload-img-preview';
      this.previewEl.appendChild(img);
    }
  }

  private async handleFile(file: File) {
    if (this.statusEl) this.statusEl.textContent = `Uploading ${file.name}…`;
    let resolvedUrl: string | null = null;

    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (res.ok) {
        const json = (await res.json()) as { url?: string };
        resolvedUrl = json.url || null;
      }
    } catch {
      // fall back to local data URL when no upload endpoint is present
    }

    if (!resolvedUrl) {
      resolvedUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    }

    this.data = {
      url: resolvedUrl,
      name: file.name,
      size: file.size,
      mime: file.type,
    };
    if (this.statusEl) this.statusEl.textContent = 'Ready';
    this.updatePreview();
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-upload-tool';

    const drop = document.createElement('label');
    drop.className = 'editor-upload-dropzone';

    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) void this.handleFile(file);
    });

    const label = document.createElement('span');
    label.textContent = 'Click to choose a file or drag & drop here';

    const status = document.createElement('small');
    status.className = 'editor-upload-status';
    this.statusEl = status;

    drop.addEventListener('dragover', (e) => {
      e.preventDefault();
      drop.classList.add('is-dragover');
    });
    drop.addEventListener('dragleave', () => {
      drop.classList.remove('is-dragover');
    });
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('is-dragover');
      const file = e.dataTransfer?.files?.[0];
      if (file) void this.handleFile(file);
    });

    drop.append(input, label, status);

    const preview = document.createElement('div');
    preview.className = 'editor-upload-preview';
    this.previewEl = preview;
    this.updatePreview();

    wrap.append(drop, preview);
    return wrap;
  }

  save(): UploadBlockData {
    return {
      url: this.data.url,
      name: this.data.name,
      size: this.data.size,
      mime: this.data.mime,
    };
  }
}

export type CalloutTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface CalloutData {
  icon: string;
  title?: string;
  text: string;
  tone: CalloutTone;
}

export class CalloutTool {
  private data: CalloutData;

  static get toolbox() {
    return {
      title: 'Callout',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1.2 2.3h5.6c.2-1.1.6-1.8 1.2-2.3A7 7 0 0 0 12 2z"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<CalloutData> }) {
    this.data = {
      icon: data?.icon ?? '💡',
      title: data?.title ?? '',
      text: data?.text ?? '',
      tone: (data?.tone as CalloutTone) || 'neutral',
    };
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = `editor-callout-builder is-${this.data.tone}`;

    const top = document.createElement('div');
    top.className = 'editor-callout-top';

    const iconIn = document.createElement('input');
    iconIn.type = 'text';
    iconIn.className = 'cdx-input editor-callout-icon-in';
    iconIn.value = this.data.icon;
    iconIn.placeholder = '💡';
    iconIn.addEventListener('input', () => {
      this.data.icon = iconIn.value || '💡';
    });

    const titleIn = document.createElement('input');
    titleIn.type = 'text';
    titleIn.className = 'cdx-input editor-form-input';
    titleIn.placeholder = 'Callout title (optional)...';
    titleIn.value = this.data.title || '';
    titleIn.addEventListener('input', () => {
      this.data.title = titleIn.value;
    });

    const toneSel = document.createElement('select');
    toneSel.className = 'cdx-input editor-form-select';
    (['neutral', 'info', 'success', 'warning', 'danger'] as CalloutTone[]).forEach((t) => {
      const o = document.createElement('option');
      o.value = t;
      o.textContent = t;
      if (this.data.tone === t) o.selected = true;
      toneSel.appendChild(o);
    });
    toneSel.addEventListener('change', () => {
      this.data.tone = toneSel.value as CalloutTone;
      wrap.className = `editor-callout-builder is-${this.data.tone}`;
    });

    top.append(iconIn, titleIn, toneSel);

    const bodyIn = document.createElement('textarea');
    bodyIn.className = 'cdx-input editor-form-input';
    bodyIn.rows = 2;
    bodyIn.placeholder = 'Write a highlighted callout note...';
    bodyIn.value = this.data.text;
    bodyIn.addEventListener('input', () => {
      this.data.text = bodyIn.value;
    });

    wrap.append(top, bodyIn);
    return wrap;
  }

  save(): CalloutData {
    return {
      icon: this.data.icon.trim() || '💡',
      title: this.data.title?.trim() || '',
      text: this.data.text.trim(),
      tone: this.data.tone,
    };
  }
}

export interface HotkeyData {
  keys: string;
  label?: string;
}

export class HotkeyTool {
  private data: HotkeyData;
  private previewEl: HTMLElement | null = null;

  static get toolbox() {
    return {
      title: 'Hotkey',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h2M10 10h2M14 10h4M7 14h10"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<HotkeyData> }) {
    this.data = {
      keys: data?.keys ?? 'Ctrl + K',
      label: data?.label ?? 'Open command menu',
    };
  }

  private renderPreview() {
    const el = this.previewEl;
    if (!el) return;
    el.innerHTML = '';
    const parts = this.data.keys
      .split('+')
      .map((k) => k.trim())
      .filter(Boolean);
    parts.forEach((part, idx) => {
      if (idx > 0) {
        const plus = document.createElement('span');
        plus.className = 'editor-hotkey-plus';
        plus.textContent = '+';
        el.appendChild(plus);
      }
      const kbd = document.createElement('kbd');
      kbd.className = 'editor-kbd';
      kbd.textContent = part;
      el.appendChild(kbd);
    });
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-form-builder';

    const row = document.createElement('div');
    row.className = 'editor-hotkey-edit-row';

    const keysIn = document.createElement('input');
    keysIn.type = 'text';
    keysIn.className = 'cdx-input editor-form-input';
    keysIn.placeholder = 'e.g. Ctrl + Shift + P';
    keysIn.value = this.data.keys;
    keysIn.addEventListener('input', () => {
      this.data.keys = keysIn.value;
      this.renderPreview();
    });

    const recordBtn = document.createElement('button');
    recordBtn.type = 'button';
    recordBtn.className = 'excalidraw-btn';
    recordBtn.textContent = 'Record';
    recordBtn.addEventListener('click', () => {
      recordBtn.textContent = 'Press keys…';
      recordBtn.classList.add('is-active');
      const onKey = (e: KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const mods: string[] = [];
        if (e.ctrlKey) mods.push('Ctrl');
        if (e.metaKey) mods.push('Cmd');
        if (e.altKey) mods.push('Alt');
        if (e.shiftKey) mods.push('Shift');
        const key = e.key;
        if (!['Control', 'Meta', 'Alt', 'Shift'].includes(key)) {
          mods.push(key.length === 1 ? key.toUpperCase() : key);
          this.data.keys = mods.join(' + ');
          keysIn.value = this.data.keys;
          this.renderPreview();
          window.removeEventListener('keydown', onKey, true);
          recordBtn.textContent = 'Record';
          recordBtn.classList.remove('is-active');
        }
      };
      window.addEventListener('keydown', onKey, true);
    });

    const labelIn = document.createElement('input');
    labelIn.type = 'text';
    labelIn.className = 'cdx-input editor-form-input';
    labelIn.placeholder = 'Action description (optional)';
    labelIn.value = this.data.label || '';
    labelIn.addEventListener('input', () => {
      this.data.label = labelIn.value;
    });

    row.append(keysIn, recordBtn, labelIn);

    const preview = document.createElement('div');
    preview.className = 'editor-hotkey-preview';
    this.previewEl = preview;
    this.renderPreview();

    wrap.append(row, preview);
    return wrap;
  }

  save(): HotkeyData {
    return {
      keys: this.data.keys.trim() || 'Ctrl + K',
      label: this.data.label?.trim() || '',
    };
  }
}

export interface EmojiBlockData {
  emoji: string;
  label?: string;
  size: 'sm' | 'md' | 'lg';
}

const EMOJI_PRESETS: Array<{ em: string; name: string }> = [
  { em: '😀', name: 'grin smile happy' }, { em: '😂', name: 'joy laugh' },
  { em: '😎', name: 'cool sunglasses' }, { em: '🥳', name: 'party celebrate' },
  { em: '🤔', name: 'think hmm' }, { em: '🤩', name: 'star eyes excited' },
  { em: '🙌', name: 'hands celebrate' }, { em: '👍', name: 'thumbs up like' },
  { em: '👏', name: 'clap applause' }, { em: '🙏', name: 'thanks pray' },
  { em: '🔥', name: 'fire hot lit' }, { em: '✨', name: 'sparkles magic' },
  { em: '💡', name: 'idea bulb light' }, { em: '🚀', name: 'rocket launch' },
  { em: '🎯', name: 'target goal bullseye' }, { em: '✅', name: 'check done yes' },
  { em: '⚠️', name: 'warning alert' }, { em: '❌', name: 'cross error no' },
  { em: '❤️', name: 'heart love' }, { em: '💜', name: 'purple heart' },
  { em: '📌', name: 'pin note' }, { em: '📝', name: 'memo write note' },
  { em: '📚', name: 'books docs' }, { em: '💻', name: 'laptop code dev' },
  { em: '📊', name: 'chart graph data' }, { em: '⚡', name: 'lightning fast zap' },
  { em: '🧠', name: 'brain smart think' }, { em: '🎨', name: 'art design palette' },
  { em: '🎵', name: 'music audio note' }, { em: '🌟', name: 'star glow' },
  { em: '🔍', name: 'search find magnifier' }, { em: '🔒', name: 'lock security' },
  { em: '☕', name: 'coffee cup' }, { em: '🌍', name: 'earth world globe' },
  { em: '🏆', name: 'trophy win award' }, { em: '💬', name: 'chat comment bubble' },
];

export class EmojiTool {
  private data: EmojiBlockData;

  static get toolbox() {
    return {
      title: 'Emoji',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<EmojiBlockData> }) {
    this.data = {
      emoji: data?.emoji ?? '✨',
      label: data?.label ?? '',
      size: (data?.size as EmojiBlockData['size']) || 'md',
    };
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-emoji-split';

    const leftPane = document.createElement('div');
    leftPane.className = 'editor-emoji-left';

    const previewGlyph = document.createElement('div');
    previewGlyph.className = `editor-emoji-hero is-${this.data.size}`;
    previewGlyph.textContent = this.data.emoji;

    const emojiIn = document.createElement('input');
    emojiIn.type = 'text';
    emojiIn.className = 'cdx-input editor-callout-icon-in';
    emojiIn.value = this.data.emoji;
    emojiIn.placeholder = '✨';
    emojiIn.addEventListener('input', () => {
      this.data.emoji = emojiIn.value || '✨';
      previewGlyph.textContent = this.data.emoji;
    });

    const sizeSel = document.createElement('select');
    sizeSel.className = 'cdx-input editor-form-select';
    (['sm', 'md', 'lg'] as const).forEach((s) => {
      const o = document.createElement('option');
      o.value = s;
      o.textContent = s.toUpperCase();
      if (this.data.size === s) o.selected = true;
      sizeSel.appendChild(o);
    });
    sizeSel.addEventListener('change', () => {
      this.data.size = sizeSel.value as EmojiBlockData['size'];
      previewGlyph.className = `editor-emoji-hero is-${this.data.size}`;
    });

    const row = document.createElement('div');
    row.className = 'editor-emoji-controls';
    row.append(emojiIn, sizeSel);

    const labelIn = document.createElement('input');
    labelIn.type = 'text';
    labelIn.className = 'cdx-input editor-form-input';
    labelIn.placeholder = 'Caption or reaction note...';
    labelIn.value = this.data.label || '';
    labelIn.addEventListener('input', () => {
      this.data.label = labelIn.value;
    });

    leftPane.append(previewGlyph, row, labelIn);

    const rightPane = document.createElement('div');
    rightPane.className = 'editor-emoji-picker-pane';

    const searchIn = document.createElement('input');
    searchIn.type = 'search';
    searchIn.className = 'cdx-input editor-form-input';
    searchIn.placeholder = 'Search emojis (fire, rocket, heart...)';

    const grid = document.createElement('div');
    grid.className = 'editor-emoji-grid';

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
        btn.className = `editor-emoji-btn${em === this.data.emoji ? ' is-active' : ''}`;
        btn.textContent = em;
        btn.addEventListener('click', () => {
          this.data.emoji = em;
          emojiIn.value = em;
          previewGlyph.textContent = em;
          renderGrid(searchIn.value);
        });
        grid.appendChild(btn);
      });
    };

    searchIn.addEventListener('input', () => renderGrid(searchIn.value));
    renderGrid();

    rightPane.append(searchIn, grid);
    wrap.append(leftPane, rightPane);
    return wrap;
  }

  save(): EmojiBlockData {
    return {
      emoji: this.data.emoji.trim() || '✨',
      label: this.data.label?.trim() || '',
      size: this.data.size,
    };
  }
}
