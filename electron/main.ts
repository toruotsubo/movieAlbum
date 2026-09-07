import { app, BrowserWindow, ipcMain, shell, protocol, Menu, net } from 'electron';
import path from 'path';
import fs from 'fs';
import url from 'url';
import {
  initDatabase,
  getAppSettings,
  saveAppSettings,
  getAllMovies,
  getMovieById,
  getMovieByFilePath,
  addMovie,
  updateMovie,
  deleteMovie,
  updateMovieRating,
  getKeyItemGroups,
  updateKeyItemRating,
  updateKeyItemDetails,
  resetAllData,
} from './db';

// Register scheme privileges before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      bypassCSP: true,
    },
  },
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      bypassCSP: true,
    },
  },
]);

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const iconPath = path.join(__dirname, '../build/icon.png');
  const winIcon = fs.existsSync(iconPath) ? iconPath : undefined;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Movie Manager',
    icon: winIcon,
    backgroundColor: '#0b0f19',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#090d16',
      symbolColor: '#94a3b8',
      height: 36,
    },
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  mainWindow.setMenu(null);

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL('app://localhost/');
  }
}

// Serve Next.js exported static files via app:// protocol
function registerAppProtocol() {
  protocol.handle('app', (request) => {
    try {
      const reqUrl = new URL(request.url);
      let pathname = decodeURIComponent(reqUrl.pathname);

      const outDir = path.join(__dirname, '../out');

      if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
      }

      let filePath = path.join(outDir, pathname);

      if (!fs.existsSync(filePath)) {
        if (fs.existsSync(filePath + '.html')) {
          filePath = filePath + '.html';
        } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
          filePath = path.join(filePath, 'index.html');
        } else {
          filePath = path.join(outDir, 'index.html');
        }
      } else if (fs.statSync(filePath).isDirectory()) {
        const indexPath = path.join(filePath, 'index.html');
        if (fs.existsSync(indexPath)) {
          filePath = indexPath;
        }
      }

      return net.fetch(url.pathToFileURL(filePath).toString());
    } catch (error) {
      console.error('Failed to handle app protocol:', error);
      return new Response('Not Found', { status: 404 });
    }
  });
}

// Setup custom protocol for local media files using native File Protocol binding
function registerMediaProtocol() {
  protocol.registerFileProtocol('media', (request, callback) => {
    try {
      // 1. Remove media:// or media://local/ prefix
      let rawUrl = request.url.replace(/^media:\/\/(local\/)?/, '');

      // 2. Strip query parameters (e.g. ?v=1785825095548) and hash
      let cleanUrl = rawUrl.split('?')[0].split('#')[0];

      // 3. Decode URI components
      let decodedPath = decodeURIComponent(cleanUrl);

      // 4. Handle Windows drive letter paths e.g. /F:/path/to/file or F:/path/to/file -> F:/path/to/file
      if (process.platform === 'win32') {
        if (/^\/[a-zA-Z]:/.test(decodedPath)) {
          decodedPath = decodedPath.slice(1);
        }
      }

      const normalizedPath = path.normalize(decodedPath);
      callback({ path: normalizedPath });
    } catch (error) {
      console.error('Failed to handle media file protocol:', error);
      callback({ error: -6 }); // NET_ERROR FILE_NOT_FOUND
    }
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerAppProtocol();
  registerMediaProtocol();
  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('settings:get', async () => getAppSettings());
ipcMain.handle('settings:save', async (_, input) => saveAppSettings(input));

ipcMain.handle('movies:getAll', async () => getAllMovies());
ipcMain.handle('movies:getById', async (_, id: number) => getMovieById(id));
ipcMain.handle('movies:getByPath', async (_, filePath: string) => getMovieByFilePath(filePath));
ipcMain.handle('movies:add', async (_, movie) => addMovie(movie));
ipcMain.handle('movies:update', async (_, movie) => updateMovie(movie));
ipcMain.handle('movies:delete', async (_, id: number) => deleteMovie(id));
ipcMain.handle('movies:updateRating', async (_, { id, rating }: { id: number; rating: number }) =>
  updateMovieRating(id, rating)
);

import { extractVideoMetadata } from './metadataParser';

// Extract movie metadata IPC
ipcMain.handle('movies:extractMetadata', async (_, filePath: string) => {
  return extractVideoMetadata(filePath);
});

ipcMain.handle('keyItems:getAll', async () => getKeyItemGroups());
ipcMain.handle('keyItems:updateRating', async (_, { key_signature, rating }: { key_signature: string; rating: number }) =>
  updateKeyItemRating(key_signature, rating)
);
ipcMain.handle('keyItems:updateDetails', async (_, input) =>
  updateKeyItemDetails(input)
);

ipcMain.handle('app:resetData', async () => resetAllData());

// Open OS default movie player
ipcMain.handle('app:openMoviePlayer', async (_, filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, code: 'FILE_NOT_FOUND' };
    }
    const errorMsg = await shell.openPath(filePath);
    if (errorMsg) {
      return { success: false, code: 'LAUNCH_FAILED', error: errorMsg };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, code: 'LAUNCH_FAILED', error: err?.message };
  }
});

ipcMain.handle('app:checkFileExists', async (_, filePath: string) => {
  try {
    return !!(filePath && fs.existsSync(filePath));
  } catch {
    return false;
  }
});

// Save Summary Image (720x405 screenshot)
ipcMain.handle('app:saveSummaryImage', async (_, base64Data: string) => {
  try {
    const userDataPath = app.getPath('userData');
    const thumbDir = path.join(userDataPath, 'thumbnails');
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }

    const filename = `thumb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.png`;
    const fullPath = path.join(thumbDir, filename);

    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    fs.writeFileSync(fullPath, buffer);

    return fullPath;
  } catch (err: any) {
    console.error('Failed to save summary image:', err);
    throw new Error('SAVE_SUMMARY_FAILED');
  }
});

import { execFile } from 'child_process';
import { getFFmpegPath } from './ffmpegPath';

/**
 * Generate 720x405 summary thumbnail from video file using FFmpeg
 */
export async function generateThumbnailWithFFmpeg(
  filePath: string,
  targetTimeInput?: number | null
): Promise<{ imagePath: string; duration: number | null; targetTime: number } | null> {
  return new Promise((resolve) => {
    if (!fs.existsSync(filePath)) {
      resolve(null);
      return;
    }

    const meta = extractVideoMetadata(filePath);
    const duration = meta?.duration || null;

    let targetTime = targetTimeInput;
    if (targetTime === undefined || targetTime === null || isNaN(targetTime)) {
      targetTime = duration && duration > 0 ? duration * 0.5 : 0;
    }

    const userDataPath = app.getPath('userData');
    const thumbDir = path.join(userDataPath, 'thumbnails');
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }

    const filename = `thumb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.png`;
    const fullPath = path.join(thumbDir, filename);
    const seekArg = targetTime > 0 ? targetTime.toFixed(2) : '0';

    execFile(
      getFFmpegPath(),
      [
        '-y',
        '-ss', seekArg,
        '-i', filePath,
        '-vframes', '1',
        '-vf', 'scale=720:405:force_original_aspect_ratio=decrease,pad=720:405:(ow-iw)/2:(oh-ih)/2',
        fullPath,
      ],
      { timeout: 15000 },
      (err) => {
        if (!err && fs.existsSync(fullPath)) {
          resolve({ imagePath: fullPath, duration, targetTime });
        } else {
          console.error('FFmpeg thumbnail generation error:', err);
          resolve(null);
        }
      }
    );
  });
}

// Generate thumbnail via FFmpeg IPC handler
ipcMain.handle('app:generateThumbnail', async (_, { filePath, targetTime }: { filePath: string; targetTime?: number | null }) => {
  return generateThumbnailWithFFmpeg(filePath, targetTime);
});
