/**
 * 单位转换系统 (Unit Conversion System)
 *
 * 支持四种模式：
 * - Metric: 公制 (m, km/h, kg, °C)
 * - Imperial: 英制 (ft, kt, lb, °F)
 * - Mixed: 混合 (ft, km/h, kg, °C)
 * - Custom: 自定义（任意组合）
 *
 * 内部标准单位：ft, kt, kg, °C, NM, min
 */

const UnitSystem = {
    // 内置预设
    PRESETS: {
        metric: {
            name: '公制',
            nameEn: 'Metric',
            distance: 'm',
            speed: 'km/h',
            altitude: 'm',
            verticalSpeed: 'm/s',
            weight: 'kg',
            fuel: 'kg',
            temperature: '°C',
            pressure: 'hPa'
        },
        imperial: {
            name: '英制',
            nameEn: 'Imperial',
            distance: 'ft',
            speed: 'kt',
            altitude: 'ft',
            verticalSpeed: 'ft/min',
            weight: 'lb',
            fuel: 'lb',
            temperature: '°F',
            pressure: 'inHg'
        },
        mixed: {
            name: '混合',
            nameEn: 'Mixed',
            distance: 'NM',
            speed: 'kt',
            altitude: 'ft',
            verticalSpeed: 'ft/min',
            weight: 'kg',
            fuel: 'kg',
            temperature: '°C',
            pressure: 'hPa'
        }
    },

    // 标准单位定义
    STANDARD: {
        distance: 'NM',
        speed: 'kt',
        altitude: 'ft',
        verticalSpeed: 'ft/min',
        weight: 'kg',
        fuel: 'kg',
        temperature: '°C',
        pressure: 'hPa',
        time: 'min',
        angle: '°',
        fuelFlow: 'kg/h'
    },

    // 可用单位选项
    OPTIONS: {
        distance: [
            { value: 'NM', label: 'NM', toStandard: v => v, fromStandard: v => v },
            { value: 'km', label: 'km', toStandard: v => v / 1.852, fromStandard: v => v * 1.852 },
            { value: 'mi', label: 'mi', toStandard: v => v * 1.15078, fromStandard: v => v / 1.15078 },
            { value: 'm', label: 'm', toStandard: v => v / 1852, fromStandard: v => v * 1852 }
        ],
        speed: [
            { value: 'kt', label: 'kt', toStandard: v => v, fromStandard: v => v },
            { value: 'km/h', label: 'km/h', toStandard: v => v / 1.852, fromStandard: v => v * 1.852 },
            { value: 'mph', label: 'mph', toStandard: v => v / 1.15078, fromStandard: v => v * 1.15078 },
            { value: 'm/s', label: 'm/s', toStandard: v => v * 1.94384, fromStandard: v => v / 1.94384 }
        ],
        altitude: [
            { value: 'ft', label: 'ft', toStandard: v => v, fromStandard: v => v },
            { value: 'm', label: 'm', toStandard: v => v * 3.28084, fromStandard: v => v / 3.28084 }
        ],
        verticalSpeed: [
            { value: 'ft/min', label: 'ft/min', toStandard: v => v, fromStandard: v => v },
            { value: 'm/s', label: 'm/s', toStandard: v => v * 196.85, fromStandard: v => v / 196.85 },
            { value: 'm/min', label: 'm/min', toStandard: v => v * 3.28084, fromStandard: v => v / 3.28084 }
        ],
        weight: [
            { value: 'kg', label: 'kg', toStandard: v => v, fromStandard: v => v },
            { value: 'lb', label: 'lb', toStandard: v => v / 2.20462, fromStandard: v => v * 2.20462 }
        ],
        fuel: [
            { value: 'kg', label: 'kg', toStandard: v => v, fromStandard: v => v },
            { value: 'lb', label: 'lb', toStandard: v => v / 2.20462, fromStandard: v => v * 2.20462 },
            { value: 'gal', label: 'gal (US)', toStandard: v => v * 3.04, fromStandard: v => v / 3.04 }
        ],
        temperature: [
            { value: '°C', label: '°C', toStandard: v => v, fromStandard: v => v },
            { value: '°F', label: '°F', toStandard: v => (v - 32) * 5/9, fromStandard: v => v * 9/5 + 32 }
        ],
        pressure: [
            { value: 'hPa', label: 'hPa', toStandard: v => v, fromStandard: v => v },
            { value: 'inHg', label: 'inHg', toStandard: v => v * 33.8639, fromStandard: v => v / 33.8639 },
            { value: 'mbar', label: 'mbar', toStandard: v => v, fromStandard: v => v }
        ],
        time: [
            { value: 'min', label: 'min', toStandard: v => v, fromStandard: v => v },
            { value: 'sec', label: 'sec', toStandard: v => v / 60, fromStandard: v => v * 60 },
            { value: 'hr', label: 'hr', toStandard: v => v * 60, fromStandard: v => v / 60 }
        ],
        fuelFlow: [
            { value: 'kg/h', label: 'kg/h', toStandard: v => v, fromStandard: v => v },
            { value: 'lb/h', label: 'lb/h', toStandard: v => v / 2.20462, fromStandard: v => v * 2.20462 },
            { value: 'gal/h', label: 'gal/h', toStandard: v => v * 3.04, fromStandard: v => v / 3.04 }
        ]
    },

    // 当前配置
    current: null,

    /**
     * 初始化单位系统
     * @param {string} mode - 'metric' | 'imperial' | 'mixed' | 'custom'
     * @param {object} customConfig - 自定义配置（当 mode='custom' 时）
     */
    init(mode = 'mixed', customConfig = null) {
        if (mode === 'custom' && customConfig) {
            this.current = { ...customConfig };
        } else if (this.PRESETS[mode]) {
            this.current = { ...this.PRESETS[mode] };
        } else {
            this.current = { ...this.PRESETS.mixed };
        }
        this.current.mode = mode;
        this.save();
    },

    /**
     * 获取转换器
     * @param {string} type - 单位类型
     * @returns {function} 转换函数 { toStandard, fromStandard }
     */
    getConverter(type) {
        const unit = this.current[type] || this.STANDARD[type];
        const options = this.OPTIONS[type] || [];
        const option = options.find(o => o.value === unit);
        return option || { toStandard: v => v, fromStandard: v => v };
    },

    /**
     * 转换为标准单位
     * @param {string} type - 单位类型
     * @param {number} value - 输入值
     * @returns {number} 标准单位值
     */
    toStandard(type, value) {
        const converter = this.getConverter(type);
        return converter.toStandard(value);
    },

    /**
     * 从标准单位转换
     * @param {string} type - 单位类型
     * @param {number} value - 标准单位值
     * @returns {number} 显示值
     */
    fromStandard(type, value) {
        const converter = this.getConverter(type);
        return converter.fromStandard(value);
    },

    /**
     * 格式化显示值
     * @param {string} type - 单位类型
     * @param {number} value - 标准单位值
     * @param {number} decimals - 小数位数
     * @returns {string} 格式化后的字符串
     */
    format(type, value, decimals = 1) {
        const displayValue = this.fromStandard(type, value);
        const unit = this.current[type] || this.STANDARD[type];
        return `${displayValue.toFixed(decimals)} ${unit}`;
    },

    /**
     * 获取当前单位标签
     * @param {string} type - 单位类型
     * @returns {string} 单位标签
     */
    getLabel(type) {
        return this.current[type] || this.STANDARD[type] || type;
    },

    /**
     * 设置单个单位
     * @param {string} type - 单位类型
     * @param {string} unit - 单位值
     */
    setUnit(type, unit) {
        if (!this.current) this.init('custom');
        this.current.mode = 'custom';
        this.current[type] = unit;
        this.save();
    },

    /**
     * 保存当前配置到 localStorage
     */
    save() {
        if (this.current) {
            localStorage.setItem('_unitConfig', JSON.stringify(this.current));
        }
    },

    /**
     * 从 localStorage 加载配置
     */
    load() {
        const saved = localStorage.getItem('_unitConfig');
        if (saved) {
            try {
                this.current = JSON.parse(saved);
            } catch (e) {
                this.init('mixed');
            }
        } else {
            this.init('mixed');
        }
    },

    /**
     * 获取当前配置
     * @returns {object} 当前配置
     */
    getConfig() {
        return this.current ? { ...this.current } : null;
    },

    /**
     * 重置为默认配置
     * @param {string} mode - 'metric' | 'imperial' | 'mixed'
     */
    reset(mode = 'mixed') {
        this.init(mode);
    },

    /**
     * 获取所有可用预设
     * @returns {array} 预设列表
     */
    getPresets() {
        return Object.entries(this.PRESETS).map(([key, value]) => ({
            id: key,
            name: value.name,
            nameEn: value.nameEn,
            config: { ...value }
        }));
    },

    /**
     * 获取指定类型的可用选项
     * @param {string} type - 单位类型
     * @returns {array} 可用选项
     */
    getOptions(type) {
        return this.OPTIONS[type] || [];
    }
};

// 注册为全局
if (typeof window !== 'undefined') {
    window.UnitSystem = UnitSystem;
}