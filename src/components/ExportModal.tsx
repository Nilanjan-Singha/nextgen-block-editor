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

type ExportTab = 'export' | 'import';

export const ExportModal: React.FC<ExportModalProps> = ({
  open,
  data,
  onImportBlocks,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ExportTab>('export');
  const [importText, setImportText] = useState('');
  const [copiedKind, setCopiedKind] = useState<'md' | 'html' | null>(null);

  const markdown = useMemo(() => (open ? blocksToMarkdown(data) : ''), [open, data]);
  const html = useMemo(() => (open ? blocksToHtml(data) : ''), [open, data]);
  const parsedCount = useMemo(
    () => (importText.trim() ? markdownToBlocks(importText).length : 0),
    [importText]
  );

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
    <div className="ng-modal-backdrop" role="dialog" aria-modal="true" aria-label="Import & Export">
      <div className="ng-modal ng-modal-wide">
        <div className="ng-modal-head">
          <div>
            <h3>Import &amp; Export</h3>
            <p>Export your document as Markdown, HTML, or PDF, or import Markdown into blocks.</p>
          </div>
          <button type="button" className="excalidraw-btn" onClick={onClose}>
            Done
          </button>
        </div>

        <div className="ng-modal-layout">
          <aside className="ng-modal-sidebar" role="tablist" aria-label="Import and export sections">
            {(
              [
                { id: 'export', label: 'Export Document' },
                { id: 'import', label: 'Import Markdown' },
              ] as Array<{ id: ExportTab; label: string }>
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeTab === t.id}
                className={`ng-modal-tab${activeTab === t.id ? ' is-active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </aside>

          <div className="ng-modal-main">
            {activeTab === 'export' && (
              <div className="ng-modal-panel">
                <div className="ng-export-grid">
                  <div className="ng-export-card">
                    <div className="ng-export-card-title">Markdown (.md)</div>
                    <p className="ng-export-card-desc">
                      Clean GitHub-Flavored Markdown including headings, code, and Mermaid blocks.
                    </p>
                    <div className="ng-inline-ai-row">
                      <button
                        type="button"
                        className="excalidraw-btn"
                        onClick={() => void copyText(markdown, 'md')}
                      >
                        {copiedKind === 'md' ? 'Copied!' : 'Copy MD'}
                      </button>
                      <button
                        type="button"
                        className="excalidraw-btn is-active"
                        onClick={() => downloadFile(markdown, 'document.md', 'text/markdown')}
                      >
                        Download .md
                      </button>
                    </div>
                  </div>

                  <div className="ng-export-card">
                    <div className="ng-export-card-title">HTML (.html)</div>
                    <p className="ng-export-card-desc">
                      Sanitized semantic HTML ready for blogs, emails, or static sites.
                    </p>
                    <div className="ng-inline-ai-row">
                      <button
                        type="button"
                        className="excalidraw-btn"
                        onClick={() => void copyText(html, 'html')}
                      >
                        {copiedKind === 'html' ? 'Copied!' : 'Copy HTML'}
                      </button>
                      <button
                        type="button"
                        className="excalidraw-btn is-active"
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
                    </div>
                  </div>

                  <div className="ng-export-card">
                    <div className="ng-export-card-title">Print / Save as PDF</div>
                    <p className="ng-export-card-desc">
                      Open the browser print dialog to save a formatted PDF copy.
                    </p>
                    <div className="ng-inline-ai-row">
                      <button
                        type="button"
                        className="excalidraw-btn"
                        onClick={() => window.print()}
                      >
                        Print / PDF
                      </button>
                    </div>
                  </div>
                </div>

                <div className="ng-field">
                  <label>Markdown Preview</label>
                  <pre className="ng-export-preview">{markdown || '(Empty document)'}</pre>
                </div>
              </div>
            )}

            {activeTab === 'import' && (
              <div className="ng-modal-panel">
                <div className="ng-field">
                  <label>Paste Markdown ({parsedCount} blocks detected)</label>
                  <textarea
                    className="editor-mermaid-input"
                    rows={10}
                    placeholder="Paste Markdown here (# Heading, - list, > quote, ```mermaid ...```)..."
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                  />
                </div>
                <div className="ng-inline-ai-row">
                  <button
                    type="button"
                    className="excalidraw-btn is-active"
                    disabled={parsedCount === 0}
                    onClick={() => {
                      const blocks = markdownToBlocks(importText);
                      if (blocks.length > 0) {
                        onImportBlocks(blocks);
                        setImportText('');
                        onClose();
                      }
                    }}
                  >
                    Append {parsedCount || ''} Blocks to Editor
                  </button>
                  <button
                    type="button"
                    className="excalidraw-btn"
                    disabled={!importText}
                    onClick={() => setImportText('')}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
