'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Movie, AppSettings, DEFAULT_FIELD_ORDER } from '../lib/types';
import { formatMediaUrl, isUnsupportedInlinePlayback } from '../lib/utils';
import { RatingStars } from './RatingStars';
import { clsx } from 'clsx';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Camera,
  Save,
  Film,
  X,
  AlertTriangle,
  Trash2,
} from 'lucide-react';

import { useApp } from './AppProvider';
import { ConfirmModal } from './ConfirmModal';

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
  settings: propSettings,
  onSave,
  onDelete,
  onClose,
}) => {
  const { showKana, t, settings, openMoviePlayer } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [cast, setCast] = useState('');
  const [castKana, setCastKana] = useState('');
  const [releaseYear, setReleaseYear] = useState<number | string>('');
  const [releaseDate, setReleaseDate] = useState('');
  const [rating, setRating] = useState(3);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState('');
  const [custom1, setCustom1] = useState('');
  const [custom2, setCustom2] = useState('');
  const [custom3, setCustom3] = useState('');
  const [isGrouped, setIsGrouped] = useState(false);
  const loadedMovieKeyRef = useRef<string | number | null>(null);

  // Video / Summary Image State
  const [summaryImagePath, setSummaryImagePath] = useState<string | null>(null);
  const [capturedTime, setCapturedTime] = useState<number | null>(null);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [width, setWidth] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [frameRate, setFrameRate] = useState<number | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAutoGeneratingSummary, setIsAutoGeneratingSummary] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorModalState, setErrorModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
  } | null>(null);

  const split8DigitYear = (
    yearVal: number | string | null | undefined
  ): { year: number; date: string } | null => {
    if (!yearVal && yearVal !== 0) return null;
    const str = String(yearVal).trim().replace(/[０-９]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    );
    if (/^\d{8}$/.test(str)) {
      const y = Number(str.slice(0, 4));
      const m = str.slice(4, 6);
      const d = str.slice(6, 8);
      return {
        year: y,
        date: `${m}-${d}`,
      };
    }
    return null;
  };

  const handleReleaseYearChange = (rawVal: string) => {
    const normalized = rawVal.trim().replace(/[０-９]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    );
    const splitResult = split8DigitYear(normalized);
    if (splitResult) {
      setReleaseYear(splitResult.year);
      setReleaseDate(splitResult.date);
      return;
    }
    if (/^\d*$/.test(normalized)) {
      setReleaseYear(normalized);
    }
  };

  const handleReleaseYearBlur = () => {
    const splitResult = split8DigitYear(releaseYear);
    if (splitResult) {
      setReleaseYear(splitResult.year);
      setReleaseDate(splitResult.date);
    }
  };

  const generateDefaultSummaryImage = (filePath: string, presetDuration?: number | null) => {
    return new Promise<{ imagePath: string | null; targetTime: number }>(async (resolve) => {
      if (typeof window === 'undefined') {
        resolve({ imagePath: null, targetTime: 0 });
        return;
      }

      // HTML5 非対応フォーマットの場合は直接バックエンド FFmpeg で抽出
      const isLegacyFormat = isUnsupportedInlinePlayback(filePath);

      if (isLegacyFormat && window.api?.generateThumbnail) {
        try {
          const res = await window.api.generateThumbnail(filePath, presetDuration ? presetDuration * 0.5 : null);
          if (res) {
            resolve({ imagePath: res.imagePath, targetTime: res.targetTime });
            return;
          }
        } catch (e) {
          console.warn('FFmpeg thumbnail fallback error:', e);
        }
      }

      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = formatMediaUrl(filePath, false);
      video.preload = 'metadata';

      let timeoutId: NodeJS.Timeout;

      const cleanup = () => {
        clearTimeout(timeoutId);
        video.onloadedmetadata = null;
        video.onseeked = null;
        video.onerror = null;
        video.src = '';
        video.remove();
      };

      timeoutId = setTimeout(async () => {
        console.warn('Default summary generation timed out, trying FFmpeg fallback');
        cleanup();
        if (window.api?.generateThumbnail) {
          try {
            const res = await window.api.generateThumbnail(filePath, presetDuration ? presetDuration * 0.5 : null);
            if (res) {
              resolve({ imagePath: res.imagePath, targetTime: res.targetTime });
              return;
            }
          } catch (e) {
            console.error('FFmpeg fallback failed on timeout:', e);
          }
        }
        resolve({ imagePath: null, targetTime: 0 });
      }, 8000);

      video.onloadedmetadata = () => {
        const dur = (video.duration && !isNaN(video.duration) && video.duration > 0)
          ? video.duration
          : (presetDuration || 0);
        const targetTime = dur > 0 ? dur * 0.5 : 0;

        video.onseeked = async () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 720;
            canvas.height = 405;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, 720, 405);
              const dataUrl = canvas.toDataURL('image/png');
              let savedPath = dataUrl;
              if (window.api?.saveSummaryImage) {
                try {
                  savedPath = await window.api.saveSummaryImage(dataUrl);
                } catch (err) {
                  console.error('Failed to save summary image:', err);
                  setErrorModalState({
                    isOpen: true,
                    title: t('error_title'),
                    description: t('error_save_summary_failed'),
                  });
                }
              }
              cleanup();
              resolve({ imagePath: savedPath, targetTime });
              return;
            }
          } catch (err) {
            console.error('Failed to capture frame in auto summary generation:', err);
          }
          cleanup();
          resolve({ imagePath: null, targetTime });
        };

        if (targetTime > 0) {
          video.currentTime = targetTime;
        } else {
          video.currentTime = 0.001;
        }
      };

      video.onerror = async (err) => {
        console.warn('HTML5 video onError fired, falling back to backend FFmpeg thumbnail generator:', err);
        cleanup();
        if (window.api?.generateThumbnail) {
          try {
            const res = await window.api.generateThumbnail(filePath, presetDuration ? presetDuration * 0.5 : null);
            if (res) {
              resolve({ imagePath: res.imagePath, targetTime: res.targetTime });
              return;
            }
          } catch (e) {
            console.error('FFmpeg fallback failed on video error:', e);
          }
        }
        resolve({ imagePath: null, targetTime: 0 });
      };
    });
  };

  useEffect(() => {
    if (!isOpen || !movie) {
      loadedMovieKeyRef.current = null;
      return;
    }

    const currentKey = movie.id || movie.file_path || null;
    if (loadedMovieKeyRef.current !== currentKey) {
      loadedMovieKeyRef.current = currentKey;
      setTitle(movie.title || movie.file_name || '');
      setGenre(movie.genre || '');
      setCast(movie.cast || '');
      setCastKana(movie.cast_kana || '');
      let initYear: number | string = movie.release_year ?? '';
      let initDate: string = movie.release_date || '';

      const splitResult = split8DigitYear(initYear);
      if (splitResult) {
        initYear = splitResult.year;
        initDate = splitResult.date;
      }

      setReleaseYear(initYear);
      setReleaseDate(initDate);
      setRating(movie.rating || 3);
      setComment(movie.comment || '');
      setTags(movie.tags || '');
      setCustom1(movie.custom_field_1 || '');
      setCustom2(movie.custom_field_2 || '');
      setCustom3(movie.custom_field_3 || '');
      setIsGrouped(Boolean(movie.is_grouped));
      setSummaryImagePath(movie.summary_image_path || null);
      setCapturedTime(movie.captured_time !== undefined ? movie.captured_time : null);
      setIsPlayingVideo(false);
      setIsPlaying(false);
      setVideoError(null);
      setCurrentTime(0);
      setDuration(movie.duration || 0);
      setWidth(movie.width || null);
      setHeight(movie.height || null);
      setFrameRate(movie.frame_rate || null);
      setFileSize(movie.file_size || null);

      // 初回登録時などサマリー画像がない場合は中間時点のスクショをデフォルト自動生成
      if (!movie.summary_image_path && movie.file_path) {
        setIsAutoGeneratingSummary(true);
        generateDefaultSummaryImage(movie.file_path, movie.duration)
          .then(({ imagePath, targetTime }) => {
            if (imagePath) {
              setSummaryImagePath(imagePath);
              setCapturedTime(targetTime);
            }
            setIsAutoGeneratingSummary(false);
          })
          .catch((err) => {
            console.error('Failed to generate auto summary image:', err);
            setIsAutoGeneratingSummary(false);
          });
      } else {
        setIsAutoGeneratingSummary(false);
      }

      // 自動メタデータ抽出 (新規および不足動画)
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

  const getKeyFieldsLabel = () => {
    const keyFields = settings?.key_fields || ['genre'];
    const labels: string[] = [];
    for (const kf of keyFields) {
      if (kf === 'title') labels.push(t('field_title'));
      else if (kf === 'genre') labels.push(t('field_genre'));
      else if (kf === 'cast') labels.push(t('field_cast'));
      else if (kf === 'release_year') labels.push(t('field_release_year'));
      else if (kf === 'release_date') labels.push(t('field_release_date'));
      else if (kf === 'rating') labels.push(t('field_rating'));
      else if (kf === 'custom_field_1') labels.push(settings?.custom_field_1_name || t('field_custom_1_default'));
      else if (kf === 'custom_field_2') labels.push(settings?.custom_field_2_name || t('field_custom_2_default'));
      else if (kf === 'custom_field_3') labels.push(settings?.custom_field_3_name || t('field_custom_3_default'));
      else labels.push(t('field_title'));
    }
    return labels.join(' / ');
  };

  const handleToggleGrouping = () => {
    setIsGrouped((prev) => !prev);
  };

  if (!isOpen || !movie) return null;

  const videoSrc = formatMediaUrl(movie.file_path, false);
  const imageSrc = formatMediaUrl(summaryImagePath);

  // Video Player Controls
  const togglePlay = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await videoRef.current.play();
        setIsPlaying(true);
      } catch (err: any) {
        console.error('Failed to play video:', err);
        setVideoError(t('error_video_play_failed'));
        setIsPlaying(false);
      }
    }
  };

  const seekTo = (targetTime: number) => {
    if (!videoRef.current) return;
    const validTime = Math.max(0, Math.min(duration || videoRef.current.duration || 0, targetTime));
    videoRef.current.currentTime = validTime;
    setCurrentTime(validTime);
  };

  const seekBy = (seconds: number) => {
    if (!videoRef.current) return;
    seekTo(videoRef.current.currentTime + seconds);
  };

  const stepFrame = (frames: number) => {
    if (!videoRef.current) return;
    const fps = 30;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    seekTo(videoRef.current.currentTime + frames / fps);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    seekTo(time);
  };

  // Capture screenshot (720px x 405px)
  const captureFrame = async (): Promise<string | null> => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = 720;
    canvas.height = 405;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    try {
      ctx.drawImage(video, 0, 0, 720, 405);
      const dataUrl = canvas.toDataURL('image/png');

      if (window.api?.saveSummaryImage) {
        try {
          const savedPath = await window.api.saveSummaryImage(dataUrl);
          setSummaryImagePath(savedPath);
          return savedPath;
        } catch (err) {
          console.error('Failed to save summary image:', err);
          setErrorModalState({
            isOpen: true,
            title: t('error_title'),
            description: t('error_save_summary_failed'),
          });
          return null;
        }
      }
      setSummaryImagePath(dataUrl);
      return dataUrl;
    } catch (err) {
      console.error('Failed to capture frame:', err);
      return null;
    }
  };

  const handleSave = async () => {
    setIsCapturing(true);
    let finalImagePath = summaryImagePath;
    let finalCapturedTime = capturedTime;

    if (isPlayingVideo && videoRef.current) {
      finalCapturedTime = videoRef.current.currentTime;
      const captured = await captureFrame();
      if (captured) finalImagePath = captured;
    }

    let finalYear: number | null = null;
    let targetDateStr = releaseDate;

    const splitResult = split8DigitYear(releaseYear);
    if (splitResult) {
      finalYear = splitResult.year;
      targetDateStr = splitResult.date;
    } else if (releaseYear !== '' && !isNaN(Number(releaseYear))) {
      finalYear = Number(releaseYear);
    }

    let formattedReleaseDate = targetDateStr.trim().replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
    if (/^\d{4}$/.test(formattedReleaseDate)) {
      formattedReleaseDate = `${formattedReleaseDate.slice(0, 2)}-${formattedReleaseDate.slice(2, 4)}`;
    }

    onSave({
      ...movie,
      title: title.trim() || movie.file_name || t('untitled'),
      genre: genre.trim() || null,
      cast: cast.trim() || null,
      cast_kana: castKana.trim() || null,
      release_year: finalYear,
      release_date: formattedReleaseDate || null,
      rating,
      comment: comment.trim() || null,
      tags: tags.trim() || null,
      custom_field_1: custom1.trim() || null,
      custom_field_2: custom2.trim() || null,
      custom_field_3: custom3.trim() || null,
      summary_image_path: finalImagePath,
      captured_time: finalCapturedTime !== undefined ? finalCapturedTime : null,
      duration: duration || movie.duration || null,
      width: width || movie.width || null,
      height: height || movie.height || null,
      frame_rate: frameRate || movie.frame_rate || null,
      file_size: fileSize || movie.file_size || null,
      is_grouped: isGrouped,
    });
    setIsCapturing(false);
    onClose();
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleDelete = () => {
    if (!movie?.id) return;
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    if (!movie?.id) return;
    // グループ化がONになっている場合、まずグループ化をOFFにする
    if (isGrouped || movie.is_grouped || movie.parent_movie_id) {
      await onSave({
        ...movie,
        is_grouped: false,
        parent_movie_id: null,
      });
    }
    if (onDelete) {
      await onDelete(movie.id);
    }
    onClose();
  };

  const isUnsupportedPlaybackFormat = isUnsupportedInlinePlayback(movie?.file_path);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      {/* Hidden Canvas for Capturing */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="glass-card w-full max-w-4xl rounded-2xl border border-slate-700/60 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white">{movie?.id ? t('form_edit_title') : t('form_add_title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Summary Image & Player Section */}
          <div className="space-y-2">
            <div className="relative w-full aspect-video max-w-[720px] mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl group">
              {!isPlayingVideo ? (
                <button
                  type="button"
                  disabled={isUnsupportedPlaybackFormat}
                  onClick={async () => {
                    if (isUnsupportedPlaybackFormat) return;

                    if (movie.file_path && window.api?.checkFileExists) {
                      const exists = await window.api.checkFileExists(movie.file_path);
                      if (!exists) {
                        setErrorModalState({
                          isOpen: true,
                          title: t('error_title'),
                          description: t('error_file_not_found'),
                        });
                        return;
                      }
                    }

                    setIsPlayingVideo(true);
                  }}
                  className={clsx(
                    "w-full h-full relative flex items-center justify-center group focus:outline-none",
                    isUnsupportedPlaybackFormat ? "cursor-not-allowed" : "cursor-pointer"
                  )}
                >
                  {isAutoGeneratingSummary ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/90 text-slate-300 gap-3">
                      <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm font-medium text-slate-200">{t('form_generating_summary')}</span>
                    </div>
                  ) : imageSrc ? (
                    <img
                      src={imageSrc}
                      alt="Summary Preview"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500">
                      <Film className="w-12 h-12 mb-2 opacity-50" />
                      <span className="text-sm">{t('form_no_summary_click')}</span>
                    </div>
                  )}

                  {!isAutoGeneratingSummary && (
                    <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                      {isUnsupportedPlaybackFormat ? (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900/90 text-slate-300 border border-slate-700/80 font-medium text-xs shadow-lg backdrop-blur-sm">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>{t('form_manual_capture_disabled')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600/90 text-white font-medium shadow-lg backdrop-blur-sm">
                          <Play className="w-5 h-5 fill-current" />
                          <span>{t('form_play_capture_btn')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              ) : (
                <div className="w-full h-full flex flex-col relative bg-black">
                  {videoError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-900 text-slate-300 text-center space-y-3">
                      <AlertTriangle className="w-10 h-10 text-amber-400" />
                      <p className="text-sm text-slate-200">{videoError}</p>
                      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        {movie.file_path && (
                          <button
                            type="button"
                            onClick={() => openMoviePlayer(movie.file_path!)}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs text-white font-medium flex items-center gap-1.5 shadow-md"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>{t('form_open_os_player')}</span>
                          </button>
                        )}
                        {movie.file_path && window.api?.generateThumbnail && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (movie.file_path && window.api?.checkFileExists) {
                                const exists = await window.api.checkFileExists(movie.file_path);
                                if (!exists) {
                                  setErrorModalState({
                                    isOpen: true,
                                    title: t('error_title'),
                                    description: t('error_file_not_found'),
                                  });
                                  return;
                                }
                              }

                              setIsAutoGeneratingSummary(true);
                              const res = await window.api.generateThumbnail(movie.file_path!);
                              if (res) {
                                setSummaryImagePath(res.imagePath);
                                setCapturedTime(res.targetTime);
                                if (res.duration && !duration) setDuration(res.duration);
                              } else {
                                setErrorModalState({
                                  isOpen: true,
                                  title: t('error_title'),
                                  description: t('error_file_not_found'),
                                });
                              }
                              setIsAutoGeneratingSummary(false);
                            }}
                            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 font-medium flex items-center gap-1.5"
                          >
                            <Camera className="w-3.5 h-3.5 text-blue-400" />
                            <span>{t('form_ffmpeg_reextract')}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsPlayingVideo(false)}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                        >
                          {t('form_back_to_preview')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <video
                      ref={videoRef}
                      src={videoSrc}
                      preload="auto"
                      playsInline
                      className="w-full h-full object-contain"
                      onTimeUpdate={() => {
                        if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                      }}
                      onLoadedMetadata={() => {
                        if (videoRef.current) {
                          const vidDuration = videoRef.current.duration;
                          setDuration(vidDuration);
                          if (videoRef.current.videoWidth) setWidth(videoRef.current.videoWidth);
                          if (videoRef.current.videoHeight) setHeight(videoRef.current.videoHeight);

                          // 初回/未記録時は50%位置、記録あり時は記録位置にシーク
                          let targetTime = 0;
                          if (capturedTime !== null && capturedTime !== undefined && !isNaN(capturedTime) && capturedTime >= 0) {
                            targetTime = Math.min(vidDuration, Math.max(0, capturedTime));
                          } else if (vidDuration && !isNaN(vidDuration) && vidDuration > 0) {
                            targetTime = vidDuration * 0.5;
                          }

                          if (targetTime > 0) {
                            videoRef.current.currentTime = targetTime;
                            setCurrentTime(targetTime);
                          }
                        }
                      }}
                      onError={(e) => {
                        const target = e.currentTarget as HTMLVideoElement;
                        const errorDetails = target.error
                          ? `Code: ${target.error.code}, Message: ${target.error.message}`
                          : 'Unknown video error';

                        if (isUnsupportedInlinePlayback(movie.file_path) || errorDetails.includes('DEMUXER_ERROR')) {
                          setVideoError(`${t('form_unsupported_format_notice')} (${errorDetails})`);
                          // サマリー画像が未取得の場合はバックエンド FFmpeg で自動抽出を試みる
                          if (!summaryImagePath && movie.file_path && window.api?.generateThumbnail) {
                            window.api.generateThumbnail(movie.file_path).then((res) => {
                              if (res) {
                                setSummaryImagePath(res.imagePath);
                                setCapturedTime(res.targetTime);
                                if (res.duration && !duration) setDuration(res.duration);
                              }
                            }).catch(() => {});
                          }
                        } else {
                          setVideoError(t('error_video_load_failed', { error: errorDetails, path: movie.file_path || '' }));
                        }
                      }}
                      onEnded={() => setIsPlaying(false)}
                    />
                  )}
                </div>
              )}

              {/* Player Controls Bar (When playing video) */}
              {isPlayingVideo && !videoError && (
                <div className="absolute bottom-0 inset-x-0 z-20 p-2.5 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent flex flex-col gap-1.5 backdrop-blur-xs">
                  {/* Seek Bar Slider */}
                  <div className="flex items-center gap-2.5 text-xs text-slate-200">
                    <span className="font-mono text-[11px] text-slate-300 shrink-0">{formatTime(currentTime)}</span>
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      step={0.1}
                      value={currentTime}
                      onChange={handleSliderChange}
                      className="w-full h-1.5 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-blue-500 transition-all"
                    />
                    <span className="text-[11px] font-mono text-slate-300 shrink-0 text-right">
                      {formatTime(duration)}
                    </span>
                  </div>

                  {/* Buttons & Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Play/Pause */}
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                        title={isPlaying ? t('pause') : t('play')}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                      </button>

                      {/* -5s Rewind */}
                      <button
                        type="button"
                        onClick={() => seekBy(-5)}
                        className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 text-xs flex items-center gap-1 transition-colors"
                        title={t('form_rewind_5s')}
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-300" />
                        <span className="text-[10px] font-mono">-5s</span>
                      </button>

                      {/* +5s Forward */}
                      <button
                        type="button"
                        onClick={() => seekBy(5)}
                        className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 text-xs flex items-center gap-1 transition-colors"
                        title={t('form_forward_5s')}
                      >
                        <RotateCw className="w-3.5 h-3.5 text-slate-300" />
                        <span className="text-[10px] font-mono">+5s</span>
                      </button>

                      {/* Separator */}
                      <div className="w-px h-4 bg-slate-700/60 mx-1" />

                      {/* Step Frame Back (-1 frame) */}
                      <button
                        type="button"
                        onClick={() => stepFrame(-1)}
                        className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 text-xs flex items-center gap-1 transition-colors"
                        title={t('form_frame_back_tooltip')}
                      >
                        <ChevronLeft className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[10px] font-medium">{t('form_frame_back')}</span>
                      </button>

                      {/* Step Frame Forward (+1 frame) */}
                      <button
                        type="button"
                        onClick={() => stepFrame(1)}
                        className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 text-xs flex items-center gap-1 transition-colors"
                        title={t('form_frame_forward_tooltip')}
                      >
                        <span className="text-[10px] font-medium">{t('form_frame_forward')}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
                      </button>
                    </div>

                    {/* Frame Counter Indicator */}
                    <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
                      {Math.floor(currentTime * 30)} f
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">{t('field_title')}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('form_title_placeholder')}
                className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Rating (Moved under Title) */}
            <div className="md:col-span-2 flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-sm text-slate-300 font-medium">{t('form_rating_label')}</span>
              <RatingStars rating={rating} onChange={setRating} size="lg" />
            </div>

            {/* Dynamic Field Ordering */}
            {(() => {
              const order = settings?.field_order || DEFAULT_FIELD_ORDER;

              return order.map((fieldId) => {
                if (fieldId === 'title' || fieldId === 'rating') return null;

                if (fieldId === 'genre') {
                  return (
                    <div key="genre">
                      <label className="text-xs text-slate-400 mb-1 block">{t('field_genre')}</label>
                      <input
                        type="text"
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        placeholder={t('form_genre_placeholder')}
                        className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  );
                }

                if (fieldId === 'cast') {
                  return (
                    <React.Fragment key="cast">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">{t('field_cast')}</label>
                        <input
                          type="text"
                          value={cast}
                          onChange={(e) => setCast(e.target.value)}
                          placeholder={t('form_cast_placeholder')}
                          className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      {showKana && (
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">{t('field_cast_kana')}</label>
                          <input
                            type="text"
                            value={castKana}
                            onChange={(e) => setCastKana(e.target.value)}
                            placeholder={t('form_cast_kana_placeholder')}
                            className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      )}
                    </React.Fragment>
                  );
                }

                if (fieldId === 'release_year') {
                  return (
                    <div key="release_year">
                      <label className="text-xs text-slate-400 mb-1 block">{t('form_release_year_label')}</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={releaseYear}
                        onChange={(e) => handleReleaseYearChange(e.target.value)}
                        onBlur={handleReleaseYearBlur}
                        placeholder={t('form_release_year_placeholder')}
                        className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  );
                }

                if (fieldId === 'release_date') {
                  return (
                    <div key="release_date">
                      <label className="text-xs text-slate-400 mb-1 block">{t('form_release_date_label')}</label>
                      <input
                        type="text"
                        value={releaseDate}
                        onChange={(e) => setReleaseDate(e.target.value)}
                        placeholder={t('form_release_date_placeholder')}
                        className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  );
                }

                if (fieldId.startsWith('custom_field_')) {
                  const num = fieldId.replace('custom_field_', '');
                  const customName = (settings as any)?.[`custom_field_${num}_name`];
                  if (!customName) return null;

                  const val = num === '1' ? custom1 : num === '2' ? custom2 : custom3;
                  const setVal = num === '1' ? setCustom1 : num === '2' ? setCustom2 : setCustom3;

                  return (
                    <div key={fieldId}>
                      <label className="text-xs text-slate-400 mb-1 block">{customName}</label>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => setVal(e.target.value)}
                        className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  );
                }

                return null;
              });
            })()}

            {/* Comment */}
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">{t('field_comment')}</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder={t('form_comment_placeholder')}
                className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Tags (Moved under Comment) */}
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">{t('field_tags')}</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder={t('form_tags_placeholder')}
                className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Grouping Option (Moved under Tag) */}
            <div className="md:col-span-2 flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-slate-200 block">{t('form_grouping_label')}</span>
                <span className="text-xs text-slate-400 block">
                  {t('form_grouping_desc', { keyFields: getKeyFieldsLabel() })}
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleGrouping}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${isGrouped
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
              >
                {isGrouped ? t('on') : t('off')}
              </button>
            </div>
          </div>
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
              className="px-5 py-2.5 rounded-xl border border-slate-700 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              {t('cancel')}
            </button>

            <button
              type="button"
              disabled={isCapturing}
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isCapturing ? t('saving') : t('save')}</span>
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title={t('delete')}
        description={t('confirmDelete')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        variant="danger"
        onConfirm={executeDelete}
        onClose={() => setShowDeleteConfirm(false)}
      />

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
