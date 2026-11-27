import type { EditorJSBlock, EditorJSData } from '../types';

function stripHtmlTags(html: unknown): string {
  return String(html == null ? '' : html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function blocksToMarkdown(data?: EditorJSData | null): string {
  if (!data || !Array.isArray(data.blocks)) return '';

  const parts: string[] = [];

  for (const block of data.blocks) {
    const d: Record<string, any> = block.data || {};
    switch (block.type) {
      case 'header':
      case 'h1':
      case 'h2':
      case 'h3': {
        const lvl =
          block.type === 'h1' ? 1 : block.type === 'h2' ? 2 : block.type === 'h3' ? 3 : Number(d.level) || 2;
        parts.push(`${'#'.repeat(Math.min(6, Math.max(1, lvl)))} ${stripHtmlTags(d.text)}`);
        break;
      }
      case 'paragraph':
        parts.push(stripHtmlTags(d.text));
        break;
      case 'quote':
      case 'pullquote': {
        const quote = stripHtmlTags(d.text)
          .split('\n')
          .map((l) => `> ${l}`)
          .join('\n');
        const cap = d.caption ? `\n> — ${stripHtmlTags(d.caption)}` : '';
        parts.push(`${quote}${cap}`);
        break;
      }
      case 'list':
      case 'nestedlist': {
        const ordered = d.style === 'ordered';
        const items = Array.isArray(d.items) ? d.items : [];
        const lines = items.map((item: any, idx: number) => {
          const txt = typeof item === 'string' ? item : item?.content || item?.text || '';
          return `${ordered ? `${idx + 1}.` : '-'} ${stripHtmlTags(txt)}`;
        });
        parts.push(lines.join('\n'));
        break;
      }
      case 'checklist':
      case 'todo': {
        const items = Array.isArray(d.items) ? d.items : [];
        parts.push(
          items
            .map((item: any) => `- [${item.checked || item.done ? 'x' : ' '}] ${stripHtmlTags(item.text || item.title)}`)
            .join('\n')
        );
        break;
      }
      case 'code':
        parts.push(`\`\`\`${d.language || ''}\n${d.code || ''}\n\`\`\``);
        break;
      case 'mermaid':
        parts.push(`\`\`\`mermaid\n${d.code || ''}\n\`\`\``);
        break;
      case 'latex':
        parts.push(`$$\n${d.tex || ''}\n$$`);
        break;
      case 'delimiter':
        parts.push('---');
        break;
      case 'image':
      case 'simpleImage': {
        const url = d.file?.url || d.url || '';
        if (url) parts.push(`![${stripHtmlTags(d.caption || '')}](${url})`);
        break;
      }
      case 'bookmark':
        parts.push(`[${d.title || d.url || 'Link'}](${d.url || '#'})`);
        break;
      case 'steps': {
        const items = Array.isArray(d.items) ? d.items : [];
        parts.push(
          items.map((s: any, i: number) => `${i + 1}. **${s.title || ''}** — ${s.body || ''}`).join('\n')
        );
        break;
      }
      case 'diff':
        parts.push(`\`\`\`diff\n- ${String(d.before || '').replace(/\n/g, '\n- ')}\n+ ${String(d.after || '').replace(/\n/g, '\n+ ')}\n\`\`\``);
        break;
      case 'changelog': {
        const items = Array.isArray(d.items) ? d.items : [];
        parts.push(
          `### ${d.version || 'Release'} (${d.date || ''})\n` +
            items.map((i: any) => `- **${(i.kind || 'added').toUpperCase()}**: ${i.text || ''}`).join('\n')
        );
        break;
      }
      case 'social':
        parts.push(`> ${d.text || ''}\n> — ${d.author || ''} (${d.handle || ''})`);
        break;
      case 'today':
        parts.push(`📅 ${d.date || ''}`);
        break;
      default:
        if (d.text) parts.push(stripHtmlTags(d.text));
        break;
    }
  }

  return parts.filter(Boolean).join('\n\n');
}

export function markdownToBlocks(markdown: string): EditorJSBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: EditorJSBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      if (lang === 'mermaid') {
        blocks.push({ type: 'mermaid', data: { code: codeLines.join('\n') } });
      } else {
        blocks.push({ type: 'code', data: { code: codeLines.join('\n'), language: lang || undefined } });
      }
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const type = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
      blocks.push({ type, data: { text: headingMatch[2], level } });
      i += 1;
      continue;
    }

    if (/^[-*_]{3,}$/.test(trimmed)) {
      blocks.push({ type: 'delimiter', data: {} });
      i += 1;
      continue;
    }

    if (trimmed.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().slice(2));
        i += 1;
      }
      blocks.push({ type: 'quote', data: { text: quoteLines.join('\n'), caption: '' } });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const ordered = /^\d+\.\s+/.test(trimmed);
      const items: string[] = [];
      while (
        i < lines.length &&
        (ordered ? /^\d+\.\s+/.test(lines[i].trim()) : /^[-*]\s+/.test(lines[i].trim()))
      ) {
        items.push(lines[i].trim().replace(ordered ? /^\d+\.\s+/ : /^[-*]\s+/, ''));
        i += 1;
      }
      blocks.push({ type: 'list', data: { style: ordered ? 'ordered' : 'unordered', items } });
      continue;
    }

    blocks.push({ type: 'paragraph', data: { text: trimmed } });
    i += 1;
  }

  return blocks;
}
