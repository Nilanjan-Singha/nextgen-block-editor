import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import EditorJS, { type OutputData } from '@editorjs/editorjs';
import DragDrop from 'editorjs-drag-drop';
import Undo from 'editorjs-undo';
import { getEditorTools } from '../editorTools';
import type { BlockEditorHandle, BlockEditorProps, EditorJSData } from '../types';

export const BlockEditor = React.forwardRef<BlockEditorHandle, BlockEditorProps>(
  ({ initialData, placeholder, enabledTools, showStats = true, className, onReady, onChange }, ref) => {
    const holderRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<EditorJS | null>(null);
    const undoRef = useRef<{ undo: () => void; redo: () => void } | null>(null);
    const lifecycleRef = useRef<Promise<void>>(Promise.resolve());
    const onChangeRef = useRef(onChange);
    const onReadyRef = useRef(onReady);
    const [stats, setStats] = useState<{ words: number; blocks: number }>(() => {
      const blocks = initialData?.blocks || [];
      const text = blocks.map((b) => JSON.stringify(b.data || {})).join(' ');
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      return { words, blocks: blocks.length };
    });

    onChangeRef.current = onChange;
    onReadyRef.current = onReady;

    useEffect(() => {
      const holder = holderRef.current;
      if (!holder) return;

      let cancelled = false;

      const mount = async () => {
        await lifecycleRef.current;
        if (cancelled) return;

        holder.innerHTML = '';
        const instance = new EditorJS({
          holder,
          data: (initialData || { blocks: [] }) as OutputData,
          placeholder: placeholder || 'Write your story, or press / to insert blocks...',
          tools: getEditorTools(true, enabledTools),
          onChange: async () => {
            try {
              const saved = await instance.save();
              const blocks = saved.blocks || [];
              const words = (holder.innerText || '')
                .trim()
                .split(/\s+/)
                .filter(Boolean).length;
              setStats({ words, blocks: blocks.length });
              onChangeRef.current?.(saved as unknown as EditorJSData);
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
    }, []);

    useImperativeHandle(ref, () => ({
      save: async () => {
        if (!editorRef.current) return null;
        await editorRef.current.isReady;
        const saved = await editorRef.current.save();
        return saved as unknown as EditorJSData;
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

    const readMins = Math.max(1, Math.ceil(stats.words / 200));

    return (
      <div className={className ? `nextgen-editor-shell ${className}` : 'nextgen-editor-shell'}>
        <div id="editorjs" ref={holderRef} />
        {showStats && (
          <div className="nextgen-editor-stats">
            <span>{stats.blocks} blocks</span>
            <span>{stats.words} words</span>
            <span>~{readMins} min read</span>
          </div>
        )}
      </div>
    );
  }
);

BlockEditor.displayName = 'BlockEditor';
