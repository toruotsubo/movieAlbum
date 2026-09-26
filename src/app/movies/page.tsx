'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useApp } from '@/components/AppProvider';
import { RatingStars } from '@/components/RatingStars';
import { formatMediaUrl, getSplitValues, formatReleaseDate, getKeyFieldLabel, getGroupMatches } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { Movie, DEFAULT_FIELD_ORDER } from '@/lib/types';
import {
  Play,
  ArrowUpDown,
  Star,
  Film,
  Calendar,
  User,
  Shapes,
  FileText,
  Edit,
  Tag,
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
      };
      sessionStorage.setItem('movie_manager_movies_page_state', JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save filter state to sessionStorage:', e);
    }
  }, [sortKey, sortOrder, ratingFilter, tagFilter, isInitialized, databaseState.activeId]);

  // Reset filters and URL query parameters when active database changes
  const prevActiveDbRef = React.useRef(databaseState.activeId);
  useEffect(() => {
    if (prevActiveDbRef.current && databaseState.activeId && prevActiveDbRef.current !== databaseState.activeId) {
      setRatingFilter('all');
      setTagFilter('all');
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

  // Map of movie ID to group count and deduplicated tags of all movies in the group: O(N)
  const groupDataMap = useMemo(() => {
    const childrenMap = new Map<number, Movie[]>();
    for (const m of movies) {
      if (m.parent_movie_id) {
        let list = childrenMap.get(m.parent_movie_id);
        if (!list) {
          list = [];
          childrenMap.set(m.parent_movie_id, list);
        }
        list.push(m);
      }
    }

    const map = new Map<number, { count: number; tags: string[] }>();

    for (const movie of movies) {
      if (movie.parent_movie_id) continue;

      const children = childrenMap.get(movie.id);
      const groupMovies: Movie[] = children ? [movie, ...children] : [movie];

      // Collect all tags from the group movies without duplicates, preserving order
      const tagSet = new Set<string>();
      for (const m of groupMovies) {
        if (m.tags) {
          const splitTags = getSplitValues(m.tags);
          for (const t of splitTags) {
            const trimmed = t.trim();
            if (trimmed) {
              tagSet.add(trimmed);
            }
          }
        }
      }

      map.set(movie.id, {
        count: groupMovies.length,
        tags: Array.from(tagSet),
      });
    }

    return map;
  }, [movies]);

  const filteredMovies = useMemo(() => {
    // Exclude sibling movies (movies with a parent_movie_id)
    let result = movies.filter((movie) => !movie.parent_movie_id);
    if (filterValues) {
      result = result.filter((movie) => {
        for (const [k, v] of Object.entries(filterValues)) {
          const values = getSplitValues((movie as any)[k]);
          if (!values.includes(v)) return false;
        }
        return true;
      });
    }
    if (ratingFilter === 'gte4') {
      result = result.filter((movie) => movie.rating >= 4);
    } else if (ratingFilter === 'gte3') {
      result = result.filter((movie) => movie.rating >= 3);
    } else if (ratingFilter !== 'all') {
      result = result.filter((movie) => movie.rating === Number(ratingFilter));
    }
    if (tagFilter !== 'all') {
      result = result.filter((movie) => {
        const groupInfo = groupDataMap.get(movie.id);
        const tags = groupInfo ? groupInfo.tags : (movie.tags ? getSplitValues(movie.tags) : []);
        return tags.includes(tagFilter);
      });
    }
    return result;
  }, [movies, filterValues, ratingFilter, tagFilter, groupDataMap]);

  const sortedMovies = useMemo(() => {
    return [...filteredMovies].sort((a, b) => {
      let result = 0;
      if (sortKey === 'title') {
        result = (a.title || '').localeCompare(b.title || '');
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
  }, [filteredMovies, sortKey, sortOrder, keyFieldId]);
  useEffect(() => {
    setHeaderMovieCount(sortedMovies.length);
    return () => {
      setHeaderMovieCount(null);
    };
  }, [sortedMovies.length, setHeaderMovieCount]);

  // Reset pagination when filter/sort conditions change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filterSignature, ratingFilter, tagFilter, sortKey, sortOrder]);

  // Infinite scroll observer: load next batch when scrolling near bottom
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => {
            if (prev < sortedMovies.length) {
              return Math.min(prev + PAGE_SIZE, sortedMovies.length);
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
  }, [sortedMovies.length]);

  const displayedMovies = useMemo(() => {
    return sortedMovies.slice(0, visibleCount);
  }, [sortedMovies, visibleCount]);

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
        </div>
      </div>

      {/* Empty State */}
      {sortedMovies.length === 0 && (
        <div className="glass-card rounded-2xl p-12 text-center border border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
            <Film className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-200">{t('movies_list_empty')}</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {tagFilter !== 'all' || ratingFilter !== 'all' || filterSignature
              ? t('movies_list_empty_filter_desc')
              : t('movies_list_empty_desc')}
          </p>
        </div>
      )}

      {/* Movies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedMovies.map((movie) => {
          const imageSrc = formatMediaUrl(movie.summary_image_path);
          const groupInfo = groupDataMap.get(movie.id);
          const groupCount = groupInfo?.count || 1;
          const displayTags = groupInfo?.tags || (movie.tags ? getSplitValues(movie.tags) : []);

          return (
            <div
              key={movie.id}
              className="glass-card rounded-2xl overflow-hidden group flex flex-col justify-between border border-slate-800"
            >
              {/* Summary Image (720x405 Aspect Ratio) */}
              <div
                onClick={() => openMoviePlayer(movie.file_path)}
                className="relative aspect-video w-full bg-slate-950 overflow-hidden group/img cursor-pointer select-none"
                title={t('movies_list_play_tooltip')}
              >
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={movie.title || 'Movie'}
                    draggable={false}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300 pointer-events-none"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-900 select-none">
                    <Film className="w-10 h-10 mb-1 opacity-40" />
                    <span className="text-xs">NO IMAGE</span>
                  </div>
                )}

                {/* Group count badge */}
                {groupCount > 1 && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-950/20 backdrop-blur-md text-xs font-semibold text-blue-400 border border-blue-500/30 z-10 select-none">
                    {t('movies_list_group_badge', { count: groupCount })}
                  </div>
                )}

                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="p-3 rounded-full bg-blue-600/90 text-white shadow-lg backdrop-blur-sm transform group-hover/img:scale-110 transition-transform">
                    <Play className="w-6 h-6 fill-current" />
                  </div>
                </div>
              </div>

              {/* Metadata & Rating */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-white line-clamp-1">
                    {movie.title || movie.file_name}
                  </h3>

                  <div className="space-y-1.5 text-xs text-slate-400">
                    {/* Dynamic Field Ordering */}
                    {(() => {
                      const order = settings?.field_order || DEFAULT_FIELD_ORDER;
                      let releaseDateRendered = false;

                      return order.map((fieldId) => {
                        if (fieldId === 'title' || fieldId === 'rating') return null;

                        if (fieldId === 'genre') {
                          if (filterValues && filterValues['genre'] !== undefined) return null;
                          return (
                            <div key="genre" className="flex items-center gap-2">
                              <Shapes className="w-3.5 h-3.5 text-slate-500" />
                              {movie.genre ? (
                                <div className="flex flex-wrap items-center gap-1">
                                  {getSplitValues(movie.genre).map((gVal, idx) => (
                                    <React.Fragment key={idx}>
                                      {idx > 0 && <span className="text-slate-500">,</span>}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleKeyItemClick('genre', gVal);
                                        }}
                                        className="text-blue-400 hover:underline font-semibold cursor-pointer"
                                        title={t('filter_by_genre', { value: gVal })}
                                      >
                                        {gVal}
                                      </button>
                                    </React.Fragment>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </div>
                          );
                        }

                        if (fieldId === 'cast') {
                          if (filterValues && filterValues['cast'] !== undefined) return null;
                          return (
                            <div key="cast" className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-slate-500" />
                              {movie.cast ? (
                                <div className="flex flex-wrap items-center gap-1">
                                  {getSplitValues(movie.cast).map((cVal, idx) => (
                                    <React.Fragment key={idx}>
                                      {idx > 0 && <span className="text-slate-500">,</span>}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleKeyItemClick('cast', cVal);
                                        }}
                                        className="text-blue-400 hover:underline font-semibold cursor-pointer"
                                        title={t('filter_by_cast', { value: cVal })}
                                      >
                                        {cVal}
                                      </button>
                                    </React.Fragment>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </div>
                          );
                        }

                        if (fieldId === 'release_year' || fieldId === 'release_date') {
                          if (releaseDateRendered) return null;
                          releaseDateRendered = true;
                          if (filterValues && (filterValues['release_year'] !== undefined || filterValues['release_date'] !== undefined)) return null;
                          return (
                            <div key="release" className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              {movie.release_year ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleKeyItemClick('release_year', movie.release_year!);
                                  }}
                                  className="text-blue-400 hover:underline font-semibold cursor-pointer"
                                  title={t('filter_by_year', { year: movie.release_year })}
                                >
                                  {formatReleaseDate(movie.release_year, movie.release_date, language)}
                                </button>
                              ) : (
                                <span className="text-slate-300">
                                  {formatReleaseDate(movie.release_year, movie.release_date, language)}
                                </span>
                              )}
                            </div>
                          );
                        }

                        if (fieldId.startsWith('custom_field_')) {
                          if (filterValues && filterValues[fieldId] !== undefined) return null;

                          const num = fieldId.replace('custom_field_', '');
                          const customName = (settings as any)?.[`custom_field_${num}_name`];
                          if (!customName || !customName.trim()) return null;
                          const displayInList = (settings as any)?.[`custom_field_${num}_display_in_list`];
                          if (displayInList === false) return null;

                          const customVal = (movie as any)[fieldId];

                          return (
                            <div key={fieldId} className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              {customVal ? (
                                <div className="flex flex-wrap items-center gap-1">
                                  {getSplitValues(customVal).map((cVal, idx) => (
                                    <React.Fragment key={idx}>
                                      {idx > 0 && <span className="text-slate-500">,</span>}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleKeyItemClick(fieldId, cVal);
                                        }}
                                        className="text-blue-400 hover:underline font-semibold cursor-pointer"
                                        title={t('filter_by_field', { field: customName, value: cVal })}
                                      >
                                        {cVal}
                                      </button>
                                    </React.Fragment>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </div>
                          );
                        }

                        return null;
                      });
                    })()}

                    {/* Tags Display */}
                    {displayTags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <Tag className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        {displayTags.map((tag, idx) => {
                          const isSelected = tagFilter === tag;
                          return (
                            <button
                              key={idx}
                              onClick={() => setTagFilter(isSelected ? 'all' : tag)}
                              className={clsx(
                                'px-2 py-0.5 rounded-md border text-[11px] font-medium transition-colors cursor-pointer',
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-500 font-semibold shadow-sm'
                                  : 'bg-blue-600/20 border-blue-500/30 text-blue-300 hover:bg-blue-600/30'
                              )}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Rating & Actions */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center shrink-0">
                    <RatingStars
                      rating={movie.rating}
                      size="sm"
                      onChange={(newRating) => updateMovieRating(movie.id, newRating)}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 select-none">
                    <button
                      onClick={() => openEditMovieModal(movie)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/80 transition-colors cursor-pointer whitespace-nowrap shrink-0 select-none"
                      title={t('edit')}
                    >
                      <Edit className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{t('edit')}</span>
                    </button>
                    <button
                      onClick={() => {
                        const params = new URLSearchParams();
                        params.set('id', movie.id.toString());
                        if (filterSignature) {
                          params.set('filter', filterSignature);
                        }
                        router.push(`/movies/detail?${params.toString()}`);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-200 text-xs font-medium border border-blue-500/40 transition-colors cursor-pointer whitespace-nowrap shrink-0 select-none"
                    >
                      <span>{t('movies_list_detail_btn')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Infinite Scroll Sentinel */}
      {visibleCount < sortedMovies.length && (
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
