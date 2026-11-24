import { escHtml, uploadFileToBucket } from '../utils/blocksToHtml';

interface ToolOptions<T = Record<string, any>> {
  data?: T;
}

function attachUpload(
  fileInput: HTMLInputElement,
  folder: string,
  onUrl: (url: string) => void
) {
  fileInput.onchange = async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const bucketUrl = await uploadFileToBucket(file, folder);
    if (bucketUrl) {
      onUrl(bucketUrl);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onUrl(String(reader.result || ''));
    reader.readAsDataURL(file);
  };
}

export type BentoPreset = 'hero-left' | 'hero-top' | 'equal' | '2x2' | 'spotlight';
export type BentoAccent = 'default' | 'indigo' | 'emerald' | 'amber' | 'rose';

export interface BentoTile {
  kind: 'image' | 'text' | 'stat';
  url?: string;
  title?: string;
  text?: string;
  badge?: string;
  accent?: BentoAccent;
}

const BENTO_PRESETS: Array<{ id: BentoPreset; label: string; icon: string }> = [
  {
    id: 'hero-left',
    label: 'Hero left',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="10" height="18" rx="1.5"/><rect x="15" y="3" width="6" height="8" rx="1.5"/><rect x="15" y="13" width="6" height="8" rx="1.5"/></svg>',
  },
  {
    id: 'hero-top',
    label: 'Hero top',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>',
  },
  {
    id: 'equal',
    label: '3-Col',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="5" height="18" rx="1.5"/><rect x="10" y="3" width="4" height="18" rx="1.5"/><rect x="16" y="3" width="5" height="18" rx="1.5"/></svg>',
  },
  {
    id: '2x2',
    label: '2×2',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>',
  },
  {
    id: 'spotlight',
    label: 'Spotlight',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="12" height="10" rx="1.5"/><rect x="17" y="3" width="4" height="10" rx="1.5"/><rect x="3" y="15" width="8" height="6" rx="1.5"/><rect x="13" y="15" width="8" height="6" rx="1.5"/></svg>',
  },
];

const BENTO_ACCENTS: Array<{ id: BentoAccent; label: string; color: string }> = [
  { id: 'default', label: 'Default', color: '#94a3b8' },
  { id: 'indigo', label: 'Indigo', color: '#6366f1' },
  { id: 'emerald', label: 'Emerald', color: '#10b981' },
  { id: 'amber', label: 'Amber', color: '#f59e0b' },
  { id: 'rose', label: 'Rose', color: '#f43f5e' },
];

export class BentoTool {
  private data: { preset?: BentoPreset; tiles?: BentoTile[] };
  private tiles: BentoTile[];
  private preset: BentoPreset;
  private selectedIndex = 0;
  private sidebarOpen = true;

  constructor(options: ToolOptions<{ preset?: BentoPreset; tiles?: BentoTile[] }>) {
    this.data = options.data || {};
    this.preset = this.data.preset || 'hero-left';
    this.tiles =
      Array.isArray(this.data.tiles) && this.data.tiles.length
        ? this.data.tiles.map((t) => ({ ...t }))
        : [
            { kind: 'image', url: '', title: 'Hero showcase', badge: 'Featured', accent: 'indigo' },
            { kind: 'stat', title: '99.9%', text: 'Uptime reliability across regions', badge: 'Metric', accent: 'emerald' },
            { kind: 'text', title: 'Fast & modular', text: 'Click any bento card to edit it in the mini sidebar.', accent: 'default' },
          ];
  }

  static get toolbox() {
    return {
      title: 'Bento grid',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="18" rx="1.5"/><rect x="14" y="3" width="7" height="8" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    };
  }

  render() {
    const root = document.createElement('div');
    root.className = 'editor-bento-shell';

    const header = document.createElement('div');
    header.className = 'editor-bento-header';

    const titleEl = document.createElement('div');
    titleEl.className = 'editor-bento-header-title';
    titleEl.innerHTML = '<span>Bento Grid</span>';

    const headerActions = document.createElement('div');
    headerActions.className = 'editor-bento-header-actions';

    const addQuickBtn = document.createElement('button');
    addQuickBtn.type = 'button';
    addQuickBtn.className = 'b2';
    addQuickBtn.textContent = '+ Card';

    const toggleSidebarBtn = document.createElement('button');
    toggleSidebarBtn.type = 'button';
    toggleSidebarBtn.className = 'b2 p';
    toggleSidebarBtn.textContent = 'Mini Sidebar';

    headerActions.append(addQuickBtn, toggleSidebarBtn);
    header.append(titleEl, headerActions);

    const workspace = document.createElement('div');
    workspace.className = 'editor-bento-workspace';

    const canvas = document.createElement('div');
    canvas.className = 'editor-bento-canvas';

    const sidebar = document.createElement('aside');
    sidebar.className = 'editor-bento-sidebar';

    const drawCanvas = () => {
      canvas.innerHTML = '';
      const grid = document.createElement('div');
      grid.className = `editor-bento preset-${this.preset}`;

      this.tiles.forEach((tile, idx) => {
        const card = document.createElement('div');
        const accent = tile.accent || 'default';
        card.className = `editor-bento-tile is-${tile.kind} accent-${accent}${
          idx === 0 ? ' hero' : ''
        }${idx === this.selectedIndex ? ' is-selected' : ''}`;
        card.onclick = () => {
          this.selectedIndex = idx;
          if (!this.sidebarOpen) {
            this.sidebarOpen = true;
            syncSidebarVisibility();
          }
          drawCanvas();
          drawSidebar();
        };

        if (tile.badge) {
          const badge = document.createElement('span');
          badge.className = 'editor-bento-badge';
          badge.textContent = tile.badge;
          card.appendChild(badge);
        }

        if (tile.kind === 'image') {
          if (tile.url) {
            const img = document.createElement('img');
            img.src = tile.url;
            img.alt = tile.title || '';
            card.appendChild(img);
          } else {
            const empty = document.createElement('div');
            empty.className = 'editor-bento-empty';
            empty.innerHTML =
              '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg><span>Add image</span>';
            card.appendChild(empty);
          }
          if (tile.title) {
            const cap = document.createElement('div');
            cap.className = 'editor-bento-caption';
            cap.textContent = tile.title;
            card.appendChild(cap);
          }
        } else if (tile.kind === 'stat') {
          const val = document.createElement('strong');
          val.className = 'editor-bento-stat-value';
          val.textContent = tile.title || '0';
          const desc = document.createElement('p');
          desc.textContent = tile.text || 'Metric description';
          card.append(val, desc);
        } else {
          const heading = document.createElement('strong');
          heading.textContent = tile.title || 'Card title';
          const body = document.createElement('p');
          body.textContent = tile.text || 'Click to edit card text...';
          card.append(heading, body);
        }

        grid.appendChild(card);
      });

      canvas.appendChild(grid);
    };

    const drawSidebar = () => {
      sidebar.innerHTML = '';

      if (this.selectedIndex >= this.tiles.length) {
        this.selectedIndex = Math.max(0, this.tiles.length - 1);
      }

      // 1. Layout Presets section
      const presetSec = document.createElement('div');
      presetSec.className = 'editor-bento-sb-section';
      const presetLbl = document.createElement('div');
      presetLbl.className = 'editor-bento-sb-label';
      presetLbl.textContent = 'Layout';
      const presetGrid = document.createElement('div');
      presetGrid.className = 'editor-bento-preset-grid';

      BENTO_PRESETS.forEach((p) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `editor-bento-preset-btn${this.preset === p.id ? ' is-active' : ''}`;
        btn.title = p.label;
        btn.innerHTML = `${p.icon}<span>${p.label}</span>`;
        btn.onclick = () => {
          this.preset = p.id;
          drawCanvas();
          drawSidebar();
        };
        presetGrid.appendChild(btn);
      });
      presetSec.append(presetLbl, presetGrid);

      // 2. Cards strip
      const cardsSec = document.createElement('div');
      cardsSec.className = 'editor-bento-sb-section';
      const cardsHead = document.createElement('div');
      cardsHead.className = 'editor-bento-sb-head';
      const cardsLbl = document.createElement('span');
      cardsLbl.className = 'editor-bento-sb-label';
      cardsLbl.textContent = `Cards (${this.tiles.length})`;
      const addCardMini = document.createElement('button');
      addCardMini.type = 'button';
      addCardMini.className = 'b2';
      addCardMini.textContent = '+';
      addCardMini.title = 'Add card';
      addCardMini.onclick = () => {
        this.tiles.push({ kind: 'text', title: 'New card', text: 'Details...', accent: 'default' });
        this.selectedIndex = this.tiles.length - 1;
        drawCanvas();
        drawSidebar();
      };
      cardsHead.append(cardsLbl, addCardMini);

      const pillRow = document.createElement('div');
      pillRow.className = 'editor-bento-card-pills';
      this.tiles.forEach((t, idx) => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = `editor-bento-card-pill${idx === this.selectedIndex ? ' is-active' : ''}`;
        pill.textContent = `${idx + 1}`;
        pill.title = t.title || `Card ${idx + 1}`;
        pill.onclick = () => {
          this.selectedIndex = idx;
          drawCanvas();
          drawSidebar();
        };
        pillRow.appendChild(pill);
      });
      cardsSec.append(cardsHead, pillRow);

      sidebar.append(presetSec, cardsSec);

      // 3. Selected Card Inspector
      const activeTile = this.tiles[this.selectedIndex];
      if (!activeTile) return;

      const inspSec = document.createElement('div');
      inspSec.className = 'editor-bento-sb-section';

      const inspHead = document.createElement('div');
      inspHead.className = 'editor-bento-sb-head';
      const inspLbl = document.createElement('span');
      inspLbl.className = 'editor-bento-sb-label';
      inspLbl.textContent = `Card #${this.selectedIndex + 1}`;

      const inspActions = document.createElement('div');
      inspActions.className = 'editor-bento-sb-mini-actions';

      const moveUpBtn = document.createElement('button');
      moveUpBtn.type = 'button';
      moveUpBtn.className = 'b2';
      moveUpBtn.textContent = '↑';
      moveUpBtn.title = 'Move earlier';
      moveUpBtn.disabled = this.selectedIndex === 0;
      moveUpBtn.onclick = () => {
        if (this.selectedIndex <= 0) return;
        const i = this.selectedIndex;
        [this.tiles[i - 1], this.tiles[i]] = [this.tiles[i], this.tiles[i - 1]];
        this.selectedIndex = i - 1;
        drawCanvas();
        drawSidebar();
      };

      const rmBtn = document.createElement('button');
      rmBtn.type = 'button';
      rmBtn.className = 'b2';
      rmBtn.textContent = '×';
      rmBtn.title = 'Remove card';
      rmBtn.disabled = this.tiles.length <= 1;
      rmBtn.onclick = () => {
        if (this.tiles.length <= 1) return;
        this.tiles.splice(this.selectedIndex, 1);
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        drawCanvas();
        drawSidebar();
      };

      inspActions.append(moveUpBtn, rmBtn);
      inspHead.append(inspLbl, inspActions);

      const kindSel = document.createElement('select');
      kindSel.className = 'cdx-input editor-form-select';
      kindSel.innerHTML =
        '<option value="image">Image card</option><option value="text">Text card</option><option value="stat">Stat card</option>';
      kindSel.value = activeTile.kind || 'image';
      kindSel.onchange = () => {
        activeTile.kind = kindSel.value as BentoTile['kind'];
        drawCanvas();
        drawSidebar();
      };

      const badgeIn = document.createElement('input');
      badgeIn.type = 'text';
      badgeIn.className = 'cdx-input editor-form-input';
      badgeIn.placeholder = 'Badge (optional, e.g. New)';
      badgeIn.value = activeTile.badge || '';
      badgeIn.oninput = () => {
        activeTile.badge = badgeIn.value;
        drawCanvas();
      };

      const titleIn = document.createElement('input');
      titleIn.type = 'text';
      titleIn.className = 'cdx-input editor-form-input';
      titleIn.placeholder =
        activeTile.kind === 'stat' ? 'Metric (e.g. 99.9%)' : 'Card title';
      titleIn.value = activeTile.title || '';
      titleIn.oninput = () => {
        activeTile.title = titleIn.value;
        drawCanvas();
      };

      inspSec.append(inspHead, kindSel, badgeIn, titleIn);

      if (activeTile.kind === 'image') {
        const urlIn = document.createElement('input');
        urlIn.type = 'url';
        urlIn.className = 'cdx-input editor-form-input';
        urlIn.placeholder = 'Image URL';
        urlIn.value = activeTile.url || '';
        urlIn.oninput = () => {
          activeTile.url = urlIn.value.trim();
          drawCanvas();
        };

        const fileIn = document.createElement('input');
        fileIn.type = 'file';
        fileIn.accept = 'image/*';
        fileIn.className = 'editor-bento-file-in';
        attachUpload(fileIn, 'writing', (url) => {
          activeTile.url = url;
          urlIn.value = url;
          drawCanvas();
        });
        inspSec.append(urlIn, fileIn);
      } else {
        const textIn = document.createElement('textarea');
        textIn.rows = 2;
        textIn.className = 'cdx-input editor-form-input';
        textIn.placeholder =
          activeTile.kind === 'stat' ? 'Metric label...' : 'Card description...';
        textIn.value = activeTile.text || '';
        textIn.oninput = () => {
          activeTile.text = textIn.value;
          drawCanvas();
        };
        inspSec.appendChild(textIn);
      }

      // Accent dots
      const accentRow = document.createElement('div');
      accentRow.className = 'editor-bento-accent-row';
      BENTO_ACCENTS.forEach((a) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.title = a.label;
        dot.className = `editor-bento-accent-dot${
          (activeTile.accent || 'default') === a.id ? ' is-active' : ''
        }`;
        dot.style.background = a.color;
        dot.onclick = () => {
          activeTile.accent = a.id;
          drawCanvas();
          drawSidebar();
        };
        accentRow.appendChild(dot);
      });
      inspSec.appendChild(accentRow);

      sidebar.appendChild(inspSec);
    };

    const syncSidebarVisibility = () => {
      workspace.classList.toggle('is-sidebar-collapsed', !this.sidebarOpen);
      toggleSidebarBtn.className = `b2${this.sidebarOpen ? ' p' : ''}`;
    };

    toggleSidebarBtn.onclick = () => {
      this.sidebarOpen = !this.sidebarOpen;
      syncSidebarVisibility();
    };

    addQuickBtn.onclick = () => {
      this.tiles.push({ kind: 'text', title: 'New card', text: 'Card details...', accent: 'default' });
      this.selectedIndex = this.tiles.length - 1;
      if (!this.sidebarOpen) {
        this.sidebarOpen = true;
        syncSidebarVisibility();
      }
      drawCanvas();
      drawSidebar();
    };

    drawCanvas();
    drawSidebar();
    syncSidebarVisibility();

    workspace.append(canvas, sidebar);
    root.append(header, workspace);
    return root;
  }

  save() {
    return {
      preset: this.preset,
      tiles: this.tiles,
    };
  }
}

export interface CarouselSlideItem {
  url: string;
  caption?: string;
}

export class CarouselTool {
  private items: CarouselSlideItem[];

  constructor(options: ToolOptions<{ items?: Array<string | CarouselSlideItem> }>) {
    const raw = options.data?.items || [];
    this.items = raw.length
      ? raw.map((it) => (typeof it === 'string' ? { url: it, caption: '' } : { ...it }))
      : [{ url: '', caption: '' }];
  }

  static get toolbox() {
    return {
      title: 'Carousel',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="12" height="16" rx="2"/><path d="M2 8v8"/><path d="M22 8v8"/></svg>',
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

        const urlIn = document.createElement('input');
        urlIn.type = 'url';
        urlIn.placeholder = `Slide ${idx + 1} image URL`;
        urlIn.value = item.url || '';
        urlIn.oninput = () => {
          item.url = urlIn.value.trim();
        };

        const rmBtn = document.createElement('button');
        rmBtn.type = 'button';
        rmBtn.className = 'b2';
        rmBtn.textContent = '×';
        rmBtn.onclick = () => {
          this.items.splice(idx, 1);
          draw();
        };

        top.append(urlIn, rmBtn);

        const capIn = document.createElement('input');
        capIn.type = 'text';
        capIn.placeholder = 'Optional caption';
        capIn.value = item.caption || '';
        capIn.oninput = () => {
          item.caption = capIn.value;
        };

        const fileIn = document.createElement('input');
        fileIn.type = 'file';
        fileIn.accept = 'image/*';
        attachUpload(fileIn, 'writing', (url) => {
          item.url = url;
          urlIn.value = url;
        });

        row.append(top, fileIn, capIn);
        list.appendChild(row);
      });
    };

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'b2';
    addBtn.textContent = '+ Add slide image';
    addBtn.onclick = () => {
      this.items.push({ url: '', caption: '' });
      draw();
    };

    draw();
    root.append(list, addBtn);
    return root;
  }

  save() {
    return {
      items: this.items.filter((i) => i.url.trim()),
    };
  }
}

export class CompareTool {
  private data: {
    beforeUrl?: string;
    afterUrl?: string;
    beforeLabel?: string;
    afterLabel?: string;
  };

  constructor(
    options: ToolOptions<{
      beforeUrl?: string;
      afterUrl?: string;
      beforeLabel?: string;
      afterLabel?: string;
    }>
  ) {
    this.data = {
      beforeUrl: options.data?.beforeUrl || '',
      afterUrl: options.data?.afterUrl || '',
      beforeLabel: options.data?.beforeLabel || 'Before',
      afterLabel: options.data?.afterLabel || 'After',
    };
  }

  static get toolbox() {
    return {
      title: 'Before / After',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="12" y1="2" x2="12" y2="22"/><polyline points="8 9 5 12 8 15"/><polyline points="16 9 19 12 16 15"/></svg>',
    };
  }

  render() {
    const root = document.createElement('div');
    root.className = 'block-card';
    const grid = document.createElement('div');
    grid.className = 'block-two-col';

    const makeSide = (
      sideTitle: string,
      urlKey: 'beforeUrl' | 'afterUrl',
      labelKey: 'beforeLabel' | 'afterLabel'
    ) => {
      const box = document.createElement('div');
      box.className = 'block-subrow';

      const lbl = document.createElement('input');
      lbl.type = 'text';
      lbl.placeholder = `${sideTitle} label`;
      lbl.value = this.data[labelKey] || sideTitle;
      lbl.oninput = () => {
        this.data[labelKey] = lbl.value;
      };

      const urlIn = document.createElement('input');
      urlIn.type = 'url';
      urlIn.placeholder = `${sideTitle} image URL`;
      urlIn.value = this.data[urlKey] || '';
      urlIn.oninput = () => {
        this.data[urlKey] = urlIn.value.trim();
      };

      const fileIn = document.createElement('input');
      fileIn.type = 'file';
      fileIn.accept = 'image/*';
      attachUpload(fileIn, 'writing', (url) => {
        this.data[urlKey] = url;
        urlIn.value = url;
      });

      box.append(lbl, urlIn, fileIn);
      return box;
    };

    grid.append(
      makeSide('Before', 'beforeUrl', 'beforeLabel'),
      makeSide('After', 'afterUrl', 'afterLabel')
    );
    root.appendChild(grid);
    return root;
  }

  save() {
    return this.data;
  }
}

export class LightboxGalleryTool {
  private items: string[];

  constructor(options: ToolOptions<{ items?: Array<string | { url?: string }> }>) {
    this.items = (options.data?.items || []).map((i) =>
      typeof i === 'string' ? i : i.url || ''
    );
  }

  static get toolbox() {
    return {
      title: 'Lightbox gallery',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    };
  }

  render() {
    const root = document.createElement('div');
    root.className = 'block-card';

    const urls = document.createElement('textarea');
    urls.rows = 3;
    urls.placeholder = 'Image URLs, one per line';
    urls.value = this.items.join('\n');

    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.multiple = true;

    const preview = document.createElement('div');
    preview.className = 'custom-carousel-preview';

    const paint = () => {
      this.items = urls.value
        .split(/\n+/)
        .map((u) => u.trim())
        .filter(Boolean);
      preview.innerHTML = this.items
        .map((u) => `<img src="${escHtml(u)}" alt="">`)
        .join('');
    };
    paint();
    urls.oninput = paint;

    file.onchange = async () => {
      const files = Array.from(file.files || []);
      const uploaded = await Promise.all(
        files.map(async (f) => {
          const b = await uploadFileToBucket(f, 'writing');
          if (b) return b;
          return await new Promise<string>((res) => {
            const r = new FileReader();
            r.onload = () => res(String(r.result || ''));
            r.readAsDataURL(f);
          });
        })
      );
      urls.value =
        (urls.value.trim() ? `${urls.value.trim()}\n` : '') +
        uploaded.join('\n');
      paint();
    };

    root.append(urls, file, preview);
    return root;
  }

  save() {
    return { items: this.items };
  }
}

export interface MasonryItem {
  url: string;
  caption?: string;
}

export interface MasonryData {
  columns: 2 | 3 | 4;
  items: MasonryItem[];
}

export class MasonryTool {
  private columns: 2 | 3 | 4;
  private items: MasonryItem[];

  constructor(options: ToolOptions<Partial<MasonryData>>) {
    const rawCols = Number(options.data?.columns);
    this.columns = rawCols === 2 || rawCols === 4 ? rawCols : 3;
    this.items =
      Array.isArray(options.data?.items) && options.data!.items.length > 0
        ? options.data!.items.map((it) => ({
            url: it.url || '',
            caption: it.caption || '',
          }))
        : [{ url: '', caption: '' }, { url: '', caption: '' }, { url: '', caption: '' }];
  }

  static get toolbox() {
    return {
      title: 'Masonry',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="10" rx="1.5"/><rect x="13" y="3" width="8" height="6" rx="1.5"/><rect x="3" y="15" width="8" height="6" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/></svg>',
    };
  }

  render() {
    const root = document.createElement('div');
    root.className = 'block-card';

    const bar = document.createElement('div');
    bar.className = 'block-toolbar';

    ([2, 3, 4] as const).forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `b2${this.columns === c ? ' p' : ''}`;
      btn.textContent = `${c} Cols`;
      btn.onclick = () => {
        this.columns = c;
        Array.from(bar.querySelectorAll('button[data-col]')).forEach((el) => {
          const val = Number((el as HTMLElement).dataset.col);
          el.className = `b2${val === c ? ' p' : ''}`;
        });
        drawPreview();
      };
      btn.dataset.col = String(c);
      bar.appendChild(btn);
    });

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'b2';
    addBtn.textContent = '+ Add image';

    bar.appendChild(addBtn);

    const preview = document.createElement('div');
    const rows = document.createElement('div');
    rows.className = 'block-rows';

    const drawPreview = () => {
      const valid = this.items.filter((it) => it.url.trim().length > 0);
      if (!valid.length) {
        preview.className = '';
        preview.innerHTML = '';
        return;
      }
      preview.className = `editor-masonry cols-${this.columns}`;
      preview.innerHTML = valid
        .map(
          (it) =>
            `<figure class="editor-masonry-item"><img src="${escHtml(
              it.url
            )}" alt="${escHtml(it.caption || '')}">${
              it.caption
                ? `<figcaption>${escHtml(it.caption)}</figcaption>`
                : ''
            }</figure>`
        )
        .join('');
    };

    const drawRows = () => {
      rows.innerHTML = '';
      this.items.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'block-subrow';

        const top = document.createElement('div');
        top.className = 'block-subrow-head';

        const urlIn = document.createElement('input');
        urlIn.type = 'url';
        urlIn.placeholder = `Image #${idx + 1} URL`;
        urlIn.value = item.url;
        urlIn.oninput = () => {
          item.url = urlIn.value.trim();
          drawPreview();
        };

        const capIn = document.createElement('input');
        capIn.type = 'text';
        capIn.placeholder = 'Caption (optional)';
        capIn.value = item.caption || '';
        capIn.oninput = () => {
          item.caption = capIn.value;
          drawPreview();
        };

        const rmBtn = document.createElement('button');
        rmBtn.type = 'button';
        rmBtn.className = 'b2';
        rmBtn.textContent = '×';
        rmBtn.onclick = () => {
          this.items.splice(idx, 1);
          drawRows();
          drawPreview();
        };

        top.append(urlIn, capIn, rmBtn);

        const fileIn = document.createElement('input');
        fileIn.type = 'file';
        fileIn.accept = 'image/*';
        attachUpload(fileIn, 'writing', (url) => {
          item.url = url;
          urlIn.value = url;
          drawPreview();
        });

        row.append(top, fileIn);
        rows.appendChild(row);
      });
    };

    addBtn.onclick = () => {
      this.items.push({ url: '', caption: '' });
      drawRows();
    };

    drawRows();
    drawPreview();
    root.append(bar, rows, preview);
    return root;
  }

  save(): MasonryData {
    return {
      columns: this.columns,
      items: this.items
        .map((it) => ({
          url: it.url.trim(),
          caption: it.caption?.trim() || '',
        }))
        .filter((it) => it.url.length > 0),
    };
  }
}
