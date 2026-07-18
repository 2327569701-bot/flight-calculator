/**
 * 飞行计算器主程序
 * 零依赖版本 - 可直接双击 index.html 运行
 * 2024 版本
 */

// ============================================================
// 桌面端 API 检测 (Electron / Tauri)
// ============================================================

const DesktopAPI = {
    isDesktop: !!(window.electronAPI || window.__TAURI__),
    isElectron: !!window.electronAPI,
    isTauri: !!window.__TAURI__,

    async invoke(cmd, ...args) {
        if (window.electronAPI) {
            return await window.electronAPI[cmd](...args);
        } else if (window.__TAURI__) {
            const { invoke } = window.__TAURI__.core;
            return await invoke(cmd, ...args);
        }
        return null;
    },

    async openFolder(path) {
        if (window.__TAURI__) {
            const { open } = window.__TAURI__.shell;
            await open(path);
        } else if (window.electronAPI) {
            await window.electronAPI.openProfilesFolder();
        }
    }
};

// ============================================================
// 主题系统
// ============================================================

const ThemeManager = {
    STORAGE_KEY: '_themeMode',

    getPreferredTheme() {
        const savedTheme = localStorage.getItem(this.STORAGE_KEY);
        if (savedTheme === 'dark' || savedTheme === 'light') {
            return savedTheme;
        }
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    },

    applyTheme(theme) {
        const selectedTheme = theme === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', selectedTheme);
        this.updateToggleButton(selectedTheme);
    },

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(nextTheme);
        localStorage.setItem(this.STORAGE_KEY, nextTheme);
    },

    bindToggle() {
        const button = document.getElementById('themeToggle');
        if (!button || button.dataset.bound === 'true') {
            return;
        }
        button.addEventListener('click', () => this.toggleTheme());
        button.dataset.bound = 'true';
    },

    updateToggleButton(theme) {
        const button = document.getElementById('themeToggle');
        if (!button) return;

        const icon = button.querySelector('.theme-toggle-icon');
        const isDark = theme === 'dark';
        if (icon) {
            icon.textContent = isDark ? '☀️' : '🌙';
        }
        button.setAttribute('aria-pressed', String(isDark));
        button.setAttribute('title', isDark ? '切换到浅色模式' : '切换到深色模式');
        button.setAttribute('aria-label', isDark ? '切换到浅色模式' : '切换到深色模式');
    },

    init() {
        const theme = this.getPreferredTheme();
        this.applyTheme(theme);
        this.bindToggle();
    }
};

// ============================================================
// 工具函数
// ============================================================

const FlightUtils = {
    // 解析输入值
    parseInput(inputStr) {
        if (!inputStr || typeof inputStr !== 'string') return null;
        const value = parseFloat(inputStr.trim().replace(/,/g, ''));
        return isNaN(value) ? null : value;
    },

    // 格式化数字
    formatNumber(value, decimals = 1) {
        if (typeof value !== 'number' || isNaN(value)) return '—';
        return value.toFixed(decimals);
    },

    // 角度转弧度
    degToRad(deg) {
        return deg * (Math.PI / 180);
    },

    // 弧度转角度
    radToDeg(rad) {
        return rad * (180 / Math.PI);
    }
};

// ============================================================
// 单位转换系统
// ============================================================

const UnitSystem = {
    PRESETS: {
        metric: {
            name: '公制', nameEn: 'Metric',
            distance: 'km', speed: 'km/h', altitude: 'm',
            verticalSpeed: 'm/s', weight: 'kg', fuel: 'kg',
            temperature: '°C', pressure: 'hPa'
        },
        imperial: {
            name: '英制', nameEn: 'Imperial',
            distance: 'NM', speed: 'kt', altitude: 'ft',
            verticalSpeed: 'ft/min', weight: 'lb', fuel: 'lb',
            temperature: '°F', pressure: 'inHg'
        },
        mixed: {
            name: '混合', nameEn: 'Mixed',
            distance: 'NM', speed: 'kt', altitude: 'ft',
            verticalSpeed: 'ft/min', weight: 'kg', fuel: 'kg',
            temperature: '°C', pressure: 'hPa'
        }
    },

    STANDARD: {
        distance: 'NM', speed: 'kt', altitude: 'ft',
        verticalSpeed: 'ft/min', weight: 'kg', fuel: 'kg',
        temperature: '°C', pressure: 'hPa', time: 'min',
        angle: '°', fuelFlow: 'kg/h'
    },

    OPTIONS: {
        distance: [
            { value: 'NM', label: 'NM', toStd: v => v, fromStd: v => v },
            { value: 'km', label: 'km', toStd: v => v / 1.852, fromStd: v => v * 1.852 },
            { value: 'mi', label: 'mi', toStd: v => v * 1.15078, fromStd: v => v / 1.15078 },
            { value: 'm', label: 'm', toStd: v => v / 1852, fromStd: v => v * 1852 }
        ],
        speed: [
            { value: 'kt', label: 'kt', toStd: v => v, fromStd: v => v },
            { value: 'km/h', label: 'km/h', toStd: v => v / 1.852, fromStd: v => v * 1.852 },
            { value: 'mph', label: 'mph', toStd: v => v / 1.15078, fromStd: v => v * 1.15078 },
            { value: 'm/s', label: 'm/s', toStd: v => v * 1.94384, fromStd: v => v / 1.94384 }
        ],
        altitude: [
            { value: 'ft', label: 'ft', toStd: v => v, fromStd: v => v },
            { value: 'm', label: 'm', toStd: v => v * 3.28084, fromStd: v => v / 3.28084 }
        ],
        verticalSpeed: [
            { value: 'ft/min', label: 'ft/min', toStd: v => v, fromStd: v => v },
            { value: 'm/s', label: 'm/s', toStd: v => v * 196.85, fromStd: v => v / 196.85 },
            { value: 'm/min', label: 'm/min', toStd: v => v * 3.28084, fromStd: v => v / 3.28084 }
        ],
        weight: [
            { value: 'kg', label: 'kg', toStd: v => v, fromStd: v => v },
            { value: 'lb', label: 'lb', toStd: v => v / 2.20462, fromStd: v => v * 2.20462 }
        ],
        fuel: [
            { value: 'kg', label: 'kg', toStd: v => v, fromStd: v => v },
            { value: 'lb', label: 'lb', toStd: v => v / 2.20462, fromStd: v => v * 2.20462 },
            { value: 'gal', label: 'gal (US)', toStd: v => v * 3.04, fromStd: v => v / 3.04 }
        ],
        temperature: [
            { value: '°C', label: '°C', toStd: v => v, fromStd: v => v },
            { value: '°F', label: '°F', toStd: v => (v - 32) * 5/9, fromStd: v => v * 9/5 + 32 }
        ],
        pressure: [
            { value: 'hPa', label: 'hPa', toStd: v => v, fromStd: v => v },
            { value: 'inHg', label: 'inHg', toStd: v => v * 33.8639, fromStd: v => v / 33.8639 },
            { value: 'mbar', label: 'mbar', toStd: v => v, fromStd: v => v }
        ]
    },

    current: null,

    init(mode = 'mixed') {
        if (this.PRESETS[mode]) {
            this.current = { ...this.PRESETS[mode], mode };
        } else {
            this.current = { ...this.PRESETS.mixed, mode };
        }
        this.load();
    },

    toStandard(type, value) {
        const unit = this.current[type] || this.STANDARD[type];
        const options = this.OPTIONS[type] || [];
        const opt = options.find(o => o.value === unit);
        return opt ? opt.toStd(value) : value;
    },

    fromStandard(type, value) {
        const unit = this.current[type] || this.STANDARD[type];
        const options = this.OPTIONS[type] || [];
        const opt = options.find(o => o.value === unit);
        return opt ? opt.fromStd(value) : value;
    },

    format(type, value, decimals = 1) {
        const displayValue = this.fromStandard(type, value);
        const unit = this.current[type] || this.STANDARD[type] || type;
        return `${displayValue.toFixed(decimals)} ${unit}`;
    },

    getLabel(type) {
        return this.current[type] || this.STANDARD[type] || type;
    },

    setUnit(type, unit) {
        if (!this.current) this.init('custom');
        this.current.mode = 'custom';
        this.current[type] = unit;
        this.save();
    },

    save() {
        if (this.current) {
            localStorage.setItem('_unitConfig', JSON.stringify(this.current));
        }
    },

    load() {
        const saved = localStorage.getItem('_unitConfig');
        if (saved) {
            try {
                this.current = JSON.parse(saved);
            } catch (e) {
                this.init('mixed');
            }
        }
    },

    reset(mode = 'mixed') {
        this.current = { ...this.PRESETS[mode], mode };
        this.save();
    },

    getPresets() {
        return Object.entries(this.PRESETS).map(([key, val]) => ({
            id: key, name: val.name, nameEn: val.nameEn
        }));
    },

    getOptions(type) {
        return this.OPTIONS[type] || [];
    }
};

// ============================================================
// 配置文件管理器
// ============================================================

const ProfileManager = {
    AIRCRAFT_DIR: 'profiles/aircraft',
    UNITS_DIR: 'profiles/units',

    saveAircraftPreset(name, config) {
        const key = `${this.AIRCRAFT_DIR}/${name.replace(/[^a-zA-Z0-9一-龥_-]/g, '_').substring(0, 50)}`;
        localStorage.setItem(key, JSON.stringify({ name, config, savedAt: new Date().toISOString() }));
        return { success: true };
    },

    saveUnitPreset(name, config) {
        const key = `${this.UNITS_DIR}/${name.replace(/[^a-zA-Z0-9一-龥_-]/g, '_').substring(0, 50)}`;
        localStorage.setItem(key, JSON.stringify({ name, config, savedAt: new Date().toISOString() }));
        return { success: true };
    },

    loadAircraftPreset(name) {
        const key = `${this.AIRCRAFT_DIR}/${name.replace(/[^a-zA-Z0-9一-龥_-]/g, '_').substring(0, 50)}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },

    loadUnitPreset(name) {
        const key = `${this.UNITS_DIR}/${name.replace(/[^a-zA-Z0-9一-龥_-]/g, '_').substring(0, 50)}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },

    listAircraftPresets() {
        const results = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.AIRCRAFT_DIR + '/')) {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsed = JSON.parse(data);
                    results.push({ name: parsed.name, key, savedAt: parsed.savedAt });
                }
            }
        }
        return results.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    },

    listUnitPresets() {
        const results = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.UNITS_DIR + '/')) {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsed = JSON.parse(data);
                    results.push({ name: parsed.name, key, savedAt: parsed.savedAt });
                }
            }
        }
        return results.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    },

    deletePreset(key) {
        localStorage.removeItem(key);
    },

    exportAll(type = 'all') {
        const data = { exportedAt: new Date().toISOString(), version: '1.0', aircraft: [], units: [] };
        if (type === 'aircraft' || type === 'all') {
            data.aircraft = this.listAircraftPresets().map(p => {
                const d = localStorage.getItem(p.key);
                return d ? JSON.parse(d) : null;
            }).filter(Boolean);
        }
        if (type === 'units' || type === 'all') {
            data.units = this.listUnitPresets().map(p => {
                const d = localStorage.getItem(p.key);
                return d ? JSON.parse(d) : null;
            }).filter(Boolean);
        }
        return JSON.stringify(data, null, 2);
    },

    importAll(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            let imported = { aircraft: 0, units: 0 };
            if (data.aircraft) {
                data.aircraft.forEach(item => {
                    const key = `${this.AIRCRAFT_DIR}/${item.name.replace(/[^a-zA-Z0-9一-龥_-]/g, '_').substring(0, 50)}`;
                    localStorage.setItem(key, JSON.stringify(item));
                    imported.aircraft++;
                });
            }
            if (data.units) {
                data.units.forEach(item => {
                    const key = `${this.UNITS_DIR}/${item.name.replace(/[^a-zA-Z0-9一-龥_-]/g, '_').substring(0, 50)}`;
                    localStorage.setItem(key, JSON.stringify(item));
                    imported.units++;
                });
            }
            return { success: true, imported };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

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
    }
};

// ============================================================
// 下滑角计算器
// ============================================================

const GlideSlopeCalculator = {
    calculate(altitudeDiff, distance) {
        if (altitudeDiff < 0 || distance <= 0) {
            return { success: false, error: '高度差必须为正值，距离必须大于零' };
        }

        const distanceInFeet = distance * 6076;
        const angleRadians = Math.atan2(altitudeDiff, distanceInFeet);
        const angleDegrees = angleRadians * (180 / Math.PI);

        let assessment;
        if (angleDegrees < 2.5) {
            assessment = { level: 'low', text: '偏缓', color: 'warning' };
        } else if (angleDegrees <= 3.5) {
            assessment = { level: 'normal', text: '正常', color: 'success' };
        } else if (angleDegrees <= 5) {
            assessment = { level: 'steep', text: '偏陡', color: 'warning' };
        } else {
            assessment = { level: 'danger', text: '过陡', color: 'danger' };
        }

        return {
            success: true,
            result: {
                angle: angleDegrees,
                angleFormatted: angleDegrees.toFixed(1)
            },
            advice: this.getAdvice(angleDegrees, distance)
        };
    },

    getAdvice(angle, distance) {
        if (angle < 2.5) {
            return `建议增加下滑角至 3°，当前距离 ${distance.toFixed(1)} NM 可在更远距离开始下降`;
        } else if (angle > 5) {
            return `⚠️ 警告: 下滑角 ${angle.toFixed(1)}° 过陡！建议减小角度或增加距离`;
        } else if (angle > 3.5) {
            return `建议适当减小下滑角，目标 3° 可获得更平稳的进近`;
        }
        return `下滑角 ${angle.toFixed(1)}° 符合标准进近程序`;
    }
};

// ============================================================
// 垂直速度计算器
// ============================================================

const VerticalSpeedCalculator = {
    calculate(groundSpeed, glideAngle) {
        if (groundSpeed <= 0) {
            return { success: false, error: '地速必须大于零' };
        }
        if (glideAngle <= 0 || glideAngle > 15) {
            return { success: false, error: '下滑角应在 0° 到 15° 之间' };
        }

        const feetPerNm = 6076;
        const minutesPerHour = 60;
        const angleRadians = glideAngle * (Math.PI / 180);
        const vsFpm = groundSpeed * (feetPerNm / minutesPerHour) * Math.sin(angleRadians);
        const vsRounded = Math.round(vsFpm);

        let assessment;
        const absVs = Math.abs(vsRounded);
        if (absVs < 300) {
            assessment = { level: 'gentle', text: '轻柔', color: 'info' };
        } else if (absVs <= 1000) {
            assessment = { level: 'normal', text: '正常', color: 'success' };
        } else if (absVs <= 1500) {
            assessment = { level: 'moderate', text: '中等', color: 'warning' };
        } else {
            assessment = { level: 'high', text: '偏高', color: 'danger' };
        }

        return {
            success: true,
            result: {
                vs: vsRounded,
                vsFormatted: (vsRounded >= 0 ? '+' : '') + vsRounded.toLocaleString()
            },
            advice: this.getAdvice(vsRounded, groundSpeed)
        };
    },

    getAdvice(vs, gs) {
        const absVs = Math.abs(vs);
        const sign = vs >= 0 ? '+' : '';
        if (absVs > 1500) {
            return `⚠️ 建议: 下降率 ${sign}${absVs} ft/min 过高。请减速至 200 kt 以下，或减小下滑角至 3°`;
        } else if (absVs > 1000) {
            return `建议: 下降率 ${sign}${absVs} ft/min 偏高。如果速度较快，可考虑收油门减速`;
        } else if (absVs < 300) {
            return `提示: 下降率 ${sign}${absVs} ft/min 较低，适用于低空低速进近`;
        }
        return `设置目标垂直速度 ${sign}${absVs} ft/min，保持地速 ${gs} kt`;
    },

    calculateAngleFromVs(groundSpeed, targetVs) {
        if (groundSpeed <= 0) {
            return { success: false, error: '地速必须大于零' };
        }
        const feetPerNm = 6076;
        const ratio = (targetVs * 60) / (groundSpeed * feetPerNm);
        if (Math.abs(ratio) > 1) {
            return { success: false, error: '所需下滑角超过 90°，请调整参数' };
        }
        const angleRadians = Math.asin(ratio);
        const angleDegrees = angleRadians * (180 / Math.PI);
        return {
            success: true,
            result: { angle: angleDegrees, angleFormatted: angleDegrees.toFixed(1) },
            advice: `需要保持 ${angleDegrees.toFixed(1)}° 的下滑角来达到 ${Math.abs(targetVs)} ft/min 的下降率`
        };
    }
};

// ============================================================
// TOD 计算器
// ============================================================

const TodCalculator = {
    DEFAULT_GLIDE_ANGLE: 3,

    calculate(altitudeDiff, glideAngle = this.DEFAULT_GLIDE_ANGLE) {
        if (altitudeDiff < 0) {
            return { success: false, error: '高度差不能为负值' };
        }
        if (altitudeDiff === 0) {
            return {
                success: true,
                result: { distanceNm: 0, distanceNmFormatted: '0.0' },
                advice: '高度差为零，无需下降'
            };
        }

        const angleRadians = glideAngle * (Math.PI / 180);
        const distanceFeet = altitudeDiff / Math.tan(angleRadians);
        const distanceNm = distanceFeet / 6076;
        const distanceKm = distanceNm * 1.852;

        return {
            success: true,
            result: {
                distanceNm: distanceNm,
                distanceNmFormatted: distanceNm.toFixed(1),
                distanceKm: distanceKm.toFixed(1)
            },
            advice: this.getAdvice(distanceNm, altitudeDiff, glideAngle)
        };
    },

    getAdvice(distanceNm, altitudeDiff, glideAngle) {
        const rounded = Math.round(distanceNm * 2) / 2;
        if (distanceNm < 3) {
            return `⚠️ 警告: TOD 距离仅 ${rounded} NM，建议立即开始下降！`;
        } else if (distanceNm < 5) {
            return `立即开始准备下降，目标距离 ${rounded} NM`;
        } else if (distanceNm > 30) {
            return `TOD 距离较长 (${rounded} NM)，可以使用较缓的下降剖面节省燃油`;
        }
        return `在当前距离 ${rounded} NM 处开始下降，保持 ${glideAngle}° 下滑角`;
    },

    calculateTodTiming(todDistance, groundSpeed) {
        if (groundSpeed <= 0) {
            return { success: false, error: '地速必须大于零' };
        }
        const timeHours = todDistance / groundSpeed;
        const timeMinutes = timeHours * 60;

        return {
            success: true,
            result: {
                timeMinutes: Math.round(timeMinutes),
                timeMinutesFormatted: this.formatTime(timeMinutes)
            },
            advice: `从现在起 ${this.formatTime(timeMinutes)} 后开始下降`
        };
    },

    formatTime(minutes) {
        if (minutes < 1) return `${Math.round(minutes * 60)} 秒`;
        const mins = Math.floor(minutes);
        const secs = Math.round((minutes - mins) * 60);
        if (secs === 0) return `${mins} 分钟`;
        return `${mins} 分 ${secs} 秒`;
    }
};

// ============================================================
// 航空三角计算器
// ============================================================

const TriangleCalculator = {
    calculate(inputs) {
        const { speed, distance, time } = inputs;
        const knownCount = [speed, distance, time].filter(v => v !== null && !isNaN(v) && v > 0).length;

        if (knownCount < 2) {
            return { success: false, error: '请至少输入两个值' };
        }

        if (!speed || speed <= 0) {
            return this.calculateSpeed(distance, time);
        } else if (!distance || distance <= 0) {
            return this.calculateDistance(speed, time);
        } else if (!time || time <= 0) {
            return this.calculateTime(speed, distance);
        }
    },

    calculateSpeed(distance, time) {
        if (time <= 0) return { success: false, error: '时间必须大于零' };
        const speedKt = (distance / time) * 60;
        return {
            success: true,
            result: { speedKt: speedKt, speedKtFormatted: speedKt.toFixed(1) },
            advice: `保持 ${speedKt.toFixed(1)} kt 的速度飞行 ${time} 分钟`
        };
    },

    calculateDistance(speed, time) {
        if (speed <= 0) return { success: false, error: '速度必须大于零' };
        const distanceNm = (speed * time) / 60;
        return {
            success: true,
            result: { distanceNm: distanceNm, distanceNmFormatted: distanceNm.toFixed(1) },
            advice: `${time} 分钟内以 ${speed} kt 飞行约 ${distanceNm.toFixed(1)} NM`
        };
    },

    calculateTime(speed, distance) {
        if (speed <= 0) return { success: false, error: '速度必须大于零' };
        const timeMinutes = (distance / speed) * 60;
        return {
            success: true,
            result: { timeMinutes: timeMinutes, timeMinutesFormatted: this.formatTime(timeMinutes) },
            advice: `以 ${speed} kt 飞行 ${distance} NM 需要 ${this.formatTime(timeMinutes)}`
        };
    },

    formatTime(minutes) {
        if (minutes < 1) return `${Math.round(minutes * 60)} 秒`;
        const mins = Math.floor(minutes);
        const secs = Math.round((minutes - mins) * 60);
        if (secs === 0) return `${mins} 分钟`;
        return `${mins} 分 ${secs} 秒`;
    }
};

// ============================================================
// 燃油计算器
// ============================================================

const FuelCalculator = {
    // 机型数据库 (单位: kg, kg/h)
    AIRCRAFT_DB: {
        // Airbus
        'A220-100': { name: 'A220-100', family: 'Airbus', type: 'narrow', oew: 35400, mtow: 59900, maxFuel: 20873, fuelFlow: 520 },
        'A220-300': { name: 'A220-300', family: 'Airbus', type: 'narrow', oew: 40900, mtow: 79000, maxFuel: 20873, fuelFlow: 520 },
        'A318-100': { name: 'A318-100', family: 'Airbus', type: 'narrow', oew: 39500, mtow: 68000, maxFuel: 19500, fuelFlow: 620 },
        'A319-100': { name: 'A319-100', family: 'Airbus', type: 'narrow', oew: 40500, mtow: 75500, maxFuel: 25500, fuelFlow: 650 },
        'A319neo': { name: 'A319neo', family: 'Airbus', type: 'narrow', oew: 40800, mtow: 77500, maxFuel: 27000, fuelFlow: 580 },
        'A320-200': { name: 'A320-200', family: 'Airbus', type: 'narrow', oew: 42100, mtow: 79000, maxFuel: 27000, fuelFlow: 700 },
        'A320neo': { name: 'A320neo', family: 'Airbus', type: 'narrow', oew: 42400, mtow: 79500, maxFuel: 27000, fuelFlow: 620 },
        'A321-200': { name: 'A321-200', family: 'Airbus', type: 'narrow', oew: 49200, mtow: 93500, maxFuel: 32000, fuelFlow: 800 },
        'A321neo': { name: 'A321neo', family: 'Airbus', type: 'narrow', oew: 49700, mtow: 97000, maxFuel: 33000, fuelFlow: 720 },
        'A330-200': { name: 'A330-200', family: 'Airbus', type: 'wide', oew: 120500, mtow: 230000, maxFuel: 97000, fuelFlow: 1800 },
        'A330-300': { name: 'A330-300', family: 'Airbus', type: 'wide', oew: 127500, mtow: 235000, maxFuel: 97000, fuelFlow: 1900 },
        'A330-800': { name: 'A330-800', family: 'Airbus', type: 'wide', oew: 121500, mtow: 242000, maxFuel: 109000, fuelFlow: 1850 },
        'A330-900': { name: 'A330-900', family: 'Airbus', type: 'wide', oew: 123500, mtow: 242000, maxFuel: 109000, fuelFlow: 1900 },
        'A340-200': { name: 'A340-200', family: 'Airbus', type: 'wide', oew: 124500, mtow: 253000, maxFuel: 139000, fuelFlow: 2200 },
        'A340-300': { name: 'A340-300', family: 'Airbus', type: 'wide', oew: 129500, mtow: 276500, maxFuel: 139000, fuelFlow: 2300 },
        'A340-500': { name: 'A340-500', family: 'Airbus', type: 'wide', oew: 129000, mtow: 380000, maxFuel: 195000, fuelFlow: 2800 },
        'A340-600': { name: 'A340-600', family: 'Airbus', type: 'wide', oew: 137000, mtow: 380000, maxFuel: 195000, fuelFlow: 2900 },
        'A350-900': { name: 'A350-900', family: 'Airbus', type: 'wide', oew: 126500, mtow: 268000, maxFuel: 110000, fuelFlow: 1800 },
        'A350-1000': { name: 'A350-1000', family: 'Airbus', type: 'wide', oew: 142500, mtow: 316000, maxFuel: 156000, fuelFlow: 2100 },
        'A380-800': { name: 'A380-800', family: 'Airbus', type: 'wide', oew: 280000, mtow: 575000, maxFuel: 320000, fuelFlow: 3500 },
        // Boeing
        'B707-300': { name: 'B707-300', family: 'Boeing', type: 'narrow', oew: 45600, mtow: 151000, maxFuel: 52000, fuelFlow: 2500 },
        'B717-200': { name: 'B717-200', family: 'Boeing', type: 'narrow', oew: 31500, mtow: 54800, maxFuel: 11700, fuelFlow: 480 },
        'B727-100': { name: 'B727-100', family: 'Boeing', type: 'narrow', oew: 44300, mtow: 77200, maxFuel: 24000, fuelFlow: 1100 },
        'B727-200': { name: 'B727-200', family: 'Boeing', type: 'narrow', oew: 46200, mtow: 95200, maxFuel: 34000, fuelFlow: 1400 },
        'B737-100': { name: 'B737-100', family: 'Boeing', type: 'narrow', oew: 28000, mtow: 52300, maxFuel: 13200, fuelFlow: 600 },
        'B737-300': { name: 'B737-300', family: 'Boeing', type: 'narrow', oew: 32000, mtow: 65800, maxFuel: 20000, fuelFlow: 700 },
        'B737-400': { name: 'B737-400', family: 'Boeing', type: 'narrow', oew: 34000, mtow: 68000, maxFuel: 22000, fuelFlow: 750 },
        'B737-500': { name: 'B737-500', family: 'Boeing', type: 'narrow', oew: 31000, mtow: 56400, maxFuel: 17000, fuelFlow: 650 },
        'B737-600': { name: 'B737-600', family: 'Boeing', type: 'narrow', oew: 35100, mtow: 66500, maxFuel: 26000, fuelFlow: 680 },
        'B737-700': { name: 'B737-700', family: 'Boeing', type: 'narrow', oew: 37600, mtow: 70300, maxFuel: 26000, fuelFlow: 700 },
        'B737-800': { name: 'B737-800', family: 'Boeing', type: 'narrow', oew: 41100, mtow: 79000, maxFuel: 26000, fuelFlow: 750 },
        'B737-900': { name: 'B737-900', family: 'Boeing', type: 'narrow', oew: 44100, mtow: 82100, maxFuel: 26000, fuelFlow: 780 },
        'B737MAX-8': { name: 'B737 MAX 8', family: 'Boeing', type: 'narrow', oew: 42300, mtow: 82100, maxFuel: 26000, fuelFlow: 680 },
        'B737MAX-9': { name: 'B737 MAX 9', family: 'Boeing', type: 'narrow', oew: 45200, mtow: 88400, maxFuel: 27000, fuelFlow: 700 },
        'B747-100': { name: 'B747-100', family: 'Boeing', type: 'wide', oew: 174000, mtow: 340000, maxFuel: 200000, fuelFlow: 4000 },
        'B747-200': { name: 'B747-200', family: 'Boeing', type: 'wide', oew: 180000, mtow: 377000, maxFuel: 200000, fuelFlow: 4200 },
        'B747-400': { name: 'B747-400', family: 'Boeing', type: 'wide', oew: 179000, mtow: 412000, maxFuel: 240000, fuelFlow: 4500 },
        'B747-8': { name: 'B747-8', family: 'Boeing', type: 'wide', oew: 192000, mtow: 447000, maxFuel: 300000, fuelFlow: 4800 },
        'B757-200': { name: 'B757-200', family: 'Boeing', type: 'narrow', oew: 58100, mtow: 115000, maxFuel: 43000, fuelFlow: 1100 },
        'B757-300': { name: 'B757-300', family: 'Boeing', type: 'narrow', oew: 63500, mtow: 123000, maxFuel: 43000, fuelFlow: 1150 },
        'B767-200': { name: 'B767-200', family: 'Boeing', type: 'wide', oew: 90000, mtow: 186000, maxFuel: 90000, fuelFlow: 1500 },
        'B767-300': { name: 'B767-300', family: 'Boeing', type: 'wide', oew: 94000, mtow: 204000, maxFuel: 95000, fuelFlow: 1600 },
        'B767-400ER': { name: 'B767-400ER', family: 'Boeing', type: 'wide', oew: 103000, mtow: 204000, maxFuel: 107000, fuelFlow: 1700 },
        'B777-200': { name: 'B777-200', family: 'Boeing', type: 'wide', oew: 134800, mtow: 286000, maxFuel: 117000, fuelFlow: 2200 },
        'B777-200ER': { name: 'B777-200ER', family: 'Boeing', type: 'wide', oew: 138100, mtow: 347000, maxFuel: 145000, fuelFlow: 2500 },
        'B777-200LR': { name: 'B777-200LR', family: 'Boeing', type: 'wide', oew: 138200, mtow: 347000, maxFuel: 181000, fuelFlow: 2600 },
        'B777-300ER': { name: 'B777-300ER', family: 'Boeing', type: 'wide', oew: 145600, mtow: 351000, maxFuel: 181000, fuelFlow: 2700 },
        'B777F': { name: 'B777F', family: 'Boeing', type: 'wide', oew: 120000, mtow: 347000, maxFuel: 181000, fuelFlow: 2600 },
        'B787-8': { name: 'B787-8', family: 'Boeing', type: 'wide', oew: 118000, mtow: 227000, maxFuel: 126000, fuelFlow: 1800 },
        'B787-9': { name: 'B787-9', family: 'Boeing', type: 'wide', oew: 127000, mtow: 254000, maxFuel: 126000, fuelFlow: 1900 },
        'B787-10': { name: 'B787-10', family: 'Boeing', type: 'wide', oew: 136000, mtow: 281000, maxFuel: 126000, fuelFlow: 2000 }
    },

    // 当前配置状态
    state: {
        aircraft: null,
        oew: null,
        mtow: null,
        maxFuel: null,
        flightDistance: null,  // 新增：飞行距离
        avgSpeed: 450,          // 默认平均速度 (kt)
        fuelFlow: null          // 燃油流量
    },

    /**
     * 选择机型
     */
    selectAircraft(key) {
        const aircraft = this.AIRCRAFT_DB[key];
        if (aircraft) {
            this.state.aircraft = key;
            this.state.oew = aircraft.oew;
            this.state.mtow = aircraft.mtow;
            this.state.maxFuel = aircraft.maxFuel;
            this.state.fuelFlow = aircraft.fuelFlow;
            this.state.flightDistance = null;
        }
        return aircraft;
    },

    /**
     * 计算飞行所需燃油
     * @param {number} distance - 飞行距离 (NM)
     * @param {number} speed - 平均速度 (kt)
     * @returns {object} 燃油计算结果
     */
    calculateFlightFuel(distance, speed = 450) {
        if (!this.state.fuelFlow) {
            return { error: '请先选择机型' };
        }

        // 计算飞行时间 (小时)
        const flightHours = distance / speed;

        // 估算消耗燃油 (kg)
        // 加上起降阶段的额外燃油 (约 10-15 分钟的消耗)
        const cruiseFuel = this.state.fuelFlow * flightHours;
        const taxiFuel = this.state.fuelFlow * (15 / 60); // 15分钟滑行
        const approachFuel = this.state.fuelFlow * (10 / 60); // 10分钟进近

        // 储备燃油 (至少 30 分钟储备)
        const reserveFuel = this.state.fuelFlow * 0.5;

        const totalFlightFuel = cruiseFuel + taxiFuel + approachFuel + reserveFuel;

        return {
            flightHours: flightHours.toFixed(1),
            cruiseFuel: Math.round(cruiseFuel),
            taxiFuel: Math.round(taxiFuel),
            approachFuel: Math.round(approachFuel),
            reserveFuel: Math.round(reserveFuel),
            totalFlightFuel: Math.round(totalFlightFuel),
            flightTime: this.formatFlightTime(flightHours * 60)
        };
    },

    /**
     * 计算可用燃油（给定载荷）
     * @param {number} payload - 载荷重量 (kg)
     * @returns {object} 可用燃油信息
     */
    calcFuelWithPayload(payload) {
        const { oew, mtow, maxFuel } = this.state;
        if (!oew || !mtow || !maxFuel) {
            return { error: '请先选择机型' };
        }

        const usedByPayload = payload || 0;
        const availableForFuelAndPayload = mtow - oew;

        // 最大可用燃油（无载荷）
        const maxFuelNoPayload = Math.min(maxFuel, availableForFuelAndPayload);
        // 可用燃油（减去载荷后）
        const maxFuelWithPayload = Math.max(0, availableForFuelAndPayload - usedByPayload);
        // 实际可装燃油（物理限制 vs 重量限制）
        const actualMaxFuel = Math.min(maxFuel, maxFuelWithPayload);

        return {
            maxFuelCapacity: maxFuel,           // 油箱最大容量
            maxFuelWithPayload: Math.round(actualMaxFuel),  // 该载荷下最大可用燃油
            usedByPayload: usedByPayload,
            remainingWeight: Math.round(availableForFuelAndPayload - usedByPayload)
        };
    },

    /**
     * 计算可用载荷（给定燃油）
     * @param {number} fuel - 燃油重量 (kg)
     * @returns {object} 可用载荷信息
     */
    calcPayloadWithFuel(fuel) {
        const { oew, mtow, maxFuel } = this.state;
        if (!oew || !mtow || !maxFuel) {
            return { error: '请先选择机型' };
        }

        const fuelWeight = fuel || 0;
        const availableForPayloadAndFuel = mtow - oew;

        // 最大可用载荷（无燃油）
        const maxPayloadNoFuel = availableForPayloadAndFuel;
        // 可用载荷（减去燃油后）
        const maxPayloadWithFuel = Math.max(0, availableForPayloadAndFuel - fuelWeight);
        // 实际可装载荷（重量限制）
        const actualMaxPayload = Math.min(maxPayloadNoFuel, maxPayloadWithFuel);

        return {
            maxPayloadCapacity: Math.round(maxPayloadNoFuel),  // 最大载荷容量
            maxPayloadWithFuel: Math.round(actualMaxPayload), // 该燃油量下最大可用载荷
            usedByFuel: fuelWeight,
            remainingWeight: Math.round(availableForPayloadAndFuel - fuelWeight)
        };
    },

    /**
     * 完整计算（基于距离和载荷）
     * @param {number} distance - 飞行距离 (NM)
     * @param {number} payload - 载荷重量 (kg)
     * @param {number} speed - 平均速度 (kt)
     * @returns {object} 完整计算结果
     */
    calculateFull(distance, payload, speed = 450) {
        const flightFuel = this.calculateFlightFuel(distance, speed);
        const fuelWithPayload = this.calcFuelWithPayload(payload);
        const payloadWithFuel = this.calcPayloadWithFuel(flightFuel.totalFlightFuel);

        // 建议载荷（飞行燃油限制下的最大载荷）
        const suggestedPayload = Math.min(
            fuelWithPayload.maxFuelWithPayload,
            payloadWithFuel.maxPayloadWithFuel
        );

        // 检查是否满足飞行需求
        const canFly = flightFuel.totalFlightFuel <= fuelWithPayload.maxFuelWithPayload;

        return {
            flightFuel: flightFuel,
            fuelWithPayload: fuelWithPayload,
            payloadWithFuel: payloadWithFuel,
            suggestedPayload: Math.round(suggestedPayload),
            suggestedFuel: Math.round(flightFuel.totalFlightFuel),
            canFly: canFly,
            warning: canFly ? '' : '⚠️ 燃油不足！请减少载荷或增加最大燃油量'
        };
    },

    /**
     * 格式化飞行时间
     */
    formatFlightTime(minutes) {
        const hrs = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        if (hrs > 0) {
            return `${hrs}h ${mins}m`;
        }
        return `${mins}m`;
    },

    /**
     * 获取机型列表
     */
    getAircraftList() {
        const airbus = [], boeing = [];
        Object.entries(this.AIRCRAFT_DB).forEach(([key, ac]) => {
            if (ac.family === 'Airbus') airbus.push({ key, ...ac });
            else boeing.push({ key, ...ac });
        });
        return { airbus, boeing };
    },

    /**
     * 重置状态
     */
    reset() {
        this.state = {
            aircraft: null,
            oew: null,
            mtow: null,
            maxFuel: null,
            flightDistance: null,
            avgSpeed: 450,
            fuelFlow: null
        };
    }
};

// ============================================================
// 主程序
// ============================================================

let app;

class FlightCalculatorApp {
    constructor() {
        this.init();
    }

    init() {
        ThemeManager.init();
        UnitSystem.init('mixed');
        this.renderNavigation();
        this.renderCalculatorSections();
        this.bindEvents();
        this.showSection('glide-slope');
    }

    renderNavigation() {
        const navTabs = document.getElementById('navTabs');
        if (!navTabs) return;

        navTabs.innerHTML = `
            <button class="nav-tab active" data-section="glide-slope">📐 下滑角</button>
            <button class="nav-tab" data-section="vertical-speed">⬆️ 垂直速度</button>
            <button class="nav-tab" data-section="tod">🛬 TOD</button>
            <button class="nav-tab" data-section="triangle">📊 三角</button>
            <button class="nav-tab" data-section="fuel">⛽ 燃油</button>
            <button class="nav-tab settings-btn" data-action="settings">⚙️ 设置</button>
        `;
    }

    renderCalculatorSections() {
        const container = document.getElementById('calculatorContainer');
        if (!container) return;

        container.innerHTML = `
            <!-- 下滑角计算器 -->
            <section id="section-glide-slope" class="calculator-section active">
                <div class="section-header">
                    <h2 class="section-title">📐 下滑角计算器</h2>
                    <p class="section-description">根据高度差和水平距离计算最佳下滑角度</p>
                </div>
                <div class="grid-container">
                    <div class="card">
                        <div class="card-header">
                            <div class="card-icon">📐</div>
                            <div>
                                <div class="card-title">下滑角计算</div>
                                <div class="card-subtitle">Glide Slope Calculator</div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="form-group">
                                <label class="form-label">高度差 (${UnitSystem.getLabel('altitude')})</label>
                                <div class="input-with-unit">
                                    <input type="number" id="gs-altitudeDiff" class="form-input" placeholder="3000" min="0" step="100">
                                    <span class="input-unit">${UnitSystem.getLabel('altitude')}</span>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">水平距离 (${UnitSystem.getLabel('distance')})</label>
                                <div class="input-with-unit">
                                    <input type="number" id="gs-distance" class="form-input" placeholder="10" min="0.1" step="0.1">
                                    <span class="input-unit">${UnitSystem.getLabel('distance')}</span>
                                </div>
                            </div>
                            <button class="btn-calculate" onclick="app.calculateGlideSlope()">计算下滑角</button>
                            <div id="gs-result" class="result-container" style="display: none;">
                                <div class="result-label">下滑角</div>
                                <div class="result-value" id="gs-result-value">—</div>
                                <div class="result-unit">°</div>
                                <div class="result-advice" id="gs-result-advice"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 垂直速度计算器 -->
            <section id="section-vertical-speed" class="calculator-section">
                <div class="section-header">
                    <h2 class="section-title">⬆️ 垂直速度计算器</h2>
                    <p class="section-description">根据地速和下滑角计算需要的垂直下降率</p>
                </div>
                <div class="grid-container">
                    <div class="card">
                        <div class="card-header">
                            <div class="card-icon">⬆️</div>
                            <div>
                                <div class="card-title">垂直速度计算</div>
                                <div class="card-subtitle">VS = GS × sin(Angle) × 60</div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="input-row">
                                <div class="form-group">
                                    <label class="form-label">地速 (${UnitSystem.getLabel('speed')})</label>
                                    <div class="input-with-unit">
                                        <input type="number" id="vs-groundSpeed" class="form-input" placeholder="150" min="30" max="600" step="5">
                                        <span class="input-unit">${UnitSystem.getLabel('speed')}</span>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">下滑角 (°)</label>
                                    <div class="input-with-unit">
                                        <input type="number" id="vs-glideAngle" class="form-input" placeholder="3" min="0.1" max="10" step="0.1">
                                        <span class="input-unit">°</span>
                                    </div>
                                </div>
                            </div>
                            <button class="btn-calculate" onclick="app.calculateVerticalSpeed()">计算垂直速度</button>
                            <div id="vs-result" class="result-container" style="display: none;">
                                <div class="result-label">垂直速度</div>
                                <div class="result-value" id="vs-result-value">—</div>
                                <div class="result-unit">${UnitSystem.getLabel('verticalSpeed')}</div>
                                <div class="result-advice" id="vs-result-advice"></div>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <div class="card-icon">🔄</div>
                            <div>
                                <div class="card-title">反向计算</div>
                                <div class="card-subtitle">已知目标 VS，计算所需下滑角</div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="input-row">
                                <div class="form-group">
                                    <label class="form-label">地速 (${UnitSystem.getLabel('speed')})</label>
                                    <div class="input-with-unit">
                                        <input type="number" id="vs2-groundSpeed" class="form-input" placeholder="150" min="30" max="600" step="5">
                                        <span class="input-unit">${UnitSystem.getLabel('speed')}</span>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">目标 VS (${UnitSystem.getLabel('verticalSpeed')})</label>
                                    <div class="input-with-unit">
                                        <input type="number" id="vs2-targetVs" class="form-input" placeholder="750" min="-3000" max="3000" step="50">
                                        <span class="input-unit">${UnitSystem.getLabel('verticalSpeed')}</span>
                                    </div>
                                </div>
                            </div>
                            <button class="btn-calculate" onclick="app.calculateAngleFromVs()">计算下滑角</button>
                            <div id="vs2-result" class="result-container" style="display: none;">
                                <div class="result-label">所需下滑角</div>
                                <div class="result-value" id="vs2-result-value">—</div>
                                <div class="result-unit">°</div>
                                <div class="result-advice" id="vs2-result-advice"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- TOD 计算器 -->
            <section id="section-tod" class="calculator-section">
                <div class="section-header">
                    <h2 class="section-title">🛬 TOD 计算器</h2>
                    <p class="section-description">计算开始下降的最佳时机和距离</p>
                </div>
                <div class="grid-container">
                    <div class="card">
                        <div class="card-header">
                            <div class="card-icon">🛬</div>
                            <div>
                                <div class="card-title">TOD 距离计算</div>
                                <div class="card-subtitle">Top of Descent</div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="form-group">
                                <label class="form-label">高度差 (${UnitSystem.getLabel('altitude')})</label>
                                <div class="input-with-unit">
                                    <input type="number" id="tod-altitudeDiff" class="form-input" placeholder="10000" min="100" step="100">
                                    <span class="input-unit">${UnitSystem.getLabel('altitude')}</span>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">下降角 (°)</label>
                                <div class="input-with-unit">
                                    <input type="number" id="tod-glideAngle" class="form-input" placeholder="3" min="0.5" max="10" step="0.1" value="3">
                                    <span class="input-unit">°</span>
                                </div>
                            </div>
                            <button class="btn-calculate" onclick="app.calculateTod()">计算 TOD 距离</button>
                            <div id="tod-result" class="result-container" style="display: none;">
                                <div class="result-label">TOD 距离</div>
                                <div class="result-value" id="tod-result-value">—</div>
                                <div class="result-unit">${UnitSystem.getLabel('distance')}</div>
                                <div class="result-advice" id="tod-result-advice"></div>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <div class="card-icon">⏱️</div>
                            <div>
                                <div class="card-title">TOD 时机计算</div>
                                <div class="card-subtitle">计算何时开始下降</div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="input-row">
                                <div class="form-group">
                                    <label class="form-label">TOD 距离 (${UnitSystem.getLabel('distance')})</label>
                                    <div class="input-with-unit">
                                        <input type="number" id="timing-todDistance" class="form-input" placeholder="15" min="0.1" step="0.5">
                                        <span class="input-unit">${UnitSystem.getLabel('distance')}</span>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">地速 (${UnitSystem.getLabel('speed')})</label>
                                    <div class="input-with-unit">
                                        <input type="number" id="timing-groundSpeed" class="form-input" placeholder="250" min="30" max="600" step="5">
                                        <span class="input-unit">${UnitSystem.getLabel('speed')}</span>
                                    </div>
                                </div>
                            </div>
                            <button class="btn-calculate" onclick="app.calculateTodTiming()">计算下降时机</button>
                            <div id="timing-result" class="result-container" style="display: none;">
                                <div class="result-label">距离下降开始</div>
                                <div class="result-value" id="timing-result-value">—</div>
                                <div class="result-unit"></div>
                                <div class="result-advice" id="timing-result-advice"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 三角计算器 -->
            <section id="section-triangle" class="calculator-section">
                <div class="section-header">
                    <h2 class="section-title">📊 航空三角计算器</h2>
                    <p class="section-description">计算速度、距离、时间三者的关系</p>
                </div>
                <div class="grid-container">
                    <div class="card">
                        <div class="card-header">
                            <div class="card-icon">📊</div>
                            <div>
                                <div class="card-title">航空三角计算</div>
                                <div class="card-subtitle">距离 = 速度 × 时间</div>
                            </div>
                        </div>
                        <div class="card-body">
                            <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 16px;">输入任意两个值，计算第三个值</p>
                            <div class="form-group">
                                <label class="form-label">速度 (${UnitSystem.getLabel('speed')})</label>
                                <div class="input-with-unit">
                                    <input type="number" id="tri-speed" class="form-input" placeholder="250" min="0" step="5">
                                    <span class="input-unit">${UnitSystem.getLabel('speed')}</span>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">距离 (${UnitSystem.getLabel('distance')})</label>
                                <div class="input-with-unit">
                                    <input type="number" id="tri-distance" class="form-input" placeholder="100" min="0" step="1">
                                    <span class="input-unit">${UnitSystem.getLabel('distance')}</span>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">时间 (min)</label>
                                <div class="input-with-unit">
                                    <input type="number" id="tri-time" class="form-input" placeholder="30" min="0" step="1">
                                    <span class="input-unit">min</span>
                                </div>
                            </div>
                            <button class="btn-calculate" onclick="app.calculateTriangle()">计算</button>
                            <div id="tri-result" class="result-container" style="display: none;">
                                <div class="result-label" id="tri-result-label">计算结果</div>
                                <div class="result-value" id="tri-result-value">—</div>
                                <div class="result-unit" id="tri-result-unit"></div>
                                <div class="result-advice" id="tri-result-advice"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 燃油计算器 -->
            <section id="section-fuel" class="calculator-section">
                <div class="section-header">
                    <h2 class="section-title">⛽ 燃油计算器</h2>
                    <p class="section-description">输入飞行距离，推荐燃油量和最大载荷</p>
                </div>
                <div class="grid-container">
                    <!-- 机型选择 -->
                    <div class="card">
                        <div class="card-header">
                            <div class="card-icon">✈️</div>
                            <div>
                                <div class="card-title">选择机型</div>
                                <div class="card-subtitle">Airbus / Boeing</div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="form-group">
                                <label class="form-label">机型</label>
                                <select id="fuel-aircraft" class="form-input" onchange="app.onAircraftChange()">
                                    <option value="">— 选择机型 —</option>
                                    <optgroup label="Airbus">
                                        <option value="A220-100">A220-100</option>
                                        <option value="A220-300">A220-300</option>
                                        <option value="A318-100">A318-100</option>
                                        <option value="A319-100">A319-100</option>
                                        <option value="A319neo">A319neo</option>
                                        <option value="A320-200">A320-200</option>
                                        <option value="A320neo">A320neo</option>
                                        <option value="A321-200">A321-200</option>
                                        <option value="A321neo">A321neo</option>
                                        <option value="A330-200">A330-200</option>
                                        <option value="A330-300">A330-300</option>
                                        <option value="A330-800">A330-800</option>
                                        <option value="A330-900">A330-900</option>
                                        <option value="A340-200">A340-200</option>
                                        <option value="A340-300">A340-300</option>
                                        <option value="A340-500">A340-500</option>
                                        <option value="A340-600">A340-600</option>
                                        <option value="A350-900">A350-900</option>
                                        <option value="A350-1000">A350-1000</option>
                                        <option value="A380-800">A380-800</option>
                                    </optgroup>
                                    <optgroup label="Boeing">
                                        <option value="B707-300">B707-300</option>
                                        <option value="B717-200">B717-200</option>
                                        <option value="B727-100">B727-100</option>
                                        <option value="B727-200">B727-200</option>
                                        <option value="B737-100">B737-100</option>
                                        <option value="B737-300">B737-300</option>
                                        <option value="B737-400">B737-400</option>
                                        <option value="B737-500">B737-500</option>
                                        <option value="B737-600">B737-600</option>
                                        <option value="B737-700">B737-700</option>
                                        <option value="B737-800">B737-800</option>
                                        <option value="B737-900">B737-900</option>
                                        <option value="B737MAX-8">B737 MAX 8</option>
                                        <option value="B737MAX-9">B737 MAX 9</option>
                                        <option value="B747-100">B747-100</option>
                                        <option value="B747-200">B747-200</option>
                                        <option value="B747-400">B747-400</option>
                                        <option value="B747-8">B747-8</option>
                                        <option value="B757-200">B757-200</option>
                                        <option value="B757-300">B757-300</option>
                                        <option value="B767-200">B767-200</option>
                                        <option value="B767-300">B767-300</option>
                                        <option value="B767-400ER">B767-400ER</option>
                                        <option value="B777-200">B777-200</option>
                                        <option value="B777-200ER">B777-200ER</option>
                                        <option value="B777-200LR">B777-200LR</option>
                                        <option value="B777-300ER">B777-300ER</option>
                                        <option value="B777F">B777F</option>
                                        <option value="B787-8">B787-8</option>
                                        <option value="B787-9">B787-9</option>
                                        <option value="B787-10">B787-10</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div id="fuel-aircraft-info" class="result-container" style="display: none;">
                                <div class="result-label">机型信息</div>
                                <div id="fuel-aircraft-details" style="font-size: 13px; color: var(--text-secondary);"></div>
                            </div>
                        </div>
                    </div>

                    <!-- 重量参数 -->
                    <div class="card">
                        <div class="card-header">
                            <div class="card-icon">⚖️</div>
                            <div>
                                <div class="card-title">重量参数</div>
                                <div class="card-subtitle">空机重量和最大起飞重量</div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="input-row">
                                <div class="form-group">
                                    <label class="form-label">空机重量 OEW (${UnitSystem.getLabel('weight')})</label>
                                    <input type="number" id="fuel-oew" class="form-input" placeholder="42100" min="0" step="100" onchange="app.updateFuelCalc()">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">最大起飞重量 MTOW (${UnitSystem.getLabel('weight')})</label>
                                    <input type="number" id="fuel-mtow" class="form-input" placeholder="79000" min="0" step="100" onchange="app.updateFuelCalc()">
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">最大燃油容量 (${UnitSystem.getLabel('fuel')})</label>
                                <input type="number" id="fuel-maxFuel" class="form-input" placeholder="27000" min="0" step="100" onchange="app.updateFuelCalc()">
                            </div>
                        </div>
                    </div>

                    <!-- 飞行信息 -->
                    <div class="card">
                        <div class="card-header">
                            <div class="card-icon">🛫</div>
                            <div>
                                <div class="card-title">飞行信息</div>
                                <div class="card-subtitle">飞行距离和速度</div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="input-row">
                                <div class="form-group">
                                    <label class="form-label">飞行距离 (${UnitSystem.getLabel('distance')})</label>
                                    <input type="number" id="fuel-distance" class="form-input" placeholder="500" min="0" step="10" onchange="app.updateFuelCalc()">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">平均地速 (${UnitSystem.getLabel('speed')})</label>
                                    <input type="number" id="fuel-speed" class="form-input" value="450" min="0" step="10" onchange="app.updateFuelCalc()">
                                </div>
                            </div>
                            <div id="fuel-flight-info" class="result-container" style="display: none;">
                                <div class="result-label">飞行时间估算</div>
                                <div class="result-value" id="fuel-flight-time">—</div>
                                <div class="result-unit" id="fuel-fuel-flow-label">燃油流量: — kg/h</div>
                            </div>
                        </div>
                    </div>

                    <!-- 推荐燃油计算结果 -->
                    <div class="card" style="grid-column: 1 / -1;">
                        <div class="card-header" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(16, 185, 129, 0.08));">
                            <div class="card-icon" style="background: linear-gradient(135deg, #3b82f6, #10b981); color: white;">📊</div>
                            <div>
                                <div class="card-title">燃油与载荷计算结果</div>
                                <div class="card-subtitle">基于飞行距离的推荐配置</div>
                            </div>
                        </div>
                        <div class="card-body">
                            <div id="fuel-recommendation-result" style="display: none;">
                                <!-- 燃油明细 -->
                                <div style="margin-bottom: 20px;">
                                    <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">燃油消耗明细</div>
                                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px;">
                                        <div class="result-container" style="margin: 0; padding: 12px;">
                                            <div class="result-label">巡航燃油</div>
                                            <div style="font-size: 18px; font-weight: 600; color: var(--text-primary);" id="fuel-cruise">—</div>
                                            <div class="result-unit">${UnitSystem.getLabel('fuel')}</div>
                                        </div>
                                        <div class="result-container" style="margin: 0; padding: 12px;">
                                            <div class="result-label">滑行燃油</div>
                                            <div style="font-size: 18px; font-weight: 600; color: var(--text-primary);" id="fuel-taxi">—</div>
                                            <div class="result-unit">${UnitSystem.getLabel('fuel')}</div>
                                        </div>
                                        <div class="result-container" style="margin: 0; padding: 12px;">
                                            <div class="result-label">进近燃油</div>
                                            <div style="font-size: 18px; font-weight: 600; color: var(--text-primary);" id="fuel-approach">—</div>
                                            <div class="result-unit">${UnitSystem.getLabel('fuel')}</div>
                                        </div>
                                        <div class="result-container" style="margin: 0; padding: 12px;">
                                            <div class="result-label">储备燃油</div>
                                            <div style="font-size: 18px; font-weight: 600; color: var(--text-primary);" id="fuel-reserve">—</div>
                                            <div class="result-unit">${UnitSystem.getLabel('fuel')}</div>
                                        </div>
                                    </div>
                                </div>

                                <!-- 三值显示 -->
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                                    <div class="result-container" style="background: linear-gradient(135deg, #f8fafc, #f1f5f9); margin: 0;">
                                        <div class="result-label">① 油箱最大容量</div>
                                        <div class="result-value" id="fuel-tank-capacity">—</div>
                                        <div class="result-unit">${UnitSystem.getLabel('fuel')}</div>
                                    </div>
                                    <div class="result-container" style="background: linear-gradient(135deg, #eff6ff, #dbeafe); margin: 0;">
                                        <div class="result-label">② 建议燃油量</div>
                                        <div class="result-value" id="fuel-suggested">—</div>
                                        <div class="result-unit">${UnitSystem.getLabel('fuel')}</div>
                                        <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">飞行 + 储备</div>
                                    </div>
                                    <div class="result-container" style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); margin: 0;">
                                        <div class="result-label">③ 最大可用载荷</div>
                                        <div class="result-value" id="payload-max">—</div>
                                        <div class="result-unit">${UnitSystem.getLabel('weight')}</div>
                                        <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">MTOW - OEW - 建议燃油</div>
                                    </div>
                                </div>

                                <!-- 警告信息 -->
                                <div id="fuel-warning" style="display: none; margin-top: 16px; padding: 12px 16px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 10px; color: var(--accent-danger); font-size: 13px;">
                                </div>

                                <!-- 实际输入调整 -->
                                <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border-color);">
                                    <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">手动调整</div>
                                    <div class="input-row">
                                        <div class="form-group">
                                            <label class="form-label">手动输入燃油量 (${UnitSystem.getLabel('fuel')})</label>
                                            <input type="number" id="fuel-manual-fuel" class="form-input" placeholder="15000" min="0" step="100" onchange="app.updateFuelFromManual()">
                                        </div>
                                        <div class="form-group">
                                            <label class="form-label">手动输入载荷 (${UnitSystem.getLabel('weight')})</label>
                                            <input type="number" id="fuel-manual-payload" class="form-input" placeholder="10000" min="0" step="100" onchange="app.updateFuelFromManual()">
                                        </div>
                                    </div>
                                    <div id="fuel-manual-result" style="display: none; margin-top: 12px;">
                                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
                                            <div class="result-container" style="margin: 0;">
                                                <div class="result-label">总起飞重量</div>
                                                <div style="font-size: 20px; font-weight: 600;" id="fuel-total-weight">—</div>
                                                <div class="result-unit">${UnitSystem.getLabel('weight')}</div>
                                            </div>
                                            <div class="result-container" style="margin: 0;">
                                                <div class="result-label">剩余可用重量</div>
                                                <div style="font-size: 20px; font-weight: 600;" id="fuel-remaining-weight">—</div>
                                                <div class="result-unit">${UnitSystem.getLabel('weight')}</div>
                                            </div>
                                            <div class="result-container" style="margin: 0;">
                                                <div class="result-label">是否超重</div>
                                                <div style="font-size: 20px; font-weight: 600;" id="fuel-overweight">—</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div id="fuel-placeholder" style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                                <div style="font-size: 40px; margin-bottom: 12px;">⛽</div>
                                <div>选择机型并输入飞行距离开始计算</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    bindEvents() {
        ThemeManager.bindToggle();

        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                const action = e.currentTarget.dataset.action;
                if (action === 'settings') {
                    this.showSettings();
                } else if (section) {
                    this.showSection(section);
                }
            });
        });

        document.querySelectorAll('.form-input').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const card = input.closest('.card');
                    const btn = card.querySelector('.btn-calculate');
                    if (btn) btn.click();
                }
            });
        });
    }

    showSection(sectionId) {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.section === sectionId);
        });
        document.querySelectorAll('.calculator-section').forEach(section => {
            section.classList.toggle('active', section.id === 'section-' + sectionId);
        });
    }

    showSettings() {
        // 防止重复打开
        if (this._settingsModalOpen) {
            return;
        }
        this._settingsModalOpen = true;

        // 保存当前状态（用于取消）
        this._tempUnitConfig = JSON.parse(JSON.stringify(UnitSystem.current));

        const modal = document.createElement('div');
        modal.id = 'settings-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>⚙️ 设置</h3>
                    <button class="modal-close" onclick="app.closeSettingsCancel()">×</button>
                </div>
                <div class="modal-body">
                    <div class="settings-section">
                        <h4>单位系统</h4>
                        <div class="preset-buttons">
                            ${UnitSystem.getPresets().map(p => `
                                <button class="preset-btn ${UnitSystem.current.mode === p.id ? 'active' : ''}"
                                        onclick="app.previewUnitPreset('${p.id}')">${p.name}</button>
                            `).join('')}
                            <button class="preset-btn ${UnitSystem.current.mode === 'custom' ? 'active' : ''}"
                                    onclick="app.previewUnitPreset('custom')">自定义</button>
                        </div>
                        <div id="unit-options" class="unit-options">
                            ${this.renderUnitOptions()}
                        </div>
                    </div>
                    <div class="settings-section">
                        <h4>预设管理</h4>
                        <div class="preset-list">
                            <div class="preset-group">
                                <h5>单位预设</h5>
                                <div id="unit-preset-list"></div>
                            </div>
                            <div class="preset-group">
                                <h5>机型预设</h5>
                                <div id="aircraft-preset-list"></div>
                            </div>
                        </div>
                        <div class="preset-actions" style="flex-wrap: wrap;">
                            <button class="btn-small" onclick="app.saveCurrentUnitPreset()">💾 保存单位</button>
                            <button class="btn-small" onclick="app.saveCurrentAircraftPreset()">✈️ 保存机型</button>
                            <button class="btn-small" onclick="app.exportPresets()">📤 导出</button>
                            <button class="btn-small" onclick="app.importPresets()">📥 导入</button>
                            <button class="btn-small" onclick="app.openProfilesFolder()">📁 打开文件夹</button>
                        </div>
                    </div>
                    <div class="settings-section" style="border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 8px;">
                        <div style="display: flex; gap: 12px; justify-content: flex-end;">
                            <button class="btn-calculate" style="background: var(--bg-secondary); color: var(--text-primary); margin: 0;" onclick="app.closeSettingsCancel()">取消</button>
                            <button class="btn-calculate" style="margin: 0;" onclick="app.applySettings()">✓ 应用</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
        this.updatePresetList();
    }

    /**
     * 预览单位预设（仅高亮，不应用）
     */
    previewUnitPreset(mode) {
        // 更新按钮高亮状态
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        // 临时应用预览
        if (mode === 'custom') {
            UnitSystem.init('custom');
        } else {
            UnitSystem.reset(mode);
        }

        // 更新单位选项显示
        const optionsEl = document.getElementById('unit-options');
        if (optionsEl) {
            optionsEl.innerHTML = this.renderUnitOptions();
        }
    }

    /**
     * 应用设置
     */
    applySettings() {
        // 保存当前配置（确认应用）
        UnitSystem.save();
        this.closeSettingsApply();
    }

    /**
     * 取消设置（恢复到之前状态）
     */
    closeSettingsCancel() {
        // 恢复到之前的配置
        if (this._tempUnitConfig) {
            UnitSystem.current = this._tempUnitConfig;
        }
        this.closeSettingsApply();
    }

    /**
     * 关闭设置弹窗（通用方法）
     */
    closeSettings() {
        this.closeSettingsApply();
    }

    closeSettingsApply() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
                this._settingsModalOpen = false;
                this._tempUnitConfig = null;
                // 重新渲染以刷新单位标签
                this.renderCalculatorSections();
                this.bindEvents();
                // 恢复之前的 section
                const activeTab = document.querySelector('.nav-tab.active');
                if (activeTab && activeTab.dataset.section) {
                    this.showSection(activeTab.dataset.section);
                }
            }, 200);
        } else {
            this._settingsModalOpen = false;
            this._tempUnitConfig = null;
        }
    }

    renderUnitOptions() {
        const types = ['distance', 'speed', 'altitude', 'verticalSpeed', 'weight', 'fuel'];
        return types.map(type => `
            <div class="unit-option-row">
                <label>${this.getUnitLabelName(type)}</label>
                <select onchange="app.updateUnit('${type}', this.value)">
                    ${UnitSystem.getOptions(type).map(opt => `
                        <option value="${opt.value}" ${UnitSystem.current[type] === opt.value ? 'selected' : ''}>${opt.label}</option>
                    `).join('')}
                </select>
            </div>
        `).join('');
    }

    getUnitLabelName(type) {
        const names = {
            distance: '距离',
            speed: '速度',
            altitude: '高度',
            verticalSpeed: '垂直速度',
            weight: '重量',
            fuel: '燃油'
        };
        return names[type] || type;
    }

    updateUnit(type, value) {
        UnitSystem.setUnit(type, value);
        // 刷新单位选项的显示
        const optionsEl = document.getElementById('unit-options');
        if (optionsEl) {
            optionsEl.innerHTML = this.renderUnitOptions();
        }
    }

    saveCurrentUnitPreset() {
        const name = prompt('输入预设名称:');
        if (name && name.trim()) {
            this.saveUnitPresetToSystem(name.trim(), UnitSystem.getConfig());
        }
    }

    async saveUnitPresetToSystem(name, config) {
        // 优先使用桌面端 API
        if (DesktopAPI.isDesktop) {
            const result = await DesktopAPI.invoke('save_unit_preset', name, config);
            if (result) {
                this.updatePresetList();
                alert(`✓ 已保存: ${name}\n\n预设将保存到 profiles/units/ 文件夹`);
            }
        } else {
            // 浏览器模式降级
            ProfileManager.saveUnitPreset(name, config);
            this.updatePresetList();
            alert(`已保存: ${name}`);
        }
    }

    updatePresetList() {
        this.updateUnitPresetList();
        this.updateAircraftPresetList();
    }

    async updateUnitPresetList() {
        const list = document.getElementById('unit-preset-list');
        if (!list) return;

        let presets = [];
        if (DesktopAPI.isDesktop) {
            presets = await DesktopAPI.invoke('list_unit_presets');
        } else {
            presets = ProfileManager.listUnitPresets();
        }

        if (presets.length === 0) {
            list.innerHTML = '<p style="color: var(--text-muted); font-size: 12px;">暂无保存的预设</p>';
        } else {
            list.innerHTML = presets.map(p => {
                const savedDate = new Date(p.savedAt).toLocaleDateString('zh-CN');
                return `
                <div class="preset-item">
                    <div class="preset-info">
                        <span class="preset-name">${p.name}</span>
                        <span class="preset-date">${savedDate}</span>
                    </div>
                    <div class="preset-actions">
                        <button class="btn-small" onclick="app.loadUnitPreset('${p.name}')">加载</button>
                        <button class="btn-small" onclick="app.deleteUnitPreset('${p.name}')">×</button>
                    </div>
                </div>
            `}).join('');
        }
    }

    async loadUnitPreset(name) {
        let preset;
        if (DesktopAPI.isDesktop) {
            preset = await DesktopAPI.invoke('load_preset', 'units', name);
        } else {
            preset = ProfileManager.loadUnitPreset(name);
        }

        if (preset) {
            UnitSystem.current = { ...preset.config, mode: 'custom' };
            UnitSystem.save();
            alert(`✓ 已加载预设: ${name}`);
        }
    }

    async deleteUnitPreset(name) {
        if (!confirm('确定删除此预设?')) return;

        if (DesktopAPI.isDesktop) {
            await DesktopAPI.invoke('delete_preset', 'units', name);
        } else {
            const key = `profiles/units/${name}`;
            ProfileManager.deletePreset(key);
        }
        this.updatePresetList();
    }

    async exportPresets() {
        if (DesktopAPI.isDesktop) {
            const result = await DesktopAPI.invoke('export_all');
            if (result) {
                if (window.__TAURI__) {
                    const { save } = window.__TAURI__.dialog;
                    const path = await save({
                        defaultPath: 'flight-calculator-profiles.json',
                        filters: [{ name: 'JSON', extensions: ['json'] }]
                    });
                    if (path) {
                        const { writeTextFile } = window.__TAURI__.fs;
                        await writeTextFile(path, JSON.stringify(result, null, 2));
                        alert(`✓ 导出成功\n\n保存到: ${path}`);
                    }
                } else if (window.electronAPI) {
                    // Electron 原有逻辑
                }
            }
        } else {
            const data = ProfileManager.exportAll();
            ProfileManager.downloadFile(data, 'flight-calculator-profiles.json');
            alert('已下载: flight-calculator-profiles.json');
        }
    }

    async importPresets() {
        if (DesktopAPI.isDesktop) {
            if (window.__TAURI__) {
                const { open } = window.__TAURI__.dialog;
                const path = await open({
                    filters: [{ name: 'JSON', extensions: ['json'] }],
                    multiple: false
                });
                if (path) {
                    const { readTextFile } = window.__TAURI__.fs;
                    const content = await readTextFile(path);
                    const data = JSON.parse(content);
                    if (data.aircraft) {
                        for (const p of data.aircraft) {
                            await DesktopAPI.invoke('save_aircraft_preset', p.name, p.config);
                        }
                    }
                    if (data.units) {
                        for (const p of data.units) {
                            await DesktopAPI.invoke('save_unit_preset', p.name, p.config);
                        }
                    }
                    this.updatePresetList();
                    alert(`✓ 导入成功`);
                }
            } else if (window.electronAPI) {
                // Electron 原有逻辑
            }
        } else {
            alert('请使用桌面版以支持导入功能');
        }
    }

    async openProfilesFolder() {
        if (DesktopAPI.isDesktop) {
            await DesktopAPI.openFolder();
        } else {
            alert('此功能仅在桌面版中可用');
        }
    }

    // ============================================================
    // 机型预设
    // ============================================================

    saveCurrentAircraftPreset() {
        // 获取当前燃油计算器的配置
        const aircraft = document.getElementById('fuel-aircraft').value;
        const oew = document.getElementById('fuel-oew').value;
        const mtow = document.getElementById('fuel-mtow').value;
        const maxFuel = document.getElementById('fuel-maxFuel').value;

        if (!oew || !mtow || !maxFuel) {
            alert('请先在燃油计算器中填写参数');
            return;
        }

        const name = prompt('输入机型预设名称:');
        if (name && name.trim()) {
            const config = {
                aircraft: aircraft,
                oew: parseFloat(oew),
                mtow: parseFloat(mtow),
                maxFuel: parseFloat(maxFuel)
            };
            this.saveAircraftPresetToSystem(name.trim(), config);
        }
    }

    async saveAircraftPresetToSystem(name, config) {
        if (DesktopAPI.isDesktop) {
            const result = await DesktopAPI.invoke('save_aircraft_preset', name, config);
            if (result) {
                this.updatePresetList();
                alert(`✓ 已保存: ${name}\n\n预设将保存到 profiles/aircraft/ 文件夹`);
            }
        } else {
            ProfileManager.saveAircraftPreset(name, config);
            this.updatePresetList();
            alert(`已保存: ${name}`);
        }
    }

    async updateAircraftPresetList() {
        const list = document.getElementById('aircraft-preset-list');
        if (!list) return;

        let presets = [];
        if (DesktopAPI.isDesktop) {
            presets = await DesktopAPI.invoke('list_aircraft_presets');
        } else {
            presets = ProfileManager.listAircraftPresets();
        }

        if (presets.length === 0) {
            list.innerHTML = '<p style="color: var(--text-muted); font-size: 12px;">暂无保存的预设</p>';
        } else {
            list.innerHTML = presets.map(p => {
                const savedDate = new Date(p.savedAt).toLocaleDateString('zh-CN');
                return `
                <div class="preset-item">
                    <div class="preset-info">
                        <span class="preset-name">${p.name}</span>
                        <span class="preset-date">${savedDate}</span>
                    </div>
                    <div class="preset-actions">
                        <button class="btn-small" onclick="app.loadAircraftPreset('${p.name}')">加载</button>
                        <button class="btn-small" onclick="app.deleteAircraftPreset('${p.name}')">×</button>
                    </div>
                </div>
            `}).join('');
        }
    }

    async loadAircraftPreset(name) {
        let preset;
        if (DesktopAPI.isDesktop) {
            preset = await DesktopAPI.invoke('load_preset', 'aircraft', name);
        } else {
            preset = ProfileManager.loadAircraftPreset(name);
        }

        if (preset && preset.config) {
            const config = preset.config;
            document.getElementById('fuel-aircraft').value = config.aircraft || '';
            document.getElementById('fuel-oew').value = config.oew || '';
            document.getElementById('fuel-mtow').value = config.mtow || '';
            document.getElementById('fuel-maxFuel').value = config.maxFuel || '';

            // 更新 FuelCalculator 状态
            if (config.oew) FuelCalculator.state.oew = config.oew;
            if (config.mtow) FuelCalculator.state.mtow = config.mtow;
            if (config.maxFuel) FuelCalculator.state.maxFuel = config.maxFuel;

            // 如果选择了机型，更新详细信息
            if (config.aircraft) {
                FuelCalculator.selectAircraft(config.aircraft);
            }

            alert(`✓ 已加载机型预设: ${name}`);
        }
    }

    async deleteAircraftPreset(name) {
        if (!confirm('确定删除此预设?')) return;

        if (DesktopAPI.isDesktop) {
            await DesktopAPI.invoke('delete_preset', 'aircraft', name);
        } else {
            const key = `profiles/aircraft/${name}`;
            ProfileManager.deletePreset(key);
        }
        this.updatePresetList();
    }

    // 计算方法
    calculateGlideSlope() {
        const altitudeDiff = FlightUtils.parseInput(document.getElementById('gs-altitudeDiff').value);
        const distance = FlightUtils.parseInput(document.getElementById('gs-distance').value);
        this.displayResult('gs-result', GlideSlopeCalculator.calculate(altitudeDiff, distance));
    }

    calculateVerticalSpeed() {
        const groundSpeed = FlightUtils.parseInput(document.getElementById('vs-groundSpeed').value);
        const glideAngle = FlightUtils.parseInput(document.getElementById('vs-glideAngle').value);
        this.displayResult('vs-result', VerticalSpeedCalculator.calculate(groundSpeed, glideAngle));
    }

    calculateAngleFromVs() {
        const groundSpeed = FlightUtils.parseInput(document.getElementById('vs2-groundSpeed').value);
        const targetVs = FlightUtils.parseInput(document.getElementById('vs2-targetVs').value);
        this.displayResult('vs2-result', VerticalSpeedCalculator.calculateAngleFromVs(groundSpeed, targetVs));
    }

    calculateTod() {
        const altitudeDiff = FlightUtils.parseInput(document.getElementById('tod-altitudeDiff').value);
        const glideAngle = FlightUtils.parseInput(document.getElementById('tod-glideAngle').value);
        this.displayResult('tod-result', TodCalculator.calculate(altitudeDiff, glideAngle));
    }

    calculateTodTiming() {
        const todDistance = FlightUtils.parseInput(document.getElementById('timing-todDistance').value);
        const groundSpeed = FlightUtils.parseInput(document.getElementById('timing-groundSpeed').value);
        this.displayResult('timing-result', TodCalculator.calculateTodTiming(todDistance, groundSpeed));
    }

    calculateTriangle() {
        const speed = FlightUtils.parseInput(document.getElementById('tri-speed').value);
        const distance = FlightUtils.parseInput(document.getElementById('tri-distance').value);
        const time = FlightUtils.parseInput(document.getElementById('tri-time').value);
        this.displayResult('tri-result', TriangleCalculator.calculate({ speed, distance, time }));
    }

    displayResult(containerId, result) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.style.display = 'block';

        if (!result.success) {
            container.innerHTML = '<div class="result-label">错误</div><div class="result-value" style="color: var(--accent-danger); font-size: 18px;">⚠️ ' + result.error + '</div>';
            return;
        }

        let value = '', unit = '', label = '';

        if (result.result.angle !== undefined) {
            value = result.result.angleFormatted;
            unit = '°';
            label = '下滑角';
        } else if (result.result.vs !== undefined) {
            value = result.result.vsFormatted;
            unit = UnitSystem.getLabel('verticalSpeed');
            label = '垂直速度';
        } else if (result.result.distanceNm !== undefined) {
            value = result.result.distanceNmFormatted;
            unit = UnitSystem.getLabel('distance');
            label = 'TOD 距离';
        } else if (result.result.timeMinutes !== undefined) {
            value = result.result.timeMinutesFormatted;
            unit = '';
            label = '所需时间';
        } else if (result.result.speedKt !== undefined) {
            value = result.result.speedKtFormatted;
            unit = UnitSystem.getLabel('speed');
            label = '速度';
        }

        container.querySelector('.result-value').textContent = value || '—';
        container.querySelector('.result-label').textContent = label;
        container.querySelector('.result-unit').textContent = unit;
        container.querySelector('.result-advice').textContent = result.advice || '';
    }

    // 燃油计算方法
    onAircraftChange() {
        const select = document.getElementById('fuel-aircraft');
        const key = select.value;
        const infoDiv = document.getElementById('fuel-aircraft-info');
        const detailsDiv = document.getElementById('fuel-aircraft-details');

        if (!key) {
            infoDiv.style.display = 'none';
            FuelCalculator.reset();
            return;
        }

        const aircraft = FuelCalculator.selectAircraft(key);
        if (aircraft) {
            // 从标准单位转换为显示单位
            const oew = Math.round(UnitSystem.fromStandard('weight', aircraft.oew));
            const mtow = Math.round(UnitSystem.fromStandard('weight', aircraft.mtow));
            const maxFuel = Math.round(UnitSystem.fromStandard('fuel', aircraft.maxFuel));

            document.getElementById('fuel-oew').value = oew;
            document.getElementById('fuel-mtow').value = mtow;
            document.getElementById('fuel-maxFuel').value = maxFuel;

            const fuelFlowDisplay = Math.round(UnitSystem.fromStandard('fuelFlow', aircraft.fuelFlow));
            detailsDiv.innerHTML = `
                <div>机型: ${aircraft.name}</div>
                <div>系列: ${aircraft.family} ${aircraft.type === 'wide' ? '(宽体)' : '(窄体)'}</div>
                <div>OEW: ${oew.toLocaleString()} ${UnitSystem.getLabel('weight')}</div>
                <div>MTOW: ${mtow.toLocaleString()} ${UnitSystem.getLabel('weight')}</div>
                <div>最大燃油: ${maxFuel.toLocaleString()} ${UnitSystem.getLabel('fuel')}</div>
                <div>燃油流量: ${fuelFlowDisplay} ${UnitSystem.getLabel('fuelFlow')}</div>
            `;
            infoDiv.style.display = 'block';
            this.updateFuelCalc();
        }
    }

    updateFuelCalc() {
        // 获取显示单位值
        const oewDisplay = FlightUtils.parseInput(document.getElementById('fuel-oew').value);
        const mtowDisplay = FlightUtils.parseInput(document.getElementById('fuel-mtow').value);
        const maxFuelDisplay = FlightUtils.parseInput(document.getElementById('fuel-maxFuel').value);
        const distanceDisplay = FlightUtils.parseInput(document.getElementById('fuel-distance').value);
        const speedDisplay = FlightUtils.parseInput(document.getElementById('fuel-speed').value);

        // 转换为标准单位存储
        if (oewDisplay) FuelCalculator.state.oew = Math.round(UnitSystem.toStandard('weight', oewDisplay));
        if (mtowDisplay) FuelCalculator.state.mtow = Math.round(UnitSystem.toStandard('weight', mtowDisplay));
        if (maxFuelDisplay) FuelCalculator.state.maxFuel = Math.round(UnitSystem.toStandard('fuel', maxFuelDisplay));
        if (distanceDisplay) FuelCalculator.state.flightDistance = Math.round(UnitSystem.toStandard('distance', distanceDisplay));
        if (speedDisplay) FuelCalculator.state.avgSpeed = Math.round(UnitSystem.toStandard('speed', speedDisplay));

        // 计算并显示结果
        this.calculateFuelRecommendation();
    }

    calculateFuelRecommendation() {
        const { oew, mtow, maxFuel, flightDistance, avgSpeed, fuelFlow } = FuelCalculator.state;
        const resultDiv = document.getElementById('fuel-recommendation-result');
        const placeholderDiv = document.getElementById('fuel-placeholder');
        const flightInfoDiv = document.getElementById('fuel-flight-info');
        const warningDiv = document.getElementById('fuel-warning');

        // 检查是否有所需数据
        if (!oew || !mtow || !maxFuel || !fuelFlow) {
            resultDiv.style.display = 'none';
            placeholderDiv.style.display = 'block';
            placeholderDiv.innerHTML = '<div style="font-size: 40px; margin-bottom: 12px;">⛽</div><div>选择机型并输入参数开始计算</div>';
            return;
        }

        // 显示飞行信息
        if (flightDistance && avgSpeed) {
            const flightFuel = FuelCalculator.calculateFlightFuel(flightDistance, avgSpeed);
            document.getElementById('fuel-flight-time').textContent = flightFuel.flightTime;
            document.getElementById('fuel-fuel-flow-label').textContent = `燃油流量: ${Math.round(UnitSystem.fromStandard('fuelFlow', fuelFlow)).toLocaleString()} ${UnitSystem.getLabel('fuelFlow')}`;
            flightInfoDiv.style.display = 'block';
        } else {
            flightInfoDiv.style.display = 'none';
        }

        // 计算推荐
        const result = FuelCalculator.calculateFull(flightDistance || 0, 0, avgSpeed || 450);

        // 显示燃油明细
        if (result.flightFuel && !result.flightFuel.error) {
            document.getElementById('fuel-cruise').textContent = Math.round(UnitSystem.fromStandard('fuel', result.flightFuel.cruiseFuel)).toLocaleString();
            document.getElementById('fuel-taxi').textContent = Math.round(UnitSystem.fromStandard('fuel', result.flightFuel.taxiFuel)).toLocaleString();
            document.getElementById('fuel-approach').textContent = Math.round(UnitSystem.fromStandard('fuel', result.flightFuel.approachFuel)).toLocaleString();
            document.getElementById('fuel-reserve').textContent = Math.round(UnitSystem.fromStandard('fuel', result.flightFuel.reserveFuel)).toLocaleString();
        }

        // 三值显示
        document.getElementById('fuel-tank-capacity').textContent = Math.round(UnitSystem.fromStandard('fuel', maxFuel)).toLocaleString();
        document.getElementById('fuel-suggested').textContent = Math.round(UnitSystem.fromStandard('fuel', result.suggestedFuel)).toLocaleString();
        document.getElementById('payload-max').textContent = Math.round(UnitSystem.fromStandard('weight', result.suggestedPayload)).toLocaleString();

        // 警告
        if (result.warning) {
            warningDiv.style.display = 'block';
            warningDiv.textContent = result.warning;
        } else {
            warningDiv.style.display = 'none';
        }

        resultDiv.style.display = 'block';
        placeholderDiv.style.display = 'none';
    }

    updateFuelFromManual() {
        const manualFuelDisplay = FlightUtils.parseInput(document.getElementById('fuel-manual-fuel').value);
        const manualPayloadDisplay = FlightUtils.parseInput(document.getElementById('fuel-manual-payload').value);
        const manualResultDiv = document.getElementById('fuel-manual-result');

        if (!manualFuelDisplay && !manualPayloadDisplay) {
            manualResultDiv.style.display = 'none';
            return;
        }

        const { oew, mtow, maxFuel } = FuelCalculator.state;
        if (!oew || !mtow) {
            manualResultDiv.style.display = 'none';
            return;
        }

        // 使用提供的值，或计算可用的最大值
        let fuel, payload;

        if (manualFuelDisplay) {
            // 手动输入了燃油
            fuel = Math.round(UnitSystem.toStandard('fuel', manualFuelDisplay));
            // 计算可用载荷
            const result = FuelCalculator.calcPayloadWithFuel(fuel);
            payload = result.maxPayloadWithFuel;
        } else if (manualPayloadDisplay) {
            // 手动输入了载荷
            payload = Math.round(UnitSystem.toStandard('weight', manualPayloadDisplay));
            // 计算可用燃油
            const result = FuelCalculator.calcFuelWithPayload(payload);
            fuel = result.maxFuelWithPayload;
        }

        // 计算总重量
        const totalWeight = oew + fuel + payload;
        const remainingWeight = mtow - totalWeight;
        const isOverweight = totalWeight > mtow;

        document.getElementById('fuel-total-weight').textContent = Math.round(UnitSystem.fromStandard('weight', totalWeight)).toLocaleString();
        document.getElementById('fuel-remaining-weight').textContent = Math.round(UnitSystem.fromStandard('weight', Math.max(0, remainingWeight))).toLocaleString();

        const overweightEl = document.getElementById('fuel-overweight');
        if (isOverweight) {
            overweightEl.textContent = '⚠️ 超重';
            overweightEl.style.color = 'var(--accent-danger)';
        } else {
            overweightEl.textContent = '✓ 正常';
            overweightEl.style.color = 'var(--accent-success)';
        }

        manualResultDiv.style.display = 'block';
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    app = new FlightCalculatorApp();
});

// 添加弹窗样式
const style = document.createElement('style');
style.textContent = `
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.2s;
}
.modal-overlay.show {
    opacity: 1;
}
.modal-content {
    background: var(--bg-primary);
    border-radius: 16px;
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow: auto;
}
.modal-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.modal-header h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
}
.modal-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: var(--text-muted);
}
.modal-body {
    padding: 20px;
}
.settings-section {
    margin-bottom: 24px;
}
.settings-section h4 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--text-primary);
}
.preset-buttons {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    flex-wrap: wrap;
}
.preset-btn {
    padding: 8px 16px;
    border: 1px solid var(--border-color);
    background: var(--bg-input);
    color: var(--text-primary);
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
}
.preset-btn:hover {
    border-color: var(--border-hover);
}
.preset-btn.active {
    background: var(--accent-secondary);
    color: white;
    border-color: var(--accent-secondary);
}
.unit-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.unit-option-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.unit-option-row label {
    font-size: 13px;
    color: var(--text-secondary);
}
.unit-option-row select {
    padding: 6px 10px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 13px;
    background: var(--bg-input);
    color: var(--text-primary);
}
.unit-option-row select option {
    background: var(--bg-card);
    color: var(--text-primary);
}
.preset-list {
    margin-bottom: 16px;
}
.preset-group h5 {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 8px;
}
.preset-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    background: var(--bg-secondary);
    border-radius: 6px;
    margin-bottom: 6px;
    font-size: 13px;
}
.preset-item button {
    padding: 4px 10px;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    background: var(--bg-primary);
    color: var(--text-secondary);
}
.preset-item button:hover {
    background: var(--border-color);
}
.preset-actions {
    display: flex;
    gap: 8px;
}
.btn-small {
    padding: 8px 16px;
    border: 1px solid var(--border-color);
    background: var(--bg-input);
    color: var(--text-primary);
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;
}
.btn-small:hover {
    background: var(--border-color);
}
`;
document.head.appendChild(style);