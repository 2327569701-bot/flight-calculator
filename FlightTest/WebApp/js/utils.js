/**
 * 航空计算工具函数库
 *
 * 提供通用的航空计算辅助函数
 */

// 单位转换常量
export const UNITS = {
    // 长度
    FT_PER_METER: 3.28084,
    FT_PER_NM: 6076,
    FT_PER_MILE: 5280,
    NM_PER_KM: 0.539957,
    KM_PER_NM: 1.852,

    // 速度
    KT_PER_KMH: 0.539957,
    KMH_PER_KT: 1.852,

    // 时间
    SEC_PER_MIN: 60,
    MIN_PER_HOUR: 60,
    SEC_PER_HOUR: 3600
};

/**
 * 格式化数字显示
 * @param {number} value - 数值
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化字符串
 */
export function formatNumber(value, decimals = 1) {
    if (typeof value !== 'number' || isNaN(value)) {
        return '—';
    }
    return value.toFixed(decimals);
}

/**
 * 解析输入值
 * @param {string} inputStr - 输入字符串
 * @returns {number|null} 解析后的数值
 */
export function parseInput(inputStr) {
    if (!inputStr || typeof inputStr !== 'string') {
        return null;
    }

    const cleaned = inputStr.trim().replace(/,/g, '');
    const value = parseFloat(cleaned);

    if (isNaN(value)) {
        return null;
    }
    return value;
}

/**
 * 验证数值是否在范围内
 * @param {number} value - 数值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {object} 验证结果
 */
export function validateRange(value, min, max) {
    if (value < min) {
        return { valid: false, message: `值不能小于 ${min}` };
    }
    if (value > max) {
        return { valid: false, message: `值不能大于 ${max}` };
    }
    return { valid: true };
}

/**
 * 角度转换
 */
export const Angle = {
    degToRad(deg) {
        return deg * (Math.PI / 180);
    },
    radToDeg(rad) {
        return rad * (180 / Math.PI);
    }
};

/**
 * 距离转换
 */
export const Distance = {
    nmToFt(nm) {
        return nm * UNITS.FT_PER_NM;
    },
    ftToNm(ft) {
        return ft / UNITS.FT_PER_NM;
    },
    nmToKm(nm) {
        return nm * UNITS.KM_PER_NM;
    },
    kmToNm(km) {
        return km * UNITS.NM_PER_KM;
    }
};

/**
 * 速度转换
 */
export const Speed = {
    ktToKmh(kt) {
        return kt * UNITS.KMH_PER_KT;
    },
    kmhToKt(kmh) {
        return kmh * UNITS.KT_PER_KMH;
    }
};

/**
 * 时间格式化
 * @param {number} minutes - 分钟数
 * @returns {object} 格式化的时间对象
 */
export function formatTime(minutes) {
    const totalSeconds = Math.round(minutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    return {
        hours,
        minutes: mins,
        seconds: secs,
        toString() {
            if (hours > 0) {
                return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            }
            return `${mins}:${String(secs).padStart(2, '0')}`;
        }
    };
}

/**
 * 颜色根据数值获取状态
 * @param {number} value - 数值
 * @param {object} ranges - 范围定义 { low, normal, high, critical }
 * @returns {string} 颜色标识
 */
export function getStatusColor(value, ranges) {
    const absValue = Math.abs(value);

    if (ranges.critical && absValue >= ranges.critical) {
        return 'danger';
    }
    if (ranges.high && absValue >= ranges.high) {
        return 'warning';
    }
    if (ranges.normal && absValue <= ranges.normal) {
        return 'success';
    }
    return 'info';
}

/**
 * 生成唯一 ID
 * @returns {string} 唯一标识符
 */
export function generateId() {
    return `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 防抖函数
 * @param {function} func - 要防抖的函数
 * @param {number} wait - 等待时间 (ms)
 * @returns {function} 防抖后的函数
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 深拷贝对象
 * @param {object} obj - 要拷贝的对象
 * @returns {object} 拷贝后的对象
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// 导出为全局工具
if (typeof window !== 'undefined') {
    window.FlightUtils = {
        UNITS,
        formatNumber,
        parseInput,
        validateRange,
        Angle,
        Distance,
        Speed,
        formatTime,
        getStatusColor,
        generateId,
        debounce,
        deepClone
    };
}