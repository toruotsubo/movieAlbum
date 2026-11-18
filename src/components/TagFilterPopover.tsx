'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Tag, ChevronDown, X, Search, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { useApp } from './AppProvider';

interface TagFilterPopoverProps {
  availableTags: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  onToggleTag: (tag: string) => void;
}

export const TagFilterPopover: React.FC<TagFilterPopoverProps> = ({
  availableTags,
  selectedTags,
  onChange,
  onToggleTag,
}) => {
  const { t } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Reset internal search when closing
  useEffect(() => {
    if (!isOpen) {
      setTagSearch('');
    }
  }, [isOpen]);

  const filteredTags = useMemo(() => {
    const q = tagSearch.trim().toLowerCase();
    if (!q) return availableTags;
    return availableTags.filter((tag) => tag.toLowerCase().includes(q));
  }, [availableTags, tagSearch]);

  if (availableTags.length === 0) return null;

  const hasSelection = selectedTags.length > 0;

  return (
    <div ref={containerRef} className="relative flex items-center gap-2">
      <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
        <Tag className="w-3.5 h-3.5 text-slate-400" />
        {t('movies_list_filter_tag')}
      </span>

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          hasSelection
            ? 'bg-blue-600/20 border-blue-500/60 text-blue-200 hover:bg-blue-600/30'
            : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
        )}
      >
        <span className="max-w-[140px] truncate">
          {selectedTags.length === 0
            ? t('all')
            : selectedTags.length === 1
              ? selectedTags[0]
              : t('tag_filter_selected_count', { count: selectedTags.length })}
        </span>
        {selectedTags.length > 1 && (
          <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-bold leading-tight">
            {selectedTags.length}
          </span>
        )}
        <ChevronDown
          className={clsx(
            'w-3.5 h-3.5 text-slate-400 transition-transform duration-200',
            isOpen && 'rotate-180 text-blue-400'
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-30 w-80 sm:w-96 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl p-3 space-y-3 animate-fade-in">
          {/* Header: Tag Search & Clear Selection */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder={t('tag_filter_search_placeholder')}
                className="w-full pl-8 pr-7 py-1.5 rounded-lg text-xs bg-slate-950/80 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {tagSearch && (
                <button
                  type="button"
                  onClick={() => setTagSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5 rounded transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {hasSelection && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors whitespace-nowrap cursor-pointer shrink-0"
              >
                {t('tag_filter_clear')}
              </button>
            )}
          </div>

          {/* Tag Pills Grid / Wrap List */}
          <div className="max-h-60 overflow-y-auto pr-1">
            {filteredTags.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                {t('tag_filter_no_match')}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {!tagSearch.trim() && (
                  <button
                    type="button"
                    onClick={() => onChange([])}
                    className={clsx(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer',
                      !hasSelection
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                        : 'bg-slate-800/80 border-slate-700/70 text-slate-300 hover:bg-slate-800 hover:text-white'
                    )}
                  >
                    {!hasSelection && <Check className="w-3 h-3 stroke-[2.5]" />}
                    <span>{t('all')}</span>
                  </button>
                )}

                {filteredTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => onToggleTag(tag)}
                      className={clsx(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer',
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-500 font-semibold shadow-sm'
                          : 'bg-blue-600/15 border-blue-500/30 text-blue-300 hover:bg-blue-600/25 hover:border-blue-500/50'
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[2.5] shrink-0" />}
                      <span className="truncate max-w-[180px]">{tag}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

