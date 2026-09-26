"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// electron/preload.ts
var preload_exports = {};
__export(preload_exports, {
  api: () => api
});
module.exports = __toCommonJS(preload_exports);
var import_electron = require("electron");
var api = {
  getPathForFile: (file) => {
    try {
      return import_electron.webUtils.getPathForFile(file);
    } catch (err) {
      console.warn("webUtils.getPathForFile failed, falling back to file.path:", err);
      return file.path || "";
    }
  },
  getDatabaseState: () => import_electron.ipcRenderer.invoke("databases:getState"),
  switchDatabase: (id) => import_electron.ipcRenderer.invoke("databases:switch", id),
  createDatabase: (name) => import_electron.ipcRenderer.invoke("databases:create", name),
  deleteDatabase: (id) => import_electron.ipcRenderer.invoke("databases:delete", id),
  getSettings: () => import_electron.ipcRenderer.invoke("settings:get"),
  saveSettings: (input) => import_electron.ipcRenderer.invoke("settings:save", input),
  getMovies: () => import_electron.ipcRenderer.invoke("movies:getAll"),
  getMovieById: (id) => import_electron.ipcRenderer.invoke("movies:getById", id),
  getMovieByPath: (filePath) => import_electron.ipcRenderer.invoke("movies:getByPath", filePath),
  addMovie: (movie) => import_electron.ipcRenderer.invoke("movies:add", movie),
  updateMovie: (movie) => import_electron.ipcRenderer.invoke("movies:update", movie),
  deleteMovie: (id) => import_electron.ipcRenderer.invoke("movies:delete", id),
  updateMovieRating: (id, rating) => import_electron.ipcRenderer.invoke("movies:updateRating", { id, rating }),
  getKeyItemGroups: () => import_electron.ipcRenderer.invoke("keyItems:getAll"),
  updateKeyItemRating: (key_signature, rating) => import_electron.ipcRenderer.invoke("keyItems:updateRating", { key_signature, rating }),
  updateKeyItemDetails: (input) => import_electron.ipcRenderer.invoke("keyItems:updateDetails", input),
  openMoviePlayer: (filePath) => import_electron.ipcRenderer.invoke("app:openMoviePlayer", filePath),
  checkFileExists: (filePath) => import_electron.ipcRenderer.invoke("app:checkFileExists", filePath),
  extractMetadata: (filePath) => import_electron.ipcRenderer.invoke("movies:extractMetadata", filePath),
  saveSummaryImage: (base64Data) => import_electron.ipcRenderer.invoke("app:saveSummaryImage", base64Data),
  generateThumbnail: (filePath, targetTime) => import_electron.ipcRenderer.invoke("app:generateThumbnail", { filePath, targetTime }),
  resetData: () => import_electron.ipcRenderer.invoke("app:resetData")
};
import_electron.contextBridge.exposeInMainWorld("api", api);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  api
});
