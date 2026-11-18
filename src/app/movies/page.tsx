'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useApp } from '@/components/AppProvider';
import { RatingStars } from '@/components/RatingStars';
import { formatMediaUrl, getSplitValues, formatReleaseDate, getKeyFieldLabel, groupAllMovies, compareFileNames } from '@/lib/utils';
import { MovieCardSlider } from '@/components/MovieCardSlider';
import { useRouter, useSearchParams } from 'next/navigation';
import { Movie, DEFAULT_FIELD_ORDER } from '@/lib/types';
import {
  ArrowUpDown,
  Film,
  Search,
  X,
  RotateCcw,
} from 'lucide-react';
import { clsx } from 'clsx';
import { TagFilterPopover } from '@/components/TagFilterPopover';
import { RatingRangeFilter } from '@/components/RatingRangeFilter';

type SortKey = 'title' | 'genre' | 'key_field' | 'release' | string;

function MoviesContent() {
  const { movies, settings, updateMovieRating, openMoviePlayer, openEditMovieModal, loading, t, lang: language, setHeaderMovieCount, setHeaderFilterText, databaseState } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterSignature = searchParams.get('filter');
  const queryTag = searchParams.get('tag');

  const PAGE_SIZE = 36;
  const [sortKey, setSortKey] = useState<SortKey>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [ratingRange, setRatingRange] = useState<[number, number]>([1, 5]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isInitialized, setIsInitialized] = useState(false);
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  // Restore filter/sort state from sessionStorage on mount
  useEffect(() => {
    try {
      const savedStateStr = sessionStorage.getItem('movie_manager_movies_page_state');
      if (savedStateStr) {
        const savedState = JSON.parse(savedStateStr);
        // Only restore if the saved state belongs to the current database
        if (!savedState.dbId || !databaseState.activeId || savedState.dbId === databaseState.activeId) {
          if (savedState.sortKey) setSortKey(savedState.sortKey);
          if (savedState.sortOrder) setSortOrder(savedState.sortOrder);
          if (
            Array.isArray(savedState.ratingRange) &&
            savedState.ratingRange.length === 2
          ) {
            setRatingRange([
              Number(savedState.ratingRange[0]) || 1,
              Number(savedState.ratingRange[1]) || 5,
            ]);
          } else if (savedState.ratingFilter !== undefined) {
            if (savedState.ratingFilter === 'gte4') {
              setRatingRange([4, 5]);
            } else if (savedState.ratingFilter === 'gte3') {
              setRatingRange([3, 5]);
            } else if (savedState.ratingFilter !== 'all') {
              const r = Number(savedState.ratingFilter);
              if (r >= 1 && r <= 5) setRatingRange([r, r]);
            } else {
              setRatingRange([1, 5]);
            }
          }
          if (Array.isArray(savedState.selectedTags)) {
            setSelectedTags(savedState.selectedTags);
          } else if (savedState.tagFilter && savedState.tagFilter !== 'all') {
            setSelectedTags([savedState.tagFilter]);
          } else {
            setSelectedTags([]);
          }
          if (savedState.searchQuery !== undefined) setSearchQuery(savedState.searchQuery);
        }
      }
    } catch (e) {
      console.error('Failed to load filter state from sessionStorage:', e);
    }

    if (queryTag) {
      setSelectedTags([queryTag]);
    }

    setIsInitialized(true);
  }, [queryTag, databaseState.activeId]);

  // Save filter/sort state to sessionStorage when changed
  useEffect(() => {
    if (!isInitialized) return;
    try {
      const stateToSave = {
        dbId: databaseState.activeId,
        sortKey,
        sortOrder,
        ratingRange,
        selectedTags,
        searchQuery,
      };
      sessionStorage.setItem('movie_manager_movies_page_state', JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save filter state to sessionStorage:', e);
    }
  }, [sortKey, sortOrder, ratingRange, selectedTags, searchQuery, isInitialized, databaseState.activeId]);

  // Reset filters and URL query parameters when active database changes
  const prevActiveDbRef = React.useRef(databaseState.activeId);
  useEffect(() => {
    if (prevActiveDbRef.current && databaseState.activeId && prevActiveDbRef.current !== databaseState.activeId) {
      setRatingRange([1, 5]);
      setSelectedTags([]);
      setSearchQuery('');
      try {
        sessionStorage.removeItem('movie_manager_movies_page_state');
      } catch (e) {}
      if (filterSignature || queryTag) {
        router.replace('/movies');
      }
    }
    prevActiveDbRef.current = databaseState.activeId;
  }, [databaseState.activeId, filterSignature, queryTag, router]);

  const keyFields = settings?.key_fields || [];
  const keyFieldId = keyFields.length > 0 ? keyFields[0] : 'genre';
  const keyLabel = getKeyFieldLabel(keyFieldId, settings, t);

  const filterValues = useMemo(() => {
    if (!filterSignature) return null;
    try {
      return JSON.parse(filterSignature) as Record<string, string>;
    } catch {
      return null;
    }
  }, [filterSignature]);

  const filterText = useMemo(() => {
    if (filterValues && Object.keys(filterValues).length > 0) {
      const formattedVals = Object.entries(filterValues).map(([key, val]) => {
        if (key === 'release_year') {
          if (language === 'en') {
            return String(val).replace(/年$/, '');
          }
          return String(val).endsWith('年') ? String(val) : `${val}年`;
        }
        return String(val);
      });
      return formattedVals.join(' / ');
    }
    return null;
  }, [filterValues, language]);

  useEffect(() => {
    setHeaderFilterText(filterText);
    return () => {
      setHeaderFilterText(null);
    };
  }, [filterText, setHeaderFilterText]);

  // Extract all unique tags across movies
  const availableTags = useMemo(() => {
    return Array.from(
      new Set(
        movies.flatMap((m) =>
          m.tags ? getSplitValues(m.tags) : []
        )
      )
    ).sort((a, b) => a.localeCompare(b, 'ja'));
  }, [movies]);

  // 全動画をグループ化（各グループ内はファイル名でソート済み）
  const movieGroups = useMemo(() => {
    return groupAllMovies(movies, keyFields);
  }, [movies, keyFields]);

  // Map of group representative movie ID to group count and deduplicated tags of all movies in the group: O(N)
  const groupDataMap = useMemo(() => {
    const map = new Map<number, { count: number; tags: string[] }>();
    for (const group of movieGroups) {
      const lead = group[0];
      const tagSet = new Set<string>();
      for (const m of group) {
        if (m.tags) {
          const splitTags = getSplitValues(m.tags);
          for (const t of splitTags) {
            const trimmed = t.trim();
            if (trimmed) tagSet.add(trimmed);
          }
        }
      }
      map.set(lead.id, {
        count: group.length,
        tags: Array.from(tagSet),
      });
    }
    return map;
  }, [movieGroups]);

  const filteredGroups = useMemo(() => {
    let result = movieGroups;
    if (filterValues) {
      result = result.filter((group) => {
        return group.some((m) => {
          for (const [k, v] of Object.entries(filterValues)) {
            const values = getSplitValues((m as any)[k]);
            if (!values.includes(v)) return false;
          }
          return true;
        });
      });
    }
    if (ratingRange[0] > 1 || ratingRange[1] < 5) {
      result = result.filter((group) =>
        group.some((m) => m.rating >= ratingRange[0] && m.rating <= ratingRange[1])
      );
    }
    if (selectedTags.length > 0) {
      result = result.filter((group) => {
        const info = groupDataMap.get(group[0].id);
        const tags = info ? info.tags : [];
        return selectedTags.every((tag) => tags.includes(tag));
      });
    }
    if (searchQuery.trim()) {
      const terms = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const isCustom1Active = Boolean(settings?.custom_field_1_name?.trim() && settings?.custom_field_1_display_in_list !== false);
      const isCustom2Active = Boolean(settings?.custom_field_2_name?.trim() && settings?.custom_field_2_display_in_list !== false);
      const isCustom3Active = Boolean(settings?.custom_field_3_name?.trim() && settings?.custom_field_3_display_in_list !== false);

      result = result.filter((group) => {
        return terms.every((term) => {
          return group.some((m) => {
            // タイトル
            if (m.title && m.title.toLowerCase().includes(term)) return true;
            if (m.file_name && m.file_name.toLowerCase().includes(term)) return true;
            // カテゴリ
            if (m.genre && m.genre.toLowerCase().includes(term)) return true;
            // 名前
            if (m.cast && m.cast.toLowerCase().includes(term)) return true;
            if (m.cast_kana && m.cast_kana.toLowerCase().includes(term)) return true;
            // 公開年
            if (m.release_year && (String(m.release_year).includes(term) || `${m.release_year}年`.includes(term))) return true;
            // 動画一覧に表示されるユーザー定義項目
            if (isCustom1Active && m.custom_field_1 && m.custom_field_1.toLowerCase().includes(term)) return true;
            if (isCustom2Active && m.custom_field_2 && m.custom_field_2.toLowerCase().includes(term)) return true;
            if (isCustom3Active && m.custom_field_3 && m.custom_field_3.toLowerCase().includes(term)) return true;
            return false;
          });
        });
      });
    }
    return result;
  }, [movieGroups, filterValues, ratingRange, selectedTags, groupDataMap, searchQuery, settings]);

  const sortedGroups = useMemo(() => {
    return [...filteredGroups].sort((groupA, groupB) => {
      const a = groupA[0];
      const b = groupB[0];
      let result = 0;
      if (sortKey === 'title') {
        result = compareFileNames(a.title || a.file_name || '', b.title || b.file_name || '');
      } else if (sortKey === 'genre') {
        result = (a.genre || '').localeCompare(b.genre || '');
      } else if (sortKey.startsWith('key_field_')) {
        const targetField = sortKey.replace('key_field_', '');
        if (targetField === 'cast') {
          const aVal = a.cast_kana || a.cast || '';
          const bVal = b.cast_kana || b.cast || '';
          result = aVal.localeCompare(bVal, 'ja');
        } else if (targetField === 'release_year' || targetField === 'release_date') {
          const aYear = a.release_year || 0;
          const bYear = b.release_year || 0;
          if (aYear !== bYear) {
            result = aYear - bYear;
          } else {
            result = (a.release_date || '').localeCompare(b.release_date || '');
          }
        } else {
          const aVal = String((a as any)[targetField] || '');
          const bVal = String((b as any)[targetField] || '');
          result = aVal.localeCompare(bVal, 'ja');
        }
      } else if (sortKey === 'key_field') {
        if (keyFieldId === 'cast') {
          const aVal = a.cast_kana || a.cast || '';
          const bVal = b.cast_kana || b.cast || '';
          result = aVal.localeCompare(bVal, 'ja');
        } else if (keyFieldId === 'release_year' || keyFieldId === 'release_date') {
          const aYear = a.release_year || 0;
          const bYear = b.release_year || 0;
          if (aYear !== bYear) {
            result = aYear - bYear;
          } else {
            result = (a.release_date || '').localeCompare(b.release_date || '');
          }
        } else {
          const aVal = String((a as any)[keyFieldId] || '');
          const bVal = String((b as any)[keyFieldId] || '');
          result = aVal.localeCompare(bVal, 'ja');
        }
      } else if (sortKey === 'release') {
        const aYear = a.release_year || 0;
        const bYear = b.release_year || 0;
        if (aYear !== bYear) {
          result = aYear - bYear;
        } else {
          result = (a.release_date || '').localeCompare(b.release_date || '');
        }
      }
      return sortOrder === 'desc' ? -result : result;
    });
  }, [filteredGroups, sortKey, sortOrder, keyFieldId]);

  useEffect(() => {
    setHeaderMovieCount(sortedGroups.length);
    return () => {
      setHeaderMovieCount(null);
    };
  }, [sortedGroups.length, setHeaderMovieCount]);

  // Reset pagination when filter/sort conditions change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filterSignature, ratingRange, selectedTags, sortKey, sortOrder, searchQuery]);

  // Infinite scroll observer: load next batch when scrolling near bottom
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => {
            if (prev < sortedGroups.length) {
              return Math.min(prev + PAGE_SIZE, sortedGroups.length);
            }
            return prev;
          });
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(target);
    return () => {
      observer.unobserve(target);
    };
  }, [sortedGroups.length]);

  const displayedGroups = useMemo(() => {
    return sortedGroups.slice(0, visibleCount);
  }, [sortedGroups, visibleCount]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handleKeyItemClick = (fieldId: string, val: string | number) => {
    if (!val || val === '未指定' || val === '-') return;
    const keySigObj: Record<string, string> = { [fieldId]: String(val) };
    const filterSig = JSON.stringify(keySigObj);
    const params = new URLSearchParams();
    params.set('filter', filterSig);
    router.push(`/movies?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  const sortItems: { id: SortKey; label: string }[] = [
    { id: 'title', label: t('field_title') },
    { id: 'genre', label: t('field_genre') },
    ...keyFields
      .filter((kf) => kf !== 'title' && kf !== 'genre' && kf !== 'release_year' && kf !== 'release_date')
      .map((kf) => ({
        id: `key_field_${kf}`,
        label: getKeyFieldLabel(kf, settings, t),
      })),
    { id: 'release', label: t('field_release_full') },
  ];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const isRatingFiltered = ratingRange[0] > 1 || ratingRange[1] < 5;

  const hasActiveFilters =
    selectedTags.length > 0 || isRatingFiltered || searchQuery.trim() !== '';

  const resetAllFilters = () => {
    setSelectedTags([]);
    setRatingRange([1, 5]);
    setSearchQuery('');
    if (queryTag) {
      const params = new URLSearchParams();
      if (filterSignature) params.set('filter', filterSignature);
      const qs = params.toString();
      router.replace(qs ? `/movies?${qs}` : '/movies');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter & Sort Controls Row */}
      <div className="space-y-3 pb-4 border-b border-slate-800 select-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left Group: Search + Tag Filter + Rating Filter + Reset */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Search Form */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('movies_list_search_placeholder')}
                className="pl-8 pr-7 py-1.5 rounded-xl text-xs font-medium bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors w-44 sm:w-56 hover:border-slate-700"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-200 p-0.5 rounded transition-colors cursor-pointer"
                  title={t('movies_list_search_clear')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Tag Filter Controls (Multi-select Popover) */}
            <TagFilterPopover
              availableTags={availableTags}
              selectedTags={selectedTags}
              onChange={setSelectedTags}
              onToggleTag={toggleTag}
            />

            {/* Rating Filter Controls (2-Thumb Range Slider) */}
            <RatingRangeFilter
              value={ratingRange}
              onChange={setRatingRange}
            />

            {/* Clear All Filters Button (inline when active) */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-all cursor-pointer"
                title={t('filter_reset_all')}
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                <span>{t('filter_clear_short')}</span>
              </button>
            )}
          </div>

          {/* Right Group: Sort Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> {t('key_list_sort_label')}
            </span>
            {sortItems.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleSort(item.id)}
                className={clsx(
                  'flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer',
                  sortKey === item.id
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                )}
              >
                <span>{item.label}</span>
                {sortKey === item.id && <ArrowUpDown className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </div>

        {/* Active Selected Tags Pills Row */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-lg bg-blue-600/25 border border-blue-500/50 text-blue-200 text-xs font-medium"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="p-0.5 rounded hover:bg-blue-500/30 text-blue-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Empty State */}
      {sortedGroups.length === 0 && (
        <div className="glass-card rounded-2xl p-12 text-center border border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
            <Film className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-200">{t('movies_list_empty')}</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {hasActiveFilters || filterSignature
              ? t('movies_list_empty_filter_desc')
              : t('movies_list_empty_desc')}
          </p>
          {hasActiveFilters && (
            <div className="pt-2">
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t('filter_reset_all')}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Movies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 min-[1600px]:grid-cols-4 gap-6">
        {displayedGroups.map((group) => {
          const leadMovie = group[0];
          return (
            <MovieCardSlider
              key={leadMovie.id}
              movies={group}
              filterValues={filterValues}
              filterSignature={filterSignature}
              selectedTags={selectedTags}
              onToggleTag={toggleTag}
              onKeyItemClick={handleKeyItemClick}
            />
          );
        })}
      </div>

      {/* Infinite Scroll Sentinel */}
      {visibleCount < sortedGroups.length && (
        <div ref={loadMoreRef} className="py-8 flex justify-center items-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

export default function MoviesPage() {
  const { t } = useApp();
  return (
    <Suspense fallback={<div className="flex justify-center p-12 text-slate-400">{t('loading')}</div>}>
      <MoviesContent />
    </Suspense>
  );
}
