import { useEffect } from 'react';

export function useInteractiveArticle(
  containerRef: React.RefObject<HTMLElement | null>,
  depKey: unknown
) {
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const cleanups: Array<() => void> = [];

    // 1. Carousel sliders
    root.querySelectorAll<HTMLElement>('[data-carousel]').forEach((carousel) => {
      const track = carousel.querySelector<HTMLElement>('.editor-carousel-track');
      const prevBtn = carousel.querySelector<HTMLButtonElement>('.editor-carousel-prev');
      const nextBtn = carousel.querySelector<HTMLButtonElement>('.editor-carousel-next');
      const dots = Array.from(carousel.querySelectorAll<HTMLButtonElement>('.editor-carousel-dot'));
      if (!track || !dots.length) return;

      const setActiveDot = (index: number) => {
        dots.forEach((d, i) => d.classList.toggle('active', i === index));
      };

      const goTo = (index: number) => {
        const clamped = Math.max(0, Math.min(dots.length - 1, index));
        track.scrollTo({
          left: clamped * track.clientWidth,
          behavior: 'smooth',
        });
        setActiveDot(clamped);
      };

      const onScroll = () => {
        if (!track.clientWidth) return;
        const idx = Math.round(track.scrollLeft / track.clientWidth);
        setActiveDot(idx);
      };
      track.addEventListener('scroll', onScroll, { passive: true });
      cleanups.push(() => track.removeEventListener('scroll', onScroll));

      if (prevBtn) {
        const onPrev = () => {
          const idx = Math.round(track.scrollLeft / (track.clientWidth || 1));
          goTo(idx - 1);
        };
        prevBtn.addEventListener('click', onPrev);
        cleanups.push(() => prevBtn.removeEventListener('click', onPrev));
      }

      if (nextBtn) {
        const onNext = () => {
          const idx = Math.round(track.scrollLeft / (track.clientWidth || 1));
          goTo(idx + 1);
        };
        nextBtn.addEventListener('click', onNext);
        cleanups.push(() => nextBtn.removeEventListener('click', onNext));
      }

      dots.forEach((dot, idx) => {
        const onDot = () => goTo(idx);
        dot.addEventListener('click', onDot);
        cleanups.push(() => dot.removeEventListener('click', onDot));
      });
    });

    // 2. Before / After comparison sliders
    root.querySelectorAll<HTMLElement>('.editor-compare').forEach((compare) => {
      let dragging = false;
      const setPos = (clientX: number) => {
        const rect = compare.getBoundingClientRect();
        if (!rect.width) return;
        const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        compare.style.setProperty('--pos', `${pct.toFixed(2)}%`);
        const handle = compare.querySelector('.editor-compare-handle');
        handle?.setAttribute('aria-valuenow', String(Math.round(pct)));
      };

      const onPointerDown = (e: PointerEvent) => {
        dragging = true;
        compare.setPointerCapture(e.pointerId);
        setPos(e.clientX);
      };
      const onPointerMove = (e: PointerEvent) => {
        if (dragging) setPos(e.clientX);
      };
      const onPointerUp = () => {
        dragging = false;
      };

      compare.addEventListener('pointerdown', onPointerDown);
      compare.addEventListener('pointermove', onPointerMove);
      compare.addEventListener('pointerup', onPointerUp);
      compare.addEventListener('pointercancel', onPointerUp);
      cleanups.push(() => {
        compare.removeEventListener('pointerdown', onPointerDown);
        compare.removeEventListener('pointermove', onPointerMove);
        compare.removeEventListener('pointerup', onPointerUp);
        compare.removeEventListener('pointercancel', onPointerUp);
      });
    });

    // 3. Lightbox gallery
    root.querySelectorAll<HTMLElement>('.editor-gallery').forEach((gallery) => {
      const buttons = Array.from(
        gallery.querySelectorAll<HTMLButtonElement>('.editor-gallery-item')
      );
      const srcs = buttons.map((b) => b.dataset.gallerySrc || '').filter(Boolean);
      if (!srcs.length) return;

      const openLightbox = (startIndex: number) => {
        let current = startIndex;
        const overlay = document.createElement('div');
        overlay.className = 'editor-lightbox';
        overlay.innerHTML = `
          <button type="button" class="editor-lightbox-close" aria-label="Close">×</button>
          <button type="button" class="editor-lightbox-nav prev" aria-label="Previous image">‹</button>
          <img class="editor-lightbox-img" src="${srcs[current]}" alt="">
          <button type="button" class="editor-lightbox-nav next" aria-label="Next image">›</button>
          <div class="editor-lightbox-count">${current + 1} / ${srcs.length}</div>
        `;
        const img = overlay.querySelector<HTMLImageElement>('.editor-lightbox-img')!;
        const count = overlay.querySelector<HTMLElement>('.editor-lightbox-count')!;

        const update = (next: number) => {
          current = (next + srcs.length) % srcs.length;
          img.src = srcs[current];
          count.textContent = `${current + 1} / ${srcs.length}`;
        };

        const close = () => {
          document.removeEventListener('keydown', onKey);
          overlay.remove();
        };

        const onKey = (e: KeyboardEvent) => {
          if (e.key === 'Escape') close();
          else if (e.key === 'ArrowLeft') update(current - 1);
          else if (e.key === 'ArrowRight') update(current + 1);
        };

        overlay.querySelector('.editor-lightbox-close')?.addEventListener('click', close);
        overlay.querySelector('.editor-lightbox-nav.prev')?.addEventListener('click', () => update(current - 1));
        overlay.querySelector('.editor-lightbox-nav.next')?.addEventListener('click', () => update(current + 1));
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) close();
        });
        document.addEventListener('keydown', onKey);
        document.body.appendChild(overlay);
      };

      buttons.forEach((btn, idx) => {
        const onClick = () => openLightbox(idx);
        btn.addEventListener('click', onClick);
        cleanups.push(() => btn.removeEventListener('click', onClick));
      });
    });

    // 4. Slide deck / Presentation blocks
    root.querySelectorAll<HTMLElement>('[data-slides]').forEach((deck) => {
      const panels = Array.from(deck.querySelectorAll<HTMLElement>('.editor-slide-panel'));
      const countEl = deck.querySelector<HTMLElement>('.editor-slides-count');
      const prevBtn = deck.querySelector<HTMLButtonElement>('.editor-slides-prev');
      const nextBtn = deck.querySelector<HTMLButtonElement>('.editor-slides-next');
      const presentBtn = deck.querySelector<HTMLButtonElement>('.editor-slides-present');
      if (!panels.length) return;

      let current = 0;
      const show = (next: number) => {
        current = Math.max(0, Math.min(panels.length - 1, next));
        panels.forEach((p, idx) => p.classList.toggle('active', idx === current));
        if (countEl) countEl.textContent = `${current + 1} / ${panels.length}`;
      };

      const onPrev = () => show(current - 1);
      const onNext = () => show(current + 1);
      const onPresent = () => {
        if (document.fullscreenElement === deck) {
          void document.exitFullscreen();
        } else if (deck.requestFullscreen) {
          void deck.requestFullscreen();
        } else {
          deck.classList.toggle('is-presenting');
        }
      };

      prevBtn?.addEventListener('click', onPrev);
      nextBtn?.addEventListener('click', onNext);
      presentBtn?.addEventListener('click', onPresent);
      cleanups.push(() => {
        prevBtn?.removeEventListener('click', onPrev);
        nextBtn?.removeEventListener('click', onNext);
        presentBtn?.removeEventListener('click', onPresent);
      });
    });

    // 5. Tabbed content blocks
    root.querySelectorAll<HTMLElement>('[data-tabs]').forEach((tabsBlock) => {
      const tabBtns = Array.from(tabsBlock.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
      const panels = Array.from(tabsBlock.querySelectorAll<HTMLElement>('[role="tabpanel"]'));

      tabBtns.forEach((btn, idx) => {
        const onClick = () => {
          tabBtns.forEach((b, i) => b.setAttribute('aria-selected', String(i === idx)));
          panels.forEach((p, i) => p.classList.toggle('active', i === idx));
        };
        btn.addEventListener('click', onClick);
        cleanups.push(() => btn.removeEventListener('click', onClick));
      });
    });

    // 6. Accordion / FAQ stack (mutually exclusive)
    root.querySelectorAll<HTMLElement>('.editor-accordion').forEach((acc) => {
      const items = Array.from(acc.querySelectorAll<HTMLDetailsElement>('.editor-accordion-item'));
      items.forEach((item) => {
        const onToggle = () => {
          if (item.open) {
            items.forEach((other) => {
              if (other !== item) other.open = false;
            });
          }
        };
        item.addEventListener('toggle', onToggle);
        cleanups.push(() => item.removeEventListener('toggle', onToggle));
      });
    });

    // 7. Interactive Form Builder blocks
    root.querySelectorAll<HTMLFormElement>('.editor-form-block').forEach((form) => {
      const onSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        const statusEl = form.querySelector<HTMLElement>('.editor-form-status');
        const submitBtn = form.querySelector<HTMLButtonElement>('.editor-form-submit');
        const formData = new FormData(form);
        const payload: Record<string, unknown> = {};
        formData.forEach((value, key) => {
          payload[key] = value;
        });

        form.dispatchEvent(
          new CustomEvent('nextgen-form-submit', { detail: payload, bubbles: true })
        );

        const actionUrl = form.dataset.action;
        if (actionUrl) {
          if (submitBtn) submitBtn.disabled = true;
          if (statusEl) statusEl.textContent = 'Sending...';
          try {
            const res = await fetch(actionUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            if (statusEl) statusEl.textContent = 'Submitted!';
            form.reset();
          } catch {
            if (statusEl) statusEl.textContent = 'Failed to submit.';
          } finally {
            if (submitBtn) submitBtn.disabled = false;
          }
        } else {
          if (statusEl) statusEl.textContent = 'Submitted!';
          form.reset();
        }
      };
      form.addEventListener('submit', onSubmit);
      cleanups.push(() => form.removeEventListener('submit', onSubmit));
    });

    // 8. Audio audio cards & music carousel players
    const fmtTime = (secs: number) => {
      if (!Number.isFinite(secs) || secs < 0) return '0:00';
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const allAudios = Array.from(
      root.querySelectorAll<HTMLAudioElement>('[data-audio-player] .editor-audio-audio')
    );

    root.querySelectorAll<HTMLElement>('[data-audio-player]').forEach((card) => {
      const audio = card.querySelector<HTMLAudioElement>('.editor-audio-audio');
      const playBtn = card.querySelector<HTMLButtonElement>('.editor-audio-play');
      const progress = card.querySelector<HTMLElement>('.editor-audio-progress');
      const fill = card.querySelector<HTMLElement>('.editor-audio-progress-fill');
      const curEl = card.querySelector<HTMLElement>('[data-current]');
      const durEl = card.querySelector<HTMLElement>('[data-duration]');
      if (!audio || !playBtn || !progress || !fill || !curEl || !durEl) return;

      const onMeta = () => {
        durEl.textContent = fmtTime(audio.duration);
      };
      const onTime = () => {
        curEl.textContent = fmtTime(audio.currentTime);
        const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
        fill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
      };
      const onEnded = () => {
        playBtn.textContent = '▶';
        card.classList.remove('is-playing');
      };
      const onPlayClick = () => {
        if (audio.paused) {
          allAudios.forEach((other) => {
            if (other !== audio && !other.paused) {
              other.pause();
              const otherCard = other.closest<HTMLElement>('[data-audio-player]');
              const otherBtn = otherCard?.querySelector<HTMLButtonElement>('.editor-audio-play');
              if (otherBtn) otherBtn.textContent = '▶';
              otherCard?.classList.remove('is-playing');
            }
          });
          audio.play().catch(() => {});
          playBtn.textContent = '❚❚';
          card.classList.add('is-playing');
        } else {
          audio.pause();
          playBtn.textContent = '▶';
          card.classList.remove('is-playing');
        }
      };
      const onSeek = (e: MouseEvent) => {
        if (!audio.duration) return;
        const rect = progress.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        audio.currentTime = ratio * audio.duration;
      };

      audio.addEventListener('loadedmetadata', onMeta);
      audio.addEventListener('timeupdate', onTime);
      audio.addEventListener('ended', onEnded);
      playBtn.addEventListener('click', onPlayClick);
      progress.addEventListener('click', onSeek);

      cleanups.push(() => {
        audio.removeEventListener('loadedmetadata', onMeta);
        audio.removeEventListener('timeupdate', onTime);
        audio.removeEventListener('ended', onEnded);
        playBtn.removeEventListener('click', onPlayClick);
        progress.removeEventListener('click', onSeek);
      });
    });

    // 9. Interactive To-Do cards & Eisenhower Matrix checkboxes
    root.querySelectorAll<HTMLElement>('[data-todo-card]').forEach((card) => {
      const progressEl = card.querySelector<HTMLElement>('[data-todo-progress]');
      const checkboxes = Array.from(
        card.querySelectorAll<HTMLInputElement>('.editor-todo-item input[type="checkbox"]')
      );
      const sync = () => {
        let done = 0;
        checkboxes.forEach((cb) => {
          cb.closest('.editor-todo-item')?.classList.toggle('is-done', cb.checked);
          if (cb.checked) done += 1;
        });
        if (progressEl) {
          progressEl.textContent = `${done}/${checkboxes.length} done`;
        }
      };
      checkboxes.forEach((cb) => {
        cb.addEventListener('change', sync);
        cleanups.push(() => cb.removeEventListener('change', sync));
      });
    });

    root
      .querySelectorAll<HTMLInputElement>('.editor-eisenhower-check input[type="checkbox"]')
      .forEach((cb) => {
        const onChange = () => {
          cb.closest('.editor-eisenhower-check')?.classList.toggle('is-done', cb.checked);
        };
        cb.addEventListener('change', onChange);
        cleanups.push(() => cb.removeEventListener('change', onChange));
      });

    // 10. Interactive Poll cards
    root.querySelectorAll<HTMLElement>('[data-poll-card]').forEach((poll) => {
      const options = Array.from(poll.querySelectorAll<HTMLButtonElement>('.editor-poll-option'));
      const totalEl = poll.querySelector<HTMLElement>('[data-poll-total]');

      const updateBars = () => {
        const total = options.reduce(
          (sum, btn) => sum + (Number(btn.dataset.votes) || 0),
          0
        );
        options.forEach((btn) => {
          const votes = Number(btn.dataset.votes) || 0;
          const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
          const bar = btn.querySelector<HTMLElement>('.editor-poll-bar');
          const stat = btn.querySelector<HTMLElement>('.editor-poll-stat');
          if (bar) bar.style.width = `${pct}%`;
          if (stat) stat.textContent = `${pct}% (${votes})`;
        });
        if (totalEl) totalEl.textContent = `${total} total votes`;
      };

      options.forEach((btn) => {
        const onVote = () => {
          if (poll.dataset.voted === 'true') return;
          poll.dataset.voted = 'true';
          btn.dataset.votes = String((Number(btn.dataset.votes) || 0) + 1);
          btn.classList.add('is-selected');
          updateBars();
          poll.dispatchEvent(
            new CustomEvent('nextgen-poll-vote', {
              detail: { optionIndex: Number(btn.dataset.pollIdx) },
              bubbles: true,
            })
          );
        };
        btn.addEventListener('click', onVote);
        cleanups.push(() => btn.removeEventListener('click', onVote));
      });
    });

    // 11. Interactive Quiz cards (correct = green, wrong = red)
    root.querySelectorAll<HTMLElement>('[data-quiz-card]').forEach((quiz) => {
      const questions = Array.from(quiz.querySelectorAll<HTMLElement>('[data-quiz-q]'));
      const scoreEl = quiz.querySelector<HTMLElement>('[data-quiz-score]');
      const resetBtn = quiz.querySelector<HTMLButtonElement>('[data-quiz-reset]');

      const updateScore = () => {
        const correctCount = questions.filter((q) => q.dataset.result === 'correct').length;
        if (scoreEl) scoreEl.textContent = `Score: ${correctCount}/${questions.length}`;
      };

      questions.forEach((qEl) => {
        const correctIdx = Number(qEl.dataset.correct) || 0;
        const opts = Array.from(qEl.querySelectorAll<HTMLButtonElement>('.editor-quiz-option'));
        const feedbackEl = qEl.querySelector<HTMLElement>('.editor-quiz-feedback');
        const expEl = qEl.querySelector<HTMLElement>('.editor-quiz-explanation');

        opts.forEach((btn) => {
          const onClick = () => {
            if (qEl.dataset.answered === 'true') return;
            qEl.dataset.answered = 'true';
            const chosen = Number(btn.dataset.optIdx);
            const isCorrect = chosen === correctIdx;
            qEl.dataset.result = isCorrect ? 'correct' : 'wrong';

            if (isCorrect) {
              btn.classList.add('is-correct');
              if (feedbackEl) {
                feedbackEl.textContent = 'Correct!';
                feedbackEl.className = 'editor-quiz-feedback is-correct';
              }
            } else {
              btn.classList.add('is-wrong');
              opts[correctIdx]?.classList.add('is-correct');
              if (feedbackEl) {
                feedbackEl.textContent = 'Incorrect';
                feedbackEl.className = 'editor-quiz-feedback is-wrong';
              }
            }
            if (expEl) expEl.hidden = false;
            updateScore();
          };
          btn.addEventListener('click', onClick);
          cleanups.push(() => btn.removeEventListener('click', onClick));
        });
      });

      if (resetBtn) {
        const onReset = () => {
          questions.forEach((qEl) => {
            delete qEl.dataset.answered;
            delete qEl.dataset.result;
            qEl.querySelectorAll<HTMLButtonElement>('.editor-quiz-option').forEach((btn) => {
              btn.classList.remove('is-correct', 'is-wrong');
            });
            const feedbackEl = qEl.querySelector<HTMLElement>('.editor-quiz-feedback');
            if (feedbackEl) {
              feedbackEl.textContent = '';
              feedbackEl.className = 'editor-quiz-feedback';
            }
            const expEl = qEl.querySelector<HTMLElement>('.editor-quiz-explanation');
            if (expEl) expEl.hidden = true;
          });
          updateScore();
        };
        resetBtn.addEventListener('click', onReset);
        cleanups.push(() => resetBtn.removeEventListener('click', onReset));
      }
    });

    // 12. Interactive Focus Timer cards
    root.querySelectorAll<HTMLElement>('[data-focus-timer]').forEach((card) => {
      const totalSecs = Math.max(60, (Number(card.dataset.minutes) || 25) * 60);
      let remaining = totalSecs;
      let intervalId: number | null = null;

      const displayEl = card.querySelector<HTMLElement>('[data-timer-display]');
      const toggleBtn = card.querySelector<HTMLButtonElement>('[data-timer-toggle]');
      const resetBtn = card.querySelector<HTMLButtonElement>('[data-timer-reset]');
      const fillEl = card.querySelector<HTMLElement>('[data-timer-fill]');

      const render = () => {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        if (displayEl) {
          displayEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        if (fillEl) {
          const pct = ((totalSecs - remaining) / totalSecs) * 100;
          fillEl.style.width = `${Math.min(100, Math.max(0, pct))}%`;
        }
      };

      const stop = () => {
        if (intervalId !== null) {
          window.clearInterval(intervalId);
          intervalId = null;
        }
        if (toggleBtn) toggleBtn.textContent = remaining === 0 ? 'Done' : 'Start';
      };

      const onToggle = () => {
        if (intervalId !== null) {
          stop();
          return;
        }
        if (remaining <= 0) remaining = totalSecs;
        if (toggleBtn) toggleBtn.textContent = 'Pause';
        intervalId = window.setInterval(() => {
          remaining = Math.max(0, remaining - 1);
          render();
          if (remaining === 0) {
            stop();
          }
        }, 1000);
      };

      const onReset = () => {
        stop();
        remaining = totalSecs;
        if (toggleBtn) toggleBtn.textContent = 'Start';
        render();
      };

      toggleBtn?.addEventListener('click', onToggle);
      resetBtn?.addEventListener('click', onReset);

      cleanups.push(() => {
        stop();
        toggleBtn?.removeEventListener('click', onToggle);
        resetBtn?.removeEventListener('click', onReset);
      });
    });

    // 13. Table of Contents & Code Copy buttons
    root.querySelectorAll<HTMLElement>('[data-toc-card]').forEach((toc) => {
      const maxDepth = Math.min(4, Math.max(2, Number(toc.dataset.tocDepth) || 3));
      const list = toc.querySelector<HTMLUListElement>('.editor-toc-list');
      if (!list) return;
      list.innerHTML = '';

      const selector = Array.from({ length: maxDepth }, (_, i) => `h${i + 1}`).join(', ');
      const headings = Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
        (h) => !h.closest('[data-toc-card]')
      );

      if (!headings.length) {
        const li = document.createElement('li');
        li.className = 'editor-toc-empty';
        li.textContent = 'No headings found in document.';
        list.appendChild(li);
        return;
      }

      headings.forEach((h, idx) => {
        if (!h.id) h.id = `toc-heading-${idx}`;
        const level = Number(h.tagName.slice(1)) || 2;
        const li = document.createElement('li');
        li.className = `editor-toc-item level-${level}`;
        const a = document.createElement('a');
        a.href = `#${h.id}`;
        a.textContent = h.textContent || `Section ${idx + 1}`;
        const onClick = (e: MouseEvent) => {
          e.preventDefault();
          h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        a.addEventListener('click', onClick);
        cleanups.push(() => a.removeEventListener('click', onClick));
        li.appendChild(a);
        list.appendChild(li);
      });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-copy-code]').forEach((btn) => {
      const onCopy = () => {
        const codeEl = btn.closest('.editor-code-block')?.querySelector('pre code');
        const text = codeEl?.textContent || '';
        if (!text) return;
        navigator.clipboard?.writeText(text).catch(() => {});
        btn.textContent = 'Copied!';
        window.setTimeout(() => {
          btn.textContent = 'Copy';
        }, 1500);
      };
      btn.addEventListener('click', onCopy);
      cleanups.push(() => btn.removeEventListener('click', onCopy));
    });

    // 14. Interactive Flashcard Decks
    root.querySelectorAll<HTMLElement>('[data-flashcard-deck]').forEach((deck) => {
      let cards: Array<{ front?: string; back?: string }> = [];
      try {
        cards = JSON.parse(deck.dataset.cards || '[]');
      } catch {
        cards = [];
      }
      if (!cards.length) return;

      let idx = 0;
      let flipped = false;
      const countEl = deck.querySelector<HTMLElement>('[data-fc-count]');
      const sideEl = deck.querySelector<HTMLElement>('[data-fc-side]');
      const textEl = deck.querySelector<HTMLElement>('[data-fc-text]');
      const stageBtn = deck.querySelector<HTMLButtonElement>('[data-fc-stage]');
      const prevBtn = deck.querySelector<HTMLButtonElement>('[data-fc-prev]');
      const flipBtn = deck.querySelector<HTMLButtonElement>('[data-fc-flip]');
      const nextBtn = deck.querySelector<HTMLButtonElement>('[data-fc-next]');

      const sync = () => {
        const card = cards[idx] || {};
        if (countEl) countEl.textContent = `${idx + 1} / ${cards.length}`;
        if (sideEl) sideEl.textContent = flipped ? 'Back' : 'Front';
        if (textEl) textEl.textContent = flipped ? card.back || '' : card.front || '';
        stageBtn?.classList.toggle('is-flipped', flipped);
      };

      const onFlip = () => {
        flipped = !flipped;
        sync();
      };
      const onPrev = () => {
        idx = (idx - 1 + cards.length) % cards.length;
        flipped = false;
        sync();
      };
      const onNext = () => {
        idx = (idx + 1) % cards.length;
        flipped = false;
        sync();
      };

      stageBtn?.addEventListener('click', onFlip);
      flipBtn?.addEventListener('click', onFlip);
      prevBtn?.addEventListener('click', onPrev);
      nextBtn?.addEventListener('click', onNext);

      cleanups.push(() => {
        stageBtn?.removeEventListener('click', onFlip);
        flipBtn?.removeEventListener('click', onFlip);
        prevBtn?.removeEventListener('click', onPrev);
        nextBtn?.removeEventListener('click', onNext);
      });
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [containerRef, depKey]);
}
