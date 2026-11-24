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
  SIMPLE_MODE_TOOLS,
  attachPopoverCategoryHeaders,
} from '../utils/popoverCategories';
import { attachEmojiSidePicker } from '../utils/emojiSidePicker';
import {
  SettingsModal,
  type EditorMode,
  type EditorThemePreset,
} from './SettingsModal';

export const BlockEditor = React.forwardRef<BlockEditorHandle, BlockEditorProps>(
  (
    {
      initialData,
      placeholder,
      enabledTools,
      showStats = true,
      showAiBar = true,
      onAiRequest,
      className,
      onReady,
      onChange,
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

    const [settingsOpen, setSettingsOpen] = useState(false);
    const [theme, setTheme] = useState<EditorThemePreset>('inherit');
    const [editorMode, setEditorMode] = useState<EditorMode>('block');
    const [statsVisible, setStatsVisible] = useState(showStats);
    const [aiConfig, setAiConfig] = useState<AiConfig>(loadAiConfig);
    const [askOpen, setAskOpen] = useState(false);
    const [askPrompt, setAskPrompt] = useState('');
    const [aiBusy, setAiBusy] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

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
      const shell = shellRef.current;
      if (!shell) return;
      const onOpenSettings = () => setSettingsOpen(true);
      shell.addEventListener('nextgen-open-settings', onOpenSettings);
      return () => shell.removeEventListener('nextgen-open-settings', onOpenSettings);
    }, []);

    useEffect(() => {
      const holder = holderRef.current;
      if (!holder) return;

      let cancelled = false;
      const detachCategories = attachPopoverCategoryHeaders(holder);
      const detachEmoji = attachEmojiSidePicker(holder);

      const effectiveTools =
        editorMode === 'simple'
          ? enabledTools && enabledTools.length > 0
            ? enabledTools.filter((t) => SIMPLE_MODE_TOOLS.includes(t))
            : SIMPLE_MODE_TOOLS
          : enabledTools;

      const mount = async () => {
        await lifecycleRef.current;
        if (cancelled) return;

        holder.innerHTML = '';
        const instance = new EditorJS({
          holder,
          data: (latestDocRef.current || { blocks: [] }) as OutputData,
          placeholder:
            placeholder || 'Write your story, or press / to insert blocks...',
          tools: getEditorTools(true, effectiveTools),
          onChange: async () => {
            try {
              const saved = await instance.save();
              const typed = saved as unknown as EditorJSData;
              latestDocRef.current = typed;
              const blocks = saved.blocks || [];
              const words = (holder.innerText || '')
                .trim()
                .split(/\s+/)
                .filter(Boolean).length;
              setStats({ words, blocks: blocks.length });
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
    }, [editorMode]);

    useImperativeHandle(ref, () => ({
      save: async () => {
        if (!editorRef.current) return null;
        await editorRef.current.isReady;
        const saved = await editorRef.current.save();
        const typed = saved as unknown as EditorJSData;
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
          setAskOpen(false);
        }
      } catch (err) {
        setAiError(err instanceof Error ? err.message : 'AI request failed.');
      } finally {
        setAiBusy(false);
      }
    };

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
                className={`excalidraw-btn${askOpen ? ' is-active' : ''}`}
                disabled={aiBusy}
                onClick={() => setAskOpen((o) => !o)}
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

        {askOpen && (
          <form
            className="ng-ask-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (askPrompt.trim()) void runAi('ask', askPrompt.trim());
            }}
          >
            <input
              type="text"
              className="cdx-input editor-form-input"
              placeholder="Ask AI to draft, summarize, or expand..."
              value={askPrompt}
              onChange={(e) => setAskPrompt(e.target.value)}
            />
            <button type="submit" className="editor-form-submit" disabled={aiBusy}>
              {aiBusy ? 'Running…' : 'Generate'}
            </button>
          </form>
        )}

        {aiError && <div className="ng-ai-error">{aiError}</div>}

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
          mode={editorMode}
          showStats={statsVisible}
          aiConfig={aiConfig}
          onChangeTheme={setTheme}
          onChangeMode={(m) => void handleModeSwitch(m)}
          onChangeShowStats={setStatsVisible}
          onChangeAiConfig={(cfg) => {
            setAiConfig(cfg);
            saveAiConfig(cfg);
            setAiError(null);
          }}
          onClose={() => setSettingsOpen(false)}
        />
      </div>
    );
  }
);

BlockEditor.displayName = 'BlockEditor';
