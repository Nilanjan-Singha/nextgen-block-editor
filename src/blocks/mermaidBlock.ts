import mermaid from 'mermaid';

export type MermaidAlign = 'left' | 'center' | 'right';
export type MermaidSize = 'small' | 'medium' | 'large' | 'full';

export interface MermaidData {
  code: string;
  caption?: string;
  align?: MermaidAlign;
  size?: MermaidSize;
}

const MERMAID_PRESETS: Record<string, string> = {
  Flowchart: `graph TD
  A[Start] --> B{Condition?}
  B -->|Yes| C[Proceed]
  B -->|No| D[Retry]`,
  Sequence: `sequenceDiagram
  User->>Editor: Type /mermaid
  Editor->>Mermaid: Render SVG
  Mermaid-->>User: Interactive Diagram`,
  Mindmap: `mindmap
  root((NextGen Editor))
    Blocks
      Mermaid
      Charts
      Code
    AI
      Rewrite
      Continue`,
};

let mermaidInitialized = false;
let mermaidCounter = 0;

function ensureMermaidInit() {
  if (mermaidInitialized) return;
  mermaidInitialized = true;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'neutral',
  });
}

export async function renderMermaidInto(container: HTMLElement, code: string): Promise<void> {
  const trimmed = code.trim();
  if (!trimmed) {
    container.innerHTML = '<span class="editor-mermaid-empty">Enter Mermaid syntax to preview</span>';
    return;
  }
  ensureMermaidInit();
  const id = `ng-mermaid-${++mermaidCounter}`;
  try {
    const { svg } = await mermaid.render(id, trimmed);
    container.innerHTML = svg;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid Mermaid syntax';
    container.innerHTML = `<pre class="editor-mermaid-error">${message.replace(/</g, '&lt;')}</pre>`;
  }
}

export class MermaidTool {
  private data: MermaidData;
  private renderSeq = 0;
  private previewEl: HTMLDivElement | null = null;

  static get toolbox() {
    return {
      title: 'Mermaid Diagram',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="9" y="15" width="6" height="6" rx="1"/><path d="M6 9v3a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9"/><path d="M12 12v3"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<MermaidData> }) {
    this.data = {
      code: data?.code ?? MERMAID_PRESETS.Flowchart,
      caption: data?.caption ?? '',
      align: data?.align ?? 'center',
      size: data?.size ?? 'small',
    };
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-mermaid-tool';

    const head = document.createElement('div');
    head.className = 'editor-mermaid-head';

    const title = document.createElement('span');
    title.className = 'editor-mermaid-label';
    title.textContent = 'Mermaid Diagram';

    const presets = document.createElement('div');
    presets.className = 'editor-mermaid-presets';
    Object.entries(MERMAID_PRESETS).forEach(([label, snippet]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'editor-mermaid-preset-btn';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        this.data.code = snippet;
        textarea.value = snippet;
        void updatePreview();
      });
      presets.appendChild(btn);
    });

    head.append(title, presets);

    const textarea = document.createElement('textarea');
    textarea.className = 'editor-mermaid-input';
    textarea.rows = 3;
    textarea.placeholder = 'graph TD\n  A --> B';
    textarea.value = this.data.code;

    const preview = document.createElement('div');
    preview.className = 'editor-mermaid-preview';
    preview.dataset.align = this.data.align || 'center';
    preview.dataset.size = this.data.size || 'small';
    this.previewEl = preview;

    const captionInput = document.createElement('input');
    captionInput.type = 'text';
    captionInput.className = 'editor-mermaid-caption cdx-input';
    captionInput.placeholder = 'Optional diagram caption';
    captionInput.value = this.data.caption || '';

    const updatePreview = async () => {
      const seq = ++this.renderSeq;
      await renderMermaidInto(preview, this.data.code);
      if (seq !== this.renderSeq) return;
    };

    textarea.addEventListener('input', () => {
      this.data.code = textarea.value;
      void updatePreview();
    });

    captionInput.addEventListener('input', () => {
      this.data.caption = captionInput.value;
    });

    void updatePreview();
    wrap.append(head, textarea, preview, captionInput);
    return wrap;
  }

  renderSettings() {
    const tunes: Array<{
      label: string;
      icon: string;
      isActive: boolean;
      onActivate: () => void;
    }> = [
      {
        label: 'Align Left',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>',
        isActive: (this.data.align || 'center') === 'left',
        onActivate: () => {
          this.data.align = 'left';
          if (this.previewEl) this.previewEl.dataset.align = 'left';
        },
      },
      {
        label: 'Align Center',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>',
        isActive: (this.data.align || 'center') === 'center',
        onActivate: () => {
          this.data.align = 'center';
          if (this.previewEl) this.previewEl.dataset.align = 'center';
        },
      },
      {
        label: 'Align Right',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>',
        isActive: (this.data.align || 'center') === 'right',
        onActivate: () => {
          this.data.align = 'right';
          if (this.previewEl) this.previewEl.dataset.align = 'right';
        },
      },
      {
        label: 'Small',
        icon: '<span style="font-size:11px;font-weight:700;">S</span>',
        isActive: (this.data.size || 'small') === 'small',
        onActivate: () => {
          this.data.size = 'small';
          if (this.previewEl) this.previewEl.dataset.size = 'small';
        },
      },
      {
        label: 'Medium',
        icon: '<span style="font-size:11px;font-weight:700;">M</span>',
        isActive: (this.data.size || 'small') === 'medium',
        onActivate: () => {
          this.data.size = 'medium';
          if (this.previewEl) this.previewEl.dataset.size = 'medium';
        },
      },
      {
        label: 'Large',
        icon: '<span style="font-size:11px;font-weight:700;">L</span>',
        isActive: (this.data.size || 'small') === 'large',
        onActivate: () => {
          this.data.size = 'large';
          if (this.previewEl) this.previewEl.dataset.size = 'large';
        },
      },
      {
        label: 'Full Page',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
        isActive: (this.data.size || 'small') === 'full',
        onActivate: () => {
          this.data.size = 'full';
          if (this.previewEl) this.previewEl.dataset.size = 'full';
        },
      },
    ];

    return tunes.map((t) => ({
      icon: t.icon,
      label: t.label,
      isActive: t.isActive,
      closeOnActivate: true,
      onActivate: t.onActivate,
    }));
  }

  save(): MermaidData {
    return {
      code: this.data.code,
      caption: this.data.caption?.trim() || undefined,
      align: this.data.align || 'center',
      size: this.data.size || 'small',
    };
  }
}
