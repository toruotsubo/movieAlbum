'use client';

import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { formatMediaUrl, isUnsupportedInlinePlayback } from '../../lib/utils';
import { clsx } from 'clsx';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Camera,
  Film,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../AppProvider';

export interface VideoThumbnailPlayerHandle {
  captureFrame: () => Promise<string | null>;
  getCurrentTime: () => number;
}

interface VideoThumbnailPlayerProps {
  filePath?: string | null;
  summaryImagePath: string | null;
  capturedTime: number | null;
  presetDuration?: number | null;
  onSummaryImageChange: (imagePath: string | null, capturedTime: number | null) => void;
  onMetadataExtracted?: (meta: { duration?: number; width?: number; height?: number }) => void;
  onErrorModal: (title: string, description: string) => void;
}

export const VideoThumbnailPlayer = forwardRef<VideoThumbnailPlayerHandle, VideoThumbnailPlayerProps>(
  (
    {
      filePath,
      summaryImagePath,
      capturedTime,
      presetDuration,
      onSummaryImageChange,
      onMetadataExtracted,
      onErrorModal,
    },
    ref
  ) => {
    const { t, openMoviePlayer } = useApp();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [isPlayingVideo, setIsPlayingVideo] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(presetDuration || 0);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isAutoGeneratingSummary, setIsAutoGeneratingSummary] = useState(false);
    const [videoError, setVideoError] = useState<string | null>(null);

    const isUnsupportedPlayback = isUnsupportedInlinePlayback(filePath);
    const videoSrc = formatMediaUrl(filePath, false);
    const imageSrc = formatMediaUrl(summaryImagePath);

    // Format seconds to mm:ss or hh:mm:ss
    const formatTime = (timeInSeconds: number) => {
      if (isNaN(timeInSeconds) || timeInSeconds < 0) return '00:00';
      const totalSecs = Math.floor(timeInSeconds);
      const hours = Math.floor(totalSecs / 3600);
      const minutes = Math.floor((totalSecs % 3600) / 60);
      const seconds = totalSecs % 60;
      const pad = (n: number) => n.toString().padStart(2, '0');
      return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
    };

    // Auto-generate summary thumbnail if none exists
    useEffect(() => {
      if (!summaryImagePath && filePath) {
        setIsAutoGeneratingSummary(true);
        generateDefaultSummary(filePath, duration || presetDuration)
          .then(({ imagePath, targetTime }) => {
            if (imagePath) {
              onSummaryImageChange(imagePath, targetTime);
            }
            setIsAutoGeneratingSummary(false);
          })
          .catch((err) => {
            console.error('Failed to generate auto summary image:', err);
            setIsAutoGeneratingSummary(false);
          });
      }
    }, [filePath, summaryImagePath]);

    const generateDefaultSummary = (
      path: string,
      dur?: number | null
    ): Promise<{ imagePath: string | null; targetTime: number }> => {
      return new Promise(async (resolve) => {
        if (typeof window === 'undefined') {
          resolve({ imagePath: null, targetTime: 0 });
          return;
        }

        // HTML5 unsupported format -> FFmpeg direct extraction
        if (isUnsupportedPlayback && window.api?.generateThumbnail) {
          try {
            const res = await window.api.generateThumbnail(path, dur ? dur * 0.5 : null);
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
        video.src = formatMediaUrl(path, false);
        video.preload = 'metadata';
        video.muted = true;

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
          cleanup();
          if (window.api?.generateThumbnail) {
            try {
              const res = await window.api.generateThumbnail(path, (dur && dur > 0) ? dur * 0.5 : null);
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
          const vDur = video.duration && !isNaN(video.duration) && video.duration > 0 ? video.duration : dur || 0;
          const targetTime = vDur > 0 ? vDur * 0.5 : 0;

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
                    onErrorModal(t('error_title'), t('error_save_summary_failed'));
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

        video.onerror = async () => {
          cleanup();
          if (window.api?.generateThumbnail) {
            try {
              const res = await window.api.generateThumbnail(path, (dur && dur > 0) ? dur * 0.5 : null);
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
            onSummaryImageChange(savedPath, video.currentTime);
            return savedPath;
          } catch (err) {
            console.error('Failed to save summary image:', err);
            onErrorModal(t('error_title'), t('error_save_summary_failed'));
            return null;
          }
        }
        onSummaryImageChange(dataUrl, video.currentTime);
        return dataUrl;
      } catch (err) {
        console.error('Failed to capture frame:', err);
        return null;
      }
    };

    // Expose capture methods to parent via ref
    useImperativeHandle(ref, () => ({
      captureFrame,
      getCurrentTime: () => (videoRef.current ? videoRef.current.currentTime : currentTime),
    }));

    const togglePlay = async () => {
      if (!videoRef.current) return;
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          await videoRef.current.play();
          setIsPlaying(true);
        } catch (err) {
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

    return (
      <div className="space-y-2">
        <canvas ref={canvasRef} className="hidden" />

        <div className="relative w-full aspect-video max-w-[720px] mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl group">
          {!isPlayingVideo ? (
            <button
              type="button"
              disabled={isUnsupportedPlayback}
              onClick={async () => {
                if (isUnsupportedPlayback) return;
                if (filePath && window.api?.checkFileExists) {
                  const exists = await window.api.checkFileExists(filePath);
                  if (!exists) {
                    onErrorModal(t('error_title'), t('error_file_not_found'));
                    return;
                  }
                }
                setIsPlayingVideo(true);
              }}
              className={clsx(
                'w-full h-full relative flex items-center justify-center group focus:outline-none',
                isUnsupportedPlayback ? 'cursor-not-allowed' : 'cursor-pointer'
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
                  {isUnsupportedPlayback ? (
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
                    {filePath && (
                      <button
                        type="button"
                        onClick={() => openMoviePlayer(filePath)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs text-white font-medium flex items-center gap-1.5 shadow-md"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{t('form_open_os_player')}</span>
                      </button>
                    )}
                    {filePath && window.api?.generateThumbnail && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.api?.checkFileExists) {
                            const exists = await window.api.checkFileExists(filePath);
                            if (!exists) {
                              onErrorModal(t('error_title'), t('error_file_not_found'));
                              return;
                            }
                          }

                          setIsAutoGeneratingSummary(true);
                          const res = await window.api.generateThumbnail(filePath);
                          if (res) {
                            onSummaryImageChange(res.imagePath, res.targetTime);
                            if (res.duration && !duration) setDuration(res.duration);
                          } else {
                            onErrorModal(t('error_title'), t('error_file_not_found'));
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
                  muted
                  className="w-full h-full object-contain"
                  onTimeUpdate={() => {
                    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                  }}
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      const vidDuration = videoRef.current.duration;
                      setDuration(vidDuration);
                      if (onMetadataExtracted) {
                        onMetadataExtracted({
                          duration: vidDuration,
                          width: videoRef.current.videoWidth,
                          height: videoRef.current.videoHeight,
                        });
                      }

                      let target = 0;
                      if (capturedTime !== null && capturedTime !== undefined && !isNaN(capturedTime) && capturedTime >= 0) {
                        target = Math.min(vidDuration, Math.max(0, capturedTime));
                      } else if (vidDuration && !isNaN(vidDuration) && vidDuration > 0) {
                        target = vidDuration * 0.5;
                      }

                      if (target > 0) {
                        videoRef.current.currentTime = target;
                        setCurrentTime(target);
                      }
                    }
                  }}
                  onError={(e) => {
                    const target = e.currentTarget as HTMLVideoElement;
                    const errorDetails = target.error
                      ? `Code: ${target.error.code}, Message: ${target.error.message}`
                      : 'Unknown video error';

                    if (isUnsupportedPlayback || errorDetails.includes('DEMUXER_ERROR')) {
                      setVideoError(`${t('form_unsupported_format_notice')} (${errorDetails})`);
                      if (!summaryImagePath && filePath && window.api?.generateThumbnail) {
                        window.api.generateThumbnail(filePath).then((res) => {
                          if (res) {
                            onSummaryImageChange(res.imagePath, res.targetTime);
                            if (res.duration && !duration) setDuration(res.duration);
                          }
                        }).catch(() => {});
                      }
                    } else {
                      setVideoError(t('error_video_load_failed', { error: errorDetails, path: filePath || '' }));
                    }
                  }}
                  onEnded={() => setIsPlaying(false)}
                />
              )}
            </div>
          )}

          {/* Player Controls Bar */}
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
                  onChange={(e) => seekTo(parseFloat(e.target.value))}
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
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  </button>

                  {/* Backward / Forward 5s */}
                  <button
                    type="button"
                    onClick={() => seekBy(-5)}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => seekBy(5)}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  {/* Step -1 / +1 frame */}
                  <button
                    type="button"
                    onClick={() => stepFrame(-1)}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => stepFrame(1)}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Capture & Close Player Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isCapturing}
                    onClick={async () => {
                      setIsCapturing(true);
                      await captureFrame();
                      setIsCapturing(false);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isCapturing ? t('form_capturing') : t('form_capture_btn')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlayingVideo(false);
                      setIsPlaying(false);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs transition-colors"
                  >
                    {t('form_close_player')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

VideoThumbnailPlayer.displayName = 'VideoThumbnailPlayer';
