import React, { useMemo, useState } from 'react';
import type { EditorJSBlock, EditorJSData } from '../types';
import { blocksToHtml } from '../utils/blocksToHtml';
import { blocksToMarkdown, markdownToBlocks } from '../utils/markdown';

interface ExportModalProps {
  open: boolean;
  data: EditorJSData;
  onImportBlocks: (blocks: EditorJSBlock[]) => void;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  open,
  data,
  onImportBlocks,
  onClose,
}) => {
  const [importText, setImportText] = useState('');
  const [copiedKind, setCopiedKind] = useState<'md' | 'html' | null>(null);

  const markdown = useMemo(() => (open ? blocksToMarkdown(data) : ''), [open, data]);
  const html = useMemo(() => (open ? blocksToHtml(data) : ''), [open, data]);

  if (!open) return null;

  const copyText = async (text: string, kind: 'md' | 'html') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKind(kind);
      window.setTimeout(() => setCopiedKind(null), 1500);
    } catch {
      // ignore clipboard errors
    }
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ng-modal-backdrop" role="dialog" aria-modal="true" aria-label="Export & Import">
      <div className="ng-modal">
        <div className="ng-modal-head">
          <div>
            <h3>Export &amp; Markdown</h3>
            <p>Export to Markdown, HTML, PDF, or import Markdown into blocks.</p>
          </div>
          <button type="button" className="excalidraw-btn" onClick={onClose}>
            Done
          </button>
        </div>

        <div className="ng-modal-panel">
          <div className="ng-field">
            <label>Quick Export</label>
            <div className="ng-inline-ai-row">
              <button
                type="button"
                className="excalidraw-btn"
                onClick={() => void copyText(markdown, 'md')}
              >
                {copiedKind === 'md' ? 'Copied MD!' : 'Copy Markdown'}
              </button>
              <button
                type="button"
                className="excalidraw-btn"
                onClick={() => downloadFile(markdown, 'document.md', 'text/markdown')}
              >
                Download .md
              </button>
              <button
                type="button"
                className="excalidraw-btn"
                onClick={() => void copyText(html, 'html')}
              >
                {copiedKind === 'html' ? 'Copied HTML!' : 'Copy HTML'}
              </button>
              <button
                type="button"
                className="excalidraw-btn"
                onClick={() =>
                  downloadFile(
                    `<!doctype html><html><head><meta charset="utf-8"><title>Document</title></head><body>${html}</body></html>`,
                    'document.html',
                    'text/html'
                  )
                }
              >
                Download .html
              </button>
              <button
                type="button"
                className="excalidraw-btn"
                onClick={() => window.print()}
              >
                Print / PDF
              </button>
            </div>
          </div>

          <div className="ng-field">
            <label>Import Markdown</label>
            <textarea
              className="editor-mermaid-input"
              rows={5}
              placeholder="Paste Markdown here (# Heading, - list, ```mermaid ...```)..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div>
              <button
                type="button"
                className="excalidraw-btn is-active"
                disabled={!importText.trim()}
                onClick={() => {
                  const blocks = markdownToBlocks(importText);
                  if (blocks.length > 0) {
                    onImportBlocks(blocks);
                    setImportText('');
                    onClose();
                  }
                }}
              >
                Append Markdown as Blocks
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
