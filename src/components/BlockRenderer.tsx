import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useInteractiveArticle } from '../hooks/useInteractiveArticle';
import type { BlockRendererProps } from '../types';
import { blocksToHtml } from '../utils/blocksToHtml';

export const BlockRenderer: React.FC<BlockRendererProps> = ({
  data,
  theme,
  className,
}) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const html = useMemo(() => blocksToHtml(data), [data]);
  useInteractiveArticle(bodyRef, html);

  useEffect(() => {
    const updateProgress = () => {
      const el = bodyRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = Math.max(1, el.scrollHeight - window.innerHeight);
      const scrolled = Math.min(total, Math.max(0, -rect.top));
      setProgress(Math.round((scrolled / total) * 100));
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [html]);

  let resolvedTheme = theme;
  if (!resolvedTheme && typeof window !== 'undefined') {
    resolvedTheme =
      document.documentElement.getAttribute('data-ng-theme') ||
      (() => {
        try {
          return localStorage.getItem('ng-editor-theme') || undefined;
        } catch {
          return undefined;
        }
      })();
  }
  const attrTheme =
    resolvedTheme === 'light' || resolvedTheme === 'dark' ? resolvedTheme : undefined;

  return (
    <div
      ref={bodyRef}
      data-ng-theme={attrTheme}
      className={className ? `article nextgen-editor-article ${className}` : 'article nextgen-editor-article'}
    >
      <div className="ng-reading-progress" aria-hidden="true">
        <div className="ng-reading-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
};
