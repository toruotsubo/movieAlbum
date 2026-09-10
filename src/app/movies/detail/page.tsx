'use client';

import React, { Suspense, useMemo, useEffect } from 'react';
import { useApp } from '@/components/AppProvider';
import { RatingStars } from '@/components/RatingStars';
import { formatMediaUrl, formatReleaseDate, getSplitValues } from '@/lib/utils';
import { formatDuration, formatResolution, formatFrameRate, formatFileSize } from '@/lib/metadataExtractor';
import { ensureLegacyMovieMetadata } from '@/lib/legacyMetadataFetcher';
import { useSearchParams, useRouter } from 'next/navigation';
import { Movie, AppSettings, DEFAULT_FIELD_ORDER } from '@/lib/types';
import {
  Play,
  Edit,
  Film,
  Calendar,
  User,
  Shapes,
  MessageSquare,
  FileText,
  Tag,
  Tags,
  Layers,
  Clock,
  Monitor,
  Gauge,
  HardDrive,
} from 'lucide-react';


function MovieDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { movies, settings, updateMovieRating, openMoviePlayer, openEditMovieModal, refreshData, loading, showKana, t, lang: language } = useApp();

  const movieId = Number(searchParams.get('id'));
  const filterSignature = searchParams.get('filter');
  const movie = movies.find((m) => m.id === movieId);

  // 【後日削除予定】登録済み動画への対応: メタデータ欠損がある場合に自動取得
  useEffect(() => {
    if (movie) {
      ensureLegacyMovieMetadata(movie, () => {
        refreshData();
      });
    }
  }, [movie?.id]);

  const handleBack = () => {
    if (filterSignature) {
      const params = new URLSearchParams();
      params.set('filter', filterSignature);
      router.push(`/movies?${params.toString()}`);
    } else {
      router.push('/movies');
    }
  };

  const groupMovies = useMemo(() => {
    if (!movie) return [];

    const keyFields = settings?.key_fields || ['genre'];
    const parentId = movie.parent_movie_id || (movie.is_grouped ? movie.id : null);

    const matches = movies.filter((m) => {
      // 1. Check parent-child relationships
      if (parentId && (m.id === parentId || m.parent_movie_id === parentId)) {
        return true;
      }
      if (m.parent_movie_id === movie.id || movie.parent_movie_id === m.id) {
        return true;
      }

      // 2. Check matching attributes if both are grouped
      if (movie.is_grouped && m.is_grouped) {
        if ((m.title || null) !== (movie.title || null)) return false;
        if ((m.genre || null) !== (movie.genre || null)) return false;
        if ((m.release_year || null) !== (movie.release_year || null)) return false;
        if ((m.release_date || null) !== (movie.release_date || null)) return false;

        for (const kf of keyFields) {
          if (((m as any)[kf] || null) !== ((movie as any)[kf] || null)) return false;
        }
        return true;
      }

      return false;
    });

    const uniqueMatches = Array.from(new Map(matches.map((m) => [m.id, m])).values());

    return uniqueMatches.sort((a, b) => {
      const fileA = a.file_name || a.title || '';
      const fileB = b.file_name || b.title || '';
      const fileCompare = fileA.localeCompare(fileB, 'ja', { numeric: true });
      if (fileCompare !== 0) return fileCompare;

      return a.id - b.id;
    });
  }, [movies, movie, settings]);

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

  const imageSrc = formatMediaUrl(movie.summary_image_path);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Button & Title Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-white truncate">
            {movie.title || movie.file_name}
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => openEditMovieModal(movie)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-lg shadow-blue-500/20 transition-all whitespace-nowrap"
          >
            <Edit className="w-4 h-4" />
            <span>{t('edit')}</span>
          </button>

          <button
            onClick={handleBack}
            className="flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-200 text-sm font-medium border border-blue-500/40 transition-colors whitespace-nowrap"
          >
            <span>{t('back')}</span>
          </button>
        </div>
      </div>

      {/* Summary Image Hero Card (720px × 405px Aspect Ratio) */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
        <div
          onClick={() => openMoviePlayer(movie.file_path)}
          className="relative aspect-video w-full max-w-[720px] mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 cursor-pointer group shadow-2xl"
          title={t('movies_list_play_tooltip')}
        >
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={movie.title || 'Summary'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-900">
              <Film className="w-12 h-12 mb-2 opacity-40" />
              <span className="text-sm">{t('detail_no_summary_img')}</span>
            </div>
          )}

          {/* Play Overlay */}
          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="p-3 rounded-full bg-blue-600/90 text-white shadow-lg backdrop-blur-sm transform group-hover:scale-110 transition-transform">
              <Play className="w-6 h-6 fill-current" />
            </div>
          </div>
        </div>

        {/* Technical Properties Bar (動画の長さ, 画面サイズ, フレームレート, ファイルサイズ) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-inner">
          {/* Duration */}
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-slate-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-[11px] text-slate-400 block font-medium">{t('field_duration')}</span>
              <span className="text-sm font-semibold text-slate-200 font-mono truncate block">
                {formatDuration(movie.duration)}
              </span>
            </div>
          </div>

          {/* Resolution */}
          <div className="flex items-center gap-2.5">
            <Monitor className="w-4 h-4 text-slate-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-[11px] text-slate-400 block font-medium">{t('field_resolution')}</span>
              <span className="text-sm font-semibold text-slate-200 font-mono truncate block">
                {formatResolution(movie.width, movie.height)}
              </span>
            </div>
          </div>

          {/* Frame Rate */}
          <div className="flex items-center gap-2.5">
            <Gauge className="w-4 h-4 text-slate-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-[11px] text-slate-400 block font-medium">{t('field_frame_rate')}</span>
              <span className="text-sm font-semibold text-slate-200 font-mono truncate block">
                {formatFrameRate(movie.frame_rate)}
              </span>
            </div>
          </div>

          {/* File Size */}
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-4 h-4 text-slate-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-[11px] text-slate-400 block font-medium">{t('field_file_size')}</span>
              <span className="text-sm font-semibold text-slate-200 font-mono truncate block">
                {formatFileSize(movie.file_size)}
              </span>
            </div>
          </div>
        </div>

        {/* Grouped Siblings Image Gallery */}
        {groupMovies.length > 1 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>{t('detail_group_title', { count: groupMovies.length })}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {groupMovies.map((gMovie) => {
                const gImgSrc = formatMediaUrl(gMovie.summary_image_path);
                const isCurrent = gMovie.id === movie.id;
                const gTags = gMovie.tags ? Array.from(new Set(getSplitValues(gMovie.tags).map((t) => t.trim()).filter(Boolean))) : [];

                return (
                  <div key={gMovie.id} className="flex flex-col gap-1.5">
                    <div
                      onClick={() => openMoviePlayer(gMovie.file_path)}
                      className={`relative aspect-video rounded-xl overflow-hidden bg-slate-950 border cursor-pointer group transition-all ${isCurrent
                          ? 'border-blue-500 ring-2 ring-blue-500/50'
                          : 'border-slate-800 hover:border-slate-600'
                        }`}
                      title={t('movies_list_play_tooltip')}
                    >
                      {gImgSrc ? (
                        <img
                          src={gImgSrc}
                          alt={gMovie.title || 'Group item'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-900">
                          <Film className="w-6 h-6 opacity-40" />
                        </div>
                      )}

                      {isCurrent && (
                        <div className="absolute top-1 right-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          {t('detail_displaying')}
                        </div>
                      )}

                      <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-current" />
                      </div>
                    </div>

                    {/* Tags for this group movie */}
                    {gTags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <Tag className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        {gTags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded-md bg-blue-600/20 text-blue-300 border border-blue-500/30 text-[10px] font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rating Header */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-sm font-semibold text-slate-200">{t('field_rating')}</span>
          <RatingStars
            rating={movie.rating}
            onChange={(newRating) => updateMovieRating(movie.id, newRating)}
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
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                      <Shapes className="w-3.5 h-3.5" /> {t('field_genre')}
                    </span>
                    <p className="text-sm font-medium text-slate-200">{movie.genre || '-'}</p>
                  </div>
                );
              }

              if (fieldId === 'cast') {
                return (
                  <div key="cast" className="space-y-1">
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> {t('field_cast')}
                    </span>
                    <p className="text-sm font-medium text-slate-200">
                      {movie.cast || '-'}
                      {showKana && movie.cast_kana ? <span className="text-xs text-slate-400 font-normal ml-2">({movie.cast_kana})</span> : null}
                    </p>
                  </div>
                );
              }

              if (fieldId === 'release_year' || fieldId === 'release_date') {
                if (releaseDateRendered) return null;
                releaseDateRendered = true;
                return (
                  <div key="release" className="space-y-1">
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> {t('field_release_full')}
                    </span>
                    <p className="text-sm font-medium text-slate-200">
                      {formatReleaseDate(movie.release_year, movie.release_date, language)}
                    </p>
                  </div>
                );
              }

              if (fieldId.startsWith('custom_field_')) {
                const num = fieldId.replace('custom_field_', '');
                const customName = (settings as any)?.[`custom_field_${num}_name`];
                if (!customName) return null;
                const val = (movie as any)[fieldId];

                return (
                  <div key={fieldId} className="space-y-1">
                    <span className="text-xs text-slate-500 font-medium">{customName}</span>
                    <p className="text-sm font-medium text-slate-200">{val || '-'}</p>
                  </div>
                );
              }

              return null;
            });
          })()}

          {/* Comment */}
          <div className="md:col-span-2 space-y-1">
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> {t('field_comment')}
            </span>
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 min-h-[80px]">
              <p className="text-sm text-slate-300 whitespace-pre-wrap">
                {movie.comment || '-'}
              </p>
            </div>
          </div>

          {/* Tags (Moved under Comment) */}
          {movie.tags && (
            <div className="md:col-span-2 space-y-1.5">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <Tags className="w-3.5 h-3.5" /> {t('field_tags')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {getSplitValues(movie.tags).map((tag, idx) => (
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
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> {t('field_file_path')}
            </span>
            <p className="text-sm font-mono bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-slate-300 break-all">
              {movie.file_path}
            </p>
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
