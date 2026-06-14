/**
 * TOD (Top of Descent) 计算器
 *
 * 公式: TOD距离 = 高度差 / tan(下滑角)
 *       或使用近似: TOD距离(NM) ≈ 高度差(ft) / (1000 × tan(角度))
 *
 * 用途: 计算从当前高度开始下降到着陆所需的提前距离
 * 标准下降角: 3° (商业航空), 2.5°-5° (根据情况调整)
 */

export const todCalculator = {
    id: 'tod',
    name: 'TOD 计算器',
    nameEn: 'Top of Descent Calculator',
    icon: '🛬',
    description: '计算开始下降的最佳时机',

    // 标准下滑角常量
    DEFAULT_GLIDE_ANGLE: 3,
    COMMON_ANGLES: [2.5, 3, 3.5, 5],

    /**
     * 计算 TOD 距离
     * @param {number} altitudeDiff - 高度差 (ft)
     * @param {number} glideAngle - 下滑角 (度)，默认 3°
     * @returns {object} 计算结果
     */
    calculate(altitudeDiff, glideAngle = this.DEFAULT_GLIDE_ANGLE) {
        // 验证输入
        if (altitudeDiff < 0) {
            return {
                success: false,
                error: '高度差不能为负值'
            };
        }

        if (altitudeDiff === 0) {
            return {
                success: true,
                result: {
                    distanceNm: 0,
                    distanceNmFormatted: '0.0',
                    distanceKm: 0,
                    timeMinutes: 0,
                    glideAngle: glideAngle
                },
                advice: '高度差为零，无需下降'
            };
        }

        // 计算距离
        // tan(angle) = altitudeDiff / distance
        // distance = altitudeDiff / tan(angle)
        const angleRadians = glideAngle * (Math.PI / 180);
        const distanceFeet = altitudeDiff / Math.tan(angleRadians);

        // 转换为 NM (1 NM = 6076 ft)
        const distanceNm = distanceFeet / 6076;
        const distanceKm = distanceNm * 1.852; // 1 NM = 1.852 km

        // 计算所需时间（假设标准下降率）
        // 3° 下滑角时，约 500 ft/NM 的下降率
        const avgDescentRate = 500; // ft/NM
        const estimatedTime = distanceNm / (avgDescentRate / altitudeDiff * distanceNm) * 60;
        // 简化计算: 假设下降率 1000 ft/min
        const timeMinutes = altitudeDiff / 1000;

        // 提供多个角度的计算结果
        const alternatives = this.calculateAlternatives(altitudeDiff);

        return {
            success: true,
            result: {
                distanceNm: distanceNm,
                distanceNmFormatted: distanceNm.toFixed(1),
                distanceNmRounded: Math.round(distanceNm * 2) / 2, // 四舍五入到 0.5 NM
                distanceKm: distanceKm,
                distanceKmFormatted: distanceKm.toFixed(1),
                timeMinutes: Math.round(timeMinutes),
                glideAngle: glideAngle,
                alternatives: alternatives
            },
            advice: this.getAdvice(distanceNm, altitudeDiff, glideAngle)
        };
    },

    /**
     * 计算不同角度下的 TOD
     * @param {number} altitudeDiff - 高度差 (ft)
     * @returns {array} 不同角度的结果
     */
    calculateAlternatives(altitudeDiff) {
        return this.COMMON_ANGLES.map(angle => {
            const angleRadians = angle * (Math.PI / 180);
            const distanceFeet = altitudeDiff / Math.tan(angleRadians);
            const distanceNm = distanceFeet / 6076;

            return {
                angle: angle,
                distanceNm: distanceNm.toFixed(1),
                distanceNmRounded: Math.round(distanceNm * 2) / 2
            };
        });
    },

    /**
     * 获取飞行员建议
     * @param {number} distanceNm - TOD 距离 (NM)
     * @param {number} altitudeDiff - 高度差 (ft)
     * @param {number} glideAngle - 下滑角 (度)
     * @returns {string} 建议文本
     */
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

    /**
     * 计算已知 TOD 距离时的下滑角
     * @param {number} altitudeDiff - 高度差 (ft)
     * @param {number} todDistance - TOD 距离 (NM)
     * @returns {object} 计算结果
     */
    calculateAngleFromDistance(altitudeDiff, todDistance) {
        if (todDistance <= 0) {
            return { success: false, error: 'TOD 距离必须大于零' };
        }

        const distanceFeet = todDistance * 6076;
        const angleRadians = Math.atan2(altitudeDiff, distanceFeet);
        const angleDegrees = angleRadians * (180 / Math.PI);

        return {
            success: true,
            result: {
                angle: angleDegrees,
                angleFormatted: angleDegrees.toFixed(1),
                angleRounded: Math.round(angleDegrees * 10) / 10
            },
            advice: `需要保持 ${angleDegrees.toFixed(1)}° 的下滑角才能在 ${todDistance} NM 内完成下降`
        };
    },

    /**
     * 计算 TOD 时间点 (到达时机)
     * @param {number} distanceNm - TOD 距离 (NM)
     * @param {number} groundSpeed - 地速 (kt)
     * @returns {object} 计算结果
     */
    calculateTodTiming(distanceNm, groundSpeed) {
        if (groundSpeed <= 0) {
            return { success: false, error: '地速必须大于零' };
        }

        // 时间 = 距离 / 速度 (NM / (NM/hour)) = 小时
        const timeHours = distanceNm / groundSpeed;
        const timeMinutes = timeHours * 60;
        const timeSeconds = timeHours * 3600;

        return {
            success: true,
            result: {
                timeMinutes: Math.round(timeMinutes),
                timeSeconds: Math.round(timeSeconds),
                timeFormatted: this.formatTime(timeMinutes)
            },
            advice: `从现在起 ${this.formatTime(timeMinutes)} 后开始下降`
        };
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
     * 获取模块配置
     */
    getConfig() {
        return {
            id: this.id,
            name: this.name,
            icon: this.icon,
            inputs: [
                {
                    id: 'altitudeDiff',
                    label: '高度差',
                    labelEn: 'Altitude Difference',
                    unit: 'ft',
                    placeholder: '10000',
                    hint: '当前高度与目标高度之差',
                    min: 100,
                    step: 100
                },
                {
                    id: 'glideAngle',
                    label: '下降角',
                    labelEn: 'Descent Angle',
                    unit: '°',
                    placeholder: '3',
                    hint: '目标下降角度，默认 3°',
                    min: 0.5,
                    max: 10,
                    step: 0.1,
                    default: this.DEFAULT_GLIDE_ANGLE
                }
            ],
            resultLabel: 'TOD 距离',
            resultUnit: 'NM',
            alternatives: this.COMMON_ANGLES
        };
    }
};

if (typeof window !== 'undefined') {
    window.TodCalculator = todCalculator;
}