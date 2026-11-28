const COLLAPSIBLE_SELECTOR =
  '.editor-form-builder, .editor-eisenhower-builder, .editor-audio-builder, .editor-bento-shell, .block-card';

export function attachCompactCollapseBars(container: HTMLElement): () => void {
  const enhance = () => {
    container.querySelectorAll<HTMLElement>(COLLAPSIBLE_SELECTOR).forEach((el) => {
      if (el.dataset.ngCompactBound === '1') return;
      el.dataset.ngCompactBound = '1';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ng-collapse-btn';
      btn.textContent = '▴ Compact';
      btn.title = 'Collapse or expand block fields';

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const collapsed = el.classList.toggle('is-compact-collapsed');
        btn.textContent = collapsed ? '▾ Edit' : '▴ Compact';
      });

      el.classList.add('ng-collapsible-block');
      el.prepend(btn);
    });
  };

  enhance();
  const observer = new MutationObserver(() => enhance());
  observer.observe(container, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
  };
}
