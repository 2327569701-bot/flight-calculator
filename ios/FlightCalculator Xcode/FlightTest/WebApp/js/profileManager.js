/**
 * 配置文件管理器 (Profile Manager)
 *
 * 管理预设配置的保存、加载、导入、导出
 * profiles/
 * ├── aircraft/    - 机型配置预设
 * └── units/        - 单位配置预设
 */

const ProfileManager = {
    PROFILES_DIR: 'profiles',
    AIRCRAFT_DIR: 'profiles/aircraft',
    UNITS_DIR: 'profiles/units',

    /**
     * 初始化目录结构
     */
    init() {
        this.ensureDir(this.AIRCRAFT_DIR);
        this.ensureDir(this.UNITS_DIR);
    },

    /**
     * 确保目录存在（基于 localStorage 模拟）
     * 注：在 file:// 环境下使用 localStorage 作为存储
     */
    ensureDir(dir) {
        const dirs = localStorage.getItem('_dirs') || '[]';
        const dirList = JSON.parse(dirs);
        if (!dirList.includes(dir)) {
            dirList.push(dir);
            localStorage.setItem('_dirs', JSON.stringify(dirList));
        }
    },

    /**
     * 保存机型配置预设
     * @param {string} name - 预设名称
     * @param {object} config - 配置对象
     */
    saveAircraftPreset(name, config) {
        const filename = this.sanitizeFilename(name);
        const key = `${this.AIRCRAFT_DIR}/${filename}`;
        localStorage.setItem(key, JSON.stringify({
            name: name,
            config: config,
            savedAt: new Date().toISOString()
        }));
        return { success: true, path: key };
    },

    /**
     * 保存单位配置预设
     * @param {string} name - 预设名称
     * @param {object} config - 配置对象
     */
    saveUnitPreset(name, config) {
        const filename = this.sanitizeFilename(name);
        const key = `${this.UNITS_DIR}/${filename}`;
        localStorage.setItem(key, JSON.stringify({
            name: name,
            config: config,
            savedAt: new Date().toISOString()
        }));
        return { success: true, path: key };
    },

    /**
     * 加载机型配置预设
     * @param {string} name - 预设名称
     * @returns {object|null} 配置对象
     */
    loadAircraftPreset(name) {
        const filename = this.sanitizeFilename(name);
        const key = `${this.AIRCRAFT_DIR}/${filename}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },

    /**
     * 加载单位配置预设
     * @param {string} name - 预设名称
     * @returns {object|null} 配置对象
     */
    loadUnitPreset(name) {
        const filename = this.sanitizeFilename(name);
        const key = `${this.UNITS_DIR}/${filename}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },

    /**
     * 列出所有机型预设
     * @returns {array} 预设列表
     */
    listAircraftPresets() {
        return this.listPresets(this.AIRCRAFT_DIR);
    },

    /**
     * 列出所有单位预设
     * @returns {array} 预设列表
     */
    listUnitPresets() {
        return this.listPresets(this.UNITS_DIR);
    },

    /**
     * 列出指定目录下的所有预设
     * @param {string} dir - 目录路径
     * @returns {array} 预设列表
     */
    listPresets(dir) {
        const dirs = JSON.parse(localStorage.getItem('_dirs') || '[]');
        if (!dirs.includes(dir)) return [];

        const presets = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(dir + '/')) {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsed = JSON.parse(data);
                    presets.push({
                        name: parsed.name,
                        key: key,
                        savedAt: parsed.savedAt
                    });
                }
            }
        }
        return presets.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    },

    /**
     * 删除预设
     * @param {string} key - 完整键名
     */
    deletePreset(key) {
        localStorage.removeItem(key);
        return { success: true };
    },

    /**
     * 导出所有预设为 JSON 文件
     * @param {string} type - 'aircraft' | 'units' | 'all'
     * @returns {string} JSON 字符串
     */
    exportAll(type = 'all') {
        const exportData = {
            exportedAt: new Date().toISOString(),
            version: '1.0',
            aircraft: [],
            units: []
        };

        if (type === 'aircraft' || type === 'all') {
            exportData.aircraft = this.listPresets(this.AIRCRAFT_DIR).map(p => {
                const data = localStorage.getItem(p.key);
                return data ? JSON.parse(data) : null;
            }).filter(Boolean);
        }

        if (type === 'units' || type === 'all') {
            exportData.units = this.listPresets(this.UNITS_DIR).map(p => {
                const data = localStorage.getItem(p.key);
                return data ? JSON.parse(data) : null;
            }).filter(Boolean);
        }

        return JSON.stringify(exportData, null, 2);
    },

    /**
     * 导入预设 JSON 数据
     * @param {string} jsonString - JSON 字符串
     * @returns {object} 导入结果
     */
    importAll(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            let imported = { aircraft: 0, units: 0 };

            if (data.aircraft) {
                data.aircraft.forEach(item => {
                    const key = `${this.AIRCRAFT_DIR}/${this.sanitizeFilename(item.name)}`;
                    localStorage.setItem(key, JSON.stringify(item));
                    imported.aircraft++;
                });
            }

            if (data.units) {
                data.units.forEach(item => {
                    const key = `${this.UNITS_DIR}/${this.sanitizeFilename(item.name)}`;
                    localStorage.setItem(key, JSON.stringify(item));
                    imported.units++;
                });
            }

            return { success: true, imported };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    /**
     * 清理文件名（移除不安全字符）
     * @param {string} name - 原始名称
     * @returns {string} 清理后的名称
     */
    sanitizeFilename(name) {
        return name.replace(/[^a-zA-Z0-9一-龥_-]/g, '_').substring(0, 50);
    },

    /**
     * 下载配置文件为文件
     * @param {string} content - 文件内容
     * @param {string} filename - 文件名
     */
    downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * 从文件导入
     * @param {File} file - 文件对象
     * @returns {Promise} 解析后的数据
     */
    async importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }
};

// 注册为全局
if (typeof window !== 'undefined') {
    window.ProfileManager = ProfileManager;
}