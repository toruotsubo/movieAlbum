import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import {
  AppSettings,
  Movie,
  KeyItemGroup,
  CreateMovieInput,
  UpdateMovieInput,
  UpdateKeyItemInput,
  SaveSettingsInput,
  DEFAULT_APP_SETTINGS,
  DEFAULT_FIELD_ORDER,
  DatabaseInfo,
  DatabaseState,
} from '../../src/lib/types';
import { getSplitValues, getKanaForCast } from '../../src/lib/utils';

interface JsonDatabaseSchema {
  settings: AppSettings;
  movies: Movie[];
  keyRatings: Record<string, number>;
  keyTags: Record<string, string>;
}

export interface DatabaseMeta {
  id: string; // e.g. "db_00"
  name: string; // e.g. "設定ファイル_00"
  filename: string; // e.g. "db_00.json"
  created_at: string;
}

export interface DatabaseManifest {
  activeId: string;
  databases: DatabaseMeta[];
}

let jsonDb: JsonDatabaseSchema | null = null;
let currentDbId = '';
let currentDbFilePath = '';

function getDbDir(): string {
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'db');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  return dbDir;
}

function getManifestPath(): string {
  return path.join(getDbDir(), 'databases.json');
}

function loadManifest(): DatabaseManifest {
  const manifestPath = getManifestPath();
  const dbDir = getDbDir();

  if (fs.existsSync(manifestPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      if (data && Array.isArray(data.databases) && data.databases.length > 0) {
        return data as DatabaseManifest;
      }
    } catch (err) {
      console.error('Failed to parse databases.json, recreating manifest:', err);
    }
  }

  // Migrate from legacy single db (movie_manager.json) or create new default
  const legacyFilePath = path.join(dbDir, 'movie_manager.json');
  const initialId = 'db_00';
  const initialName = '設定ファイル_00';
  const initialFilename = 'db_00.json';
  const targetInitialPath = path.join(dbDir, initialFilename);

  if (fs.existsSync(legacyFilePath) && !fs.existsSync(targetInitialPath)) {
    try {
      fs.copyFileSync(legacyFilePath, targetInitialPath);
    } catch (e) {
      console.error('Failed to copy legacy movie_manager.json to db_00.json:', e);
    }
  }

  const manifest: DatabaseManifest = {
    activeId: initialId,
    databases: [
      {
        id: initialId,
        name: initialName,
        filename: initialFilename,
        created_at: new Date().toISOString(),
      },
    ],
  };

  saveManifest(manifest);
  return manifest;
}

function saveManifest(manifest: DatabaseManifest): void {
  const manifestPath = getManifestPath();
  const tmpPath = `${manifestPath}.tmp`;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2), 'utf-8');
    fs.renameSync(tmpPath, manifestPath);
  } catch (err) {
    console.error('Failed to save databases manifest:', err);
    try {
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    } catch (directErr) {
      console.error('Direct manifest write failed:', directErr);
    }
  }
}

function getNextDatabaseNumber(manifest: DatabaseManifest): string {
  const usedNumbers = new Set<number>();
  for (const db of manifest.databases) {
    const nameMatch = db.name.match(/設定ファイル_(\d+)/);
    if (nameMatch) {
      usedNumbers.add(parseInt(nameMatch[1], 10));
    }
    const idMatch = db.id.match(/db_(\d+)/);
    if (idMatch) {
      usedNumbers.add(parseInt(idMatch[1], 10));
    }
  }
  let nextNum = 0;
  while (usedNumbers.has(nextNum)) {
    nextNum++;
  }
  return String(nextNum).padStart(2, '0');
}

function loadDatabaseFile(filePath: string, defaultName: string): JsonDatabaseSchema {
  let loadedDb: JsonDatabaseSchema | null = null;
  if (fs.existsSync(filePath)) {
    try {
      loadedDb = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {
      console.error(`Failed to parse db file ${filePath}, attempting backup:`, err);
      const bakPath = `${filePath}.bak`;
      if (fs.existsSync(bakPath)) {
        try {
          loadedDb = JSON.parse(fs.readFileSync(bakPath, 'utf-8'));
          console.warn('Successfully recovered from backup:', bakPath);
        } catch (bakErr) {
          console.error('Failed to recover from backup:', bakErr);
        }
      }
    }
  }

  if (!loadedDb) {
    loadedDb = {
      settings: {
        ...DEFAULT_APP_SETTINGS,
        database_name: defaultName,
      },
      movies: [],
      keyRatings: {},
      keyTags: {},
    };
  }

  // Ensure default values
  if (!loadedDb.settings.database_name) {
    loadedDb.settings.database_name = defaultName;
  }
  if (!loadedDb.settings.field_order) {
    loadedDb.settings.field_order = [...DEFAULT_FIELD_ORDER];
  }
  if (!loadedDb.settings.key_fields || loadedDb.settings.key_fields.length === 0) {
    loadedDb.settings.key_fields = ['genre'];
  }
  if (!loadedDb.keyRatings) loadedDb.keyRatings = {};
  if (!loadedDb.keyTags) loadedDb.keyTags = {};

  return loadedDb;
}

export function initDatabase() {
  const manifest = loadManifest();
  let activeMeta = manifest.databases.find((d) => d.id === manifest.activeId);
  if (!activeMeta) {
    activeMeta = manifest.databases[0];
    manifest.activeId = activeMeta.id;
    saveManifest(manifest);
  }

  currentDbId = activeMeta.id;
  currentDbFilePath = path.join(getDbDir(), activeMeta.filename);
  jsonDb = loadDatabaseFile(currentDbFilePath, activeMeta.name);
  saveDatabase();

  console.log(`Database initialized: [${activeMeta.id}] ${activeMeta.name} at ${currentDbFilePath}`);
}

function saveDatabase() {
  if (jsonDb && currentDbFilePath) {
    const tmpFilePath = `${currentDbFilePath}.tmp`;
    const jsonStr = JSON.stringify(jsonDb, null, 2);
    try {
      fs.writeFileSync(tmpFilePath, jsonStr, 'utf-8');
      fs.renameSync(tmpFilePath, currentDbFilePath);

      try {
        fs.copyFileSync(currentDbFilePath, `${currentDbFilePath}.bak`);
      } catch {
        // Backup non-fatal
      }
    } catch (err) {
      console.error('Failed to save database atomically, falling back:', err);
      try {
        fs.writeFileSync(currentDbFilePath, jsonStr, 'utf-8');
      } catch (writeErr) {
        console.error('Direct database write failed:', writeErr);
      }
    }
  }
}

export function getDatabaseState(): DatabaseState {
  const manifest = loadManifest();
  return {
    databases: manifest.databases.map((d) => ({
      id: d.id,
      name: d.name,
    })),
    activeId: manifest.activeId,
  };
}

export function switchDatabase(id: string): { state: DatabaseState; settings: AppSettings } {
  const manifest = loadManifest();
  const targetMeta = manifest.databases.find((d) => d.id === id);
  if (!targetMeta) {
    throw new Error(`Database with id ${id} not found`);
  }

  // Save current database before switching
  saveDatabase();

  manifest.activeId = id;
  saveManifest(manifest);

  currentDbId = targetMeta.id;
  currentDbFilePath = path.join(getDbDir(), targetMeta.filename);
  jsonDb = loadDatabaseFile(currentDbFilePath, targetMeta.name);
  saveDatabase();

  return {
    state: getDatabaseState(),
    settings: jsonDb.settings,
  };
}

export function createDatabase(nameInput?: string): { state: DatabaseState; settings: AppSettings } {
  saveDatabase();

  const manifest = loadManifest();
  const numStr = getNextDatabaseNumber(manifest);
  const id = `db_${numStr}`;
  const name = nameInput?.trim() || `設定ファイル_${numStr}`;
  const filename = `${id}.json`;
  const filePath = path.join(getDbDir(), filename);

  const newDb: JsonDatabaseSchema = {
    settings: {
      ...DEFAULT_APP_SETTINGS,
      database_name: name,
    },
    movies: [],
    keyRatings: {},
    keyTags: {},
  };

  fs.writeFileSync(filePath, JSON.stringify(newDb, null, 2), 'utf-8');

  manifest.databases.push({
    id,
    name,
    filename,
    created_at: new Date().toISOString(),
  });
  manifest.activeId = id;
  saveManifest(manifest);

  currentDbId = id;
  currentDbFilePath = filePath;
  jsonDb = newDb;

  return {
    state: getDatabaseState(),
    settings: jsonDb.settings,
  };
}

export function deleteDatabase(id: string): { state: DatabaseState; settings: AppSettings } {
  const manifest = loadManifest();
  if (manifest.databases.length <= 1) {
    throw new Error('Cannot delete the only database');
  }

  const targetIdx = manifest.databases.findIndex((d) => d.id === id);
  if (targetIdx === -1) {
    throw new Error(`Database with id ${id} not found`);
  }

  const target = manifest.databases[targetIdx];
  const targetFilePath = path.join(getDbDir(), target.filename);
  const targetBakPath = `${targetFilePath}.bak`;

  try {
    if (fs.existsSync(targetFilePath)) fs.unlinkSync(targetFilePath);
    if (fs.existsSync(targetBakPath)) fs.unlinkSync(targetBakPath);
  } catch (err) {
    console.error('Failed to unlink db file during deletion:', err);
  }

  manifest.databases.splice(targetIdx, 1);
  // 要件: 現在選択中のデータベースファイルが消去され、最初のデータベースファイルが選択される
  const firstDb = manifest.databases[0];
  manifest.activeId = firstDb.id;
  saveManifest(manifest);

  currentDbId = firstDb.id;
  currentDbFilePath = path.join(getDbDir(), firstDb.filename);
  jsonDb = loadDatabaseFile(currentDbFilePath, firstDb.name);
  saveDatabase();

  return {
    state: getDatabaseState(),
    settings: jsonDb.settings,
  };
}

/**
 * Check if two movies have matching group attributes
 */
function isMatchingGroupAttributes(movieA: Movie, movieB: Movie, keyFields: string[]): boolean {
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
 * Synchronize grouping relationships for a movie
 */
function syncGroupingForMovie(movie: Movie): void {
  if (!jsonDb) return;
  const keyFields = jsonDb.settings.key_fields || ['genre'];

  if (movie.is_grouped) {
    for (const m of jsonDb.movies) {
      if (m.id === movie.id) continue;
      if (isMatchingGroupAttributes(movie, m, keyFields)) {
        m.parent_movie_id = movie.id;
        m.updated_at = new Date().toISOString();
      }
    }
  } else {
    for (const m of jsonDb.movies) {
      if (m.parent_movie_id === movie.id) {
        m.parent_movie_id = null;
        m.updated_at = new Date().toISOString();
      }
    }
  }
}

/**
 * Build combinations of key field values for a movie
 */
function buildKeyCombinations(movie: Movie, keyFields: string[]): Record<string, string>[] {
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
  return combinations;
}

// === Settings Helpers ===
export function getAppSettings(): AppSettings {
  if (!jsonDb) initDatabase();
  return jsonDb!.settings;
}

export function saveAppSettings(input: SaveSettingsInput): AppSettings {
  if (!jsonDb) initDatabase();

  const newDatabaseName = input.database_name !== undefined ? input.database_name.trim() : jsonDb!.settings.database_name;

  if (newDatabaseName) {
    const manifest = loadManifest();
    const currentMeta = manifest.databases.find((d) => d.id === currentDbId);
    if (currentMeta && currentMeta.name !== newDatabaseName) {
      currentMeta.name = newDatabaseName;
      saveManifest(manifest);
    }
  }

  jsonDb!.settings = {
    ...jsonDb!.settings,
    ...input,
    database_name: newDatabaseName,
    is_initialized: input.is_initialized !== undefined ? input.is_initialized : jsonDb!.settings.is_initialized,
    custom_field_1_display_in_list:
      input.custom_field_1_display_in_list !== undefined
        ? input.custom_field_1_display_in_list
        : jsonDb!.settings.custom_field_1_display_in_list !== false,
    custom_field_2_display_in_list:
      input.custom_field_2_display_in_list !== undefined
        ? input.custom_field_2_display_in_list
        : jsonDb!.settings.custom_field_2_display_in_list !== false,
    custom_field_3_display_in_list:
      input.custom_field_3_display_in_list !== undefined
        ? input.custom_field_3_display_in_list
        : jsonDb!.settings.custom_field_3_display_in_list !== false,
    key_fields: input.key_fields || jsonDb!.settings.key_fields,
    field_order: input.field_order || jsonDb!.settings.field_order || DEFAULT_FIELD_ORDER,
    language: input.language !== undefined ? input.language : jsonDb!.settings.language || 'auto',
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

  const maxId = jsonDb!.movies.reduce((max, m) => Math.max(max, m.id), 0);
  const newId = maxId + 1;

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
  syncGroupingForMovie(newMovie);
  saveDatabase();
  return newMovie;
}

export function updateMovie(movie: UpdateMovieInput): Movie {
  if (!jsonDb) initDatabase();
  const index = jsonDb!.movies.findIndex((m) => m.id === movie.id);
  if (index === -1) throw new Error(`Movie with id ${movie.id} not found.`);

  const updatedMovie: Movie = {
    ...jsonDb!.movies[index],
    ...movie,
    updated_at: new Date().toISOString(),
  };

  jsonDb!.movies[index] = updatedMovie;
  syncGroupingForMovie(updatedMovie);
  saveDatabase();
  return updatedMovie;
}

export function deleteMovie(id: number): boolean {
  if (!jsonDb) initDatabase();
  const index = jsonDb!.movies.findIndex((m) => m.id === id);
  if (index !== -1) {
    for (const m of jsonDb!.movies) {
      if (m.parent_movie_id === id) {
        m.parent_movie_id = null;
        m.updated_at = new Date().toISOString();
      }
    }

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
    const combinations = buildKeyCombinations(movie, keyFields);
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
      const combinations = buildKeyCombinations(movie, keyFields);
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

  const currentDbName = jsonDb!.settings.database_name || '設定ファイル_00';

  jsonDb = {
    settings: {
      ...DEFAULT_APP_SETTINGS,
      database_name: currentDbName,
    },
    movies: [],
    keyRatings: {},
    keyTags: {},
  };

  saveDatabase();
  return jsonDb.settings;
}
