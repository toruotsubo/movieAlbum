export function formatMediaUrl(
  filePath: string | null | undefined,
  cacheBust: boolean = true
): string {
  if (!filePath) return '';
  if (filePath.startsWith('data:') || filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }

  // Remove existing media:// prefix and query params if any
  let cleanPath = filePath.replace(/^media:\/\/(local\/)?/, '').split('?')[0].split('#')[0];

  // Convert Windows backslashes \ to /
  let normalized = cleanPath.replace(/\\/g, '/');

  // Ensure Windows drive letter starts with / e.g. /F:/path/to/file
  if (/^[a-zA-Z]:/.test(normalized)) {
    normalized = '/' + normalized;
  }

  const segments = normalized.split('/');
  const encodedSegments = segments.map((seg) => {
    // Preserve Windows drive letter colon e.g. F:
    if (/^[a-zA-Z]:$/.test(seg)) {
      return seg;
    }
    return encodeURIComponent(seg);
  });

  // Use media://local/... format to prevent Chromium from stripping drive letter colons
  const url = `media://local${encodedSegments.join('/')}`;

  if (cacheBust) {
    return `${url}?v=${Date.now()}`;
  }

  return url;
}

export function getSplitValues(val: any): string[] {
  if (val === null || val === undefined || val === '') {
    return ['-'];
  }
  const str = String(val);
  const parts = Array.from(
    new Set(
      str
        .split(/[,|、|，]/)
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
  return parts.length > 0 ? parts : ['-'];
}

export function formatReleaseDate(year?: number | null, dateStr?: string | null, language: string = 'ja'): string {
  if (!year && !dateStr) return '-';

  const isEn = language === 'en';
  let yearPart = '';
  if (year) {
    yearPart = isEn ? `${year}` : `${year}年`;
  }

  let datePart = '';
  if (dateStr) {
    const trimmed = dateStr.trim();
    const match = trimmed.match(/^(\d{1,2})[-/](\d{1,2})$/);
    if (match) {
      const month = match[1].padStart(2, '0');
      const day = match[2].padStart(2, '0');
      datePart = isEn ? `${month}/${day}` : `${month}月${day}日`;
    } else {
      datePart = trimmed;
    }
  }

  if (yearPart && datePart) {
    return isEn ? `${yearPart}-${datePart}` : `${yearPart}${datePart}`;
  }

  return yearPart || datePart || '-';
}

export function getKanaForCast(
  cast: string | null | undefined,
  castKana: string | null | undefined,
  targetCastVal: string
): string | null {
  if (!cast || !castKana) return null;

  const castSplits = cast.split(/[,|、|，]/).map((s) => s.trim()).filter(Boolean);
  const kanaSplits = castKana.split(/[,|、|，]/).map((s) => s.trim()).filter(Boolean);

  if (castSplits.length === 0 || kanaSplits.length === 0) return null;

  const idx = castSplits.findIndex((c) => c === targetCastVal.trim());
  if (idx !== -1) {
    if (idx < kanaSplits.length) {
      return kanaSplits[idx];
    } else {
      // 登場の数に登場ふりがなが足りないときは、直前のふりがな（末尾のふりがな）を使う
      return kanaSplits[kanaSplits.length - 1];
    }
  }

  return null;
}

export const INLINE_PLAYBACK_EXTENSIONS = new Set(['mp4', 'm4v', 'webm', 'ogv', 'ogg']);

export const VIDEO_EXTENSIONS = new Set([
  'mp4', 'm4v', 'mkv', 'avi', 'wmv', 'mov', 'flv', 'webm',
  'mpg', 'mpeg', 'm2v', '3gp', '3g2', 'ts', 'mts', 'm2ts',
  'vob', 'ogv', 'ogg', 'rm', 'rmvb', 'asf', 'divx', 'f4v'
]);

export function isVideoFile(fileNameOrPath: string | null | undefined, mimeType?: string): boolean {
  if (mimeType && mimeType.startsWith('video/')) {
    return true;
  }
  if (!fileNameOrPath) return false;
  const ext = fileNameOrPath.split('.').pop()?.toLowerCase() || '';
  return VIDEO_EXTENSIONS.has(ext);
}

export function isUnsupportedInlinePlayback(filePath: string | null | undefined): boolean {
  if (!filePath) return false;
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return !INLINE_PLAYBACK_EXTENSIONS.has(ext);
}


