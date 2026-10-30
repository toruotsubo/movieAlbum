'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Plus, Tag } from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { clsx } from 'clsx';

interface TagInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  existingTags?: string[];
}

export const TagInput: React.FC<TagInputProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
  existingTags = [],
}) => {
  const { t } = useApp();
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // カンマや読点区切りで分割してタグの配列を取得
  const tags = useMemo(
    () =>
      value
        ? value
            .split(/[,、，]/)
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
    [value]
  );

  // 入力文字と前方一致する既存タグ候補（未入力時は表示しない、追加済みタグは除外）
  const matchingSuggestions = useMemo(() => {
    const query = inputValue.trim();
    if (!query) return [];

    const lowerQuery = query.toLowerCase();
    const currentSet = new Set(tags);

    return existingTags.filter(
      (tag) => !currentSet.has(tag) && tag.toLowerCase().startsWith(lowerQuery)
    );
  }, [inputValue, existingTags, tags]);

  // 入力内容が変わったらハイライト位置をリセット
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [inputValue]);

  // キーボード操作時にハイライト項目へスクロール追従
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const itemEl = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
      if (itemEl) {
        itemEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const handleSelectSuggestion = (selectedTag: string) => {
    const currentSet = new Set(tags);
    if (!currentSet.has(selectedTag)) {
      currentSet.add(selectedTag);
      onChange(Array.from(currentSet).join(', '));
    }
    setInputValue('');
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    // カンマや読点区切りで分割し、トリム＆空除外
    const newItems = trimmed
      .split(/[,、，]/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (newItems.length === 0) return;

    const currentSet = new Set(tags);
    let changed = false;

    for (const item of newItems) {
      if (!currentSet.has(item)) {
        currentSet.add(item);
        changed = true;
      }
    }

    if (changed) {
      onChange(Array.from(currentSet).join(', '));
    }
    setInputValue('');
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 日本語変換等のIME確定中のキー操作では処理しない
    if (e.nativeEvent.isComposing) {
      return;
    }

    if (e.key === 'ArrowDown') {
      if (matchingSuggestions.length > 0) {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < matchingSuggestions.length - 1 ? prev + 1 : 0
        );
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      if (matchingSuggestions.length > 0) {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : matchingSuggestions.length - 1
        );
      }
      return;
    }

    if (e.key === 'Escape') {
      if (matchingSuggestions.length > 0 && highlightedIndex !== -1) {
        e.preventDefault();
        e.stopPropagation();
        setHighlightedIndex(-1);
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (
        highlightedIndex >= 0 &&
        highlightedIndex < matchingSuggestions.length
      ) {
        handleSelectSuggestion(matchingSuggestions[highlightedIndex]);
      } else {
        handleAdd();
      }
    }
  };

  const handleRemove = (tagToRemove: string) => {
    const updatedTags = tags.filter((item) => item !== tagToRemove);
    onChange(updatedTags.join(', '));
  };

  const showSuggestions = isFocused && matchingSuggestions.length > 0;

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* 入力済みタグ一覧 */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 min-h-[38px] items-center">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-200 text-xs font-medium group transition-colors select-none"
            >
              <span className="max-w-[200px] truncate" title={tag}>
                {tag}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(tag)}
                className="p-0.5 rounded-md text-blue-400 hover:text-red-400 hover:bg-slate-800/80 transition-colors cursor-pointer"
                aria-label={`Remove tag ${tag}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 新規タグUI (inputフォーム + 候補ドロップダウン + 追加ボタン) */}
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || t('form_tags_placeholder')}
            className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />

          {/* 前方一致候補リスト */}
          {showSuggestions && (
            <div
              ref={listRef}
              className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-48 overflow-y-auto rounded-xl bg-slate-900 border border-slate-700/80 shadow-xl py-1 select-none"
            >
              {matchingSuggestions.map((suggestion, index) => {
                const isHighlighted = index === highlightedIndex;
                return (
                  <button
                    key={suggestion}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectSuggestion(suggestion);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={clsx(
                      'w-full flex items-center gap-2 px-3.5 py-2 text-left text-xs font-medium transition-colors cursor-pointer',
                      isHighlighted
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-200 hover:bg-slate-800'
                    )}
                  >
                    <Tag
                      className={clsx(
                        'w-3.5 h-3.5 shrink-0',
                        isHighlighted ? 'text-blue-200' : 'text-blue-400'
                      )}
                    />
                    <span className="truncate">{suggestion}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all select-none cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t('add')}</span>
        </button>
      </div>
    </div>
  );
};
