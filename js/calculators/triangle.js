/**
 * 航空三角计算器 (Flight Triangle Calculator)
 *
 * 基础公式:
 *   距离 = 速度 × 时间
 *   速度 = 距离 / 时间
 *   时间 = 距离 / 速度
 *
 * 单位转换:
 *   1 NM = 6076 ft
 *   1 hour = 60 minutes
 *   1 kt = 1 NM/hour
 *
 * 用途: 航空中距离、速度、时间的基本换算
 */

export const triangleCalculator = {
    id: 'triangle',
    name: '航空三角计算器',
    nameEn: 'Flight Triangle Calculator',
    icon: '📊',
    description: '计算速度、距离、时间的关系',

    // 变量定义
    VARS: {
        speed: { id: 'speed', label: '速度', unit: 'kt', placeholder: '250' },
        distance: { id: 'distance', label: '距离', unit: 'NM', placeholder: '100' },
        time: { id: 'time', label: '时间', unit: 'min', placeholder: '30' }
    },

    /**
     * 计算缺失变量
     * @param {object} inputs - 输入值 { speed, distance, time }
     * @returns {object} 计算结果
     */
    calculate(inputs) {
        const { speed, distance, time } = inputs;

        // 统计已知变量数量
        const knownCount = [speed, distance, time].filter(v => v !== null && !isNaN(v) && v > 0).length;

        if (knownCount < 2) {
            return {
                success: false,
                error: '请至少输入两个值'
            };
        }

        if (knownCount === 3) {
            // 全部三个都输入了，验证一致性
            return this.verify(inputs);
        }

        // 计算缺失变量
        if (speed === null || speed === undefined || speed <= 0) {
            return this.calculateSpeed(distance, time);
        } else if (distance === null || distance === undefined || distance <= 0) {
            return this.calculateDistance(speed, time);
        } else if (time === null || time === undefined || time <= 0) {
            return this.calculateTime(speed, distance);
        }
    },

    /**
     * 计算速度
     * @param {number} distance - 距离 (NM)
     * @param {number} time - 时间 (min)
     * @returns {object} 计算结果
     */
    calculateSpeed(distance, time) {
        if (time <= 0) {
            return { success: false, error: '时间必须大于零' };
        }

        // 速度 = 距离 / 时间 (NM/min) × 60 = NM/hour = kt
        const speedKt = (distance / time) * 60;
        const speedKmh = speedKt * 1.852;

        return {
            success: true,
            result: {
                var: 'speed',
                speedKt: speedKt,
                speedKtFormatted: speedKt.toFixed(1),
                speedKmh: speedKmh.toFixed(1)
            },
            inputs: { distance, time },
            advice: `保持 ${speedKt.toFixed(1)} kt 的速度飞行 ${time} 分钟`
        };
    },

    /**
     * 计算距离
     * @param {number} speed - 速度 (kt)
     * @param {number} time - 时间 (min)
     * @returns {object} 计算结果
     */
    calculateDistance(speed, time) {
        if (speed <= 0) {
            return { success: false, error: '速度必须大于零' };
        }

        // 距离 = 速度 × 时间 / 60 (kt × min / 60 = NM)
        const distanceNm = (speed * time) / 60;
        const distanceKm = distanceNm * 1.852;

        return {
            success: true,
            result: {
                var: 'distance',
                distanceNm: distanceNm,
                distanceNmFormatted: distanceNm.toFixed(1),
                distanceKm: distanceKm.toFixed(1)
            },
            inputs: { speed, time },
            advice: `${time} 分钟内以 ${speed} kt 飞行约 ${distanceNm.toFixed(1)} NM`
        };
    },

    /**
     * 计算时间
     * @param {number} speed - 速度 (kt)
     * @param {number} distance - 距离 (NM)
     * @returns {object} 计算结果
     */
    calculateTime(speed, distance) {
        if (speed <= 0) {
            return { success: false, error: '速度必须大于零' };
        }

        // 时间 = 距离 / 速度 (NM / (NM/hour)) × 60 = 分钟
        const timeMinutes = (distance / speed) * 60;
        const timeHours = timeMinutes / 60;

        return {
            success: true,
            result: {
                var: 'time',
                timeMinutes: timeMinutes,
                timeMinutesFormatted: this.formatTime(timeMinutes),
                timeHours: timeHours.toFixed(2)
            },
            inputs: { speed, distance },
            advice: `以 ${speed} kt 飞行 ${distance} NM 需要 ${this.formatTime(timeMinutes)}`
        };
    },

    /**
     * 验证三个输入值是否一致
     * @param {object} inputs - 输入值
     * @returns {object} 验证结果
     */
    verify(inputs) {
        const { speed, distance, time } = inputs;
        const calculatedTime = (distance / speed) * 60;
        const diff = Math.abs(calculatedTime - time);
        const tolerance = 0.5; // 允许 0.5 分钟的误差

        if (diff <= tolerance) {
            return {
                success: true,
                result: {
                    verified: true,
                    message: '三个值相互一致'
                },
                advice: `✓ 输入数据验证通过: ${speed} kt × ${time} min = ${distance} NM`
            };
        } else {
            return {
                success: true,
                result: {
                    verified: false,
                    message: '数据不一致',
                    expected: calculatedTime.toFixed(1)
                },
                advice: `⚠️ 数据验证: 预期时间 ${calculatedTime.toFixed(1)} min，实际 ${time} min`
            };
        }
    },

    /**
     * 格式化时间显示
     * @param {number} minutes - 分钟数
     * @returns {string} 格式化字符串
     */
    formatTime(minutes) {
        if (minutes < 1) {
            return `${Math.round(minutes * 60)} 秒`;
        }
        const mins = Math.floor(minutes);
        const secs = Math.round((minutes - mins) * 60);
        if (secs === 0) {
            return `${mins} 分钟`;
        }
        return `${mins} 分 ${secs} 秒`;
    },

    /**
     * 燃料消耗估算
     * @param {number} fuelFlow - 燃油流量 (kg/hr 或 gal/hr)
     * @param {number} time - 时间 (min)
     * @returns {object} 计算结果
     */
    calculateFuel(fuelFlow, time) {
        if (fuelFlow <= 0 || time <= 0) {
            return { success: false, error: '燃油流量和时间必须为正值' };
        }

        const fuelUsed = (fuelFlow * time) / 60;

        return {
            success: true,
            result: {
                fuelUsed: fuelUsed,
                fuelUsedFormatted: fuelUsed.toFixed(1)
            },
            advice: `预计消耗 ${fuelUsed.toFixed(1)} 单位燃油`
        };
    },

    /**
     * 获取模块配置
     */
    getConfig() {
        return {
            id: this.id,
            name: this.name,
            icon: this.icon,
            inputs: [
                {
                    id: 'speed',
                    label: '速度',
                    labelEn: 'Speed',
                    unit: 'kt',
                    placeholder: '250',
                    hint: '地速或空速',
                    min: 0,
                    step: 5
                },
                {
                    id: 'distance',
                    label: '距离',
                    labelEn: 'Distance',
                    unit: 'NM',
                    placeholder: '100',
                    hint: '水平距离',
                    min: 0,
                    step: 1
                },
                {
                    id: 'time',
                    label: '时间',
                    labelEn: 'Time',
                    unit: 'min',
                    placeholder: '30',
                    hint: '飞行时间',
                    min: 0,
                    step: 1
                }
            ],
            resultLabel: '计算结果',
            resultUnit: ''
        };
    }
};

if (typeof window !== 'undefined') {
    window.TriangleCalculator = triangleCalculator;
}