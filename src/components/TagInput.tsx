'use client';

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useApp } from '@/components/AppProvider';

interface TagInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
}) => {
  const { t } = useApp();
  const [inputValue, setInputValue] = useState('');

  // カンマや読点区切りで分割してタグの配列を取得
  const tags = value
    ? value
        .split(/[,、，]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

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
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 日本語変換等のIME確定中のEnterでは追加しない
    if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      handleAdd();
    }
  };

  const handleRemove = (tagToRemove: string) => {
    const updatedTags = tags.filter((item) => item !== tagToRemove);
    onChange(updatedTags.join(', '));
  };

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

      {/* 新規タグUI (inputフォーム + 追加ボタン) */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('form_tags_placeholder')}
          className="flex-1 min-w-0 bg-slate-900/80 border border-slate-700/70 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        />
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
