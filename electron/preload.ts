import { contextBridge, ipcRenderer, webUtils } from 'electron';
import {
  AppSettings,
  Movie,
  KeyItemGroup,
  CreateMovieInput,
  UpdateMovieInput,
  UpdateKeyItemInput,
  SaveSettingsInput,
  DatabaseInfo,
  DatabaseState,
} from '../src/lib/types';

export const api = {
  getPathForFile: (file: File): string => {
    try {
      return webUtils.getPathForFile(file);
    } catch (err) {
      console.warn('webUtils.getPathForFile failed, falling back to file.path:', err);
      return (file as any).path || '';
    }
  },

  getDatabaseState: (): Promise<DatabaseState> => ipcRenderer.invoke('databases:getState'),
  switchDatabase: (id: string): Promise<{ state: DatabaseState; settings: AppSettings }> =>
    ipcRenderer.invoke('databases:switch', id),
  createDatabase: (name?: string): Promise<{ state: DatabaseState; settings: AppSettings }> =>
    ipcRenderer.invoke('databases:create', name),
  deleteDatabase: (id: string): Promise<{ state: DatabaseState; settings: AppSettings }> =>
    ipcRenderer.invoke('databases:delete', id),

  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (input: SaveSettingsInput): Promise<AppSettings> => ipcRenderer.invoke('settings:save', input),

  getMovies: (): Promise<Movie[]> => ipcRenderer.invoke('movies:getAll'),
  getMovieById: (id: number): Promise<Movie | null> => ipcRenderer.invoke('movies:getById', id),
  getMovieByPath: (filePath: string): Promise<Movie | null> => ipcRenderer.invoke('movies:getByPath', filePath),
  addMovie: (movie: CreateMovieInput): Promise<Movie> => ipcRenderer.invoke('movies:add', movie),
  updateMovie: (movie: UpdateMovieInput): Promise<Movie> => ipcRenderer.invoke('movies:update', movie),
  deleteMovie: (id: number): Promise<boolean> => ipcRenderer.invoke('movies:delete', id),
  updateMovieRating: (id: number, rating: number): Promise<Movie> => ipcRenderer.invoke('movies:updateRating', { id, rating }),

  getKeyItemGroups: (): Promise<KeyItemGroup[]> => ipcRenderer.invoke('keyItems:getAll'),
  updateKeyItemRating: (key_signature: string, rating: number): Promise<void> =>
    ipcRenderer.invoke('keyItems:updateRating', { key_signature, rating }),
  updateKeyItemDetails: (input: UpdateKeyItemInput): Promise<void> =>
    ipcRenderer.invoke('keyItems:updateDetails', input),

  openMoviePlayer: (filePath: string): Promise<{ success: boolean; code?: string; error?: string }> =>
    ipcRenderer.invoke('app:openMoviePlayer', filePath),
  checkFileExists: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke('app:checkFileExists', filePath),

  extractMetadata: (
    filePath: string
  ): Promise<{
    file_size: number | null;
    duration: number | null;
    width: number | null;
    height: number | null;
    frame_rate: number | null;
  } | null> => ipcRenderer.invoke('movies:extractMetadata', filePath),

  saveSummaryImage: (base64Data: string): Promise<string> => ipcRenderer.invoke('app:saveSummaryImage', base64Data),
  generateThumbnail: (
    filePath: string,
    targetTime?: number | null
  ): Promise<{ imagePath: string; duration: number | null; targetTime: number } | null> =>
    ipcRenderer.invoke('app:generateThumbnail', { filePath, targetTime }),
  resetData: (): Promise<AppSettings> => ipcRenderer.invoke('app:resetData'),
};

contextBridge.exposeInMainWorld('api', api);

export type ApiWindow = typeof window & {
  api: typeof api;
};
