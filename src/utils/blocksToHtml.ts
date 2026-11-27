import katex from 'katex';
import type { EditorJSData } from '../types';
import {
  SUPPORTED_LANGUAGES,
  detectCodeLanguage,
  highlightCodeHtml,
} from './syntaxHighlight';

export function escHtml(value: unknown): string {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function slugify(text: unknown): string {
  return (
    String(text == null ? '' : text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'post'
  );
}

export async function uploadFileToBucket(
  file: File,
  folder = 'uploads'
): Promise<string | null> {
  try {
    const form = new FormData();
    form.append('file', file);
    form.append('folder', folder);
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: form,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { url?: string };
    return json.url || null;
  } catch {
    return null;
  }
}

export function sanitizeInlineHtml(value: unknown): string {
  if (typeof document === 'undefined') {
    return escHtml(value);
  }
  const template = document.createElement('template');
  template.innerHTML = String(value == null ? '' : value);
  const allowed = ['A', 'MARK', 'SPAN', 'U', 'S', 'STRIKE', 'CODE', 'B', 'STRONG', 'I', 'EM', 'SUP', 'SUB'];
  template.content.querySelectorAll('*').forEach((element) => {
    if (!allowed.includes(element.tagName)) {
      element.replaceWith(document.createTextNode(element.textContent || ''));
      return;
    }
    if (
      element.tagName === 'SPAN' &&
      !element.classList.contains('editor-inline-spoiler')
    ) {
      element.replaceWith(document.createTextNode(element.textContent || ''));
      return;
    }
    Array.from(element.attributes).forEach((attribute) => {
      if (element.tagName === 'A' && attribute.name === 'href') return;
      if (
        element.tagName === 'A' &&
        attribute.name === 'class' &&
        attribute.value === 'editor-mention'
      ) {
        return;
      }
      if (
        element.tagName === 'SPAN' &&
        attribute.name === 'class' &&
        attribute.value === 'editor-inline-spoiler'
      ) {
        return;
      }
      if (['target', 'rel'].includes(attribute.name) && element.tagName === 'A') return;
      element.removeAttribute(attribute.name);
    });
    if (element.tagName === 'A') {
      const href = element.getAttribute('href') || '';
      if (!/^https?:\/\//i.test(href) && !/^mailto:/i.test(href)) {
        element.removeAttribute('href');
      }
      element.setAttribute('target', '_blank');
      element.setAttribute('rel', 'noopener noreferrer');
    }
  });
  return template.innerHTML;
}

function nestedListHtml(items: unknown[]): string {
  return (items || [])
    .map((item) => {
      if (typeof item === 'string') {
        return `<li>${escHtml(item)}</li>`;
      }
      const obj = item as { content?: string; items?: unknown[] };
      const text = obj.content || '';
      const children = obj.items ? nestedListHtml(obj.items) : '';
      return `<li>${escHtml(text)}${children}</li>`;
    })
    .join('');
}

const LINK_TINTS = [
  '#4f772d',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#0d9488',
  '#e06d53',
  '#6366f1',
];

function pickLinkTint(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return LINK_TINTS[hash % LINK_TINTS.length];
}

function renderAudioCard(track: {
  url?: string;
  title?: string;
  artist?: string;
  coverUrl?: string;
}, compact = false): string {
  const url = String(track.url || '').trim();
  if (!url) return '';
  const cover = track.coverUrl
    ? `<img class="editor-audio-cover" src="${escHtml(track.coverUrl)}" alt="${escHtml(
        track.title || 'Audio cover'
      )}">`
    : `<div class="editor-audio-cover editor-audio-cover-placeholder" aria-hidden="true">♪</div>`;
  const title = escHtml(track.title || 'Untitled Track');
  const artist = track.artist
    ? `<div class="editor-audio-artist">${escHtml(track.artist)}</div>`
    : '';
  return `<div class="editor-audio-card${compact ? ' is-compact' : ''}" data-audio-player>
    ${cover}
    <div class="editor-audio-main">
      <div class="editor-audio-top">
        <div class="editor-audio-meta">
          <div class="editor-audio-title">${title}</div>
          ${artist}
        </div>
        <button type="button" class="editor-audio-play" aria-label="Play">▶</button>
      </div>
      <div class="editor-audio-controls">
        <span class="editor-audio-time" data-current>0:00</span>
        <div class="editor-audio-progress" role="slider" aria-label="Seek audio" tabindex="0">
          <div class="editor-audio-progress-fill"></div>
        </div>
        <span class="editor-audio-time" data-duration>0:00</span>
      </div>
    </div>
    <audio preload="metadata" src="${escHtml(url)}" class="editor-audio-audio"></audio>
  </div>`;
}

export function blocksToHtml(data: EditorJSData | null | undefined): string {
  if (!data || !Array.isArray(data.blocks)) return '';
  return data.blocks
    .map((block) => {
      const d = (block.data || {}) as Record<string, any>;
      if (
        block.type === 'header' ||
        block.type === 'h1' ||
        block.type === 'h2' ||
        block.type === 'h3'
      ) {
        const fallback =
          block.type === 'h1' ? 1 : block.type === 'h3' ? 3 : 2;
        const level = Math.min(6, Math.max(1, Number(d.level) || fallback));
        return `<h${level}>${sanitizeInlineHtml(d.text)}</h${level}>`;
      }
      if (block.type === 'paragraph') {
        return `<p>${sanitizeInlineHtml(d.text)}</p>`;
      }
      if (block.type === 'quote') {
        return `<blockquote>${sanitizeInlineHtml(d.text)}${
          d.caption ? `<cite>${escHtml(d.caption)}</cite>` : ''
        }</blockquote>`;
      }
      if (block.type === 'list' || block.type === 'nestedlist') {
        const tag = d.style === 'ordered' ? 'ol' : 'ul';
        return `<${tag}>${nestedListHtml(d.items || [])}</${tag}>`;
      }
      if (block.type === 'checklist') {
        return (
          '<ul class="checklist">' +
          (d.items || [])
            .map(
              (item: { checked?: boolean; text?: string }) =>
                `<li>${item.checked ? '☑' : '☐'} ${escHtml(item.text)}</li>`
            )
            .join('') +
          '</ul>'
        );
      }
      if (block.type === 'code') {
        const rawCode = String(d.code || '');
        const lang =
          d.language && d.language !== 'auto'
            ? String(d.language)
            : detectCodeLanguage(rawCode);
        const labelObj = SUPPORTED_LANGUAGES.find((l) => l.id === lang);
        const label = labelObj ? labelObj.label : lang;
        const highlighted = highlightCodeHtml(rawCode, lang);
        return `<div class="editor-code-block"><div class="editor-code-block-head"><span class="editor-code-badge">${escHtml(
          label
        )}</span><button type="button" class="editor-code-copy" data-copy-code>Copy</button></div><pre><code>${highlighted}</code></pre></div>`;
      }
      if (block.type === 'toc') {
        const title = escHtml(d.title || 'Table of Contents');
        const depth = Math.min(4, Math.max(2, Number(d.maxDepth) || 3));
        return `<nav class="editor-toc-card" data-toc-card data-toc-depth="${depth}" aria-label="${title}"><div class="editor-toc-title">${title}</div><ul class="editor-toc-list"></ul></nav>`;
      }
      if (block.type === 'table') {
        return (
          '<table>' +
          (d.content || [])
            .map((row: string[], index: number) => {
              const tag = index === 0 && d.withHeadings ? 'th' : 'td';
              return (
                '<tr>' +
                row
                  .map((cell) => `<${tag}>${sanitizeInlineHtml(cell)}</${tag}>`)
                  .join('') +
                '</tr>'
              );
            })
            .join('') +
          '</table>'
        );
      }
      if (block.type === 'linkTool') {
        const linkMeta = d.meta || {};
        const linkUrl = d.link || d.url || '';
        const thumbUrl = linkMeta.image && linkMeta.image.url ? linkMeta.image.url : '';
        if (!linkUrl) return '';
        let host = '';
        try {
          host = new URL(linkUrl).hostname.replace(/^www\./, '');
        } catch {
          host = linkUrl;
        }
        const tint = pickLinkTint(linkUrl);
        return `<a class="editor-link-preview" style="--link-tint:${tint}" href="${escHtml(
          linkUrl
        )}" target="_blank" rel="noopener noreferrer"><span class="editor-link-preview-body"><strong>${escHtml(
          linkMeta.title || d.title || linkUrl
        )}</strong><span>${escHtml(
          linkMeta.description || d.description || linkUrl
        )}</span><small>${escHtml(host)}</small></span>${
          thumbUrl
            ? `<img class="editor-link-preview-img" src="${escHtml(thumbUrl)}" alt="" loading="lazy">`
            : ''
        }</a>`;
      }
      if (
        block.type === 'image' ||
        block.type === 'inlineImage' ||
        block.type === 'simpleImage'
      ) {
        const imageUrl = d.file && d.file.url ? d.file.url : d.url || '';
        return imageUrl
          ? `<figure><img src="${escHtml(imageUrl)}" alt="${escHtml(
              d.caption
            )}"><figcaption>${escHtml(d.caption)}</figcaption></figure>`
          : '';
      }
      if (block.type === 'gallery') {
        const urls = (d.items || [])
          .map((item: string | { url?: string }) =>
            typeof item === 'string' ? item : item.url || ''
          )
          .filter(Boolean);
        if (!urls.length) return '';
        return (
          '<div class="editor-gallery">' +
          urls
            .map(
              (url: string, idx: number) =>
                `<button type="button" class="editor-gallery-item" data-gallery-idx="${idx}" data-gallery-src="${escHtml(
                  url
                )}" aria-label="View image ${idx + 1}"><img src="${escHtml(
                  url
                )}" alt="" loading="lazy"></button>`
            )
            .join('') +
          '</div>'
        );
      }
      if (block.type === 'carousel') {
        const slides = (d.items || [])
          .map((item: string | { url?: string; caption?: string }) =>
            typeof item === 'string'
              ? { url: item, caption: '' }
              : { url: item.url || '', caption: item.caption || '' }
          )
          .filter((s: { url: string }) => s.url);
        if (!slides.length) return '';
        return (
          '<div class="editor-carousel" data-carousel>' +
          '<div class="editor-carousel-track">' +
          slides
            .map(
              (s: { url: string; caption: string }, idx: number) =>
                `<figure class="editor-carousel-slide" data-slide="${idx}"><img src="${escHtml(
                  s.url
                )}" alt="${escHtml(s.caption)}" loading="lazy">${
                  s.caption
                    ? `<figcaption>${escHtml(s.caption)}</figcaption>`
                    : ''
                }</figure>`
            )
            .join('') +
          '</div>' +
          '<button type="button" class="editor-carousel-prev" aria-label="Previous slide">‹</button>' +
          '<button type="button" class="editor-carousel-next" aria-label="Next slide">›</button>' +
          '<div class="editor-carousel-dots">' +
          slides
            .map(
              (_: unknown, idx: number) =>
                `<button type="button" class="editor-carousel-dot${
                  idx === 0 ? ' active' : ''
                }" data-dot="${idx}" aria-label="Go to slide ${
                  idx + 1
                }"></button>`
            )
            .join('') +
          '</div></div>'
        );
      }
      if (block.type === 'bento') {
        const preset = ['hero-left', 'hero-top', 'equal', '2x2', 'spotlight'].includes(d.preset)
          ? d.preset
          : 'hero-left';
        const tiles = (d.tiles || []) as Array<{
          kind?: string;
          url?: string;
          title?: string;
          text?: string;
          badge?: string;
          accent?: string;
        }>;
        if (!tiles.length) return '';
        return (
          `<div class="editor-bento preset-${escHtml(preset)}">` +
          tiles
            .map((t, idx) => {
              const accent = ['indigo', 'emerald', 'amber', 'rose'].includes(t.accent || '')
                ? ` accent-${escHtml(t.accent || '')}`
                : '';
              const badgeHtml = t.badge
                ? `<span class="editor-bento-badge">${escHtml(t.badge)}</span>`
                : '';
              const cls = `editor-bento-tile${idx === 0 ? ' hero' : ''}${accent}`;
              if (t.kind === 'image' && t.url) {
                return `<figure class="${cls} is-image">${badgeHtml}<img src="${escHtml(
                  t.url
                )}" alt="${escHtml(t.title || '')}" loading="lazy">${
                  t.title
                    ? `<figcaption>${escHtml(t.title)}</figcaption>`
                    : ''
                }</figure>`;
              }
              if (t.kind === 'stat') {
                return `<div class="${cls} is-stat">${badgeHtml}${
                  t.title ? `<strong class="editor-bento-stat-value">${escHtml(t.title)}</strong>` : ''
                }${t.text ? `<p>${escHtml(t.text)}</p>` : ''}</div>`;
              }
              return `<div class="${cls} is-text">${badgeHtml}${
                t.title ? `<strong>${escHtml(t.title)}</strong>` : ''
              }${t.text ? `<p>${escHtml(t.text)}</p>` : ''}</div>`;
            })
            .join('') +
          '</div>'
        );
      }
      if (block.type === 'compare') {
        const beforeUrl = d.beforeUrl || '';
        const afterUrl = d.afterUrl || '';
        if (!beforeUrl || !afterUrl) return '';
        return (
          `<div class="editor-compare" style="--pos:50%">` +
          `<img class="editor-compare-after" src="${escHtml(
            afterUrl
          )}" alt="${escHtml(d.afterLabel || 'After')}" loading="lazy">` +
          `<div class="editor-compare-before-wrap"><img class="editor-compare-before" src="${escHtml(
            beforeUrl
          )}" alt="${escHtml(d.beforeLabel || 'Before')}" loading="lazy"></div>` +
          `<span class="editor-compare-label left">${escHtml(
            d.beforeLabel || 'Before'
          )}</span>` +
          `<span class="editor-compare-label right">${escHtml(
            d.afterLabel || 'After'
          )}</span>` +
          `<div class="editor-compare-handle" role="slider" aria-label="Comparison slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" tabindex="0"><span>↔</span></div>` +
          `</div>`
        );
      }
      if (block.type === 'slides') {
        const rawSlides = String(d.content || '')
          .split(/\n---\n/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (!rawSlides.length) return '';
        const formatSlide = (txt: string) =>
          txt
            .split(/\n+/)
            .map((line) => {
              const t = line.trim();
              if (t.startsWith('# ')) return `<h3>${escHtml(t.slice(2))}</h3>`;
              if (t.startsWith('## ')) return `<h4>${escHtml(t.slice(3))}</h4>`;
              return `<p>${escHtml(t)}</p>`;
            })
            .join('');
        return (
          '<div class="editor-slides" data-slides>' +
          '<div class="editor-slides-bar">' +
          `<span class="editor-slides-count">1 / ${rawSlides.length}</span>` +
          '<div class="editor-slides-controls">' +
          '<button type="button" class="editor-slides-prev" aria-label="Previous slide">←</button>' +
          '<button type="button" class="editor-slides-next" aria-label="Next slide">→</button>' +
          '<button type="button" class="editor-slides-present">Present</button>' +
          '</div></div>' +
          '<div class="editor-slides-stage">' +
          rawSlides
            .map(
              (s, idx) =>
                `<div class="editor-slide-panel${
                  idx === 0 ? ' active' : ''
                }" data-slide-idx="${idx}">${formatSlide(s)}</div>`
            )
            .join('') +
          '</div></div>'
        );
      }
      if (block.type === 'tabs') {
        const tabs = (d.tabs || []) as Array<{ label?: string; content?: string }>;
        if (!tabs.length) return '';
        return (
          '<div class="editor-tabs" data-tabs>' +
          '<div class="editor-tabs-bar" role="tablist">' +
          tabs
            .map(
              (t, idx) =>
                `<button type="button" role="tab" aria-selected="${
                  idx === 0 ? 'true' : 'false'
                }" data-tab-idx="${idx}">${escHtml(
                  t.label || `Tab ${idx + 1}`
                )}</button>`
            )
            .join('') +
          '</div>' +
          '<div class="editor-tabs-panels">' +
          tabs
            .map(
              (t, idx) =>
                `<div class="editor-tab-panel${
                  idx === 0 ? ' active' : ''
                }" role="tabpanel" data-tab-panel="${idx}"><p>${escHtml(
                  t.content || ''
                ).replace(/\n/g, '<br>')}</p></div>`
            )
            .join('') +
          '</div></div>'
        );
      }
      if (block.type === 'accordion') {
        const items = (d.items || []) as Array<{ title?: string; body?: string }>;
        if (!items.length) return '';
        return (
          '<div class="editor-accordion">' +
          items
            .map(
              (it) =>
                `<details class="editor-accordion-item"><summary>${escHtml(
                  it.title || 'Item'
                )}</summary><div class="editor-accordion-body"><p>${escHtml(
                  it.body || ''
                ).replace(/\n/g, '<br>')}</p></div></details>`
            )
            .join('') +
          '</div>'
        );
      }
      if (block.type === 'pullquote') {
        if (!d.text) return '';
        return `<blockquote class="editor-pullquote"><p>${escHtml(
          d.text
        )}</p>${
          d.attribution ? `<cite>— ${escHtml(d.attribution)}</cite>` : ''
        }</blockquote>`;
      }
      if (block.type === 'timeline') {
        const steps = (d.steps || []) as Array<{ title?: string; detail?: string }>;
        if (!steps.length) return '';
        return (
          '<ol class="editor-timeline">' +
          steps
            .map(
              (s, idx) =>
                `<li><span class="editor-timeline-num">${
                  idx + 1
                }</span><div class="editor-timeline-card"><strong>${escHtml(
                  s.title || `Step ${idx + 1}`
                )}</strong>${
                  s.detail ? `<p>${escHtml(s.detail)}</p>` : ''
                }</div></li>`
            )
            .join('') +
          '</ol>'
        );
      }
      if (block.type === 'stats') {
        const stats = (d.stats || []) as Array<{ value?: string; label?: string }>;
        if (!stats.length) return '';
        const cols = Math.min(4, Math.max(2, stats.length));
        return (
          `<div class="editor-stats-row cols-${cols}">` +
          stats
            .map(
              (s) =>
                `<div class="editor-stat-card"><b>${escHtml(
                  s.value || '—'
                )}</b><span>${escHtml(s.label || '')}</span></div>`
            )
            .join('') +
          '</div>'
        );
      }
      if (block.type === 'proscons') {
        const pros = (d.pros || []) as string[];
        const cons = (d.cons || []) as string[];
        return (
          '<div class="editor-proscons">' +
          '<div class="editor-pros"><strong>Pros</strong><ul>' +
          pros.map((p) => `<li>${escHtml(p)}</li>`).join('') +
          '</ul></div>' +
          '<div class="editor-cons"><strong>Cons</strong><ul>' +
          cons.map((c) => `<li>${escHtml(c)}</li>`).join('') +
          '</ul></div></div>'
        );
      }
      if (block.type === 'cards') {
        const cards = (d.cards || []) as Array<{
          title?: string;
          subtitle?: string;
          url?: string;
          badge?: string;
        }>;
        if (!cards.length) return '';
        return (
          '<div class="editor-cards-grid">' +
          cards
            .map((c) => {
              const isData = /^data:/i.test(c.url || '');
              return `<a class="editor-grid-card" href="${escHtml(
                c.url || '#'
              )}"${
                isData
                  ? ` download="${escHtml(c.title || 'file')}"`
                  : ' target="_blank" rel="noopener noreferrer"'
              }>${
                c.badge
                  ? `<span class="editor-grid-card-badge">${escHtml(
                      c.badge
                    )}</span>`
                  : ''
              }<strong>${escHtml(c.title || 'Untitled')}</strong>${
                c.subtitle ? `<span>${escHtml(c.subtitle)}</span>` : ''
              }</a>`;
            })
            .join('') +
          '</div>'
        );
      }
      if (block.type === 'embed') {
        return d.embed
          ? `<iframe src="${escHtml(d.embed)}" title="${escHtml(
              d.caption
            )}" loading="lazy"></iframe>`
          : '';
      }
      if (block.type === 'attaches') {
        const attachmentUrl =
          d.file && d.file.url ? d.file.url : d.dataUrl || '';
        const downloadName = d.name || (d.file && d.file.name) || 'attachment';
        return attachmentUrl
          ? `<a href="${escHtml(attachmentUrl)}" download="${escHtml(
              downloadName
            )}">${escHtml(
              d.name || (d.file && d.file.name) || 'Download attachment'
            )}</a>`
          : '';
      }
      if (block.type === 'button') {
        return d.url
          ? `<a class="btn" href="${escHtml(d.url)}">${escHtml(
              d.text || 'Open'
            )}</a>`
          : '';
      }
      if (block.type === 'layout') {
        const leftHtml = d.leftData
          ? blocksToHtml(d.leftData as EditorJSData)
          : `<p>${escHtml(d.left)}</p>`;
        const rightHtml = d.rightData
          ? blocksToHtml(d.rightData as EditorJSData)
          : `<p>${escHtml(d.right)}</p>`;
        return `<div class="editor-layout"><div>${leftHtml}</div><div>${rightHtml}</div></div>`;
      }
      if (block.type === 'collapsible') {
        return `<details><summary>${escHtml(
          d.title || 'Details'
        )}</summary><p>${escHtml(d.text)}</p></details>`;
      }
      if (block.type === 'delimiter') {
        return '<hr class="editor-hr">';
      }
      if (
        block.type === 'toggleh1' ||
        block.type === 'toggleh2' ||
        block.type === 'toggleh3'
      ) {
        const fallbackLevel = block.type === 'toggleh1' ? 1 : block.type === 'toggleh2' ? 2 : 3;
        const level = Math.min(3, Math.max(1, Number(d.level) || fallbackLevel));
        const innerHtml = d.contentData
          ? blocksToHtml(d.contentData as EditorJSData)
          : '';
        return `<details class="editor-toggle-heading level-${level}"${
          d.open !== false ? ' open' : ''
        }><summary><h${level}>${sanitizeInlineHtml(
          d.title || `Heading ${level}`
        )}</h${level}></summary><div class="editor-toggle-body">${innerHtml}</div></details>`;
      }
      if (block.type === 'spoiler') {
        const label = escHtml(d.label || 'Spoiler');
        const kind = d.kind === 'image' ? 'image' : 'text';
        const overlay = `<div class="editor-spoiler-overlay"><span class="editor-spoiler-pill">${label} · Click to reveal</span></div>`;
        if (kind === 'image' && d.url) {
          return `<figure class="editor-spoiler-card is-image" data-spoiler><div class="editor-spoiler-content"><img src="${escHtml(
            d.url
          )}" alt="${label}" loading="lazy"></div>${overlay}</figure>`;
        }
        return `<div class="editor-spoiler-card is-text" data-spoiler><div class="editor-spoiler-content"><div class="editor-spoiler-text-body">${escHtml(
          d.text || ''
        )}</div></div>${overlay}</div>`;
      }
      if (block.type === 'mermaid') {
        const code = String(d.code || '');
        const caption = d.caption ? `<figcaption>${escHtml(d.caption)}</figcaption>` : '';
        return `<figure class="editor-mermaid-block"><div class="editor-mermaid-diagram" data-mermaid="${escHtml(
          code
        )}"><pre class="editor-mermaid-fallback">${escHtml(code)}</pre></div>${caption}</figure>`;
      }
      if (block.type === 'alert') {
        const variant = ['info', 'tip', 'warning', 'danger'].includes(d.variant)
          ? d.variant
          : 'info';
        const icons: Record<string, string> = {
          info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
          tip: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
          warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
          danger: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        };
        return `<div class="editor-alert variant-${escHtml(
          variant
        )}" role="note"><span class="editor-alert-icon" aria-hidden="true">${
          icons[variant]
        }</span><div class="editor-alert-body">${
          d.title ? `<strong>${escHtml(d.title)}</strong>` : ''
        }<p>${escHtml(d.message || '')}</p></div></div>`;
      }
      if (block.type === 'badges') {
        const items = (d.items || []) as Array<{ label?: string; tone?: string }>;
        if (!items.length) return '';
        return (
          '<div class="editor-badges">' +
          items
            .map(
              (b) =>
                `<span class="editor-badge tone-${escHtml(
                  b.tone || 'neutral'
                )}">${escHtml(b.label || '')}</span>`
            )
            .join('') +
          '</div>'
        );
      }
      if (block.type === 'tags') {
        const tags = (d.tags || []) as string[];
        if (!tags.length) return '';
        return (
          '<div class="editor-inline-tags">' +
          tags.map((t) => `<span class="editor-inline-tag">#${escHtml(t)}</span>`).join('') +
          '</div>'
        );
      }
      if (block.type === 'comment') {
        return '';
      }
      if (block.type === 'scratch') {
        const text = String(d.text || '').trim();
        if (!text) return '';
        const title = d.title ? `<div class="editor-scratch-card-title">${escHtml(d.title)}</div>` : '';
        return `<aside class="editor-scratch-card">${title}<pre class="editor-scratch-card-body">${escHtml(text)}</pre></aside>`;
      }
      if (block.type === 'dialogue') {
        const triggerLabel = escHtml(d.triggerLabel || 'Open Dialog');
        const payload = escHtml(
          JSON.stringify({
            title: d.title || 'Dialog',
            body: d.body || '',
            confirmLabel: d.confirmLabel || 'Got it',
          })
        );
        return `<div class="editor-dialogue-preview"><button type="button" class="editor-dialogue-trigger" data-dialogue="${payload}">${triggerLabel}</button></div>`;
      }
      if (block.type === 'masonry') {
        const cols = [2, 3, 4].includes(Number(d.columns)) ? Number(d.columns) : 3;
        const items = (d.items || []) as Array<{ url?: string; caption?: string }>;
        const valid = items.filter((it) => it.url);
        if (!valid.length) return '';
        return (
          `<div class="editor-masonry cols-${cols}">` +
          valid
            .map(
              (it) =>
                `<figure class="editor-masonry-item"><img src="${escHtml(
                  it.url
                )}" alt="${escHtml(it.caption || '')}" loading="lazy">${
                  it.caption
                    ? `<figcaption>${escHtml(it.caption)}</figcaption>`
                    : ''
                }</figure>`
            )
            .join('') +
          '</div>'
        );
      }
      if (block.type === 'emoji') {
        const em = escHtml(d.emoji || '✨');
        const size = ['sm', 'md', 'lg'].includes(String(d.size))
          ? String(d.size)
          : 'md';
        const label = d.label
          ? `<span class="editor-emoji-label">${escHtml(d.label)}</span>`
          : '';
        return `<div class="editor-emoji-card is-${size}"><span class="editor-emoji-glyph">${em}</span>${label}</div>`;
      }
      if (block.type === 'hotkey') {
        const parts = String(d.keys || '')
          .split('+')
          .map((k) => k.trim())
          .filter(Boolean);
        if (!parts.length) return '';
        const keysHtml = parts
          .map((k) => `<kbd class="editor-kbd">${escHtml(k)}</kbd>`)
          .join('<span class="editor-hotkey-plus">+</span>');
        const label = d.label
          ? `<span class="editor-hotkey-label">${escHtml(d.label)}</span>`
          : '';
        return `<div class="editor-hotkey-card"><div class="editor-hotkey-keys">${keysHtml}</div>${label}</div>`;
      }
      if (block.type === 'callout') {
        const tone = ['neutral', 'info', 'success', 'warning', 'danger'].includes(
          String(d.tone)
        )
          ? String(d.tone)
          : 'neutral';
        const icon = escHtml(d.icon || '💡');
        const title = d.title ? `<strong class="editor-callout-title">${escHtml(d.title)}</strong>` : '';
        const text = d.text ? `<p class="editor-callout-text">${sanitizeInlineHtml(d.text)}</p>` : '';
        return `<aside class="editor-callout-card is-${tone}"><span class="editor-callout-icon" aria-hidden="true">${icon}</span><div class="editor-callout-body">${title}${text}</div></aside>`;
      }
      if (block.type === 'upload') {
        const url = String(d.url || '').trim();
        if (!url) return '';
        const name = escHtml(d.name || 'Download file');
        const mime = String(d.mime || '');
        if (mime.startsWith('image/')) {
          return `<figure class="editor-upload-figure"><img src="${escHtml(url)}" alt="${name}"><figcaption>${name}</figcaption></figure>`;
        }
        return `<a class="editor-upload-card" href="${escHtml(
          url
        )}" download="${name}" target="_blank" rel="noopener noreferrer"><span class="editor-upload-badge">FILE</span><span class="editor-upload-name">${name}</span><span class="editor-upload-dl">Download</span></a>`;
      }
      if (block.type === 'flashcards') {
        const cards = (d.cards || []) as Array<{ front?: string; back?: string }>;
        if (!cards.length) return '';
        const title = escHtml(d.title || 'Flashcards');
        const payload = escHtml(JSON.stringify(cards));
        return `<div class="editor-flashcard-deck" data-flashcard-deck data-cards="${payload}"><div class="editor-flashcard-head"><strong>${title}</strong><span class="editor-quiz-score" data-fc-count>1 / ${cards.length}</span></div><button type="button" class="editor-flashcard-stage" data-fc-stage><span class="editor-flashcard-side" data-fc-side>Front</span><span class="editor-flashcard-text" data-fc-text>${escHtml(
          cards[0]?.front || ''
        )}</span></button><div class="editor-flashcard-nav"><button type="button" class="editor-quiz-reset" data-fc-prev>Prev</button><button type="button" class="editor-quiz-reset" data-fc-flip>Flip Card</button><button type="button" class="editor-quiz-reset" data-fc-next>Next</button></div></div>`;
      }
      if (block.type === 'cover') {
        const bg = d.coverUrl
          ? `url("${escHtml(d.coverUrl)}") center / cover no-repeat`
          : escHtml(d.gradient || 'linear-gradient(135deg, #27272a 0%, #52525b 100%)');
        const icon = d.icon
          ? `<div class="editor-cover-icon">${escHtml(d.icon)}</div>`
          : '';
        const title = d.title
          ? `<h1 class="editor-cover-title">${escHtml(d.title)}</h1>`
          : '';
        const subtitle = d.subtitle
          ? `<p class="editor-cover-subtitle">${escHtml(d.subtitle)}</p>`
          : '';
        return `<header class="editor-cover-card"><div class="editor-cover-banner" style="background:${bg}"></div>${icon}<div class="editor-cover-meta">${title}${subtitle}</div></header>`;
      }
      if (block.type === 'chart') {
        const points = (d.points || []) as Array<{ label?: string; value?: number }>;
        if (!points.length) return '';
        const payload = escHtml(
          JSON.stringify({
            title: d.title || '',
            chartType: String(d.chartType || 'bar'),
            points,
          })
        );
        const titleHtml = d.title
          ? `<div class="editor-chart-title">${escHtml(d.title)}</div>`
          : '';
        return `<figure class="editor-chart-card" data-chart-config="${payload}">${titleHtml}<div class="editor-chart-canvas-wrap"><canvas class="editor-chart-canvas"></canvas></div></figure>`;
      }
      if (block.type === 'footnotes') {
        const items = (d.items || []) as Array<{ text?: string; url?: string }>;
        if (!items.length) return '';
        const title = escHtml(d.title || 'References & Footnotes');
        const listHtml = items
          .map((item) => {
            const text = escHtml(item.text || '');
            const link = item.url
              ? ` <a href="${escHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escHtml(
                  item.url
                )}</a>`
              : '';
            return `<li>${text}${link}</li>`;
          })
          .join('');
        return `<aside class="editor-footnotes-card"><div class="editor-footnotes-title">${title}</div><ol class="editor-footnotes-list">${listHtml}</ol></aside>`;
      }
      if (block.type === 'kanban') {
        const cols = (d.columns || []) as Array<{ title?: string; cards?: string[] }>;
        if (!cols.length) return '';
        const heading = d.heading
          ? `<h3 class="editor-kanban-title">${escHtml(d.heading)}</h3>`
          : '';
        const colsHtml = cols
          .map((c) => {
            const cards = (c.cards || [])
              .map((card) => `<div class="editor-kanban-card">${escHtml(card)}</div>`)
              .join('');
            return `<div class="editor-kanban-column"><div class="editor-kanban-column-head"><span>${escHtml(
              c.title || 'Column'
            )}</span><span class="editor-kanban-count">${(c.cards || []).length}</span></div><div class="editor-kanban-column-body">${cards}</div></div>`;
          })
          .join('');
        return `<div class="editor-kanban-block">${heading}<div class="editor-kanban-grid">${colsHtml}</div></div>`;
      }
      if (block.type === 'timer') {
        const mins = Math.max(1, Number(d.minutes) || 25);
        const label = escHtml(d.label || 'Focus Timer');
        const initialTime = `${String(mins).padStart(2, '0')}:00`;
        return `<div class="editor-timer-card" data-focus-timer data-minutes="${mins}"><div class="editor-timer-meta"><div class="editor-timer-label">${label}</div><div class="editor-timer-display" data-timer-display>${initialTime}</div></div><div class="editor-timer-actions"><button type="button" class="editor-form-submit" data-timer-toggle>Start</button><button type="button" class="editor-quiz-reset" data-timer-reset>Reset</button></div><div class="editor-timer-bar"><div class="editor-timer-bar-fill" data-timer-fill></div></div></div>`;
      }
      if (block.type === 'quiz') {
        const questions = (d.questions || []) as Array<{
          question?: string;
          options?: string[];
          correctIndex?: number;
          explanation?: string;
        }>;
        if (!questions.length) return '';
        const title = escHtml(d.title || 'Quiz');
        const qHtml = questions
          .map((q, qIdx) => {
            const correct = Number(q.correctIndex) || 0;
            const optsHtml = (q.options || [])
              .map(
                (opt, oIdx) =>
                  `<button type="button" class="editor-quiz-option" data-opt-idx="${oIdx}">${escHtml(
                    opt
                  )}</button>`
              )
              .join('');
            const expHtml = q.explanation
              ? `<div class="editor-quiz-explanation" hidden>${escHtml(q.explanation)}</div>`
              : '';
            return `<div class="editor-quiz-question" data-quiz-q data-correct="${correct}"><div class="editor-quiz-q-text">${
              qIdx + 1
            }. ${escHtml(
              q.question || ''
            )}</div><div class="editor-quiz-options">${optsHtml}</div><div class="editor-quiz-feedback" aria-live="polite"></div>${expHtml}</div>`;
          })
          .join('');
        return `<div class="editor-quiz-card" data-quiz-card><div class="editor-quiz-head"><strong>${title}</strong><div class="editor-quiz-meta"><span class="editor-quiz-score" data-quiz-score>Score: 0/${questions.length}</span><button type="button" class="editor-quiz-reset" data-quiz-reset>Reset</button></div></div><div class="editor-quiz-list">${qHtml}</div></div>`;
      }
      if (block.type === 'poll') {
        const options = (d.options || []) as Array<{ label?: string; votes?: number }>;
        if (!options.length) return '';
        const total = options.reduce((sum, o) => sum + (Number(o.votes) || 0), 0);
        const q = escHtml(d.question || 'Poll');
        const optsHtml = options
          .map((o, idx) => {
            const votes = Number(o.votes) || 0;
            const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
            return `<button type="button" class="editor-poll-option" data-poll-idx="${idx}" data-votes="${votes}"><span class="editor-poll-bar" style="width:${pct}%"></span><span class="editor-poll-label">${escHtml(
              o.label || ''
            )}</span><span class="editor-poll-stat">${pct}% (${votes})</span></button>`;
          })
          .join('');
        return `<div class="editor-poll-card" data-poll-card><div class="editor-poll-question">${q}</div><div class="editor-poll-options">${optsHtml}</div><div class="editor-poll-total" data-poll-total>${total} total votes</div></div>`;
      }
      if (block.type === 'faq') {
        const items = (d.items || []) as Array<{ question?: string; answer?: string }>;
        if (!items.length) return '';
        const titleHtml = d.title
          ? `<h3 class="editor-faq-title">${escHtml(d.title)}</h3>`
          : '';
        const itemsHtml = items
          .map(
            (it) =>
              `<details class="editor-accordion-item editor-faq-item"><summary class="editor-faq-summary">${escHtml(
                it.question || ''
              )}</summary><div class="editor-faq-answer">${escHtml(
                it.answer || ''
              )}</div></details>`
          )
          .join('');
        return `<div class="editor-faq-card editor-accordion">${titleHtml}${itemsHtml}</div>`;
      }
      if (block.type === 'todo') {
        const items = (d.items || []) as Array<{
          text?: string;
          done?: boolean;
          priority?: string;
        }>;
        if (!items.length) return '';
        const doneCount = items.filter((i) => i.done).length;
        const title = escHtml(d.title || 'Tasks');
        const listHtml = items
          .map((item) => {
            const checked = item.done ? ' checked' : '';
            const doneClass = item.done ? ' is-done' : '';
            const prio = escHtml(item.priority || 'medium');
            return `<label class="editor-todo-item${doneClass}"><input type="checkbox"${checked}><span>${escHtml(
              item.text || ''
            )}</span><span class="editor-todo-prio is-${prio}">${prio}</span></label>`;
          })
          .join('');
        return `<div class="editor-todo-card" data-todo-card><div class="editor-todo-card-head"><strong>${title}</strong><span class="editor-todo-progress" data-todo-progress>${doneCount}/${items.length} done</span></div><div class="editor-todo-items">${listHtml}</div></div>`;
      }
      if (block.type === 'eisenhower') {
        const quadrants = [
          { key: 'doFirst', label: 'Do First', hint: 'Urgent & Important' },
          { key: 'schedule', label: 'Schedule', hint: 'Not Urgent & Important' },
          { key: 'delegate', label: 'Delegate', hint: 'Urgent & Not Important' },
          { key: 'eliminate', label: 'Eliminate', hint: 'Not Urgent & Not Important' },
        ];
        const titleHtml = d.title
          ? `<h3 class="editor-eisenhower-title">${escHtml(d.title)}</h3>`
          : '';
        const cardsHtml = quadrants
          .map((q) => {
            const items = (d[q.key] || []) as Array<{ text?: string; done?: boolean }>;
            const itemsHtml = items.length
              ? items
                  .map(
                    (it) =>
                      `<label class="editor-eisenhower-check${it.done ? ' is-done' : ''}"><input type="checkbox"${
                        it.done ? ' checked' : ''
                      }><span>${escHtml(it.text || '')}</span></label>`
                  )
                  .join('')
              : '<div class="editor-eisenhower-empty">No items</div>';
            return `<div class="editor-eisenhower-card is-${q.key}"><div class="editor-eisenhower-head"><strong>${q.label}</strong><span>${q.hint}</span></div><div class="editor-eisenhower-items">${itemsHtml}</div></div>`;
          })
          .join('');
        return `<div class="editor-eisenhower-block">${titleHtml}<div class="editor-eisenhower-grid">${cardsHtml}</div></div>`;
      }
      if (block.type === 'audio') {
        return renderAudioCard({
          url: String(d.url || ''),
          title: String(d.title || ''),
          artist: String(d.artist || ''),
          coverUrl: String(d.coverUrl || ''),
        });
      }
      if (block.type === 'musicCarousel') {
        const tracks = (d.tracks || []) as Array<{
          url?: string;
          title?: string;
          artist?: string;
          coverUrl?: string;
        }>;
        const cards = tracks
          .map((t) => renderAudioCard(t, true))
          .filter(Boolean)
          .join('');
        if (!cards) return '';
        const heading = d.heading
          ? `<div class="editor-music-carousel-head"><span>${escHtml(d.heading)}</span></div>`
          : '';
        return `<section class="editor-music-carousel">${heading}<div class="editor-music-carousel-track">${cards}</div></section>`;
      }
      if (block.type === 'form') {
        const fields = (d.fields || []) as Array<{
          id?: string;
          label?: string;
          type?: string;
          placeholder?: string;
          required?: boolean;
          options?: string[];
        }>;
        const title = d.title ? `<h3 class="editor-form-title">${escHtml(d.title)}</h3>` : '';
        const desc = d.description
          ? `<p class="editor-form-desc">${escHtml(d.description)}</p>`
          : '';
        const actionAttr = d.actionUrl ? ` data-action="${escHtml(d.actionUrl)}"` : '';
        const fieldsHtml = fields
          .map((f, idx) => {
            const name = escHtml(f.id || `field_${idx + 1}`);
            const label = escHtml(f.label || `Field ${idx + 1}`);
            const req = f.required ? ' required' : '';
            const reqMark = f.required ? ' <span class="editor-form-req">*</span>' : '';
            const ph = escHtml(f.placeholder || '');
            if (f.type === 'textarea') {
              return `<div class="editor-form-field"><label class="editor-form-label">${label}${reqMark}<textarea name="${name}" placeholder="${ph}" rows="3" class="editor-form-control"${req}></textarea></label></div>`;
            }
            if (f.type === 'select') {
              const opts = (f.options || [])
                .map((o) => `<option value="${escHtml(o)}">${escHtml(o)}</option>`)
                .join('');
              return `<div class="editor-form-field"><label class="editor-form-label">${label}${reqMark}<select name="${name}" class="editor-form-control"${req}>${opts}</select></label></div>`;
            }
            if (f.type === 'checkbox') {
              return `<div class="editor-form-field editor-form-checkbox"><label><input type="checkbox" name="${name}"${req}> <span>${label}${reqMark}</span></label></div>`;
            }
            const inputType = escHtml(f.type || 'text');
            return `<div class="editor-form-field"><label class="editor-form-label">${label}${reqMark}<input type="${inputType}" name="${name}" placeholder="${ph}" class="editor-form-control"${req}></label></div>`;
          })
          .join('');
        const submitLabel = escHtml(d.submitLabel || 'Submit');
        return `<form class="editor-form-block"${actionAttr}>${title}${desc}${fieldsHtml}<div class="editor-form-actions"><button type="submit" class="editor-form-submit">${submitLabel}</button><span class="editor-form-status" aria-live="polite"></span></div></form>`;
      }
      if (block.type === 'latex') {
        const tex = String(d.tex || '').trim();
        if (!tex) return '';
        const displayMode = d.displayMode !== false;
        try {
          const html = katex.renderToString(tex, {
            throwOnError: false,
            displayMode,
          });
          return `<div class="editor-latex-render${displayMode ? ' is-display' : ''}">${html}</div>`;
        } catch {
          return `<pre class="editor-latex-fallback">${escHtml(tex)}</pre>`;
        }
      }
      if (block.type === 'drawing' || block.type === 'gif' || block.type === 'excalidraw') {
        const mediaUrl = d.dataUrl || d.url || '';
        if (!mediaUrl) return '';
        const img = `<img src="${escHtml(mediaUrl)}" alt="${escHtml(
          d.caption || block.type
        )}">`;
        const captionHtml = d.caption
          ? `<figcaption>${escHtml(d.caption)}</figcaption>`
          : '';
        if (block.type === 'excalidraw' || block.type === 'drawing') {
          return `<figure class="editor-whiteboard-figure editor-excalidraw-preview" data-excalidraw-src="${escHtml(
            mediaUrl
          )}"><button type="button" class="editor-excalidraw-preview-fs" aria-label="Full screen" title="Full screen"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg></button>${img}${captionHtml}</figure>`;
        }
        return d.caption
          ? `<figure class="editor-whiteboard-figure">${img}${captionHtml}</figure>`
          : img;
      }
      return d.text ? `<p>${sanitizeInlineHtml(d.text)}</p>` : '';
    })
    .join('');
}
