'use client';

import React, { useEffect, useRef } from 'react';

interface SlideItemProps extends React.HTMLAttributes<HTMLDivElement> {
  isCurrent: boolean;
  children: React.ReactNode;
}

/**
 * スライダーの各スライド用ラッパーコンポーネント。
 * React 18のJSXではinert属性がDOMへ出力されない問題があるため、
 * DOM要素に対して直接setAttribute('inert', '')とel.inert = true/falseを同期します。
 */
export const SlideItem: React.FC<SlideItemProps> = ({
  isCurrent,
  children,
  className,
  ...props
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  // 初回マウント時およびisCurrent変更時にDOMのinert属性とプロパティを直接設定
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!isCurrent) {
      el.setAttribute('inert', '');
      (el as any).inert = true;
    } else {
      el.removeAttribute('inert');
      (el as any).inert = false;
    }
  }, [isCurrent]);

  const setRef = (el: HTMLDivElement | null) => {
    ref.current = el;
    if (el) {
      if (!isCurrent) {
        el.setAttribute('inert', '');
        (el as any).inert = true;
      } else {
        el.removeAttribute('inert');
        (el as any).inert = false;
      }
    }
  };

  return (
    <div
      ref={setRef}
      className={className}
      aria-hidden={!isCurrent}
      {...props}
    >
      {children}
    </div>
  );
};
