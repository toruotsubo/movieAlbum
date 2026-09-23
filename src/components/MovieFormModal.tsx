'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Movie, AppSettings } from '../lib/types';
import { split8DigitYear } from '../lib/utils';
import { Save, X, Trash2 } from 'lucide-react';
import { useApp } from './AppProvider';
import { ConfirmModal } from './ConfirmModal';
import { VideoThumbnailPlayer, VideoThumbnailPlayerHandle } from './movie-form/VideoThumbnailPlayer';
import { MovieMetadataFields, MovieFormData } from './movie-form/MovieMetadataFields';

interface MovieFormModalProps {
  isOpen: boolean;
  movie: Partial<Movie> | null;
  settings: AppSettings | null;
  onSave: (movieData: Partial<Movie>) => void;
  onDelete?: (id: number) => Promise<void>;
  onClose: () => void;
}

export const MovieFormModal: React.FC<MovieFormModalProps> = ({
  isOpen,
  movie,
  settings,
  onSave,
  onDelete,
  onClose,
}) => {
  const { showKana, t } = useApp();
  const playerRef = useRef<VideoThumbnailPlayerHandle>(null);

  // Form State
  const [formData, setFormData] = useState<MovieFormData>({
    title: '',
    genre: '',
    cast: '',
    castKana: '',
    releaseYear: '',
    releaseDate: '',
    rating: 3,
    comment: '',
    tags: '',
    custom1: '',
    custom2: '',
    custom3: '',
    isGrouped: false,
  });

  // Media & Metadata State
  const [summaryImagePath, setSummaryImagePath] = useState<string | null>(null);
  const [capturedTime, setCapturedTime] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [frameRate, setFrameRate] = useState<number | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorModalState, setErrorModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
  } | null>(null);

  const loadedMovieKeyRef = useRef<string | number | null>(null);

  // Initialize form when movie or isOpen changes
  useEffect(() => {
    if (!isOpen || !movie) {
      loadedMovieKeyRef.current = null;
      return;
    }

    const currentKey = movie.id || movie.file_path || null;
    if (loadedMovieKeyRef.current !== currentKey) {
      loadedMovieKeyRef.current = currentKey;

      let initYear: number | string = movie.release_year ?? '';
      let initDate: string = movie.release_date || '';
      const splitResult = split8DigitYear(initYear);
      if (splitResult) {
        initYear = splitResult.year;
        initDate = splitResult.date;
      }

      setFormData({
        title: movie.title || movie.file_name || '',
        genre: movie.genre || '',
        cast: movie.cast || '',
        castKana: movie.cast_kana || '',
        releaseYear: initYear,
        releaseDate: initDate,
        rating: movie.rating || 3,
        comment: movie.comment || '',
        tags: movie.tags || '',
        custom1: movie.custom_field_1 || '',
        custom2: movie.custom_field_2 || '',
        custom3: movie.custom_field_3 || '',
        isGrouped: Boolean(movie.is_grouped),
      });

      setSummaryImagePath(movie.summary_image_path || null);
      setCapturedTime(movie.captured_time !== undefined ? movie.captured_time : null);
      setDuration(movie.duration || null);
      setWidth(movie.width || null);
      setHeight(movie.height || null);
      setFrameRate(movie.frame_rate || null);
      setFileSize(movie.file_size || null);

      // Extract metadata if needed
      if (movie.file_path && window.api?.extractMetadata) {
        window.api.extractMetadata(movie.file_path).then((meta) => {
          if (meta) {
            if (meta.file_size) setFileSize(meta.file_size);
            if (meta.duration && !movie.duration) setDuration(meta.duration);
            if (meta.width) setWidth(meta.width);
            if (meta.height) setHeight(meta.height);
            if (meta.frame_rate) setFrameRate(meta.frame_rate);
          }
        }).catch((err) => console.warn('Failed to extract metadata in modal:', err));
      }
    }
  }, [isOpen, movie]);

  const handleFieldChange = <K extends keyof MovieFormData>(field: K, value: MovieFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleGrouping = () => {
    setFormData((prev) => ({ ...prev, isGrouped: !prev.isGrouped }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    let finalImagePath = summaryImagePath;
    let finalCapturedTime = capturedTime;

    // If player ref is active, attempt capture of current frame
    if (playerRef.current) {
      finalCapturedTime = playerRef.current.getCurrentTime();
      const captured = await playerRef.current.captureFrame();
      if (captured) finalImagePath = captured;
    }

    let finalYear: number | null = null;
    let targetDateStr = formData.releaseDate;
    const splitResult = split8DigitYear(formData.releaseYear);
    if (splitResult) {
      finalYear = splitResult.year;
      targetDateStr = splitResult.date;
    } else if (typeof formData.releaseYear === 'number') {
      finalYear = formData.releaseYear;
    } else if (typeof formData.releaseYear === 'string' && formData.releaseYear.trim() !== '') {
      const parsed = parseInt(formData.releaseYear.trim(), 10);
      if (!isNaN(parsed)) finalYear = parsed;
    }

    let finalDate: string | null = null;
    if (targetDateStr && targetDateStr.trim() !== '') {
      const match = targetDateStr.trim().match(/^(\d{1,2})[-/](\d{1,2})$/);
      if (match) {
        const m = match[1].padStart(2, '0');
        const d = match[2].padStart(2, '0');
        finalDate = `${m}-${d}`;
      } else {
        finalDate = targetDateStr.trim();
      }
    }

    const payload: Partial<Movie> = {
      ...movie,
      title: formData.title.trim() || movie?.file_name || null,
      genre: formData.genre.trim() || null,
      cast: formData.cast.trim() || null,
      cast_kana: formData.castKana.trim() || null,
      release_year: finalYear,
      release_date: finalDate,
      rating: formData.rating,
      comment: formData.comment.trim() || null,
      tags: formData.tags.trim() || null,
      custom_field_1: formData.custom1.trim() || null,
      custom_field_2: formData.custom2.trim() || null,
      custom_field_3: formData.custom3.trim() || null,
      is_grouped: formData.isGrouped,
      summary_image_path: finalImagePath,
      captured_time: finalCapturedTime,
      duration,
      width,
      height,
      frame_rate: frameRate,
      file_size: fileSize,
    };

    onSave(payload);
    setIsSaving(false);
    onClose();
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!movie?.id) return;
    if (onDelete) {
      await onDelete(movie.id);
    }
    onClose();
  };

  if (!isOpen || !movie) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-card w-full max-w-4xl rounded-2xl border border-slate-700/60 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 bg-slate-900/60">
          <h2 className="text-lg font-bold text-white">
            {movie?.id ? t('form_edit_title') : t('form_add_title')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Video Player & Thumbnail Capture */}
          <VideoThumbnailPlayer
            ref={playerRef}
            filePath={movie.file_path}
            summaryImagePath={summaryImagePath}
            capturedTime={capturedTime}
            presetDuration={duration}
            onSummaryImageChange={(img, time) => {
              setSummaryImagePath(img);
              if (time !== null) setCapturedTime(time);
            }}
            onMetadataExtracted={(meta) => {
              if (meta.duration && !duration) setDuration(meta.duration);
              if (meta.width) setWidth(meta.width);
              if (meta.height) setHeight(meta.height);
            }}
            onErrorModal={(title, description) => {
              setErrorModalState({ isOpen: true, title, description });
            }}
          />

          {/* Form Fields */}
          <MovieMetadataFields
            formData={formData}
            settings={settings}
            showKana={showKana}
            onFieldChange={handleFieldChange}
            onToggleGrouping={handleToggleGrouping}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/60 bg-slate-900/60">
          <div>
            {movie?.id && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/40 bg-red-600/10 text-red-400 hover:bg-red-600/20 text-sm font-medium transition-colors"
                title={t('delete')}
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('delete')}</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium shadow-lg shadow-blue-500/25 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? t('saving') : t('save')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          title={t('delete')}
          description={t('confirmDelete')}
          confirmText={t('delete')}
          variant="danger"
          onConfirm={handleConfirmDelete}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* Error / Alert Modal */}
      {errorModalState && (
        <ConfirmModal
          isOpen={errorModalState.isOpen}
          title={errorModalState.title}
          description={errorModalState.description}
          confirmText="OK"
          showCancel={false}
          variant="danger"
          onConfirm={() => setErrorModalState(null)}
          onClose={() => setErrorModalState(null)}
        />
      )}
    </div>
  );
};
