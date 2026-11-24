import React, { useMemo, useRef } from 'react';
import { useInteractiveArticle } from '../hooks/useInteractiveArticle';
import type { BlockRendererProps } from '../types';
import { blocksToHtml } from '../utils/blocksToHtml';

export const BlockRenderer: React.FC<BlockRendererProps> = ({
  data,
  className,
}) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  const html = useMemo(() => blocksToHtml(data), [data]);
  useInteractiveArticle(bodyRef, html);

  return (
    <div
      ref={bodyRef}
      className={className ? `article nextgen-editor-article ${className}` : 'article nextgen-editor-article'}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
