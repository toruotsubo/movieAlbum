'use client';

import React, { Suspense, useMemo, useEffect, useState } from 'react';
import { useApp } from '@/components/AppProvider';
import { RatingStars } from '@/components/RatingStars';
import { formatMediaUrl, formatReleaseDate, getSplitValues, getGroupMatches, getSavedSliderIndex, saveSliderIndex } from '@/lib/utils';
import { formatDuration, formatResolution, formatFrameRate, formatFileSize } from '@/lib/metadataExtractor';
import { ensureLegacyMovieMetadata } from '@/lib/legacyMetadataFetcher';
import { useSearchParams, useRouter } from 'next/navigation';
import { DEFAULT_FIELD_ORDER } from '@/lib/types';
import {
  Play,
  Edit,
  Film,
  Calendar,
  User,
  Shapes,
  MessageSquare,
  FileText,
  Tags,
  Layers,
  Clock,
  Monitor,
  Gauge,
  HardDrive,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';

function MovieDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { movies, settings, updateMovieRating, openMoviePlayer, openEditMovieModal, refreshData, loading, showKana, t, lang: language } = useApp();

  const movieId = Number(searchParams.get('id'));
  const filterSignature = searchParams.get('filter');
  const slideParam = searchParams.get('slide');
  const movie = movies.find((m) => m.id === movieId);

  // グループ化動画の取得: 親動画の概念を廃止し、ファイル名順でソートされた動画リストを取得（先頭がインデックス0）
  const groupMovies = useMemo(() => {
    if (!movie) return [];
    const keyFields = settings?.key_fields || ['genre'];
    return getGroupMatches(movie, movies, keyFields);
  }, [movies, movie, settings]);

  const totalCount = groupMovies.length;
  const leadId = groupMovies[0]?.id;

  // 初期スライド位置の決定: slideパラメータ > movieIdの位置 > 保存された位置 > 0
  const initialSlideIndex = useMemo(() => {
    if (slideParam !== null) {
      const parsed = parseInt(slideParam, 10);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
    const idx = groupMovies.findIndex((m) => m.id === movieId);
    if (idx >= 0) return idx;
    if (leadId) return getSavedSliderIndex(leadId);
    return 0;
  }, [slideParam, groupMovies, movieId, leadId]);

  const [currentIndex, setCurrentIndex] = useState(initialSlideIndex);

  useEffect(() => {
    setCurrentIndex(initialSlideIndex);
  }, [initialSlideIndex]);

  const safeIndex = Math.min(Math.max(0, currentIndex), Math.max(0, totalCount - 1));
  const currentMovie = groupMovies[safeIndex] || movie;

  // スライド位置が切り替わったときに保存
  useEffect(() => {
    if (leadId && totalCount > 1) {
      saveSliderIndex(leadId, safeIndex);
    }
  }, [leadId, totalCount, safeIndex]);

  // 【後日削除予定】登録済み動画への対応: メタデータ欠損がある場合に自動取得
  useEffect(() => {
    if (currentMovie) {
      ensureLegacyMovieMetadata(currentMovie, () => {
        refreshData();
      });
    }
  }, [currentMovie?.id]);

  const changeSlide = (newIndex: number) => {
    const clamped = Math.min(Math.max(0, newIndex), Math.max(0, totalCount - 1));
    setCurrentIndex(clamped);
    if (leadId && totalCount > 1) {
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

  const handleBack = () => {
    if (leadId && totalCount > 1) {
      saveSliderIndex(leadId, safeIndex);
    }
    if (filterSignature) {
      const params = new URLSearchParams();
      params.set('filter', filterSignature);
      router.push(`/movies?${params.toString()}`);
    } else {
      router.push('/movies');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-slate-300">{t('detail_movie_not_found')}</h2>
        <button
          onClick={handleBack}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium"
        >
          {t('detail_back_to_list')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Button & Title Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-white truncate">
            {currentMovie.title || currentMovie.file_name}
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0 select-none">
          <button
            type="button"
            onClick={() => openEditMovieModal(currentMovie)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-lg shadow-blue-500/20 transition-all whitespace-nowrap select-none cursor-pointer"
          >
            <Edit className="w-4 h-4" />
            <span>{t('edit')}</span>
          </button>

          <button
            type="button"
            onClick={handleBack}
            className="flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-200 text-sm font-medium border border-blue-500/40 transition-colors whitespace-nowrap select-none cursor-pointer"
          >
            <span>{t('back')}</span>
          </button>
        </div>
      </div>

      {/* Main Slider Card */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 relative select-none">
        <div className="w-full overflow-hidden relative">
          {/* Controls Overlay (Aspect 16:9, perfectly matching the 720px thumbnail hero card) */}
          {totalCount > 1 && (
            <div className="absolute top-0 left-0 right-0 pointer-events-none z-20">
              <div className="relative aspect-video w-full max-w-[720px] mx-auto pointer-events-none">
                {/* Previous Slide Button */}
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={safeIndex === 0}
                  title={t('slider_prev')}
                  aria-label={t('slider_prev')}
                  className={clsx(
                    'pointer-events-auto absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all select-none',
                    safeIndex === 0
                      ? 'opacity-20 cursor-not-allowed bg-slate-950/70 text-slate-500 border border-slate-800'
                      : 'bg-slate-950/80 hover:bg-blue-600 text-white border border-slate-700/80 hover:border-blue-400 shadow-xl backdrop-blur-md active:scale-95 cursor-pointer'
                  )}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Next Slide Button */}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={safeIndex === totalCount - 1}
                  title={t('slider_next')}
                  aria-label={t('slider_next')}
                  className={clsx(
                    'pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all select-none',
                    safeIndex === totalCount - 1
                      ? 'opacity-20 cursor-not-allowed bg-slate-950/70 text-slate-500 border border-slate-800'
                      : 'bg-slate-950/80 hover:bg-blue-600 text-white border border-slate-700/80 hover:border-blue-400 shadow-xl backdrop-blur-md active:scale-95 cursor-pointer'
                  )}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Group Count Badge */}
                <div
                  className="pointer-events-auto absolute top-3 right-3 px-3 py-1 rounded-full bg-slate-950/50 backdrop-blur-md text-xs font-semibold text-blue-400 border border-blue-500/30 flex items-center gap-1.5 select-none shadow-md"
                  title={t('movies_list_group_badge', { count: totalCount })}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>
                    {safeIndex + 1} / {totalCount}
                  </span>
                </div>

                {/* Dot Indicators */}
                <div className="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/40 backdrop-blur-sm select-none">
                  {groupMovies.map((_, dotIdx) => (
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
                          ? 'w-5 bg-blue-500 shadow-sm shadow-blue-500/50'
                          : 'w-1.5 bg-slate-400/50 hover:bg-slate-300'
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Slides Track */}
          <div
            className="flex w-full transition-transform duration-300 ease-out items-start"
            style={{ transform: `translateX(-${safeIndex * 100}%)` }}
          >
            {groupMovies.map((item) => {
              const itemImageSrc = formatMediaUrl(item.summary_image_path);

              return (
                <div key={item.id} className="w-full shrink-0 space-y-6">
                  {/* Summary Image Hero Card (720px × 405px Aspect Ratio) */}
                  <div
                    onClick={() => openMoviePlayer(item.file_path)}
                    className="relative aspect-video w-full max-w-[720px] mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 cursor-pointer group shadow-2xl select-none"
                    title={t('movies_list_play_tooltip')}
                  >
                    {itemImageSrc ? (
                      <img
                        src={itemImageSrc}
                        alt={item.title || 'Summary'}
                        draggable={false}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-900 select-none">
                        <Film className="w-12 h-12 mb-2 opacity-40" />
                        <span className="text-sm">{t('detail_no_summary_img')}</span>
                      </div>
                    )}

                    {/* Play Overlay */}
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center select-none">
                      <div className="p-3 rounded-full bg-blue-600/90 text-white shadow-lg backdrop-blur-sm transform group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 fill-current" />
                      </div>
                    </div>
                  </div>

                  {/* Technical Properties Bar (動画の長さ, 画面サイズ, フレームレート, ファイルサイズ) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-inner select-none">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[11px] text-slate-400 block font-medium">{t('field_duration')}</span>
                        <span className="text-sm font-semibold text-slate-200 font-mono truncate block">
                          {formatDuration(item.duration)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Monitor className="w-4 h-4 text-slate-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[11px] text-slate-400 block font-medium">{t('field_resolution')}</span>
                        <span className="text-sm font-semibold text-slate-200 font-mono truncate block">
                          {formatResolution(item.width, item.height)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Gauge className="w-4 h-4 text-slate-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[11px] text-slate-400 block font-medium">{t('field_frame_rate')}</span>
                        <span className="text-sm font-semibold text-slate-200 font-mono truncate block">
                          {formatFrameRate(item.frame_rate)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <HardDrive className="w-4 h-4 text-slate-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[11px] text-slate-400 block font-medium">{t('field_file_size')}</span>
                        <span className="text-sm font-semibold text-slate-200 font-mono truncate block">
                          {formatFileSize(item.file_size)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rating Header */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800 select-none">
                    <span className="text-sm font-semibold text-slate-200">{t('field_rating')}</span>
                    <RatingStars
                      rating={item.rating}
                      onChange={(newRating) => updateMovieRating(item.id, newRating)}
                      size="lg"
                    />
                  </div>

                  {/* Metadata Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {(() => {
                      const order = settings?.field_order || DEFAULT_FIELD_ORDER;
                      let releaseDateRendered = false;

                      return order.map((fieldId) => {
                        if (fieldId === 'title' || fieldId === 'rating') return null;

                        if (fieldId === 'genre') {
                          return (
                            <div key="genre" className="space-y-1">
                              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5 select-none">
                                <Shapes className="w-3.5 h-3.5" /> {t('field_genre')}
                              </span>
                              <p className="text-sm font-medium text-slate-200">{item.genre || '-'}</p>
                            </div>
                          );
                        }

                        if (fieldId === 'cast') {
                          return (
                            <div key="cast" className="space-y-1">
                              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5 select-none">
                                <User className="w-3.5 h-3.5" /> {t('field_cast')}
                              </span>
                              <p className="text-sm font-medium text-slate-200">
                                {item.cast || '-'}
                                {showKana && item.cast_kana ? (
                                  <span className="text-xs text-slate-400 font-normal ml-2">({item.cast_kana})</span>
                                ) : null}
                              </p>
                            </div>
                          );
                        }

                        if (fieldId === 'release_year' || fieldId === 'release_date') {
                          if (releaseDateRendered) return null;
                          releaseDateRendered = true;
                          return (
                            <div key="release" className="space-y-1">
                              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5 select-none">
                                <Calendar className="w-3.5 h-3.5" /> {t('field_release_full')}
                              </span>
                              <p className="text-sm font-medium text-slate-200">
                                {formatReleaseDate(item.release_year, item.release_date, language)}
                              </p>
                            </div>
                          );
                        }

                        if (fieldId.startsWith('custom_field_')) {
                          const num = fieldId.replace('custom_field_', '');
                          const customName = (settings as any)?.[`custom_field_${num}_name`];
                          if (!customName) return null;
                          const val = (item as any)[fieldId];

                          return (
                            <div key={fieldId} className="space-y-1">
                              <span className="text-xs text-slate-500 font-medium select-none">{customName}</span>
                              <p className="text-sm font-medium text-slate-200">{val || '-'}</p>
                            </div>
                          );
                        }

                        return null;
                      });
                    })()}

                    {/* Comment */}
                    <div className="md:col-span-2 space-y-1">
                      <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5 select-none">
                        <MessageSquare className="w-3.5 h-3.5" /> {t('field_comment')}
                      </span>
                      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 min-h-[80px]">
                        <p className="text-sm text-slate-300 whitespace-pre-wrap">{item.comment || '-'}</p>
                      </div>
                    </div>

                    {/* Tags */}
                    {item.tags && (
                      <div className="md:col-span-2 space-y-1.5">
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5 select-none">
                          <Tags className="w-3.5 h-3.5" /> {t('field_tags')}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {getSplitValues(item.tags).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/30 text-xs font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* File Path */}
                    <div className="md:col-span-2 space-y-1">
                      <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5 select-none">
                        <FileText className="w-3.5 h-3.5" /> {t('field_file_path')}
                      </span>
                      <p className="text-sm font-mono bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-slate-300 break-all">
                        {item.file_path}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MovieDetailPage() {
  const { t } = useApp();
  return (
    <Suspense fallback={<div className="flex justify-center p-12 text-slate-400">{t('loading')}</div>}>
      <MovieDetailContent />
    </Suspense>
  );
}
