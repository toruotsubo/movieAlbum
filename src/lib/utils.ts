import { Movie, AppSettings, ALL_BASE_FIELDS, KeyItemGroup } from './types';

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
      // 名前の数に名前ふりがなが足りないときは、直前のふりがな（末尾のふりがな）を使う
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

/**
 * Split an 8-digit numeric string (YYYYMMDD) into year (number) and date (MM-DD)
 */
export function split8DigitYear(
  yearVal: number | string | null | undefined
): { year: number; date: string } | null {
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
}

/**
 * Get display label for a key field ID with translation fallback
 */
export function getKeyFieldLabel(
  keyId: string,
  settings: AppSettings | null,
  tFunc: (k: any) => string
): string {
  if (keyId === 'title') return tFunc('field_title');
  if (keyId === 'genre') return tFunc('field_genre');
  if (keyId === 'cast') return tFunc('field_cast');
  if (keyId === 'release_year') return tFunc('field_release_year');
  if (keyId === 'release_date') return tFunc('field_release_date');
  if (keyId === 'rating') return tFunc('field_rating');

  if (keyId === 'custom_field_1') return settings?.custom_field_1_name || tFunc('field_custom_1_default');
  if (keyId === 'custom_field_2') return settings?.custom_field_2_name || tFunc('field_custom_2_default');
  if (keyId === 'custom_field_3') return settings?.custom_field_3_name || tFunc('field_custom_3_default');

  const base = ALL_BASE_FIELDS.find((f) => f.id === keyId);
  return base ? tFunc(`field_${base.id}` as any) : tFunc('field_key_item');
}

/**
 * Check if two movies share identical attributes for grouping
 */
export function isMatchingGroupMovie(
  movieA: Movie,
  movieB: Movie,
  keyFields: string[]
): boolean {
  if ((movieA.title || null) !== (movieB.title || null)) return false;
  if ((movieA.genre || null) !== (movieB.genre || null)) return false;
  if ((movieA.release_year || null) !== (movieB.release_year || null)) return false;
  if ((movieA.release_date || null) !== (movieB.release_date || null)) return false;

  for (const kf of keyFields) {
    if (((movieA as any)[kf] || null) !== ((movieB as any)[kf] || null)) return false;
  }
  return true;
}

/**
 * Get all movies belonging to the same group as targetMovie
 */
export function getGroupMatches(
  targetMovie: Movie,
  allMovies: Movie[],
  keyFields: string[]
): Movie[] {
  const parentId = targetMovie.parent_movie_id || (targetMovie.is_grouped ? targetMovie.id : null);

  const matches = allMovies.filter((m) => {
    // 1. Check parent-child relationships
    if (parentId && (m.id === parentId || m.parent_movie_id === parentId)) {
      return true;
    }
    if (m.parent_movie_id === targetMovie.id || targetMovie.parent_movie_id === m.id) {
      return true;
    }

    // 2. Check matching attributes if both have grouping enabled
    if (targetMovie.is_grouped && m.is_grouped) {
      return isMatchingGroupMovie(targetMovie, m, keyFields);
    }

    return false;
  });

  return Array.from(new Map(matches.map((m) => [m.id, m])).values());
}

/**
 * Find initial kana for the cast in a key item group
 */
export function findInitialCastKana(
  group: KeyItemGroup | null,
  movies: Movie[]
): string {
  if (!group) return '';
  const targetCastVal = group.key_values['cast'];
  if (!targetCastVal) return '';

  for (const m of movies) {
    if (m.cast && m.cast_kana) {
      const kana = getKanaForCast(m.cast, m.cast_kana, targetCastVal);
      if (kana) return kana;
    }
  }
  return '';
}




