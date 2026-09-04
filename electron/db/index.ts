import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { AppSettings, Movie, KeyItemGroup, CreateMovieInput, UpdateMovieInput, UpdateKeyItemInput, DEFAULT_FIELD_ORDER } from '../../src/lib/types';
import { getSplitValues, getKanaForCast } from '../../src/lib/utils';

interface JsonDatabaseSchema {
  settings: AppSettings;
  movies: Movie[];
  keyRatings: Record<string, number>;
  keyTags: Record<string, string>;
}

let jsonDb: JsonDatabaseSchema | null = null;
let dbFilePath = '';

export function initDatabase() {
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'db');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbFilePath = path.join(dbDir, 'movie_manager.json');

  if (fs.existsSync(dbFilePath)) {
    try {
      jsonDb = JSON.parse(fs.readFileSync(dbFilePath, 'utf-8'));
    } catch (err) {
      console.error('Failed to parse database file, resetting:', err);
      jsonDb = null;
    }
  }

  if (!jsonDb) {
    jsonDb = {
      settings: {
        id: 1,
        is_initialized: false,
        custom_field_1_name: null,
        custom_field_2_name: null,
        custom_field_3_name: null,
        custom_field_1_display_in_list: true,
        custom_field_2_display_in_list: true,
        custom_field_3_display_in_list: true,
        key_fields: ['genre', 'cast'],
        field_order: DEFAULT_FIELD_ORDER,
        language: 'auto',
      },
      movies: [],
      keyRatings: {},
      keyTags: {},
    };
    saveDatabase();
  }

  console.log('Database initialized successfully at:', dbFilePath);
}

function saveDatabase() {
  if (jsonDb && dbFilePath) {
    fs.writeFileSync(dbFilePath, JSON.stringify(jsonDb, null, 2), 'utf-8');
  }
}

// === Settings Helpers ===
export function getAppSettings(): AppSettings {
  if (!jsonDb) initDatabase();
  return jsonDb!.settings;
}

export function saveAppSettings(input: {
  is_initialized?: boolean;
  custom_field_1_name?: string | null;
  custom_field_2_name?: string | null;
  custom_field_3_name?: string | null;
  custom_field_1_display_in_list?: boolean;
  custom_field_2_display_in_list?: boolean;
  custom_field_3_display_in_list?: boolean;
  key_fields?: string[];
  field_order?: string[];
  language?: 'auto' | 'ja' | 'en' | null;
}): AppSettings {
  if (!jsonDb) initDatabase();
  jsonDb!.settings = {
    ...jsonDb!.settings,
    ...input,
    is_initialized: input.is_initialized !== undefined ? input.is_initialized : jsonDb!.settings.is_initialized,
    custom_field_1_display_in_list: input.custom_field_1_display_in_list !== undefined ? input.custom_field_1_display_in_list : (jsonDb!.settings.custom_field_1_display_in_list !== false),
    custom_field_2_display_in_list: input.custom_field_2_display_in_list !== undefined ? input.custom_field_2_display_in_list : (jsonDb!.settings.custom_field_2_display_in_list !== false),
    custom_field_3_display_in_list: input.custom_field_3_display_in_list !== undefined ? input.custom_field_3_display_in_list : (jsonDb!.settings.custom_field_3_display_in_list !== false),
    key_fields: input.key_fields || jsonDb!.settings.key_fields,
    field_order: input.field_order || jsonDb!.settings.field_order || DEFAULT_FIELD_ORDER,
    language: input.language !== undefined ? input.language : (jsonDb!.settings.language || 'auto'),
  };
  saveDatabase();
  return jsonDb!.settings;
}

// === Movies Helpers ===
export function getAllMovies(): Movie[] {
  if (!jsonDb) initDatabase();
  return [...jsonDb!.movies].sort((a, b) => b.id - a.id);
}

export function getMovieById(id: number): Movie | null {
  if (!jsonDb) initDatabase();
  return jsonDb!.movies.find((m) => m.id === id) || null;
}

export function getMovieByFilePath(filePath: string): Movie | null {
  if (!jsonDb) initDatabase();
  return jsonDb!.movies.find((m) => m.file_path === filePath) || null;
}

export function addMovie(movie: CreateMovieInput): Movie {
  if (!jsonDb) initDatabase();
  const existing = getMovieByFilePath(movie.file_path);
  if (existing) {
    return updateMovie({ ...movie, id: existing.id });
  }

  const newId = jsonDb!.movies.length > 0 ? Math.max(...jsonDb!.movies.map((m) => m.id)) + 1 : 1;
  const newMovie: Movie = {
    id: newId,
    file_path: movie.file_path,
    file_name: movie.file_name,
    summary_image_path: movie.summary_image_path || null,
    title: movie.title || null,
    genre: movie.genre || null,
    cast: movie.cast || null,
    cast_kana: movie.cast_kana || null,
    release_year: movie.release_year || null,
    release_date: movie.release_date || null,
    rating: movie.rating !== undefined ? movie.rating : 3,
    comment: movie.comment || null,
    tags: movie.tags || null,
    custom_field_1: movie.custom_field_1 || null,
    custom_field_2: movie.custom_field_2 || null,
    custom_field_3: movie.custom_field_3 || null,
    duration: movie.duration || null,
    captured_time: movie.captured_time !== undefined ? movie.captured_time : null,
    width: movie.width !== undefined ? movie.width : null,
    height: movie.height !== undefined ? movie.height : null,
    frame_rate: movie.frame_rate !== undefined ? movie.frame_rate : null,
    file_size: movie.file_size !== undefined ? movie.file_size : null,
    is_grouped: movie.is_grouped !== undefined ? movie.is_grouped : false,
    parent_movie_id: movie.parent_movie_id !== undefined ? movie.parent_movie_id : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  jsonDb!.movies.push(newMovie);
  saveDatabase();
  return newMovie;
}

export function updateMovie(movie: UpdateMovieInput): Movie {
  if (!jsonDb) initDatabase();
  const index = jsonDb!.movies.findIndex((m) => m.id === movie.id);
  if (index === -1) throw new Error(`Movie with id ${movie.id} not found.`);

  jsonDb!.movies[index] = {
    ...jsonDb!.movies[index],
    ...movie,
    updated_at: new Date().toISOString(),
  };

  saveDatabase();
  return jsonDb!.movies[index];
}

export function deleteMovie(id: number): boolean {
  if (!jsonDb) initDatabase();
  const index = jsonDb!.movies.findIndex((m) => m.id === id);
  if (index !== -1) {
    jsonDb!.movies.splice(index, 1);
    saveDatabase();
    return true;
  }
  return false;
}

export function updateMovieRating(id: number, rating: number): Movie {
  if (!jsonDb) initDatabase();
  const movie = jsonDb!.movies.find((m) => m.id === id);
  if (!movie) throw new Error(`Movie with id ${id} not found.`);

  movie.rating = rating;
  movie.updated_at = new Date().toISOString();
  saveDatabase();
  return movie;
}

// === Key Items Helpers ===
export function getKeyItemGroups(): KeyItemGroup[] {
  const settings = getAppSettings();
  const keyFields = settings.key_fields;
  const movies = getAllMovies();

  if (keyFields.length === 0) return [];

  const groupsMap = new Map<string, { keyValues: Record<string, string>; movies: Movie[] }>();

  for (const movie of movies) {
    let combinations: Record<string, string>[] = [{}];

    for (const kf of keyFields) {
      const values = getSplitValues((movie as any)[kf]);
      const nextCombinations: Record<string, string>[] = [];
      for (const comb of combinations) {
        for (const val of values) {
          nextCombinations.push({ ...comb, [kf]: val });
        }
      }
      combinations = nextCombinations;
    }

    for (const keyValues of combinations) {
      const signature = JSON.stringify(keyValues);
      if (!groupsMap.has(signature)) {
        groupsMap.set(signature, { keyValues, movies: [] });
      }
      groupsMap.get(signature)!.movies.push(movie);
    }
  }

  const result: KeyItemGroup[] = [];

  for (const [signature, group] of groupsMap.entries()) {
    // "サマリー画像は、項目に紐づいた動画のうち評価が高いもの1点を自動的に選択する。選択はキー項目一覧画面表示時に行われる。"
    const sortedMovies = [...group.movies].sort((a, b) => b.rating - a.rating);
    const topMovie = sortedMovies.find((m) => m.summary_image_path) || sortedMovies[0];

    const groupRating = jsonDb!.keyRatings[signature] !== undefined ? jsonDb!.keyRatings[signature] : 3;

    let sortKey = Object.values(group.keyValues).join(' / ');
    if (keyFields.includes('cast')) {
      const targetCastVal = group.keyValues['cast'];
      let foundKana = '';

      for (const movie of group.movies) {
        const kana = getKanaForCast(movie.cast, movie.cast_kana, targetCastVal);
        if (kana) {
          foundKana = kana;
          break;
        }
      }

      if (foundKana) {
        sortKey = foundKana;
      }
    }

    const tags = jsonDb!.keyTags && jsonDb!.keyTags[signature] ? jsonDb!.keyTags[signature] : null;

    result.push({
      key_signature: signature,
      key_values: group.keyValues,
      sort_key: sortKey,
      summary_image_path: topMovie ? topMovie.summary_image_path : null,
      rating: groupRating,
      movie_count: group.movies.length,
      tags: tags,
    });
  }

  return result;
}

export function updateKeyItemRating(key_signature: string, rating: number): void {
  if (!jsonDb) initDatabase();
  jsonDb!.keyRatings[key_signature] = rating;
  saveDatabase();
}

export function updateKeyItemDetails(input: UpdateKeyItemInput): void {
  if (!jsonDb) initDatabase();
  if (!jsonDb!.keyTags) jsonDb!.keyTags = {};
  if (!jsonDb!.keyRatings) jsonDb!.keyRatings = {};

  const { key_signature, cast_kana, tags, rating } = input;
  if (tags !== undefined) {
    jsonDb!.keyTags[key_signature] = tags || '';
  }
  if (rating !== undefined) {
    jsonDb!.keyRatings[key_signature] = rating;
  }

  if (cast_kana !== undefined) {
    const settings = getAppSettings();
    const keyFields = settings.key_fields;
    const movies = jsonDb!.movies;

    let targetCastVal: string | null = null;
    try {
      const parsedKeyValues = JSON.parse(key_signature);
      if (parsedKeyValues && typeof parsedKeyValues === 'object' && parsedKeyValues.cast) {
        targetCastVal = parsedKeyValues.cast;
      }
    } catch (e) {
      console.error('Failed to parse key_signature in updateKeyItemDetails:', e);
    }

    for (const movie of movies) {
      let combinations: Record<string, string>[] = [{}];
      for (const kf of keyFields) {
        const values = getSplitValues((movie as any)[kf]);
        const nextCombinations: Record<string, string>[] = [];
        for (const comb of combinations) {
          for (const val of values) {
            nextCombinations.push({ ...comb, [kf]: val });
          }
        }
        combinations = nextCombinations;
      }

      const isMatch = combinations.some((comb) => JSON.stringify(comb) === key_signature);
      if (isMatch) {
        if (targetCastVal && movie.cast) {
          const castSplits = movie.cast.split(/[,|、|，]/).map((s) => s.trim()).filter(Boolean);
          const kanaSplits = movie.cast_kana ? movie.cast_kana.split(/[,|、|，]/).map((s) => s.trim()).filter(Boolean) : [];
          const idx = castSplits.findIndex((c) => c === targetCastVal!.trim());

          if (idx !== -1) {
            const updatedKanaSplits = [...kanaSplits];
            while (updatedKanaSplits.length <= idx) {
              const lastKana = updatedKanaSplits.length > 0 ? updatedKanaSplits[updatedKanaSplits.length - 1] : '';
              updatedKanaSplits.push(lastKana);
            }
            updatedKanaSplits[idx] = cast_kana || '';
            movie.cast_kana = updatedKanaSplits.join(',');
          } else {
            movie.cast_kana = cast_kana;
          }
        } else {
          movie.cast_kana = cast_kana;
        }

        movie.updated_at = new Date().toISOString();
      }
    }
  }

  saveDatabase();
}

export function resetAllData(): AppSettings {
  if (!jsonDb) initDatabase();

  try {
    const userDataPath = app.getPath('userData');
    const thumbDir = path.join(userDataPath, 'thumbnails');
    if (fs.existsSync(thumbDir)) {
      fs.rmSync(thumbDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error('Failed to clear thumbnails directory:', err);
  }

  jsonDb = {
    settings: {
      id: 1,
      is_initialized: false,
      custom_field_1_name: null,
      custom_field_2_name: null,
      custom_field_3_name: null,
      custom_field_1_display_in_list: true,
      custom_field_2_display_in_list: true,
      custom_field_3_display_in_list: true,
      key_fields: ['genre'],
      field_order: DEFAULT_FIELD_ORDER,
      language: 'auto',
    },
    movies: [],
    keyRatings: {},
    keyTags: {},
  };

  saveDatabase();
  return jsonDb.settings;
}

