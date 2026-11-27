import React, { useEffect, useRef, useState } from 'react';
import type EditorJS from '@editorjs/editorjs';

export interface ClassicToolbarProps {
  editorRef: React.RefObject<EditorJS | null>;
  onUndo: () => void;
  onRedo: () => void;
  fontFamily: 'sans' | 'serif' | 'mono';
  onChangeFontFamily: (font: 'sans' | 'serif' | 'mono') => void;
  enabledTools?: string[];
  onOpenSettings: () => void;
}

const INSERT_ITEMS: Array<{ tool: string; label: string; category: string }> = [
  { tool: 'bento', label: 'Bento Grid', category: 'Layout' },
  { tool: 'masonry', label: 'Masonry Grid', category: 'Media' },
  { tool: 'excalidraw', label: 'Excalidraw', category: 'Media' },
  { tool: 'chart', label: 'Data Chart', category: 'Data' },
  { tool: 'callout', label: 'Callout', category: 'Text' },
  { tool: 'spoiler', label: 'Spoiler', category: 'Layout' },
  { tool: 'dialogue', label: 'Dialogue Box', category: 'Interactive' },
  { tool: 'scratch', label: 'Scratchpad', category: 'Text' },
  { tool: 'hotkey', label: 'Hotkey', category: 'Text' },
  { tool: 'image', label: 'Image', category: 'Media' },
  { tool: 'upload', label: 'File Upload', category: 'Media' },
  { tool: 'table', label: 'Table', category: 'Data' },
  { tool: 'latex', label: 'LaTeX Math', category: 'Data' },
  { tool: 'tabs', label: 'Tabs', category: 'Layout' },
  { tool: 'accordion', label: 'Accordion', category: 'Layout' },
  { tool: 'quiz', label: 'Quiz', category: 'Interactive' },
  { tool: 'poll', label: 'Poll', category: 'Interactive' },
  { tool: 'kanban', label: 'Kanban Board', category: 'Interactive' },
  { tool: 'delimiter', label: 'Delimiter', category: 'Text' },
  { tool: 'settings', label: 'Settings', category: 'System' },
];

export const ClassicToolbar: React.FC<ClassicToolbarProps> = ({
  editorRef,
  onUndo,
  onRedo,
  fontFamily,
  onChangeFontFamily,
  enabledTools,
  onOpenSettings,
}) => {
  const allowedTools = enabledTools ? new Set(enabledTools) : null;
  const visibleInsertItems = allowedTools
    ? INSERT_ITEMS.filter((item) => item.tool === 'settings' || allowedTools.has(item.tool))
    : INSERT_ITEMS;
  const [insertOpen, setInsertOpen] = useState(false);
  const [alignOpen, setAlignOpen] = useState(false);
  const [blockType, setBlockType] = useState('paragraph');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setInsertOpen(false);
        setAlignOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const keepSelection = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
  };

  const toggleInlineTag = (tagName: 'code' | 'mark') => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;

    const existing = (
      range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? (range.commonAncestorContainer as HTMLElement)
        : range.commonAncestorContainer.parentElement
    )?.closest(tagName);

    if (existing && existing.parentNode) {
      const parent = existing.parentNode;
      while (existing.firstChild) {
        parent.insertBefore(existing.firstChild, existing);
      }
      parent.removeChild(existing);
      return;
    }

    const el = document.createElement(tagName);
    el.appendChild(range.extractContents());
    range.insertNode(el);
  };

  const insertBlock = (tool: string, data: Record<string, unknown> = {}) => {
    const ed = editorRef.current;
    if (!ed) return;
    if (tool === 'settings') {
      onOpenSettings();
      setInsertOpen(false);
      return;
    }
    try {
      const idx = ed.blocks.getCurrentBlockIndex();
      const targetIdx = idx >= 0 ? idx + 1 : ed.blocks.getBlocksCount();
      ed.blocks.insert(tool, data, {}, targetIdx, true);
    } catch {
      ed.blocks.insert(tool, data);
    }
    setInsertOpen(false);
  };

  const handleBlockTypeChange = (next: string) => {
    setBlockType(next);
    if (next === 'paragraph') insertBlock('paragraph', { text: '' });
    else if (next === 'h1') insertBlock('h1', { text: '', level: 1 });
    else if (next === 'h2') insertBlock('h2', { text: '', level: 2 });
    else if (next === 'h3') insertBlock('h3', { text: '', level: 3 });
    else if (next === 'quote') insertBlock('quote', { text: '', caption: '' });
    else if (next === 'code') insertBlock('code', { code: '' });
  };

  return (
    <div ref={wrapRef} className="ng-classic-toolbar" role="toolbar" aria-label="Formatting toolbar">
      {/* Undo / Redo */}
      <button type="button" className="ng-ct-btn" onMouseDown={keepSelection} onClick={onUndo} title="Undo">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
      </button>
      <button type="button" className="ng-ct-btn" onMouseDown={keepSelection} onClick={onRedo} title="Redo">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
      </button>

      <span className="ng-ct-sep" />

      {/* Paragraph / Heading selector */}
      <select
        className="ng-ct-select"
        value={blockType}
        onChange={(e) => handleBlockTypeChange(e.target.value)}
        aria-label="Block type"
      >
        <option value="paragraph">Paragraph</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="quote">Quote</option>
        <option value="code">Code</option>
      </select>

      {/* Font selector */}
      <select
        className="ng-ct-select"
        value={fontFamily}
        onChange={(e) => onChangeFontFamily(e.target.value as 'sans' | 'serif' | 'mono')}
        aria-label="Font family"
      >
        <option value="sans">Sans</option>
        <option value="serif">Serif</option>
        <option value="mono">Mono</option>
      </select>

      <span className="ng-ct-sep" />

      {/* Inline formatting */}
      <button type="button" className="ng-ct-btn ng-ct-b" onMouseDown={keepSelection} onClick={() => exec('bold')} title="Bold">B</button>
      <button type="button" className="ng-ct-btn ng-ct-i" onMouseDown={keepSelection} onClick={() => exec('italic')} title="Italic">I</button>
      <button type="button" className="ng-ct-btn ng-ct-u" onMouseDown={keepSelection} onClick={() => exec('underline')} title="Underline">U</button>
      <button type="button" className="ng-ct-btn ng-ct-s" onMouseDown={keepSelection} onClick={() => exec('strikeThrough')} title="Strikethrough">S</button>
      <button type="button" className="ng-ct-btn" onMouseDown={keepSelection} onClick={() => toggleInlineTag('code')} title="Inline Code">&lt;&gt;</button>
      <button type="button" className="ng-ct-btn ng-ct-highlight" onMouseDown={keepSelection} onClick={() => toggleInlineTag('mark')} title="Highlight">A</button>
      <input
        type="color"
        className="ng-ct-color"
        title="Text Color"
        aria-label="Text Color"
        defaultValue="#18181b"
        onChange={(e) => exec('foreColor', e.target.value)}
      />
      <input
        type="color"
        className="ng-ct-color"
        title="Highlight Color"
        aria-label="Highlight Color"
        defaultValue="#fef08a"
        onChange={(e) => exec('hiliteColor', e.target.value)}
      />
      <button
        type="button"
        className="ng-ct-btn"
        onMouseDown={keepSelection}
        onClick={() => {
          const url = window.prompt('Enter link URL (https://...)');
          if (url) exec('createLink', url.trim());
        }}
        title="Insert Link"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      </button>
      <button type="button" className="ng-ct-btn" onMouseDown={keepSelection} onClick={() => exec('superscript')} title="Superscript">x²</button>
      <button type="button" className="ng-ct-btn" onMouseDown={keepSelection} onClick={() => exec('subscript')} title="Subscript">x₂</button>
      <button type="button" className="ng-ct-btn" onMouseDown={keepSelection} onClick={() => exec('removeFormat')} title="Clear Formatting">Tₓ</button>

      <span className="ng-ct-sep" />

      {/* Lists, Indent, Align */}
      <button type="button" className="ng-ct-btn" onMouseDown={keepSelection} onClick={() => insertBlock('list', { style: 'unordered', items: [] })} title="Bullet List">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>
      </button>
      <button type="button" className="ng-ct-btn" onMouseDown={keepSelection} onClick={() => insertBlock('list', { style: 'ordered', items: [] })} title="Numbered List">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
      </button>
      <button type="button" className="ng-ct-btn" onMouseDown={keepSelection} onClick={() => insertBlock('list', { style: 'checklist', items: [] })} title="Checklist">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>
      </button>
      <button type="button" className="ng-ct-btn" onMouseDown={keepSelection} onClick={() => exec('outdent')} title="Decrease Indent">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="7 8 3 12 7 16"/><line x1="21" y1="12" x2="11" y2="12"/><line x1="21" y1="6" x2="11" y2="6"/><line x1="21" y1="18" x2="11" y2="18"/></svg>
      </button>
      <button type="button" className="ng-ct-btn" onMouseDown={keepSelection} onClick={() => exec('indent')} title="Increase Indent">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 8 7 12 3 16"/><line x1="21" y1="12" x2="11" y2="12"/><line x1="21" y1="6" x2="11" y2="6"/><line x1="21" y1="18" x2="11" y2="18"/></svg>
      </button>

      {/* Alignment dropdown */}
      <div className="ng-ct-dropdown-wrap">
        <button
          type="button"
          className="ng-ct-btn"
          onMouseDown={keepSelection}
          onClick={() => {
            setAlignOpen((v) => !v);
            setInsertOpen(false);
          }}
          title="Alignment"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
          <span className="ng-ct-caret">▾</span>
        </button>
        {alignOpen && (
          <div className="ng-ct-menu">
            <button type="button" onMouseDown={keepSelection} onClick={() => { exec('justifyLeft'); setAlignOpen(false); }}>Align Left</button>
            <button type="button" onMouseDown={keepSelection} onClick={() => { exec('justifyCenter'); setAlignOpen(false); }}>Align Center</button>
            <button type="button" onMouseDown={keepSelection} onClick={() => { exec('justifyRight'); setAlignOpen(false); }}>Align Right</button>
            <button type="button" onMouseDown={keepSelection} onClick={() => { exec('justifyFull'); setAlignOpen(false); }}>Justify</button>
          </div>
        )}
      </div>

      <span className="ng-ct-sep" />

      {/* + Insert dropdown with all custom blocks */}
      <div className="ng-ct-dropdown-wrap">
        <button
          type="button"
          className="ng-ct-insert-btn"
          onClick={() => {
            setInsertOpen((v) => !v);
            setAlignOpen(false);
          }}
        >
          <span>+ Insert</span>
          <span className="ng-ct-caret">▾</span>
        </button>
        {insertOpen && (
          <div className="ng-ct-menu ng-ct-insert-menu">
            {visibleInsertItems.map((item) => (
              <button
                key={item.tool}
                type="button"
                onClick={() => insertBlock(item.tool)}
              >
                <span>{item.label}</span>
                <span className="ng-ct-cat">{item.category}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
