"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// electron/main.ts
var main_exports = {};
__export(main_exports, {
  generateThumbnailWithFFmpeg: () => generateThumbnailWithFFmpeg
});
module.exports = __toCommonJS(main_exports);
var import_electron3 = require("electron");
var import_path4 = __toESM(require("path"));
var import_fs4 = __toESM(require("fs"));
var import_url = __toESM(require("url"));
var import_stream = require("stream");
var import_child_process2 = require("child_process");

// electron/db/index.ts
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var import_electron = require("electron");

// src/lib/types.ts
var DEFAULT_APP_SETTINGS = {
  id: 1,
  is_initialized: false,
  custom_field_1_name: null,
  custom_field_2_name: null,
  custom_field_3_name: null,
  custom_field_1_display_in_list: true,
  custom_field_2_display_in_list: true,
  custom_field_3_display_in_list: true,
  key_fields: ["genre"],
  field_order: [
    "title",
    "rating",
    "genre",
    "cast",
    "release_year",
    "release_date",
    "custom_field_1",
    "custom_field_2",
    "custom_field_3"
  ],
  language: "auto",
  database_name: "\u8A2D\u5B9A\u30D5\u30A1\u30A4\u30EB_00"
};
var DEFAULT_FIELD_ORDER = [
  "title",
  "rating",
  "genre",
  "cast",
  "release_year",
  "release_date",
  "custom_field_1",
  "custom_field_2",
  "custom_field_3"
];

// src/lib/utils.ts
function getSplitValues(val) {
  if (val === null || val === void 0 || val === "") {
    return ["-"];
  }
  const str = String(val);
  const parts = Array.from(
    new Set(
      str.split(/[,|、|，]/).map((s) => s.trim()).filter(Boolean)
    )
  );
  return parts.length > 0 ? parts : ["-"];
}
function getKanaForCast(cast, castKana, targetCastVal) {
  if (!cast || !castKana) return null;
  const castSplits = cast.split(/[,|、|，]/).map((s) => s.trim()).filter(Boolean);
  const kanaSplits = castKana.split(/[,|、|，]/).map((s) => s.trim()).filter(Boolean);
  if (castSplits.length === 0 || kanaSplits.length === 0) return null;
  const idx = castSplits.findIndex((c) => c === targetCastVal.trim());
  if (idx !== -1) {
    if (idx < kanaSplits.length) {
      return kanaSplits[idx];
    } else {
      return kanaSplits[kanaSplits.length - 1];
    }
  }
  return null;
}

// electron/db/index.ts
var jsonDb = null;
var currentDbId = "";
var currentDbFilePath = "";
function getDbDir() {
  const userDataPath = import_electron.app.getPath("userData");
  const dbDir = import_path.default.join(userDataPath, "db");
  if (!import_fs.default.existsSync(dbDir)) {
    import_fs.default.mkdirSync(dbDir, { recursive: true });
  }
  return dbDir;
}
function getManifestPath() {
  return import_path.default.join(getDbDir(), "databases.json");
}
function loadManifest() {
  const manifestPath = getManifestPath();
  const dbDir = getDbDir();
  if (import_fs.default.existsSync(manifestPath)) {
    try {
      const data = JSON.parse(import_fs.default.readFileSync(manifestPath, "utf-8"));
      if (data && Array.isArray(data.databases) && data.databases.length > 0) {
        return data;
      }
    } catch (err) {
      console.error("Failed to parse databases.json, recreating manifest:", err);
    }
  }
  const legacyFilePath = import_path.default.join(dbDir, "movie_manager.json");
  const initialId = "db_00";
  const initialName = "\u8A2D\u5B9A\u30D5\u30A1\u30A4\u30EB_00";
  const initialFilename = "db_00.json";
  const targetInitialPath = import_path.default.join(dbDir, initialFilename);
  if (import_fs.default.existsSync(legacyFilePath) && !import_fs.default.existsSync(targetInitialPath)) {
    try {
      import_fs.default.copyFileSync(legacyFilePath, targetInitialPath);
    } catch (e) {
      console.error("Failed to copy legacy movie_manager.json to db_00.json:", e);
    }
  }
  const manifest = {
    activeId: initialId,
    databases: [
      {
        id: initialId,
        name: initialName,
        filename: initialFilename,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      }
    ]
  };
  saveManifest(manifest);
  return manifest;
}
function saveManifest(manifest) {
  const manifestPath = getManifestPath();
  const tmpPath = `${manifestPath}.tmp`;
  try {
    import_fs.default.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2), "utf-8");
    import_fs.default.renameSync(tmpPath, manifestPath);
  } catch (err) {
    console.error("Failed to save databases manifest:", err);
    try {
      import_fs.default.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
    } catch (directErr) {
      console.error("Direct manifest write failed:", directErr);
    }
  }
}
function getNextDatabaseNumber(manifest) {
  const usedNumbers = /* @__PURE__ */ new Set();
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
  return String(nextNum).padStart(2, "0");
}
function loadDatabaseFile(filePath, defaultName) {
  let loadedDb = null;
  if (import_fs.default.existsSync(filePath)) {
    try {
      loadedDb = JSON.parse(import_fs.default.readFileSync(filePath, "utf-8"));
    } catch (err) {
      console.error(`Failed to parse db file ${filePath}, attempting backup:`, err);
      const bakPath = `${filePath}.bak`;
      if (import_fs.default.existsSync(bakPath)) {
        try {
          loadedDb = JSON.parse(import_fs.default.readFileSync(bakPath, "utf-8"));
          console.warn("Successfully recovered from backup:", bakPath);
        } catch (bakErr) {
          console.error("Failed to recover from backup:", bakErr);
        }
      }
    }
  }
  if (!loadedDb) {
    loadedDb = {
      settings: {
        ...DEFAULT_APP_SETTINGS,
        database_name: defaultName
      },
      movies: [],
      keyRatings: {},
      keyTags: {}
    };
  }
  if (!loadedDb.settings.database_name) {
    loadedDb.settings.database_name = defaultName;
  }
  if (!loadedDb.settings.field_order) {
    loadedDb.settings.field_order = [...DEFAULT_FIELD_ORDER];
  }
  if (!loadedDb.settings.key_fields || loadedDb.settings.key_fields.length === 0) {
    loadedDb.settings.key_fields = ["genre"];
  }
  if (!loadedDb.keyRatings) loadedDb.keyRatings = {};
  if (!loadedDb.keyTags) loadedDb.keyTags = {};
  return loadedDb;
}
function initDatabase() {
  const manifest = loadManifest();
  let activeMeta = manifest.databases.find((d) => d.id === manifest.activeId);
  if (!activeMeta) {
    activeMeta = manifest.databases[0];
    manifest.activeId = activeMeta.id;
    saveManifest(manifest);
  }
  currentDbId = activeMeta.id;
  currentDbFilePath = import_path.default.join(getDbDir(), activeMeta.filename);
  jsonDb = loadDatabaseFile(currentDbFilePath, activeMeta.name);
  saveDatabase();
  console.log(`Database initialized: [${activeMeta.id}] ${activeMeta.name} at ${currentDbFilePath}`);
}
function saveDatabase() {
  if (jsonDb && currentDbFilePath) {
    const tmpFilePath = `${currentDbFilePath}.tmp`;
    const jsonStr = JSON.stringify(jsonDb, null, 2);
    try {
      import_fs.default.writeFileSync(tmpFilePath, jsonStr, "utf-8");
      import_fs.default.renameSync(tmpFilePath, currentDbFilePath);
      try {
        import_fs.default.copyFileSync(currentDbFilePath, `${currentDbFilePath}.bak`);
      } catch {
      }
    } catch (err) {
      console.error("Failed to save database atomically, falling back:", err);
      try {
        import_fs.default.writeFileSync(currentDbFilePath, jsonStr, "utf-8");
      } catch (writeErr) {
        console.error("Direct database write failed:", writeErr);
      }
    }
  }
}
function getDatabaseState() {
  const manifest = loadManifest();
  return {
    databases: manifest.databases.map((d) => ({
      id: d.id,
      name: d.name
    })),
    activeId: manifest.activeId
  };
}
function switchDatabase(id) {
  const manifest = loadManifest();
  const targetMeta = manifest.databases.find((d) => d.id === id);
  if (!targetMeta) {
    throw new Error(`Database with id ${id} not found`);
  }
  saveDatabase();
  manifest.activeId = id;
  saveManifest(manifest);
  currentDbId = targetMeta.id;
  currentDbFilePath = import_path.default.join(getDbDir(), targetMeta.filename);
  jsonDb = loadDatabaseFile(currentDbFilePath, targetMeta.name);
  saveDatabase();
  return {
    state: getDatabaseState(),
    settings: jsonDb.settings
  };
}
function createDatabase(nameInput) {
  saveDatabase();
  const manifest = loadManifest();
  const numStr = getNextDatabaseNumber(manifest);
  const id = `db_${numStr}`;
  const name = nameInput?.trim() || `\u8A2D\u5B9A\u30D5\u30A1\u30A4\u30EB_${numStr}`;
  const filename = `${id}.json`;
  const filePath = import_path.default.join(getDbDir(), filename);
  const newDb = {
    settings: {
      ...DEFAULT_APP_SETTINGS,
      database_name: name
    },
    movies: [],
    keyRatings: {},
    keyTags: {}
  };
  import_fs.default.writeFileSync(filePath, JSON.stringify(newDb, null, 2), "utf-8");
  manifest.databases.push({
    id,
    name,
    filename,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  manifest.activeId = id;
  saveManifest(manifest);
  currentDbId = id;
  currentDbFilePath = filePath;
  jsonDb = newDb;
  return {
    state: getDatabaseState(),
    settings: jsonDb.settings
  };
}
function deleteDatabase(id) {
  const manifest = loadManifest();
  if (manifest.databases.length <= 1) {
    throw new Error("Cannot delete the only database");
  }
  const targetIdx = manifest.databases.findIndex((d) => d.id === id);
  if (targetIdx === -1) {
    throw new Error(`Database with id ${id} not found`);
  }
  const target = manifest.databases[targetIdx];
  const targetFilePath = import_path.default.join(getDbDir(), target.filename);
  const targetBakPath = `${targetFilePath}.bak`;
  try {
    if (import_fs.default.existsSync(targetFilePath)) import_fs.default.unlinkSync(targetFilePath);
    if (import_fs.default.existsSync(targetBakPath)) import_fs.default.unlinkSync(targetBakPath);
  } catch (err) {
    console.error("Failed to unlink db file during deletion:", err);
  }
  manifest.databases.splice(targetIdx, 1);
  const firstDb = manifest.databases[0];
  manifest.activeId = firstDb.id;
  saveManifest(manifest);
  currentDbId = firstDb.id;
  currentDbFilePath = import_path.default.join(getDbDir(), firstDb.filename);
  jsonDb = loadDatabaseFile(currentDbFilePath, firstDb.name);
  saveDatabase();
  return {
    state: getDatabaseState(),
    settings: jsonDb.settings
  };
}
function isMatchingGroupAttributes(movieA, movieB, keyFields) {
  if ((movieA.title || null) !== (movieB.title || null)) return false;
  if ((movieA.genre || null) !== (movieB.genre || null)) return false;
  if ((movieA.release_year || null) !== (movieB.release_year || null)) return false;
  if ((movieA.release_date || null) !== (movieB.release_date || null)) return false;
  for (const kf of keyFields) {
    if ((movieA[kf] || null) !== (movieB[kf] || null)) return false;
  }
  return true;
}
function syncGroupingForMovie(movie) {
  if (!jsonDb) return;
  const keyFields = jsonDb.settings.key_fields || ["genre"];
  if (movie.is_grouped) {
    for (const m of jsonDb.movies) {
      if (m.id === movie.id) continue;
      if (isMatchingGroupAttributes(movie, m, keyFields)) {
        m.parent_movie_id = movie.id;
        m.updated_at = (/* @__PURE__ */ new Date()).toISOString();
      }
    }
  } else {
    for (const m of jsonDb.movies) {
      if (m.parent_movie_id === movie.id) {
        m.parent_movie_id = null;
        m.updated_at = (/* @__PURE__ */ new Date()).toISOString();
      }
    }
  }
}
function buildKeyCombinations(movie, keyFields) {
  let combinations = [{}];
  for (const kf of keyFields) {
    const values = getSplitValues(movie[kf]);
    const nextCombinations = [];
    for (const comb of combinations) {
      for (const val of values) {
        nextCombinations.push({ ...comb, [kf]: val });
      }
    }
    combinations = nextCombinations;
  }
  return combinations;
}
function getAppSettings() {
  if (!jsonDb) initDatabase();
  return jsonDb.settings;
}
function saveAppSettings(input) {
  if (!jsonDb) initDatabase();
  const newDatabaseName = input.database_name !== void 0 ? input.database_name.trim() : jsonDb.settings.database_name;
  if (newDatabaseName) {
    const manifest = loadManifest();
    const currentMeta = manifest.databases.find((d) => d.id === currentDbId);
    if (currentMeta && currentMeta.name !== newDatabaseName) {
      currentMeta.name = newDatabaseName;
      saveManifest(manifest);
    }
  }
  jsonDb.settings = {
    ...jsonDb.settings,
    ...input,
    database_name: newDatabaseName,
    is_initialized: input.is_initialized !== void 0 ? input.is_initialized : jsonDb.settings.is_initialized,
    custom_field_1_display_in_list: input.custom_field_1_display_in_list !== void 0 ? input.custom_field_1_display_in_list : jsonDb.settings.custom_field_1_display_in_list !== false,
    custom_field_2_display_in_list: input.custom_field_2_display_in_list !== void 0 ? input.custom_field_2_display_in_list : jsonDb.settings.custom_field_2_display_in_list !== false,
    custom_field_3_display_in_list: input.custom_field_3_display_in_list !== void 0 ? input.custom_field_3_display_in_list : jsonDb.settings.custom_field_3_display_in_list !== false,
    key_fields: input.key_fields || jsonDb.settings.key_fields,
    field_order: input.field_order || jsonDb.settings.field_order || DEFAULT_FIELD_ORDER,
    language: input.language !== void 0 ? input.language : jsonDb.settings.language || "auto"
  };
  saveDatabase();
  return jsonDb.settings;
}
function getAllMovies() {
  if (!jsonDb) initDatabase();
  return [...jsonDb.movies].sort((a, b) => b.id - a.id);
}
function getMovieById(id) {
  if (!jsonDb) initDatabase();
  return jsonDb.movies.find((m) => m.id === id) || null;
}
function getMovieByFilePath(filePath) {
  if (!jsonDb) initDatabase();
  return jsonDb.movies.find((m) => m.file_path === filePath) || null;
}
function addMovie(movie) {
  if (!jsonDb) initDatabase();
  const existing = getMovieByFilePath(movie.file_path);
  if (existing) {
    return updateMovie({ ...movie, id: existing.id });
  }
  const maxId = jsonDb.movies.reduce((max, m) => Math.max(max, m.id), 0);
  const newId = maxId + 1;
  const newMovie = {
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
    rating: movie.rating !== void 0 ? movie.rating : 3,
    comment: movie.comment || null,
    tags: movie.tags || null,
    custom_field_1: movie.custom_field_1 || null,
    custom_field_2: movie.custom_field_2 || null,
    custom_field_3: movie.custom_field_3 || null,
    duration: movie.duration || null,
    captured_time: movie.captured_time !== void 0 ? movie.captured_time : null,
    width: movie.width !== void 0 ? movie.width : null,
    height: movie.height !== void 0 ? movie.height : null,
    frame_rate: movie.frame_rate !== void 0 ? movie.frame_rate : null,
    file_size: movie.file_size !== void 0 ? movie.file_size : null,
    is_grouped: movie.is_grouped !== void 0 ? movie.is_grouped : false,
    parent_movie_id: movie.parent_movie_id !== void 0 ? movie.parent_movie_id : null,
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  jsonDb.movies.push(newMovie);
  syncGroupingForMovie(newMovie);
  saveDatabase();
  return newMovie;
}
function updateMovie(movie) {
  if (!jsonDb) initDatabase();
  const index = jsonDb.movies.findIndex((m) => m.id === movie.id);
  if (index === -1) throw new Error(`Movie with id ${movie.id} not found.`);
  const updatedMovie = {
    ...jsonDb.movies[index],
    ...movie,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  jsonDb.movies[index] = updatedMovie;
  syncGroupingForMovie(updatedMovie);
  saveDatabase();
  return updatedMovie;
}
function deleteMovie(id) {
  if (!jsonDb) initDatabase();
  const index = jsonDb.movies.findIndex((m) => m.id === id);
  if (index !== -1) {
    for (const m of jsonDb.movies) {
      if (m.parent_movie_id === id) {
        m.parent_movie_id = null;
        m.updated_at = (/* @__PURE__ */ new Date()).toISOString();
      }
    }
    jsonDb.movies.splice(index, 1);
    saveDatabase();
    return true;
  }
  return false;
}
function updateMovieRating(id, rating) {
  if (!jsonDb) initDatabase();
  const movie = jsonDb.movies.find((m) => m.id === id);
  if (!movie) throw new Error(`Movie with id ${id} not found.`);
  movie.rating = rating;
  movie.updated_at = (/* @__PURE__ */ new Date()).toISOString();
  saveDatabase();
  return movie;
}
function getKeyItemGroups() {
  const settings = getAppSettings();
  const keyFields = settings.key_fields;
  const movies = getAllMovies();
  if (keyFields.length === 0) return [];
  const groupsMap = /* @__PURE__ */ new Map();
  for (const movie of movies) {
    const combinations = buildKeyCombinations(movie, keyFields);
    for (const keyValues of combinations) {
      const signature = JSON.stringify(keyValues);
      if (!groupsMap.has(signature)) {
        groupsMap.set(signature, { keyValues, movies: [] });
      }
      groupsMap.get(signature).movies.push(movie);
    }
  }
  const result = [];
  for (const [signature, group] of groupsMap.entries()) {
    const sortedMovies = [...group.movies].sort((a, b) => b.rating - a.rating);
    const topMovie = sortedMovies.find((m) => m.summary_image_path) || sortedMovies[0];
    const groupRating = jsonDb.keyRatings[signature] !== void 0 ? jsonDb.keyRatings[signature] : 3;
    let sortKey = Object.values(group.keyValues).join(" / ");
    if (keyFields.includes("cast")) {
      const targetCastVal = group.keyValues["cast"];
      let foundKana = "";
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
    const tags = jsonDb.keyTags && jsonDb.keyTags[signature] ? jsonDb.keyTags[signature] : null;
    result.push({
      key_signature: signature,
      key_values: group.keyValues,
      sort_key: sortKey,
      summary_image_path: topMovie ? topMovie.summary_image_path : null,
      rating: groupRating,
      movie_count: group.movies.length,
      tags
    });
  }
  return result;
}
function updateKeyItemRating(key_signature, rating) {
  if (!jsonDb) initDatabase();
  jsonDb.keyRatings[key_signature] = rating;
  saveDatabase();
}
function updateKeyItemDetails(input) {
  if (!jsonDb) initDatabase();
  if (!jsonDb.keyTags) jsonDb.keyTags = {};
  if (!jsonDb.keyRatings) jsonDb.keyRatings = {};
  const { key_signature, cast_kana, tags, rating } = input;
  if (tags !== void 0) {
    jsonDb.keyTags[key_signature] = tags || "";
  }
  if (rating !== void 0) {
    jsonDb.keyRatings[key_signature] = rating;
  }
  if (cast_kana !== void 0) {
    const settings = getAppSettings();
    const keyFields = settings.key_fields;
    const movies = jsonDb.movies;
    let targetCastVal = null;
    try {
      const parsedKeyValues = JSON.parse(key_signature);
      if (parsedKeyValues && typeof parsedKeyValues === "object" && parsedKeyValues.cast) {
        targetCastVal = parsedKeyValues.cast;
      }
    } catch (e) {
      console.error("Failed to parse key_signature in updateKeyItemDetails:", e);
    }
    for (const movie of movies) {
      const combinations = buildKeyCombinations(movie, keyFields);
      const isMatch = combinations.some((comb) => JSON.stringify(comb) === key_signature);
      if (isMatch) {
        if (targetCastVal && movie.cast) {
          const castSplits = movie.cast.split(/[,|、|，]/).map((s) => s.trim()).filter(Boolean);
          const kanaSplits = movie.cast_kana ? movie.cast_kana.split(/[,|、|，]/).map((s) => s.trim()).filter(Boolean) : [];
          const idx = castSplits.findIndex((c) => c === targetCastVal.trim());
          if (idx !== -1) {
            const updatedKanaSplits = [...kanaSplits];
            while (updatedKanaSplits.length <= idx) {
              const lastKana = updatedKanaSplits.length > 0 ? updatedKanaSplits[updatedKanaSplits.length - 1] : "";
              updatedKanaSplits.push(lastKana);
            }
            updatedKanaSplits[idx] = cast_kana || "";
            movie.cast_kana = updatedKanaSplits.join(",");
          } else {
            movie.cast_kana = cast_kana;
          }
        } else {
          movie.cast_kana = cast_kana;
        }
        movie.updated_at = (/* @__PURE__ */ new Date()).toISOString();
      }
    }
  }
  saveDatabase();
}
function resetAllData() {
  if (!jsonDb) initDatabase();
  const currentDbName = jsonDb.settings.database_name || "\u8A2D\u5B9A\u30D5\u30A1\u30A4\u30EB_00";
  jsonDb = {
    settings: {
      ...DEFAULT_APP_SETTINGS,
      database_name: currentDbName
    },
    movies: [],
    keyRatings: {},
    keyTags: {}
  };
  saveDatabase();
  return jsonDb.settings;
}

// electron/metadataParser.ts
var import_fs3 = __toESM(require("fs"));
var import_path3 = __toESM(require("path"));
var import_child_process = require("child_process");

// electron/ffmpegPath.ts
var import_path2 = __toESM(require("path"));
var import_fs2 = __toESM(require("fs"));
var import_electron2 = require("electron");
function getFFmpegPath() {
  try {
    let binaryPath = null;
    try {
      const ffmpegStatic = require("ffmpeg-static");
      binaryPath = typeof ffmpegStatic === "string" ? ffmpegStatic : ffmpegStatic?.default;
    } catch {
    }
    if (binaryPath) {
      if (import_electron2.app?.isPackaged) {
        binaryPath = binaryPath.replace("app.asar", "app.asar.unpacked");
      }
      if (import_fs2.default.existsSync(binaryPath)) {
        return binaryPath;
      }
    }
    if (import_electron2.app?.isPackaged && process.resourcesPath) {
      const fallbackPath = import_path2.default.join(process.resourcesPath, "app.asar.unpacked", "node_modules", "ffmpeg-static", "ffmpeg.exe");
      if (import_fs2.default.existsSync(fallbackPath)) {
        return fallbackPath;
      }
    }
  } catch (err) {
    console.warn("Failed to resolve ffmpeg-static path:", err);
  }
  return "ffmpeg";
}

// electron/metadataParser.ts
async function extractVideoMetadata(filePath) {
  try {
    if (!import_fs3.default.existsSync(filePath)) {
      return null;
    }
    const stat = import_fs3.default.statSync(filePath);
    const fileSize = stat.size;
    const ext = import_path3.default.extname(filePath).toLowerCase();
    let meta = null;
    if (ext === ".webm" || ext === ".mkv") {
      meta = extractWebmMetadataNative(filePath, fileSize);
    } else if (ext === ".avi") {
      meta = extractAviMetadataNative(filePath);
    }
    if (!meta || !meta.frameRate && ext !== ".webm" && ext !== ".mkv" && ext !== ".avi") {
      const mp4Meta = extractMp4MetadataNative(filePath, fileSize);
      if (mp4Meta) {
        meta = {
          duration: mp4Meta.duration ?? meta?.duration,
          width: mp4Meta.width ?? meta?.width,
          height: mp4Meta.height ?? meta?.height,
          frameRate: mp4Meta.frameRate ?? meta?.frameRate
        };
      }
    }
    if (!meta || !meta.duration || !meta.width) {
      const ffmpegMeta = await extractMetadataWithFFmpeg(filePath);
      if (ffmpegMeta) {
        meta = {
          duration: meta?.duration ?? ffmpegMeta.duration,
          width: meta?.width ?? ffmpegMeta.width,
          height: meta?.height ?? ffmpegMeta.height,
          frameRate: meta?.frameRate ?? ffmpegMeta.frameRate
        };
      }
    }
    return {
      file_size: fileSize,
      duration: meta?.duration ?? null,
      width: meta?.width ?? null,
      height: meta?.height ?? null,
      frame_rate: meta?.frameRate ?? null
    };
  } catch (err) {
    console.error("Failed to extract video metadata:", err);
    return null;
  }
}
async function extractMetadataWithFFmpeg(filePath) {
  return new Promise((resolve) => {
    (0, import_child_process.execFile)(
      getFFmpegPath(),
      ["-hide_banner", "-i", filePath],
      {
        encoding: "utf8",
        timeout: 8e3
      },
      (err, _stdout, stderr) => {
        const output = (stderr || "") + (_stdout || "") + (err?.message || "");
        if (!output) {
          resolve(null);
          return;
        }
        let duration;
        let width;
        let height;
        let frameRate;
        const durMatch = output.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
        if (durMatch) {
          const h = parseFloat(durMatch[1]);
          const m = parseFloat(durMatch[2]);
          const s = parseFloat(durMatch[3]);
          duration = Math.round((h * 3600 + m * 60 + s) * 100) / 100;
        }
        const streamMatch = output.match(/Stream #\d+:\d+.*?: Video:.*? (\d{2,5})x(\d{2,5})/);
        if (streamMatch) {
          width = parseInt(streamMatch[1], 10);
          height = parseInt(streamMatch[2], 10);
        }
        const fpsMatch = output.match(/(\d+(?:\.\d+)?)\s*fps/);
        if (fpsMatch) {
          frameRate = Math.round(parseFloat(fpsMatch[1]) * 100) / 100;
        }
        if (duration || width || height) {
          resolve({ duration, width, height, frameRate });
        } else {
          resolve(null);
        }
      }
    );
  });
}
function extractMp4MetadataNative(filePath, fileSize) {
  let fd = null;
  try {
    let parseBoxes2 = function(buf, start, end) {
      let curr = start;
      while (curr + 8 <= end) {
        const size32 = buf.readUInt32BE(curr);
        const type = buf.toString("ascii", curr + 4, curr + 8);
        let boxSize = size32 === 1 ? Number(buf.readBigUInt64BE(curr + 8)) : size32;
        let headerLen = size32 === 1 ? 16 : 8;
        if (size32 === 0 || curr + boxSize > end) {
          boxSize = end - curr;
        }
        const contentStart = curr + headerLen;
        const contentEnd = curr + boxSize;
        if (type === "mvhd") {
          const version = buf.readUInt8(contentStart);
          if (version === 1) {
            mvhdTimescale = buf.readUInt32BE(contentStart + 20);
            mvhdDuration = Number(buf.readBigUInt64BE(contentStart + 24));
          } else {
            mvhdTimescale = buf.readUInt32BE(contentStart + 12);
            mvhdDuration = buf.readUInt32BE(contentStart + 16);
          }
        } else if (type === "trak") {
          parseTrak2(buf, contentStart, contentEnd);
        } else if (type === "moov" || type === "mdia" || type === "minf" || type === "stbl") {
          parseBoxes2(buf, contentStart, contentEnd);
        }
        curr += boxSize;
        if (boxSize <= 0) break;
      }
    }, parseTrak2 = function(buf, start, end) {
      let isVideoTrack = false;
      let width = 0;
      let height = 0;
      let timescale = 0;
      let duration = 0;
      let sampleCount = 0;
      function scanTrakNodes(curr, stop) {
        while (curr + 8 <= stop) {
          const size32 = buf.readUInt32BE(curr);
          const type = buf.toString("ascii", curr + 4, curr + 8);
          let boxSize = size32 === 1 ? Number(buf.readBigUInt64BE(curr + 8)) : size32;
          let headerLen = size32 === 1 ? 16 : 8;
          if (size32 === 0 || curr + boxSize > stop) boxSize = stop - curr;
          const contentStart = curr + headerLen;
          const contentEnd = curr + boxSize;
          if (type === "hdlr") {
            if (contentStart + 12 <= contentEnd) {
              const handlerType = buf.toString("ascii", contentStart + 8, contentStart + 12);
              if (handlerType === "vide") {
                isVideoTrack = true;
              }
            }
          } else if (type === "tkhd") {
            const version = buf.readUInt8(contentStart);
            const widthOffset = version === 1 ? 84 : 76;
            if (contentStart + widthOffset + 8 <= contentEnd) {
              width = buf.readUInt32BE(contentStart + widthOffset) >> 16;
              height = buf.readUInt32BE(contentStart + widthOffset + 4) >> 16;
            }
          } else if (type === "mdhd") {
            const version = buf.readUInt8(contentStart);
            if (version === 1) {
              timescale = buf.readUInt32BE(contentStart + 20);
              duration = Number(buf.readBigUInt64BE(contentStart + 24));
            } else {
              timescale = buf.readUInt32BE(contentStart + 12);
              duration = buf.readUInt32BE(contentStart + 16);
            }
          } else if (type === "stsz") {
            if (contentStart + 8 <= contentEnd) {
              const count = buf.readUInt32BE(contentStart + 4);
              if (count > 0) sampleCount = count;
            }
          } else if (type === "stts") {
            if (sampleCount === 0 && contentStart + 8 <= contentEnd) {
              const entryCount = buf.readUInt32BE(contentStart + 4);
              let total = 0;
              let entryPos = contentStart + 8;
              for (let i = 0; i < entryCount && entryPos + 8 <= contentEnd; i++) {
                total += buf.readUInt32BE(entryPos);
                entryPos += 8;
              }
              if (total > 0) sampleCount = total;
            }
          } else if (type === "mdia" || type === "minf" || type === "stbl") {
            scanTrakNodes(contentStart, contentEnd);
          }
          curr += boxSize;
          if (boxSize <= 0) break;
        }
      }
      scanTrakNodes(start, end);
      if (isVideoTrack || width > 0 && height > 0 && videoWidth === 0) {
        if (width > 0) videoWidth = width;
        if (height > 0) videoHeight = height;
        if (timescale > 0) videoTimescale = timescale;
        if (duration > 0) videoDuration = duration;
        if (sampleCount > 0) videoSampleCount = sampleCount;
      }
    };
    var parseBoxes = parseBoxes2, parseTrak = parseTrak2;
    fd = import_fs3.default.openSync(filePath, "r");
    let moovBuf = null;
    let moovStartOffset = 0;
    let pos = 0;
    const headerBuf = Buffer.alloc(16);
    while (pos + 8 <= fileSize) {
      const bytesRead = import_fs3.default.readSync(fd, headerBuf, 0, 8, pos);
      if (bytesRead < 8) break;
      const size32 = headerBuf.readUInt32BE(0);
      const type = headerBuf.toString("ascii", 4, 8);
      let boxSize = BigInt(size32);
      let headerLen = 8;
      if (size32 === 1) {
        const read64 = import_fs3.default.readSync(fd, headerBuf, 8, 8, pos + 8);
        if (read64 < 8) break;
        boxSize = headerBuf.readBigUInt64BE(8);
        headerLen = 16;
      } else if (size32 === 0) {
        boxSize = BigInt(fileSize - pos);
      }
      if (type === "moov") {
        const moovLen = Number(boxSize);
        if (moovLen > 0 && moovLen <= 64 * 1024 * 1024) {
          moovBuf = Buffer.alloc(moovLen);
          import_fs3.default.readSync(fd, moovBuf, 0, moovLen, pos);
          moovStartOffset = pos;
        }
        break;
      }
      if (boxSize <= BigInt(0)) break;
      pos += Number(boxSize);
    }
    if (!moovBuf && fileSize > 8) {
      const searchSize = Math.min(fileSize, 16 * 1024 * 1024);
      const tailBuf = Buffer.alloc(searchSize);
      const startReadPos = fileSize - searchSize;
      import_fs3.default.readSync(fd, tailBuf, 0, searchSize, startReadPos);
      for (let i = tailBuf.length - 4; i >= 0; i--) {
        if (tailBuf[i] === 109 && tailBuf[i + 1] === 111 && tailBuf[i + 2] === 111 && tailBuf[i + 3] === 118) {
          if (i >= 4) {
            const moovSize32 = tailBuf.readUInt32BE(i - 4);
            const absoluteMoovPos = startReadPos + (i - 4);
            if (moovSize32 > 0 && absoluteMoovPos + moovSize32 <= fileSize) {
              moovBuf = Buffer.alloc(moovSize32);
              import_fs3.default.readSync(fd, moovBuf, 0, moovSize32, absoluteMoovPos);
              moovStartOffset = absoluteMoovPos;
              break;
            }
          }
        }
      }
    }
    import_fs3.default.closeSync(fd);
    fd = null;
    if (!moovBuf) return null;
    let mvhdTimescale = 0;
    let mvhdDuration = 0;
    let videoWidth = 0;
    let videoHeight = 0;
    let videoTimescale = 0;
    let videoDuration = 0;
    let videoSampleCount = 0;
    parseBoxes2(moovBuf, 0, moovBuf.length);
    let finalDuration;
    if (videoTimescale > 0 && videoDuration > 0) {
      finalDuration = videoDuration / videoTimescale;
    } else if (mvhdTimescale > 0 && mvhdDuration > 0) {
      finalDuration = mvhdDuration / mvhdTimescale;
    }
    let frameRate;
    if (finalDuration && finalDuration > 0 && videoSampleCount > 0) {
      frameRate = Math.round(videoSampleCount / finalDuration * 100) / 100;
    }
    return {
      duration: finalDuration ? Math.round(finalDuration * 100) / 100 : void 0,
      width: videoWidth || void 0,
      height: videoHeight || void 0,
      frameRate
    };
  } catch (err) {
    if (fd !== null) {
      try {
        import_fs3.default.closeSync(fd);
      } catch (e) {
      }
    }
    return null;
  }
}
function extractWebmMetadataNative(filePath, fileSize) {
  let fd = null;
  try {
    let readVint2 = function(p) {
      if (p >= buf.length) return null;
      const b0 = buf[p];
      let mask = 128;
      let length = 1;
      while (length <= 8 && (b0 & mask) === 0) {
        mask >>= 1;
        length++;
      }
      if (length > 8) return null;
      let val = b0 & mask - 1;
      for (let i = 1; i < length; i++) {
        if (p + i >= buf.length) return null;
        val = val * 256 + buf[p + i];
      }
      return { value: val, length };
    }, readElementHeader2 = function(p) {
      if (p >= buf.length) return null;
      let idLen = 1;
      const b0 = buf[p];
      if ((b0 & 128) !== 0) idLen = 1;
      else if ((b0 & 64) !== 0) idLen = 2;
      else if ((b0 & 32) !== 0) idLen = 3;
      else if ((b0 & 16) !== 0) idLen = 4;
      else return null;
      if (p + idLen > buf.length) return null;
      let id = 0;
      for (let i = 0; i < idLen; i++) {
        id = id * 256 + buf[p + i];
      }
      const vint = readVint2(p + idLen);
      if (!vint) return null;
      return {
        id,
        idLen,
        dataLen: vint.value,
        headerLen: idLen + vint.length
      };
    }, parseEbml2 = function(start, end) {
      let p = start;
      while (p < end) {
        const header = readElementHeader2(p);
        if (!header) break;
        const elemEnd = p + header.headerLen + header.dataLen;
        if (header.id === 408125543 || header.id === 374648427 || header.id === 174 || header.id === 224) {
          parseEbml2(p + header.headerLen, Math.min(elemEnd, end));
        } else if (header.id === 2352003) {
          const dataStart = p + header.headerLen;
          if (header.dataLen === 4 && dataStart + 4 <= buf.length) {
            defaultDurationNs = buf.readUInt32BE(dataStart);
          } else if (header.dataLen === 8 && dataStart + 8 <= buf.length) {
            defaultDurationNs = Number(buf.readBigUInt64BE(dataStart));
          }
        } else if (header.id === 176) {
          const dataStart = p + header.headerLen;
          if (header.dataLen === 2 && dataStart + 2 <= buf.length) width = buf.readUInt16BE(dataStart);
          else if (header.dataLen === 4 && dataStart + 4 <= buf.length) width = buf.readUInt32BE(dataStart);
        } else if (header.id === 186) {
          const dataStart = p + header.headerLen;
          if (header.dataLen === 2 && dataStart + 2 <= buf.length) height = buf.readUInt16BE(dataStart);
          else if (header.dataLen === 4 && dataStart + 4 <= buf.length) height = buf.readUInt32BE(dataStart);
        }
        p = elemEnd;
      }
    };
    var readVint = readVint2, readElementHeader = readElementHeader2, parseEbml = parseEbml2;
    fd = import_fs3.default.openSync(filePath, "r");
    const readSize = Math.min(fileSize, 4 * 1024 * 1024);
    const buf = Buffer.alloc(readSize);
    import_fs3.default.readSync(fd, buf, 0, readSize, 0);
    import_fs3.default.closeSync(fd);
    fd = null;
    let defaultDurationNs;
    let width;
    let height;
    parseEbml2(0, buf.length);
    let frameRate;
    if (defaultDurationNs && defaultDurationNs > 0) {
      frameRate = Math.round(1e9 / defaultDurationNs * 100) / 100;
    }
    return {
      width,
      height,
      frameRate
    };
  } catch (err) {
    if (fd !== null) {
      try {
        import_fs3.default.closeSync(fd);
      } catch (e) {
      }
    }
    return null;
  }
}
function extractAviMetadataNative(filePath) {
  let fd = null;
  try {
    fd = import_fs3.default.openSync(filePath, "r");
    const buf = Buffer.alloc(64 * 1024);
    const bytesRead = import_fs3.default.readSync(fd, buf, 0, buf.length, 0);
    import_fs3.default.closeSync(fd);
    fd = null;
    if (bytesRead < 56) return null;
    const riffType = buf.toString("ascii", 0, 4);
    const aviType = buf.toString("ascii", 8, 12);
    if (riffType !== "RIFF" || aviType !== "AVI ") return null;
    let microSecPerFrame = 0;
    let totalFrames = 0;
    let width = 0;
    let height = 0;
    for (let i = 12; i < bytesRead - 40; i++) {
      if (buf.toString("ascii", i, i + 4) === "avih") {
        const content = i + 8;
        microSecPerFrame = buf.readUInt32LE(content);
        totalFrames = buf.readUInt32LE(content + 16);
        width = buf.readUInt32LE(content + 32);
        height = buf.readUInt32LE(content + 36);
        break;
      }
    }
    let frameRate;
    if (microSecPerFrame > 0) {
      frameRate = Math.round(1e6 / microSecPerFrame * 100) / 100;
    }
    let duration;
    if (frameRate && totalFrames > 0) {
      duration = Math.round(totalFrames / frameRate * 100) / 100;
    }
    return {
      duration,
      width: width || void 0,
      height: height || void 0,
      frameRate
    };
  } catch (err) {
    if (fd !== null) {
      try {
        import_fs3.default.closeSync(fd);
      } catch (e) {
      }
    }
    return null;
  }
}

// electron/main.ts
import_electron3.protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      bypassCSP: true
    }
  },
  {
    scheme: "media",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      bypassCSP: true
    }
  }
]);
var isDev = !import_electron3.app.isPackaged && process.env.NODE_ENV !== "production";
var mainWindow = null;
function createWindow() {
  const iconPath = import_path4.default.join(__dirname, "../build/icon.png");
  const winIcon = import_fs4.default.existsSync(iconPath) ? iconPath : void 0;
  mainWindow = new import_electron3.BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: "movieAlbum",
    icon: winIcon,
    backgroundColor: "#0b0f19",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#090d16",
      symbolColor: "#94a3b8",
      height: 36
    },
    autoHideMenuBar: true,
    webPreferences: {
      preload: import_path4.default.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    }
  });
  mainWindow.setMenu(null);
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL("app://localhost/");
  }
}
function registerAppProtocol() {
  import_electron3.protocol.handle("app", (request) => {
    try {
      const reqUrl = new URL(request.url);
      let pathname = decodeURIComponent(reqUrl.pathname);
      const outDir = import_path4.default.join(__dirname, "../out");
      if (pathname === "/" || pathname === "") {
        pathname = "/index.html";
      }
      let filePath = import_path4.default.join(outDir, pathname);
      if (!import_fs4.default.existsSync(filePath)) {
        if (import_fs4.default.existsSync(filePath + ".html")) {
          filePath = filePath + ".html";
        } else if (import_fs4.default.existsSync(import_path4.default.join(filePath, "index.html"))) {
          filePath = import_path4.default.join(filePath, "index.html");
        } else {
          filePath = import_path4.default.join(outDir, "index.html");
        }
      } else if (import_fs4.default.statSync(filePath).isDirectory()) {
        const indexPath = import_path4.default.join(filePath, "index.html");
        if (import_fs4.default.existsSync(indexPath)) {
          filePath = indexPath;
        }
      }
      return import_electron3.net.fetch(import_url.default.pathToFileURL(filePath).toString());
    } catch (error) {
      console.error("Failed to handle app protocol:", error);
      return new Response("Not Found", { status: 404 });
    }
  });
}
var MIME_TYPES = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".webm": "video/webm",
  ".ogv": "video/ogg",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".wmv": "video/x-ms-wmv",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml"
};
function registerMediaProtocol() {
  import_electron3.protocol.handle("media", (request) => {
    try {
      let rawUrl = request.url.replace(/^media:\/\/(local\/)?/, "");
      let cleanUrl = rawUrl.split("?")[0].split("#")[0];
      let decodedPath = decodeURIComponent(cleanUrl);
      if (process.platform === "win32") {
        if (/^\/[a-zA-Z]:/.test(decodedPath)) {
          decodedPath = decodedPath.slice(1);
        }
      }
      const normalizedPath = import_path4.default.normalize(decodedPath);
      if (!import_fs4.default.existsSync(normalizedPath)) {
        return new Response("Media Not Found", { status: 404 });
      }
      const stats = import_fs4.default.statSync(normalizedPath);
      const ext = import_path4.default.extname(normalizedPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      const rangeHeader = request.headers.get("range");
      if (!rangeHeader) {
        const stream = import_fs4.default.createReadStream(normalizedPath);
        return new Response(import_stream.Readable.toWeb(stream), {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Content-Length": stats.size.toString(),
            "Accept-Ranges": "bytes"
          }
        });
      }
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (!match) {
        return new Response("Invalid Range", { status: 416 });
      }
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : stats.size - 1;
      if (start >= stats.size || end >= stats.size || start > end) {
        return new Response("Requested Range Not Satisfiable", {
          status: 416,
          headers: {
            "Content-Range": `bytes */${stats.size}`
          }
        });
      }
      const chunkSize = end - start + 1;
      const fileStream = import_fs4.default.createReadStream(normalizedPath, { start, end });
      return new Response(import_stream.Readable.toWeb(fileStream), {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Length": chunkSize.toString(),
          "Content-Range": `bytes ${start}-${end}/${stats.size}`,
          "Accept-Ranges": "bytes"
        }
      });
    } catch (error) {
      console.error("Failed to handle media file protocol:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  });
}
async function generateThumbnailWithFFmpeg(filePath, targetTimeInput) {
  if (!import_fs4.default.existsSync(filePath)) {
    return null;
  }
  const meta = await extractVideoMetadata(filePath);
  const duration = meta?.duration || null;
  let targetTime = targetTimeInput;
  if (targetTime === void 0 || targetTime === null || isNaN(targetTime)) {
    targetTime = duration && duration > 0 ? duration * 0.5 : 0;
  }
  return new Promise((resolve) => {
    const userDataPath = import_electron3.app.getPath("userData");
    const thumbDir = import_path4.default.join(userDataPath, "thumbnails");
    if (!import_fs4.default.existsSync(thumbDir)) {
      import_fs4.default.mkdirSync(thumbDir, { recursive: true });
    }
    const filename = `thumb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.png`;
    const fullPath = import_path4.default.join(thumbDir, filename);
    const seekArg = targetTime > 0 ? targetTime.toFixed(2) : "0";
    (0, import_child_process2.execFile)(
      getFFmpegPath(),
      [
        "-y",
        "-ss",
        seekArg,
        "-i",
        filePath,
        "-vframes",
        "1",
        "-vf",
        "scale=720:405:force_original_aspect_ratio=decrease,pad=720:405:(ow-iw)/2:(oh-ih)/2",
        fullPath
      ],
      { timeout: 15e3 },
      (err) => {
        if (!err && import_fs4.default.existsSync(fullPath)) {
          resolve({ imagePath: fullPath, duration, targetTime });
        } else {
          console.error("FFmpeg thumbnail generation error:", err);
          resolve(null);
        }
      }
    );
  });
}
import_electron3.app.whenReady().then(() => {
  import_electron3.Menu.setApplicationMenu(null);
  registerAppProtocol();
  registerMediaProtocol();
  initDatabase();
  createWindow();
  import_electron3.app.on("activate", () => {
    if (import_electron3.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
import_electron3.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") import_electron3.app.quit();
});
import_electron3.ipcMain.handle("settings:get", async () => getAppSettings());
import_electron3.ipcMain.handle("settings:save", async (_, input) => saveAppSettings(input));
import_electron3.ipcMain.handle("databases:getState", async () => getDatabaseState());
import_electron3.ipcMain.handle("databases:switch", async (_, id) => switchDatabase(id));
import_electron3.ipcMain.handle("databases:create", async (_, name) => createDatabase(name));
import_electron3.ipcMain.handle("databases:delete", async (_, id) => deleteDatabase(id));
import_electron3.ipcMain.handle("movies:getAll", async () => getAllMovies());
import_electron3.ipcMain.handle("movies:getById", async (_, id) => getMovieById(id));
import_electron3.ipcMain.handle("movies:getByPath", async (_, filePath) => getMovieByFilePath(filePath));
import_electron3.ipcMain.handle("movies:add", async (_, movie) => addMovie(movie));
import_electron3.ipcMain.handle("movies:update", async (_, movie) => updateMovie(movie));
import_electron3.ipcMain.handle("movies:delete", async (_, id) => deleteMovie(id));
import_electron3.ipcMain.handle(
  "movies:updateRating",
  async (_, { id, rating }) => updateMovieRating(id, rating)
);
import_electron3.ipcMain.handle("movies:extractMetadata", async (_, filePath) => {
  return extractVideoMetadata(filePath);
});
import_electron3.ipcMain.handle("keyItems:getAll", async () => getKeyItemGroups());
import_electron3.ipcMain.handle(
  "keyItems:updateRating",
  async (_, { key_signature, rating }) => updateKeyItemRating(key_signature, rating)
);
import_electron3.ipcMain.handle(
  "keyItems:updateDetails",
  async (_, input) => updateKeyItemDetails(input)
);
import_electron3.ipcMain.handle("app:resetData", async () => resetAllData());
import_electron3.ipcMain.handle("app:openMoviePlayer", async (_, filePath) => {
  try {
    if (!import_fs4.default.existsSync(filePath)) {
      return { success: false, code: "FILE_NOT_FOUND" };
    }
    const errorMsg = await import_electron3.shell.openPath(filePath);
    if (errorMsg) {
      return { success: false, code: "LAUNCH_FAILED", error: errorMsg };
    }
    return { success: true };
  } catch (err) {
    return { success: false, code: "LAUNCH_FAILED", error: err?.message };
  }
});
import_electron3.ipcMain.handle("app:checkFileExists", async (_, filePath) => {
  try {
    return !!(filePath && import_fs4.default.existsSync(filePath));
  } catch {
    return false;
  }
});
import_electron3.ipcMain.handle("app:saveSummaryImage", async (_, base64Data) => {
  try {
    const userDataPath = import_electron3.app.getPath("userData");
    const thumbDir = import_path4.default.join(userDataPath, "thumbnails");
    if (!import_fs4.default.existsSync(thumbDir)) {
      import_fs4.default.mkdirSync(thumbDir, { recursive: true });
    }
    const filename = `thumb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.png`;
    const fullPath = import_path4.default.join(thumbDir, filename);
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    import_fs4.default.writeFileSync(fullPath, buffer);
    return fullPath;
  } catch (err) {
    console.error("Failed to save summary image:", err);
    throw new Error("SAVE_SUMMARY_FAILED");
  }
});
import_electron3.ipcMain.handle("app:generateThumbnail", async (_, { filePath, targetTime }) => {
  return generateThumbnailWithFFmpeg(filePath, targetTime);
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateThumbnailWithFFmpeg
});
