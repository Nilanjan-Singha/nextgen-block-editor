import React, { useMemo, useRef } from 'react';
import { useInteractiveArticle } from '../hooks/useInteractiveArticle';
import type { BlockRendererProps } from '../types';
import { blocksToHtml } from '../utils/blocksToHtml';

export const BlockRenderer: React.FC<BlockRendererProps> = ({
  data,
  theme,
  className,
}) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  const html = useMemo(() => blocksToHtml(data), [data]);
  useInteractiveArticle(bodyRef, html);

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
    resolvedTheme && resolvedTheme !== 'inherit' ? resolvedTheme : undefined;

  return (
    <div
      ref={bodyRef}
      data-ng-theme={attrTheme}
      className={className ? `article nextgen-editor-article ${className}` : 'article nextgen-editor-article'}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
