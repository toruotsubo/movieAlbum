'use client';

import React, { useState } from 'react';
import { Movie, DEFAULT_FIELD_ORDER } from '@/lib/types';
import { useApp } from '@/components/AppProvider';
import { RatingStars } from '@/components/RatingStars';
import { formatMediaUrl, getSplitValues, formatReleaseDate, getSavedSliderIndex, saveSliderIndex } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import {
  Play,
  Film,
  Calendar,
  User,
  Shapes,
  FileText,
  Edit,
  Tag,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { clsx } from 'clsx';

interface MovieCardSliderProps {
  movies: Movie[]; // グループの全動画（初期表示の代表動画がインデックス0）
  filterValues: Record<string, string> | null;
  filterSignature: string | null;
  tagFilter: string;
  onTagFilterChange: (tag: string) => void;
  onKeyItemClick: (fieldId: string, val: string | number) => void;
}

export function MovieCardSlider({
  movies,
  filterValues,
  filterSignature,
  tagFilter,
  onTagFilterChange,
  onKeyItemClick,
}: MovieCardSliderProps) {
  const { settings, updateMovieRating, openMoviePlayer, openEditMovieModal, t, lang: language } = useApp();
  const router = useRouter();

  const totalCount = movies.length;
  const leadId = movies[0]?.id;

  // 保存されたスライド位置があれば復元、なければ0
  const [currentIndex, setCurrentIndex] = useState(() => {
    return leadId ? getSavedSliderIndex(leadId) : 0;
  });

  React.useEffect(() => {
    if (leadId) {
      const saved = getSavedSliderIndex(leadId);
      setCurrentIndex(saved);
    }
  }, [leadId]);

  const safeIndex = Math.min(Math.max(0, currentIndex), Math.max(0, totalCount - 1));

  const changeSlide = (newIndex: number) => {
    const clamped = Math.min(Math.max(0, newIndex), Math.max(0, totalCount - 1));
    setCurrentIndex(clamped);
    if (leadId) {
      saveSliderIndex(leadId, clamped);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (safeIndex > 0) {
      changeSlide(safeIndex - 1);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (safeIndex < totalCount - 1) {
      changeSlide(safeIndex + 1);
    }
  };

  if (totalCount === 0) return null;

  return (
    <div className="glass-card rounded-2xl overflow-hidden group/card flex flex-col justify-between border border-slate-800 relative select-none">
      {/* Group Controls Overlay (16:9 aspect ratio, perfectly aligned with the thumbnail image) */}
      {totalCount > 1 && (
        <div className="absolute top-0 left-0 right-0 aspect-video pointer-events-none z-20">
          {/* Previous Slide Button */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={safeIndex === 0}
            title={t('slider_prev')}
            aria-label={t('slider_prev')}
            className={clsx(
              'pointer-events-auto absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all select-none',
              safeIndex === 0
                ? 'opacity-20 cursor-not-allowed bg-slate-950/70 text-slate-500 border border-slate-800'
                : 'bg-slate-950/80 hover:bg-blue-600 text-white border border-slate-700/80 hover:border-blue-400 shadow-xl backdrop-blur-md active:scale-95 cursor-pointer'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Next Slide Button */}
          <button
            type="button"
            onClick={handleNext}
            disabled={safeIndex === totalCount - 1}
            title={t('slider_next')}
            aria-label={t('slider_next')}
            className={clsx(
              'pointer-events-auto absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all select-none',
              safeIndex === totalCount - 1
                ? 'opacity-20 cursor-not-allowed bg-slate-950/70 text-slate-500 border border-slate-800'
                : 'bg-slate-950/80 hover:bg-blue-600 text-white border border-slate-700/80 hover:border-blue-400 shadow-xl backdrop-blur-md active:scale-95 cursor-pointer'
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Group Count Badge */}
          <div
            className="pointer-events-auto absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-950/50 backdrop-blur-md text-xs font-semibold text-blue-400 border border-blue-500/30 flex items-center gap-1.5 select-none shadow-md"
            title={t('movies_list_group_badge', { count: totalCount })}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>
              {safeIndex + 1} / {totalCount}
            </span>
          </div>

          {/* Dot Indicators */}
          <div className="pointer-events-auto absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-950/40 backdrop-blur-sm select-none">
            {movies.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  changeSlide(dotIdx);
                }}
                title={`${dotIdx + 1} / ${totalCount}`}
                aria-label={`Slide ${dotIdx + 1}`}
                className={clsx(
                  'h-1.5 rounded-full transition-all duration-300 cursor-pointer',
                  dotIdx === safeIndex
                    ? 'w-4 bg-blue-500 shadow-sm shadow-blue-500/50'
                    : 'w-1.5 bg-slate-400/50 hover:bg-slate-300'
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Slides Track Viewport */}
      <div className="w-full overflow-hidden flex-1 flex flex-col">
        <div
          className="flex w-full h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${safeIndex * 100}%)` }}
        >
          {movies.map((movie) => {
            const imageSrc = formatMediaUrl(movie.summary_image_path);
            const displayTags = movie.tags ? getSplitValues(movie.tags) : [];

            return (
              <div
                key={movie.id}
                className="w-full shrink-0 flex flex-col justify-between"
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
                                <Shapes className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                {movie.genre ? (
                                  <div className="flex flex-wrap items-center gap-1">
                                    {getSplitValues(movie.genre).map((gVal, idx) => (
                                      <React.Fragment key={idx}>
                                        {idx > 0 && <span className="text-slate-500">,</span>}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onKeyItemClick('genre', gVal);
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
                                <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                {movie.cast ? (
                                  <div className="flex flex-wrap items-center gap-1">
                                    {getSplitValues(movie.cast).map((cVal, idx) => (
                                      <React.Fragment key={idx}>
                                        {idx > 0 && <span className="text-slate-500">,</span>}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onKeyItemClick('cast', cVal);
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
                            if (
                              filterValues &&
                              (filterValues['release_year'] !== undefined ||
                                filterValues['release_date'] !== undefined)
                            )
                              return null;
                            return (
                              <div key="release" className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                {movie.release_year ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onKeyItemClick('release_year', movie.release_year!);
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
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onKeyItemClick(fieldId, cVal);
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
                                type="button"
                                onClick={() => onTagFilterChange(isSelected ? 'all' : tag)}
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
                        type="button"
                        onClick={() => openEditMovieModal(movie)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/80 transition-colors cursor-pointer whitespace-nowrap shrink-0 select-none"
                        title={t('edit')}
                      >
                        <Edit className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>{t('edit')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const params = new URLSearchParams();
                          params.set('id', movie.id.toString());
                          params.set('slide', safeIndex.toString());
                          if (filterSignature) {
                            params.set('filter', filterSignature);
                          }
                          if (leadId) {
                            saveSliderIndex(leadId, safeIndex);
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
      </div>
    </div>
  );
}
