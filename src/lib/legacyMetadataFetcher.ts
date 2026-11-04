import { Movie } from './types';
import { extractMetadataFromUrl } from './metadataExtractor';
import { formatMediaUrl } from './utils';

const timelineAttemptedKeys = new Set<string>();

/**
 * 登録済み動画データの詳細画面表示時に、メタデータ（duration, width, height, frame_rate, file_size）
 * および8時点まとめ画像（timeline_image_path）の有無を確認し、
 * 不足している場合は自動取得・生成して DB と State を更新します。
 */
export async function ensureLegacyMovieMetadata(
  movie: Movie,
  onUpdate: (updatedMovie: Movie) => void
): Promise<void> {
  if (!movie || !movie.file_path) return;

  const hasDuration = movie.duration != null && movie.duration > 0;
  const hasResolution = movie.width != null && movie.height != null && movie.width > 0 && movie.height > 0;
  const hasFrameRate = movie.frame_rate != null && movie.frame_rate > 0;
  const hasFileSize = movie.file_size != null && movie.file_size > 0;
  const hasTimelineImage = Boolean(movie.timeline_image_path);

  const needsMetadata = !(hasDuration && hasResolution && hasFrameRate && hasFileSize);
  const timelineKey = `${movie.id}:${movie.file_path}`;
  const needsTimeline = !hasTimelineImage && !timelineAttemptedKeys.has(timelineKey);

  if (!needsMetadata && !needsTimeline) {
    return;
  }

  try {
    let fileSize = movie.file_size ?? null;
    let duration = movie.duration ?? null;
    let width = movie.width ?? null;
    let height = movie.height ?? null;
    let frameRate = movie.frame_rate ?? null;
    let timelineImagePath = movie.timeline_image_path ?? null;

    if (needsMetadata) {
      // 1. Electron IPC 経由でネイティブ解析 & ファイルサイズ取得
      if (window.api?.extractMetadata) {
        const nativeMeta = await window.api.extractMetadata(movie.file_path);
        if (nativeMeta) {
          if (fileSize == null) fileSize = nativeMeta.file_size;
          if (duration == null) duration = nativeMeta.duration;
          if (width == null) width = nativeMeta.width;
          if (height == null) height = nativeMeta.height;
          if (frameRate == null) frameRate = nativeMeta.frame_rate;
        }
      }

      // 2. ブラウザ経由 (HTML5 Video Element) フォールバック取得
      if (duration == null || width == null || height == null) {
        const mediaUrl = formatMediaUrl(movie.file_path, false);
        if (mediaUrl) {
          const browserMeta = await extractMetadataFromUrl(mediaUrl);
          if (duration == null && browserMeta.duration) duration = browserMeta.duration;
          if (width == null && browserMeta.width) width = browserMeta.width;
          if (height == null && browserMeta.height) height = browserMeta.height;
        }
      }
    }

    // 3. 8時点スクリーンショットまとめ画像の自動生成
    if (needsTimeline && window.api?.generateTimelineThumbnail) {
      timelineAttemptedKeys.add(timelineKey);
      const timelineRes = await window.api.generateTimelineThumbnail(
        movie.file_path,
        duration,
        width,
        height
      );
      if (timelineRes?.imagePath) {
        timelineImagePath = timelineRes.imagePath;
        if (duration == null && timelineRes.duration) duration = timelineRes.duration;
        if (width == null && timelineRes.width) width = timelineRes.width;
        if (height == null && timelineRes.height) height = timelineRes.height;
      }
    }

    // 差分があるかチェック
    const isChanged =
      fileSize !== movie.file_size ||
      duration !== movie.duration ||
      width !== movie.width ||
      height !== movie.height ||
      frameRate !== movie.frame_rate ||
      timelineImagePath !== movie.timeline_image_path;

    if (isChanged && window.api?.updateMovie) {
      const updated = await window.api.updateMovie({
        id: movie.id,
        file_size: fileSize,
        duration: duration,
        width: width,
        height: height,
        frame_rate: frameRate,
        timeline_image_path: timelineImagePath,
      });
      onUpdate(updated);
    }
  } catch (err) {
    console.error('Failed to backfill legacy movie metadata or timeline image:', err);
  }
}
