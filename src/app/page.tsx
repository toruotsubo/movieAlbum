'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/components/AppProvider';
import { RatingStars } from '@/components/RatingStars';
import { formatMediaUrl, getKeyFieldLabel } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { ArrowUpDown, Film, Star, Edit, Tag, X } from 'lucide-react';
import { clsx } from 'clsx';
import { KeyItemGroup } from '@/lib/types';

export default function KeyItemsPage() {
  const { keyGroups, settings, updateKeyItemRating, openEditKeyItemModal, loading, t, databaseState } = useApp();
  const router = useRouter();

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [ratingFilter, setRatingFilter] = useState<string | number>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [isTextListModalOpen, setIsTextListModalOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Restore filter/sort state from sessionStorage on mount
  useEffect(() => {
    try {
      const savedStateStr = sessionStorage.getItem('movie_manager_key_items_page_state');
      if (savedStateStr) {
        const savedState = JSON.parse(savedStateStr);
        // Only restore if the saved state belongs to the current database
        if (!savedState.dbId || !databaseState.activeId || savedState.dbId === databaseState.activeId) {
          if (savedState.sortOrder) setSortOrder(savedState.sortOrder);
          if (savedState.ratingFilter !== undefined) setRatingFilter(savedState.ratingFilter);
          if (savedState.tagFilter) setTagFilter(savedState.tagFilter);
        }
      }
    } catch (e) {
      console.error('Failed to load filter state from sessionStorage:', e);
    }
    setIsInitialized(true);
  }, [databaseState.activeId]);

  // Save filter/sort state to sessionStorage when changed
  useEffect(() => {
    if (!isInitialized) return;
    try {
      const stateToSave = {
        dbId: databaseState.activeId,
        sortOrder,
        ratingFilter,
        tagFilter,
      };
      sessionStorage.setItem('movie_manager_key_items_page_state', JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save filter state to sessionStorage:', e);
    }
  }, [sortOrder, ratingFilter, tagFilter, isInitialized, databaseState.activeId]);

  const keyFieldId = settings?.key_fields && settings.key_fields.length > 0 ? settings.key_fields[0] : 'genre';
  const keyLabel = getKeyFieldLabel(keyFieldId, settings, t);

  // Reset tagFilter and ratingFilter when keyFieldId changes
  const prevKeyFieldRef = React.useRef(keyFieldId);
  useEffect(() => {
    if (prevKeyFieldRef.current !== keyFieldId) {
      prevKeyFieldRef.current = keyFieldId;
      setTagFilter('all');
      setRatingFilter('all');
    }
  }, [keyFieldId]);

  // Reset filters when active database changes
  const prevActiveDbRef = React.useRef(databaseState.activeId);
  useEffect(() => {
    if (prevActiveDbRef.current && databaseState.activeId && prevActiveDbRef.current !== databaseState.activeId) {
      setTagFilter('all');
      setRatingFilter('all');
      try {
        sessionStorage.removeItem('movie_manager_key_items_page_state');
      } catch (e) {}
    }
    prevActiveDbRef.current = databaseState.activeId;
  }, [databaseState.activeId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-full bg-slate-900/50 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-card rounded-xl overflow-hidden border border-slate-800 p-6 space-y-4">
              <div className="aspect-video w-full bg-slate-900 rounded-lg animate-pulse" />
              <div className="space-y-2">
                <div className="h-6 w-3/4 bg-slate-900 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-slate-900 rounded animate-pulse" />
              </div>
              <div className="pt-4 border-t border-slate-800 flex justify-between">
                <div className="h-6 w-24 bg-slate-900 rounded animate-pulse" />
                <div className="h-6 w-16 bg-slate-900 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Extract all unique tags
  const availableTags = Array.from(
    new Set(
      keyGroups.flatMap((g) =>
        g.tags ? g.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
      )
    )
  ).sort((a, b) => a.localeCompare(b, 'ja'));

  const filteredGroups = keyGroups.filter((g) => {
    if (ratingFilter === 'gte4') {
      if (g.rating < 4) return false;
    } else if (ratingFilter === 'gte3') {
      if (g.rating < 3) return false;
    } else if (ratingFilter !== 'all' && g.rating !== Number(ratingFilter)) {
      return false;
    }
    if (tagFilter !== 'all') {
      if (!g.tags) return false;
      const groupTags = g.tags.split(',').map((t) => t.trim());
      if (!groupTags.includes(tagFilter)) return false;
    }
    return true;
  });

  const sortedGroups = [...filteredGroups].sort((a, b) => {
    const aVal = (keyFieldId === 'cast' && a.sort_key) ? a.sort_key : Object.values(a.key_values).join(' / ');
    const bVal = (keyFieldId === 'cast' && b.sort_key) ? b.sort_key : Object.values(b.key_values).join(' / ');
    return sortOrder === 'desc' ? bVal.localeCompare(aVal, 'ja') : aVal.localeCompare(bVal, 'ja');
  });

  const toggleSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const handleRowClick = (group: KeyItemGroup) => {
    const params = new URLSearchParams();
    params.set('filter', group.key_signature);
    router.push(`/movies?${params.toString()}`);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800/80 select-none">
          <div className="flex flex-wrap items-center gap-4">
            {/* Tag Filter Controls */}
            {availableTags.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-400" /> {t('movies_list_filter_tag')}
                </span>
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer hover:border-slate-700"
                >
                  <option value="all">{t('all')}</option>
                  {availableTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Rating Filter Controls */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-slate-400" /> {t('movies_list_filter_rating')}
              </span>
              <select
                value={ratingFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'all' || val === 'gte4' || val === 'gte3') {
                    setRatingFilter(val);
                  } else {
                    setRatingFilter(Number(val));
                  }
                }}
                className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer hover:border-slate-700"
              >
                <option value="all">{t('all')}</option>
                {[5, 4, 3, 2, 1].map((r) => (
                  <option key={r} value={r}>
                    ★{r}
                  </option>
                ))}
                <hr className="border-slate-800 my-1" />
                <option value="gte4">{t('movies_list_rating_gte4')}</option>
                <option value="gte3">{t('movies_list_rating_gte3')}</option>
              </select>
            </div>

            {/* Sort Bar */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5" /> {t('key_list_sort_label')}
              </span>
              <button
                onClick={toggleSort}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-900 border border-slate-800 text-slate-200 hover:border-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all cursor-pointer"
              >
                <span>{keyLabel}</span>
                <ArrowUpDown className="w-3 h-3 text-blue-400" />
              </button>
            </div>
          </div>

          {/* Text List Button */}
          <button
            onClick={() => setIsTextListModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-200 border border-blue-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all cursor-pointer"
          >
            <span>{t('key_list_text_display')}</span>
          </button>
        </div>

        {/* Empty State */}
        {sortedGroups.length === 0 && (
          <div className="glass-card rounded-xl p-8 sm:p-12 text-center border border-slate-800 space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400 border border-slate-700/50">
              <Film className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200 tracking-tight">{t('key_list_empty')}</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              {tagFilter !== 'all' || ratingFilter !== 'all'
                ? t('movies_list_empty_filter_desc')
                : t('key_list_empty_desc')}
            </p>
          </div>
        )}

        {/* Key Item Groups List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedGroups.map((group) => {
            const imageSrc = formatMediaUrl(group.summary_image_path);

            return (
              <div
                key={group.key_signature}
                className="glass-card glass-card-hover rounded-xl overflow-hidden flex flex-col justify-between border border-slate-800/80 transition-all shadow-sm"
              >
                {/* Summary Image (720x405 Aspect Ratio) */}
                <div
                  onClick={() => handleRowClick(group)}
                  className="relative aspect-video w-full bg-slate-950 overflow-hidden group/img cursor-pointer select-none"
                >
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt="Group Summary"
                      draggable={false}
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300 pointer-events-none"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/80 gap-1.5 select-none">
                      <Film className="w-10 h-10 opacity-40" />
                      <span className="text-xs font-medium tracking-wider">NO IMAGE</span>
                    </div>
                  )}

                  {/* Badge count */}
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-slate-950/20 backdrop-blur-md text-xs font-semibold text-blue-400 border border-blue-500/30 shadow-sm z-10 select-none">
                    {t('key_list_movies_count', { count: group.movie_count })}
                  </div>
                </div>

                {/* Group Metadata & Rating */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      {Object.values(group.key_values).map((val, idx) => (
                        <div key={idx} className="text-lg font-semibold text-slate-100 tracking-tight line-clamp-1">
                          {val}
                        </div>
                      ))}
                    </div>

                    {/* Key Item Tags Display */}
                    {group.tags && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Tag className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        {group.tags.split(',').map((t, idx) => {
                          const trimmedTag = t.trim();
                          if (!trimmedTag) return null;
                          const isSelected = tagFilter === trimmedTag;
                          return (
                            <button
                              key={idx}
                              onClick={() => setTagFilter(isSelected ? 'all' : trimmedTag)}
                              className={clsx(
                                'px-2.5 py-1 rounded-lg border text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer',
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-500 font-semibold shadow-sm'
                                  : 'bg-blue-600/20 border-blue-500/30 text-blue-300 hover:bg-blue-600/30'
                              )}
                            >
                              {trimmedTag}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center shrink-0">
                      <RatingStars
                        rating={group.rating}
                        size="sm"
                        onChange={(newRating) => updateKeyItemRating(group.key_signature, newRating)}
                      />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 select-none">
                      <button
                        onClick={() => openEditKeyItemModal(group)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-slate-100 text-xs font-medium border border-slate-800 hover:border-slate-700 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer whitespace-nowrap shrink-0 select-none"
                        title={t('edit')}
                      >
                        <Edit className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>{t('edit')}</span>
                      </button>

                      <button
                        onClick={() => handleRowClick(group)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-200 text-xs font-medium border border-blue-500/40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer whitespace-nowrap shrink-0 select-none"
                      >
                        <span>{t('movies_list_title')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Text List Modal */}
      {isTextListModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <h3 className="text-base font-semibold text-slate-100 select-none">{t('key_list_text_display')}</h3>
              <button
                onClick={() => setIsTextListModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Tag Cloud Items */}
            <div className="p-6 overflow-y-auto flex-1 max-h-[60vh]">
              {sortedGroups.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  {t('key_list_empty')}
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {sortedGroups.map((group) => {
                    const keyText = Object.values(group.key_values).join(' / ');
                    return (
                      <button
                        key={group.key_signature}
                        onClick={() => {
                          setIsTextListModalOpen(false);
                          handleRowClick(group);
                        }}
                        className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-slate-800/80 hover:bg-blue-600 text-slate-200 hover:text-white border border-slate-700/70 hover:border-blue-500 transition-all cursor-pointer shadow-sm hover:shadow-blue-500/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        {keyText}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
