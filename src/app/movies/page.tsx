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
  Star,
  Film,
  Tag,
  Search,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';

type SortKey = 'title' | 'genre' | 'key_field' | 'release';

function MoviesContent() {
  const { movies, settings, updateMovieRating, openMoviePlayer, openEditMovieModal, loading, t, lang: language, setHeaderMovieCount, setHeaderFilterText, databaseState } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterSignature = searchParams.get('filter');
  const queryTag = searchParams.get('tag');

  const PAGE_SIZE = 36;
  const [sortKey, setSortKey] = useState<SortKey>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [ratingFilter, setRatingFilter] = useState<string | number>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
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
          if (savedState.ratingFilter !== undefined) setRatingFilter(savedState.ratingFilter);
          if (savedState.tagFilter) setTagFilter(savedState.tagFilter);
          if (savedState.searchQuery !== undefined) setSearchQuery(savedState.searchQuery);
        }
      }
    } catch (e) {
      console.error('Failed to load filter state from sessionStorage:', e);
    }

    if (queryTag) {
      setTagFilter(queryTag);
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
        ratingFilter,
        tagFilter,
        searchQuery,
      };
      sessionStorage.setItem('movie_manager_movies_page_state', JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save filter state to sessionStorage:', e);
    }
  }, [sortKey, sortOrder, ratingFilter, tagFilter, searchQuery, isInitialized, databaseState.activeId]);

  // Reset filters and URL query parameters when active database changes
  const prevActiveDbRef = React.useRef(databaseState.activeId);
  useEffect(() => {
    if (prevActiveDbRef.current && databaseState.activeId && prevActiveDbRef.current !== databaseState.activeId) {
      setRatingFilter('all');
      setTagFilter('all');
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
    if (ratingFilter === 'gte4') {
      result = result.filter((group) => group.some((m) => m.rating >= 4));
    } else if (ratingFilter === 'gte3') {
      result = result.filter((group) => group.some((m) => m.rating >= 3));
    } else if (ratingFilter !== 'all') {
      result = result.filter((group) => group.some((m) => m.rating === Number(ratingFilter)));
    }
    if (tagFilter !== 'all') {
      result = result.filter((group) => {
        const info = groupDataMap.get(group[0].id);
        const tags = info ? info.tags : [];
        return tags.includes(tagFilter);
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
  }, [movieGroups, filterValues, ratingFilter, tagFilter, groupDataMap, searchQuery, settings]);

  const sortedGroups = useMemo(() => {
    return [...filteredGroups].sort((groupA, groupB) => {
      const a = groupA[0];
      const b = groupB[0];
      let result = 0;
      if (sortKey === 'title') {
        result = compareFileNames(a.title || a.file_name || '', b.title || b.file_name || '');
      } else if (sortKey === 'genre') {
        result = (a.genre || '').localeCompare(b.genre || '');
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
  }, [filterSignature, ratingFilter, tagFilter, sortKey, sortOrder, searchQuery]);

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
    ...(keyFieldId !== 'title' && keyFieldId !== 'genre' && keyFieldId !== 'release_year' && keyFieldId !== 'release_date'
      ? [{ id: 'key_field' as SortKey, label: keyLabel }]
      : []),
    { id: 'release', label: t('field_release_full') },
  ];

  return (
    <div className="space-y-6">
      {/* Filter & Sort Controls Row */}
      <div className="pb-4 border-b border-slate-800 select-none">
        <div className="flex flex-wrap items-center justify-start gap-4">
          {/* Tag Filter Controls */}
          {availableTags.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" /> {t('movies_list_filter_tag')}
              </span>
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
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
            <span className="text-xs text-slate-400 flex items-center gap-1">
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
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
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
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> {t('key_list_sort_label')}
            </span>
            {sortItems.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleSort(item.id)}
                className={clsx(
                  'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  sortKey === item.id
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                )}
              >
                <span>{item.label}</span>
                {sortKey === item.id && <ArrowUpDown className="w-3 h-3" />}
              </button>
            ))}
          </div>

          {/* Search Form */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('movies_list_search_placeholder')}
              className="pl-8 pr-7 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors w-40 sm:w-56"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-slate-400 hover:text-slate-200 p-0.5 rounded transition-colors"
                title={t('movies_list_search_clear')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {sortedGroups.length === 0 && (
        <div className="glass-card rounded-2xl p-12 text-center border border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
            <Film className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-200">{t('movies_list_empty')}</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {tagFilter !== 'all' || ratingFilter !== 'all' || filterSignature || searchQuery.trim() !== ''
              ? t('movies_list_empty_filter_desc')
              : t('movies_list_empty_desc')}
          </p>
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
              tagFilter={tagFilter}
              onTagFilterChange={setTagFilter}
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
