const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// 获取用户数据目录
const userDataPath = app.getPath('userData');
const profilesPath = path.join(userDataPath, 'profiles');
const aircraftPath = path.join(profilesPath, 'aircraft');
const unitsPath = path.join(profilesPath, 'units');

// 确保文件夹存在
function ensureProfilesDir() {
    if (!fs.existsSync(profilesPath)) {
        fs.mkdirSync(profilesPath, { recursive: true });
    }
    if (!fs.existsSync(aircraftPath)) {
        fs.mkdirSync(aircraftPath, { recursive: true });
    }
    if (!fs.existsSync(unitsPath)) {
        fs.mkdirSync(unitsPath, { recursive: true });
    }
}

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'icon.png'),  // 可选：添加图标
        title: 'Flight Calculator | 飞行计算器'
    });

    // 加载 index.html
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // 开发模式打开 DevTools
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    ensureProfilesDir();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// ============================================================
// IPC 通信 - 预设管理
// ============================================================

// 保存机型预设
ipcMain.handle('save-aircraft-preset', async (event, name, config) => {
    try {
        const filename = sanitizeFilename(name) + '.json';
        const filePath = path.join(aircraftPath, filename);
        fs.writeFileSync(filePath, JSON.stringify({
            name: name,
            config: config,
            savedAt: new Date().toISOString()
        }, null, 2));
        return { success: true, path: filePath };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// 保存单位预设
ipcMain.handle('save-unit-preset', async (event, name, config) => {
    try {
        const filename = sanitizeFilename(name) + '.json';
        const filePath = path.join(unitsPath, filename);
        fs.writeFileSync(filePath, JSON.stringify({
            name: name,
            config: config,
            savedAt: new Date().toISOString()
        }, null, 2));
        return { success: true, path: filePath };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// 列出机型预设
ipcMain.handle('list-aircraft-presets', async () => {
    return listPresets(aircraftPath);
});

// 列出单位预设
ipcMain.handle('list-unit-presets', async () => {
    return listPresets(unitsPath);
});

// 加载预设
ipcMain.handle('load-preset', async (event, type, name) => {
    try {
        const dir = type === 'aircraft' ? aircraftPath : unitsPath;
        const filename = sanitizeFilename(name) + '.json';
        const filePath = path.join(dir, filename);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content);
        }
        return null;
    } catch (e) {
        return null;
    }
});

// 删除预设
ipcMain.handle('delete-preset', async (event, type, name) => {
    try {
        const dir = type === 'aircraft' ? aircraftPath : unitsPath;
        const filename = sanitizeFilename(name) + '.json';
        const filePath = path.join(dir, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ============================================================
// IPC 通信 - 导入/导出
// ============================================================

// 导出所有预设
ipcMain.handle('export-all', async () => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: '导出预设',
            defaultPath: 'flight-calculator-profiles.json',
            filters: [{ name: 'JSON Files', extensions: ['json'] }]
        });

        if (result.canceled) {
            return { success: false, canceled: true };
        }

        const exportData = {
            exportedAt: new Date().toISOString(),
            version: '1.0',
            aircraft: readAllPresets(aircraftPath),
            units: readAllPresets(unitsPath)
        };

        fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2));
        return { success: true, path: result.filePath };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// 导入预设
ipcMain.handle('import-all', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: '导入预设',
            filters: [{ name: 'JSON Files', extensions: ['json'] }],
            properties: ['openFile']
        });

        if (result.canceled) {
            return { success: false, canceled: true };
        }

        const content = fs.readFileSync(result.filePaths[0], 'utf-8');
        const data = JSON.parse(content);
        let imported = { aircraft: 0, units: 0 };

        if (data.aircraft) {
            data.aircraft.forEach(item => {
                const filePath = path.join(aircraftPath, sanitizeFilename(item.name) + '.json');
                fs.writeFileSync(filePath, JSON.stringify(item, null, 2));
                imported.aircraft++;
            });
        }

        if (data.units) {
            data.units.forEach(item => {
                const filePath = path.join(unitsPath, sanitizeFilename(item.name) + '.json');
                fs.writeFileSync(filePath, JSON.stringify(item, null, 2));
                imported.units++;
            });
        }

        return { success: true, imported };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// 打开预设文件夹
ipcMain.handle('open-profiles-folder', async () => {
    const { shell } = require('electron');
    shell.openPath(profilesPath);
});

// ============================================================
// 辅助函数
// ============================================================

function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9一-龥_-]/g, '_').substring(0, 50);
}

function listPresets(dir) {
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    return files.map(filename => {
        const filePath = path.join(dir, filename);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        return {
            name: data.name,
            key: filename.replace('.json', ''),
            savedAt: data.savedAt
        };
    }).sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
}

function readAllPresets(dir) {
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    return files.map(filename => {
        const filePath = path.join(dir, filename);
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    });
}