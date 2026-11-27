interface ToolOptions<T = Record<string, any>> {
  data?: T;
}

export type SlideBgPreset = 'default' | 'white' | 'zinc' | 'dark' | 'gradient';
export type SlideAlign = 'left' | 'center' | 'right';
export type SlideTextTone = 'auto' | 'light' | 'dark';

export class SlidesTool {
  private content: string;
  private background: SlideBgPreset;
  private align: SlideAlign;
  private textTone: SlideTextTone;
  private textarea?: HTMLTextAreaElement;
  private rootEl?: HTMLDivElement;

  constructor(
    options: ToolOptions<{
      content?: string;
      background?: SlideBgPreset;
      align?: SlideAlign;
      textTone?: SlideTextTone;
    }>
  ) {
    this.content =
      options.data?.content ||
      '# Slide 1\nIntroduce the big idea.\n\n---\n\n# Slide 2\nKey takeaways or code.';
    this.background = options.data?.background ?? 'default';
    this.align = options.data?.align ?? 'left';
    this.textTone = options.data?.textTone ?? 'auto';
  }

  static get toolbox() {
    return {
      title: 'Slides',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    };
  }

  private applyVisualAttrs() {
    if (!this.rootEl) return;
    this.rootEl.dataset.slideBg = this.background;
    this.rootEl.dataset.slideAlign = this.align;
    this.rootEl.dataset.slideText = this.textTone;
  }

  render() {
    const root = document.createElement('div');
    root.className = 'block-card editor-slides-tool-card';
    this.rootEl = root;
    this.applyVisualAttrs();

    const hint = document.createElement('div');
    hint.className = 'block-hint';
    hint.textContent =
      'Separate slides with --- on its own line. Use the block menu (⋮) to customize background, text tone & alignment.';

    const ta = document.createElement('textarea');
    ta.rows = 7;
    ta.value = this.content;
    ta.placeholder = '# Slide 1\n...\n\n---\n\n# Slide 2\n...';
    ta.oninput = () => {
      this.content = ta.value;
    };

    root.append(hint, ta);
    this.textarea = ta;
    return root;
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
        icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>',
        isActive: this.align === 'left',
        onActivate: () => {
          this.align = 'left';
          this.applyVisualAttrs();
        },
      },
      {
        label: 'Align Center',
        icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>',
        isActive: this.align === 'center',
        onActivate: () => {
          this.align = 'center';
          this.applyVisualAttrs();
        },
      },
      {
        label: 'Align Right',
        icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>',
        isActive: this.align === 'right',
        onActivate: () => {
          this.align = 'right';
          this.applyVisualAttrs();
        },
      },
      {
        label: 'BG: Default',
        icon: '<span style="font-size:11px;font-weight:700;">D</span>',
        isActive: this.background === 'default',
        onActivate: () => {
          this.background = 'default';
          this.applyVisualAttrs();
        },
      },
      {
        label: 'BG: White',
        icon: '<span style="display:inline-block;width:12px;height:12px;border-radius:99px;background:#fff;border:1px solid #999;"></span>',
        isActive: this.background === 'white',
        onActivate: () => {
          this.background = 'white';
          this.textTone = 'dark';
          this.applyVisualAttrs();
        },
      },
      {
        label: 'BG: Soft Zinc',
        icon: '<span style="display:inline-block;width:12px;height:12px;border-radius:99px;background:#e4e4e7;border:1px solid #999;"></span>',
        isActive: this.background === 'zinc',
        onActivate: () => {
          this.background = 'zinc';
          this.textTone = 'dark';
          this.applyVisualAttrs();
        },
      },
      {
        label: 'BG: Dark',
        icon: '<span style="display:inline-block;width:12px;height:12px;border-radius:99px;background:#09090b;border:1px solid #666;"></span>',
        isActive: this.background === 'dark',
        onActivate: () => {
          this.background = 'dark';
          this.textTone = 'light';
          this.applyVisualAttrs();
        },
      },
      {
        label: 'BG: Gradient',
        icon: '<span style="display:inline-block;width:12px;height:12px;border-radius:99px;background:linear-gradient(135deg,#18181b,#52525b);"></span>',
        isActive: this.background === 'gradient',
        onActivate: () => {
          this.background = 'gradient';
          this.textTone = 'light';
          this.applyVisualAttrs();
        },
      },
      {
        label: 'Text: Dark',
        icon: '<span style="font-size:11px;font-weight:700;">T</span>',
        isActive: this.textTone === 'dark',
        onActivate: () => {
          this.textTone = 'dark';
          this.applyVisualAttrs();
        },
      },
      {
        label: 'Text: Light',
        icon: '<span style="font-size:11px;font-weight:700;opacity:0.65;">T</span>',
        isActive: this.textTone === 'light',
        onActivate: () => {
          this.textTone = 'light';
          this.applyVisualAttrs();
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

  save() {
    return {
      content: this.textarea?.value ?? this.content,
      background: this.background,
      align: this.align,
      textTone: this.textTone,
    };
  }
}

export interface TabItem {
  label: string;
  content: string;
}

export class TabsTool {
  private tabs: TabItem[];

  constructor(options: ToolOptions<{ tabs?: TabItem[] }>) {
    this.tabs =
      Array.isArray(options.data?.tabs) && options.data!.tabs.length
        ? options.data!.tabs.map((t) => ({ ...t }))
        : [
            { label: 'Overview', content: '' },
            { label: 'Specs', content: '' },
            { label: 'Notes', content: '' },
          ];
  }

  static get toolbox() {
    return {
      title: 'Tabs',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M9 4v6"/><path d="M15 4v6"/></svg>',
    };
  }

  render() {
    const root = document.createElement('div');
    root.className = 'block-card';
    const list = document.createElement('div');
    list.className = 'block-rows';

    const draw = () => {
      list.innerHTML = '';
      this.tabs.forEach((tab, idx) => {
        const row = document.createElement('div');
        row.className = 'block-subrow';

        const top = document.createElement('div');
        top.className = 'block-subrow-head';

        const lbl = document.createElement('input');
        lbl.type = 'text';
        lbl.placeholder = `Tab ${idx + 1} label`;
        lbl.value = tab.label;
        lbl.oninput = () => {
          tab.label = lbl.value;
        };

        const rmBtn = document.createElement('button');
        rmBtn.type = 'button';
        rmBtn.className = 'b2';
        rmBtn.textContent = '×';
        rmBtn.onclick = () => {
          this.tabs.splice(idx, 1);
          draw();
        };

        top.append(lbl, rmBtn);

        const body = document.createElement('textarea');
        body.rows = 3;
        body.placeholder = 'Tab panel content...';
        body.value = tab.content;
        body.oninput = () => {
          tab.content = body.value;
        };

        row.append(top, body);
        list.appendChild(row);
      });
    };

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'b2';
    addBtn.textContent = '+ Add tab';
    addBtn.onclick = () => {
      this.tabs.push({ label: `Tab ${this.tabs.length + 1}`, content: '' });
      draw();
    };

    draw();
    root.append(list, addBtn);
    return root;
  }

  save() {
    return { tabs: this.tabs };
  }
}

export interface AccordionItem {
  title: string;
  body: string;
}

export class AccordionTool {
  private items: AccordionItem[];

  constructor(options: ToolOptions<{ items?: AccordionItem[] }>) {
    this.items =
      Array.isArray(options.data?.items) && options.data!.items.length
        ? options.data!.items.map((i) => ({ ...i }))
        : [
            { title: 'Question or section 1', body: '' },
            { title: 'Question or section 2', body: '' },
          ];
  }

  static get toolbox() {
    return {
      title: 'Accordion',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="5" rx="1"/><rect x="3" y="11" width="18" height="5" rx="1"/><line x1="3" y1="19" x2="21" y2="19"/></svg>',
    };
  }

  render() {
    const root = document.createElement('div');
    root.className = 'block-card';
    const list = document.createElement('div');
    list.className = 'block-rows';

    const draw = () => {
      list.innerHTML = '';
      this.items.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'block-subrow';

        const top = document.createElement('div');
        top.className = 'block-subrow-head';

        const titleIn = document.createElement('input');
        titleIn.type = 'text';
        titleIn.placeholder = `Row ${idx + 1} title`;
        titleIn.value = item.title;
        titleIn.oninput = () => {
          item.title = titleIn.value;
        };

        const rmBtn = document.createElement('button');
        rmBtn.type = 'button';
        rmBtn.className = 'b2';
        rmBtn.textContent = '×';
        rmBtn.onclick = () => {
          this.items.splice(idx, 1);
          draw();
        };

        top.append(titleIn, rmBtn);

        const bodyIn = document.createElement('textarea');
        bodyIn.rows = 2;
        bodyIn.placeholder = 'Answer / details...';
        bodyIn.value = item.body;
        bodyIn.oninput = () => {
          item.body = bodyIn.value;
        };

        row.append(top, bodyIn);
        list.appendChild(row);
      });
    };

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'b2';
    addBtn.textContent = '+ Add row';
    addBtn.onclick = () => {
      this.items.push({ title: '', body: '' });
      draw();
    };

    draw();
    root.append(list, addBtn);
    return root;
  }

  save() {
    return { items: this.items };
  }
}

export class PullQuoteTool {
  private data: { text: string; attribution: string };

  constructor(options: ToolOptions<{ text?: string; attribution?: string }>) {
    this.data = {
      text: options.data?.text || '',
      attribution: options.data?.attribution || '',
    };
  }

  static get toolbox() {
    return {
      title: 'Pull quote',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="5" x2="20" y2="5"/><path d="M7 10h4v4H7z"/><path d="M13 10h4v4h-4z"/><line x1="4" y1="19" x2="20" y2="19"/></svg>',
    };
  }

  render() {
    const root = document.createElement('div');
    root.className = 'block-card';

    const text = document.createElement('textarea');
    text.rows = 3;
    text.placeholder = 'Oversized editorial pull-quote...';
    text.value = this.data.text;
    text.oninput = () => {
      this.data.text = text.value;
    };

    const attr = document.createElement('input');
    attr.type = 'text';
    attr.placeholder = 'Attribution (optional)';
    attr.value = this.data.attribution;
    attr.oninput = () => {
      this.data.attribution = attr.value;
    };

    root.append(text, attr);
    return root;
  }

  save() {
    return this.data;
  }
}
