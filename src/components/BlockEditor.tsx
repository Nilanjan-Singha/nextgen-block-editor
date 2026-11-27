import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import EditorJS, { type OutputData } from '@editorjs/editorjs';
import DragDrop from 'editorjs-drag-drop';
import Undo from 'editorjs-undo';
import { getEditorTools } from '../editorTools';
import type { BlockEditorHandle, BlockEditorProps, EditorJSData } from '../types';
import {
  generateAiText,
  loadAiConfig,
  saveAiConfig,
  type AiConfig,
} from '../utils/aiClient';
import {
  ALL_TOOL_NAMES,
  attachPopoverCategoryHeaders,
} from '../utils/popoverCategories';
import { attachEmojiSidePicker } from '../utils/emojiSidePicker';
import { ClassicToolbar } from './ClassicToolbar';
import {
  SettingsModal,
  type EditorMode,
  type EditorThemePreset,
  type EditorWidthPreset,
} from './SettingsModal';

export const BlockEditor = React.forwardRef<BlockEditorHandle, BlockEditorProps>(
  (
    {
      initialData,
      placeholder,
      enabledTools,
      showStats = true,
      showAiBar = false,
      onAiRequest,
      className,
      onReady,
      onChange,
      onThemeChange,
    },
    ref
  ) => {
    const shellRef = useRef<HTMLDivElement>(null);
    const holderRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<EditorJS | null>(null);
    const undoRef = useRef<{ undo: () => void; redo: () => void } | null>(null);
    const lifecycleRef = useRef<Promise<void>>(Promise.resolve());
    const latestDocRef = useRef<EditorJSData>(initialData || { blocks: [] });
    const onChangeRef = useRef(onChange);
    const onReadyRef = useRef(onReady);
    const runAiRef = useRef<
      (mode: 'continue' | 'ask', prompt?: string) => Promise<void>
    >(async () => {});

    const [settingsOpen, setSettingsOpen] = useState(false);
    const [theme, setTheme] = useState<EditorThemePreset>(() => {
      try {
        const saved = localStorage.getItem('ng-editor-theme');
        if (saved === 'light' || saved === 'dark' || saved === 'inherit') return saved;
      } catch {
        // ignore
      }
      return 'inherit';
    });
    const [docWidth, setDocWidth] = useState<EditorWidthPreset>(() => {
      try {
        const saved = localStorage.getItem('ng-editor-width');
        if (saved === 'narrow' || saved === 'standard' || saved === 'full') return saved;
      } catch {
        // ignore
      }
      return 'full';
    });
    const [editorMode, setEditorMode] = useState<EditorMode>('block');
    const [simpleFont, setSimpleFont] = useState<'sans' | 'serif' | 'mono'>('sans');
    const [selectedTools, setSelectedTools] = useState<string[]>(() => {
      if (enabledTools && enabledTools.length > 0) return enabledTools;
      try {
        const raw = localStorage.getItem('ng-enabled-tools');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // ignore
      }
      return ALL_TOOL_NAMES;
    });
    const [statsVisible, setStatsVisible] = useState(showStats);
    const [aiConfig, setAiConfig] = useState<AiConfig>(loadAiConfig);
    const [aiPopover, setAiPopover] = useState<{
      mode: 'ask' | 'continue';
      top: number;
      left: number;
    } | null>(null);
    const [askPrompt, setAskPrompt] = useState('');
    const [aiBusy, setAiBusy] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [scratchOpen, setScratchOpen] = useState(false);
    const [scratchText, setScratchText] = useState<string>(() => {
      try {
        return localStorage.getItem('ng-scratchpad-note') || '';
      } catch {
        return '';
      }
    });
    const [scratchCopied, setScratchCopied] = useState(false);
    const [scratchOffset, setScratchOffset] = useState({ x: 0, y: 0 });

    const [stats, setStats] = useState<{ words: number; blocks: number }>(() => {
      const blocks = initialData?.blocks || [];
      const text = blocks.map((b) => JSON.stringify(b.data || {})).join(' ');
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      return { words, blocks: blocks.length };
    });

    onChangeRef.current = onChange;
    onReadyRef.current = onReady;

    useEffect(() => {
      setStatsVisible(showStats);
    }, [showStats]);

    useEffect(() => {
      try {
        localStorage.setItem('ng-editor-theme', theme);
      } catch {
        // ignore
      }
      if (theme === 'inherit') {
        document.documentElement.removeAttribute('data-ng-theme');
      } else {
        document.documentElement.setAttribute('data-ng-theme', theme);
      }
      onThemeChange?.(theme);
    }, [theme, onThemeChange]);

    useEffect(() => {
      const shell = shellRef.current;
      if (!shell) return;
      const openAiNearRect = (mode: 'ask' | 'continue', e: Event) => {
        const rect = (e as CustomEvent<{ rect?: DOMRect }>).detail?.rect;
        const shellRect = shell.getBoundingClientRect();
        const popW = 320;
        const rawLeft = rect ? rect.left - shellRect.left : 60;
        const rawTop = rect ? rect.top - shellRect.top + 4 : 60;
        const maxLeft = Math.max(12, shellRect.width - popW - 12);
        const left = Math.max(12, Math.min(rawLeft, maxLeft));
        const top = Math.max(12, rawTop);
        setAiError(null);
        setAskPrompt('');
        setAiPopover({ mode, top, left });
      };
      const onOpenSettings = () => setSettingsOpen(true);
      const onAiContinue = (e: Event) => openAiNearRect('continue', e);
      const onAiAsk = (e: Event) => openAiNearRect('ask', e);
      const onOpenScratch = () => setScratchOpen(true);
      shell.addEventListener('nextgen-open-settings', onOpenSettings);
      shell.addEventListener('nextgen-ai-continue', onAiContinue);
      shell.addEventListener('nextgen-ai-ask', onAiAsk);
      shell.addEventListener('nextgen-open-scratch', onOpenScratch);
      return () => {
        shell.removeEventListener('nextgen-open-settings', onOpenSettings);
        shell.removeEventListener('nextgen-ai-continue', onAiContinue);
        shell.removeEventListener('nextgen-ai-ask', onAiAsk);
        shell.removeEventListener('nextgen-open-scratch', onOpenScratch);
      };
    }, []);

    useEffect(() => {
      const holder = holderRef.current;
      if (!holder) return;

      let cancelled = false;
      const detachCategories = attachPopoverCategoryHeaders(holder);
      const detachEmoji = attachEmojiSidePicker(holder);

      const effectiveTools = Array.from(new Set([...selectedTools, 'settings']));

      const mount = async () => {
        await lifecycleRef.current;
        if (cancelled) return;

        const sanitizedInitial = {
          ...(latestDocRef.current || { blocks: [] }),
          blocks: ((latestDocRef.current?.blocks || []) as EditorJSData['blocks']).filter(
            (b) => !['settings', 'continueWriting', 'askAi', 'scratch'].includes(b.type)
          ),
        };
        latestDocRef.current = sanitizedInitial;

        holder.innerHTML = '';
        const instance = new EditorJS({
          holder,
          data: sanitizedInitial as OutputData,
          placeholder:
            placeholder || 'Write your story, or press / to insert blocks...',
          tools: getEditorTools(true, effectiveTools),
          onChange: async () => {
            try {
              const saved = await instance.save();
              const filteredBlocks = (saved.blocks || []).filter(
                (b) => !['settings', 'continueWriting', 'askAi', 'scratch'].includes(b.type)
              );
              const typed = { ...saved, blocks: filteredBlocks } as unknown as EditorJSData;
              latestDocRef.current = typed;
              const words = (holder.innerText || '')
                .trim()
                .split(/\s+/)
                .filter(Boolean).length;
              setStats({ words, blocks: filteredBlocks.length });
              onChangeRef.current?.(typed);
            } catch {
              // ignore transient save errors while editing
            }
          },
        });

        editorRef.current = instance;

        try {
          await instance.isReady;
          if (cancelled) {
            instance.destroy();
            return;
          }
          try {
            new DragDrop(instance);
          } catch {
            // ignore
          }
          try {
            undoRef.current = new Undo({ editor: instance });
          } catch {
            // ignore
          }
          onReadyRef.current?.();
        } catch {
          // ignore if destroyed before ready
        }
      };

      void mount();

      return () => {
        cancelled = true;
        detachCategories();
        detachEmoji();
        const toDestroy = editorRef.current;
        editorRef.current = null;
        undoRef.current = null;
        if (toDestroy && typeof toDestroy.destroy === 'function') {
          lifecycleRef.current = toDestroy.isReady
            .then(() => {
              toDestroy.destroy();
            })
            .catch(() => {
              // ignore
            });
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editorMode, selectedTools]);

    useImperativeHandle(ref, () => ({
      save: async () => {
        if (!editorRef.current) return null;
        await editorRef.current.isReady;
        const saved = await editorRef.current.save();
        const filteredBlocks = (saved.blocks || []).filter(
          (b) => !['settings', 'continueWriting', 'askAi', 'scratch'].includes(b.type)
        );
        const typed = { ...saved, blocks: filteredBlocks } as unknown as EditorJSData;
        latestDocRef.current = typed;
        return typed;
      },
      undo: () => {
        if (undoRef.current && typeof undoRef.current.undo === 'function') {
          undoRef.current.undo();
        }
      },
      redo: () => {
        if (undoRef.current && typeof undoRef.current.redo === 'function') {
          undoRef.current.redo();
        }
      },
    }));

    const runAi = async (mode: 'continue' | 'ask', prompt = '') => {
      if (aiBusy) return;
      if (!onAiRequest && !aiConfig.apiKey.trim() && aiConfig.provider !== 'custom') {
        setSettingsOpen(true);
        setAiError('Add an API key in Settings to use AI features.');
        return;
      }

      setAiBusy(true);
      setAiError(null);

      try {
        let context = holderRef.current?.innerText?.trim() || '';
        if (editorRef.current) {
          await editorRef.current.isReady;
          const saved = await editorRef.current.save();
          latestDocRef.current = saved as unknown as EditorJSData;
          context = saved.blocks
            .map((b) => (typeof b.data?.text === 'string' ? b.data.text : ''))
            .filter(Boolean)
            .join('\n\n')
            .slice(-3000);
        }

        const result = onAiRequest
          ? await onAiRequest({ mode, prompt, context })
          : await generateAiText({ config: aiConfig, mode, prompt, context });

        const paragraphs = result
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter(Boolean);

        if (editorRef.current && paragraphs.length > 0) {
          for (const text of paragraphs) {
            editorRef.current.blocks.insert('paragraph', { text });
          }
          const updated = await editorRef.current.save();
          const typed = updated as unknown as EditorJSData;
          latestDocRef.current = typed;
          onChangeRef.current?.(typed);
        }

        if (mode === 'ask') {
          setAskPrompt('');
          setAiPopover(null);
        }
      } catch (err) {
        setAiError(err instanceof Error ? err.message : 'AI request failed.');
      } finally {
        setAiBusy(false);
      }
    };

    runAiRef.current = runAi;

    const handleModeSwitch = async (nextMode: EditorMode) => {
      if (nextMode === editorMode) return;
      if (editorRef.current) {
        try {
          await editorRef.current.isReady;
          const saved = await editorRef.current.save();
          latestDocRef.current = saved as unknown as EditorJSData;
        } catch {
          // ignore
        }
      }
      setEditorMode(nextMode);
    };

    const readMins = Math.max(1, Math.ceil(stats.words / 200));

    return (
      <div
        ref={shellRef}
        data-ng-theme={theme === 'inherit' ? undefined : theme}
        data-ng-width={docWidth}
        data-ng-font={editorMode === 'simple' ? simpleFont : undefined}
        className={className ? `nextgen-editor-shell ${className}` : 'nextgen-editor-shell'}
      >
        {showAiBar && (
          <div className="ng-ai-bar">
            <div className="ng-ai-actions">
              <button
                type="button"
                className="excalidraw-btn"
                disabled={aiBusy}
                onClick={() => void runAi('continue')}
              >
                {aiBusy ? 'Thinking…' : '✦ Continue Writing'}
              </button>
              <button
                type="button"
                className={`excalidraw-btn${aiPopover?.mode === 'ask' ? ' is-active' : ''}`}
                disabled={aiBusy}
                onClick={() =>
                  setAiPopover((p) =>
                    p ? null : { mode: 'ask', top: 120, left: 120 }
                  )
                }
              >
                Ask AI
              </button>
            </div>
            <button
              type="button"
              className="excalidraw-btn"
              onClick={() => setSettingsOpen(true)}
              title="Editor Settings (/settings)"
            >
              ⚙ Settings
            </button>
          </div>
        )}

        {editorMode === 'simple' && (
          <ClassicToolbar
            editorRef={editorRef}
            onUndo={() => undoRef.current?.undo?.()}
            onRedo={() => undoRef.current?.redo?.()}
            fontFamily={simpleFont}
            onChangeFontFamily={setSimpleFont}
            enabledTools={selectedTools}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}

        <div id="editorjs" ref={holderRef} />

        {statsVisible && (
          <div className="nextgen-editor-stats">
            <span>{editorMode === 'simple' ? 'Simple Mode' : 'Block Editor'}</span>
            <span>•</span>
            <span>{stats.blocks} blocks</span>
            <span>{stats.words} words</span>
            <span>~{readMins} min read</span>
          </div>
        )}

        <SettingsModal
          open={settingsOpen}
          theme={theme}
          docWidth={docWidth}
          mode={editorMode}
          showStats={statsVisible}
          aiConfig={aiConfig}
          selectedTools={selectedTools}
          onChangeTheme={setTheme}
          onChangeDocWidth={(w) => {
            setDocWidth(w);
            try {
              localStorage.setItem('ng-editor-width', w);
            } catch {
              // ignore
            }
          }}
          onChangeMode={(m) => void handleModeSwitch(m)}
          onChangeShowStats={setStatsVisible}
          onChangeAiConfig={(cfg) => {
            setAiConfig(cfg);
            saveAiConfig(cfg);
            setAiError(null);
          }}
          onChangeSelectedTools={(tools) => {
            setSelectedTools(tools);
            try {
              localStorage.setItem('ng-enabled-tools', JSON.stringify(tools));
            } catch {
              // ignore
            }
          }}
          onClose={() => setSettingsOpen(false)}
        />

        {aiPopover && (
          <form
            className="ng-ai-inline-popover"
            style={{ top: `${aiPopover.top}px`, left: `${aiPopover.left}px` }}
            onSubmit={(e) => {
              e.preventDefault();
              if (aiPopover.mode === 'continue') {
                void runAi('continue', askPrompt.trim());
              } else if (askPrompt.trim()) {
                void runAi('ask', askPrompt.trim());
              }
            }}
          >
            <div className="ng-ai-inline-head">
              <span>
                {aiPopover.mode === 'continue'
                  ? '✦ Continue Writing'
                  : 'Ask AI'}
              </span>
              <button
                type="button"
                className="b2"
                aria-label="Close AI prompt"
                onClick={() => setAiPopover(null)}
              >
                ×
              </button>
            </div>
            <div className="ng-ai-inline-row">
              <input
                type="text"
                autoFocus
                className="cdx-input editor-form-input"
                placeholder={
                  aiPopover.mode === 'continue'
                    ? 'How should AI continue? (optional)'
                    : 'What do you want AI to write?'
                }
                value={askPrompt}
                onChange={(e) => setAskPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setAiPopover(null);
                }}
              />
              <button
                type="submit"
                className="editor-form-submit"
                disabled={aiBusy || (aiPopover.mode === 'ask' && !askPrompt.trim())}
              >
                {aiBusy
                  ? 'Running…'
                  : aiPopover.mode === 'continue'
                  ? 'Continue'
                  : 'Generate'}
              </button>
            </div>
            {aiError && <div className="ng-ai-error">{aiError}</div>}
          </form>
        )}

        {scratchOpen && (
          <div
            className="ng-scratch-sticky"
            role="dialog"
            aria-label="Scratchpad sticky note"
            style={{
              transform: `translate(${scratchOffset.x}px, ${scratchOffset.y}px)`,
            }}
          >
            <div
              className="ng-scratch-sticky-head"
              onMouseDown={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                const startX = e.clientX - scratchOffset.x;
                const startY = e.clientY - scratchOffset.y;
                const onMove = (ev: MouseEvent) => {
                  setScratchOffset({ x: ev.clientX - startX, y: ev.clientY - startY });
                };
                const onUp = () => {
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
            >
              <span className="ng-scratch-sticky-title">📝 Scratchpad</span>
              <span className="ng-scratch-sticky-count">
                {scratchText.trim() ? scratchText.trim().split(/\s+/).length : 0}w · {scratchText.length}c
              </span>
              <div className="ng-scratch-sticky-actions">
                <button
                  type="button"
                  className="ng-scratch-sticky-btn"
                  onClick={() => {
                    if (!scratchText) return;
                    void navigator.clipboard?.writeText(scratchText);
                    setScratchCopied(true);
                    window.setTimeout(() => setScratchCopied(false), 1200);
                  }}
                >
                  {scratchCopied ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  className="ng-scratch-sticky-btn"
                  onClick={() => {
                    setScratchText('');
                    try {
                      localStorage.setItem('ng-scratchpad-note', '');
                    } catch {
                      // ignore
                    }
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="ng-scratch-sticky-btn"
                  aria-label="Close scratchpad"
                  onClick={() => setScratchOpen(false)}
                >
                  ×
                </button>
              </div>
            </div>
            <textarea
              className="ng-scratch-sticky-body"
              placeholder="Quick sticky note, rough ideas, snippets..."
              value={scratchText}
              onChange={(e) => {
                const val = e.target.value;
                setScratchText(val);
                try {
                  localStorage.setItem('ng-scratchpad-note', val);
                } catch {
                  // ignore
                }
              }}
            />
          </div>
        )}
      </div>
    );
  }
);

BlockEditor.displayName = 'BlockEditor';
