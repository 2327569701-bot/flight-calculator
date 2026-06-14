const { contextBridge, ipcRenderer } = require('electron');

// 安全桥接 - 只暴露必要的 API
contextBridge.exposeInMainWorld('electronAPI', {
    // 预设管理
    saveAircraftPreset: (name, config) => ipcRenderer.invoke('save-aircraft-preset', name, config),
    saveUnitPreset: (name, config) => ipcRenderer.invoke('save-unit-preset', name, config),
    listAircraftPresets: () => ipcRenderer.invoke('list-aircraft-presets'),
    listUnitPresets: () => ipcRenderer.invoke('list-unit-presets'),
    loadPreset: (type, name) => ipcRenderer.invoke('load-preset', type, name),
    deletePreset: (type, name) => ipcRenderer.invoke('delete-preset', type, name),

    // 导入/导出
    exportAll: () => ipcRenderer.invoke('export-all'),
    importAll: () => ipcRenderer.invoke('import-all'),
    openProfilesFolder: () => ipcRenderer.invoke('open-profiles-folder')
});