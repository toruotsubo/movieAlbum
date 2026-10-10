'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.getAttribute('aria-hidden') === 'true') return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  });
}

// 画面上に開かれているモーダル（コンテナ）のスタック
const trapStack: HTMLElement[] = [];

interface FocusTrapOptions {
  initialFocus?: boolean;
}

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  isActive: boolean = true,
  options?: FocusTrapOptions
) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    trapStack.push(container);

    let timer: NodeJS.Timeout | null = null;
    if (options?.initialFocus !== false) {
      // モーダル表示時に最初のフォーカス可能要素へフォーカスを移動
      timer = setTimeout(() => {
        if (!containerRef.current) return;
        // 既にコンテナ内の要素にフォーカスがあれば維持
        if (containerRef.current.contains(document.activeElement)) return;

        const focusables = getFocusableElements(containerRef.current);
        if (focusables.length > 0) {
          focusables[0].focus();
        } else {
          if (!containerRef.current.hasAttribute('tabindex')) {
            containerRef.current.setAttribute('tabindex', '-1');
          }
          containerRef.current.focus();
        }
      }, 50);
    }

    return () => {
      if (timer) clearTimeout(timer);
      const index = trapStack.indexOf(container);
      if (index !== -1) {
        trapStack.splice(index, 1);
      }
    };
  }, [isActive, options?.initialFocus]);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;

      // ネストされたモーダルがある場合、最前面（スタックの末尾）のコンテナのみ処理
      if (trapStack.length > 0 && trapStack[trapStack.length - 1] !== container) {
        return;
      }

      const focusables = getFocusableElements(container);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        // Shift + Tab: 逆方向
        if (!active || !container.contains(active) || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: 順方向
        if (!active || !container.contains(active) || active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);

  return containerRef;
}
