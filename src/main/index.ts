import { app, BrowserWindow, Menu } from 'electron';
import { join } from 'node:path';
import { openDatabase, type DB } from '../db/connection';
import { registerIpc } from './ipc';
import { TokenStore } from './token-store';
import { buildAppMenu } from './menu';

let mainWindow: BrowserWindow | null = null;
let db: DB | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => mainWindow?.show());

  // В dev electron-vite отдаёт renderer через dev-server; в prod — из файла.
  if (process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  db = openDatabase(join(app.getPath('userData'), 'direct_navigator.db'));
  registerIpc(db, new TokenStore(app.getPath('userData')));
  Menu.setApplicationMenu(buildAppMenu());
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// macOS: закрытие окна не завершает приложение.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
  db?.close();
});
