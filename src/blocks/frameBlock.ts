import { escHtml, uploadFileToBucket } from '../utils/blocksToHtml';

export type FrameDevice = 'iphone' | 'samsung' | 'macbook' | 'laptop' | 'browser';

export interface FrameData {
  device: FrameDevice;
  contentType: 'image' | 'url';
  src: string;
  address?: string;
  caption?: string;
}

const DEVICE_OPTIONS: Array<{ id: FrameDevice; label: string }> = [
  { id: 'iphone', label: 'iPhone' },
  { id: 'samsung', label: 'Samsung' },
  { id: 'macbook', label: 'MacBook' },
  { id: 'laptop', label: 'Laptop' },
  { id: 'browser', label: 'Browser' },
];

export function renderFrameMarkup(data: Partial<FrameData>): string {
  const device: FrameDevice =
    data.device && ['iphone', 'samsung', 'macbook', 'laptop', 'browser'].includes(data.device)
      ? data.device
      : 'iphone';
  const src = String(data.src || '').trim();
  const isIframe = data.contentType === 'url';
  const inner = !src
    ? '<div class="editor-frame-empty">Add an image or URL to preview inside the device frame</div>'
    : isIframe
    ? `<iframe src="${escHtml(src)}" title="${escHtml(data.caption || device)}" loading="lazy"></iframe>`
    : `<img src="${escHtml(src)}" alt="${escHtml(data.caption || device)}" loading="lazy" />`;

  let chrome = '';
  if (device === 'iphone') {
    chrome = '<div class="editor-frame-island" aria-hidden="true"></div>';
  } else if (device === 'samsung') {
    chrome = '<div class="editor-frame-punch" aria-hidden="true"></div>';
  } else if (device === 'browser') {
    chrome = `<div class="editor-frame-browser-bar"><span class="editor-frame-dots"><i></i><i></i><i></i></span><span class="editor-frame-addr">${escHtml(
      data.address || src || 'https://example.com'
    )}</span></div>`;
  } else {
    chrome = '<div class="editor-frame-cam" aria-hidden="true"></div>';
  }

  const base =
    device === 'macbook' || device === 'laptop'
      ? '<div class="editor-frame-base" aria-hidden="true"></div>'
      : '';
  const caption = data.caption
    ? `<figcaption class="editor-frame-caption">${escHtml(data.caption)}</figcaption>`
    : '';

  return `<figure class="editor-frame-block" data-device="${device}"><div class="editor-frame-shell is-${device}">${chrome}<div class="editor-frame-screen">${inner}</div></div>${base}${caption}</figure>`;
}

export class FrameTool {
  private data: FrameData;

  static get toolbox() {
    return {
      title: 'Device Frame',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
    };
  }

  constructor({ data }: { data?: Partial<FrameData> }) {
    this.data = {
      device: data?.device ?? 'iphone',
      contentType: data?.contentType ?? 'image',
      src: data?.src ?? '',
      address: data?.address ?? 'https://nextgen-editor.dev',
      caption: data?.caption ?? '',
    };
  }

  render(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'editor-extra-card';

    const head = document.createElement('div');
    head.className = 'editor-extra-head';
    head.textContent = 'Device Mockup Frame';

    const controls = document.createElement('div');
    controls.className = 'editor-frame-controls';

    const deviceSelect = document.createElement('select');
    deviceSelect.className = 'cdx-input editor-form-select';
    DEVICE_OPTIONS.forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt.id;
      o.textContent = opt.label;
      if (this.data.device === opt.id) o.selected = true;
      deviceSelect.appendChild(o);
    });

    const typeSelect = document.createElement('select');
    typeSelect.className = 'cdx-input editor-form-select';
    [
      { id: 'image', label: 'Image / Screenshot' },
      { id: 'url', label: 'Live URL (iframe)' },
    ].forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt.id;
      o.textContent = opt.label;
      if (this.data.contentType === opt.id) o.selected = true;
      typeSelect.appendChild(o);
    });

    const srcInput = document.createElement('input');
    srcInput.type = 'url';
    srcInput.className = 'cdx-input';
    srcInput.placeholder = 'Image URL or Website URL (https://...)';
    srcInput.value = this.data.src;

    const uploadInput = document.createElement('input');
    uploadInput.type = 'file';
    uploadInput.accept = 'image/*';
    uploadInput.className = 'cdx-input';

    const addrInput = document.createElement('input');
    addrInput.type = 'text';
    addrInput.className = 'cdx-input';
    addrInput.placeholder = 'Browser address bar text (optional)';
    addrInput.value = this.data.address || '';

    const capInput = document.createElement('input');
    capInput.type = 'text';
    capInput.className = 'cdx-input';
    capInput.placeholder = 'Optional caption';
    capInput.value = this.data.caption || '';

    const preview = document.createElement('div');
    const refresh = () => {
      preview.innerHTML = renderFrameMarkup(this.data);
    };

    deviceSelect.addEventListener('change', () => {
      this.data.device = deviceSelect.value as FrameDevice;
      refresh();
    });
    typeSelect.addEventListener('change', () => {
      this.data.contentType = typeSelect.value as 'image' | 'url';
      refresh();
    });
    srcInput.addEventListener('input', () => {
      this.data.src = srcInput.value;
      refresh();
    });
    addrInput.addEventListener('input', () => {
      this.data.address = addrInput.value;
      refresh();
    });
    capInput.addEventListener('input', () => {
      this.data.caption = capInput.value;
      refresh();
    });
    uploadInput.addEventListener('change', async () => {
      const file = uploadInput.files?.[0];
      if (!file) return;
      const uploaded = await uploadFileToBucket(file, 'frames');
      if (uploaded) {
        this.data.contentType = 'image';
        typeSelect.value = 'image';
        this.data.src = uploaded;
        srcInput.value = uploaded;
        refresh();
      }
    });

    controls.append(deviceSelect, typeSelect);
    refresh();
    wrap.append(head, controls, srcInput, uploadInput, addrInput, capInput, preview);
    return wrap;
  }

  save(): FrameData {
    return {
      device: this.data.device,
      contentType: this.data.contentType,
      src: this.data.src.trim(),
      address: this.data.address?.trim() || undefined,
      caption: this.data.caption?.trim() || undefined,
    };
  }
}
