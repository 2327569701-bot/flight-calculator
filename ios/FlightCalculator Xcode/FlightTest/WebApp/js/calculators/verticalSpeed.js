/**
 * 垂直速度计算器 (Vertical Speed Calculator)
 *
 * 公式: VS = GS × sin(下滑角) × 60
 * 其中: GS (地速) 单位: kt, 结果 VS 单位: ft/min
 *
 * 用途: 根据地速和下滑角计算需要的垂直速度
 * 这对于保持稳定下滑路径至关重要
 */

export const verticalSpeedCalculator = {
    id: 'vertical-speed',
    name: '垂直速度计算器',
    nameEn: 'Vertical Speed Calculator',
    icon: '⬆️',
    description: '根据地速和下滑角计算垂直速度',

    /**
     * 计算垂直速度
     * @param {number} groundSpeed - 地速 (kt)
     * @param {number} glideAngle - 下滑角 (度)
     * @returns {object} 计算结果
     */
    calculate(groundSpeed, glideAngle) {
        // 验证输入
        if (groundSpeed <= 0) {
            return {
                success: false,
                error: '地速必须大于零'
            };
        }

        if (glideAngle <= 0 || glideAngle > 15) {
            return {
                success: false,
                error: '下滑角应在 0° 到 15° 之间'
            };
        }

        // 转换为下降率 (ft/min)
        // 原理: 1 kt = 6076 ft/hour = 6076/60 ft/min
        // VS = GS(kt) × 6076/60 × sin(angle) = GS × 101.27 × sin(angle)
        const feetPerNm = 6076;
        const minutesPerHour = 60;
        const angleRadians = glideAngle * (Math.PI / 180);

        const vsFpm = groundSpeed * (feetPerNm / minutesPerHour) * Math.sin(angleRadians);
        const vsRounded = Math.round(vsFpm);

        // 评估垂直速度
        let assessment = this.assessVerticalSpeed(vsRounded);

        return {
            success: true,
            result: {
                vs: vsRounded,
                vsFormatted: this.formatVerticalSpeed(vsRounded),
                vsRaw: vsRounded,
                gs: groundSpeed,
                angle: glideAngle,
                assessment: assessment
            },
            advice: this.getAdvice(vsRounded, groundSpeed, glideAngle)
        };
    },

    /**
     * 评估垂直速度是否在正常范围内
     * @param {number} vs - 垂直速度 (ft/min)
     * @returns {object} 评估结果
     */
    assessVerticalSpeed(vs) {
        const absVs = Math.abs(vs);

        if (absVs < 300) {
            return {
                level: 'gentle',
                text: '轻柔',
                color: 'info',
                description: '下降率较小，适合最后进近减速阶段'
            };
        } else if (absVs <= 1000) {
            return {
                level: 'normal',
                text: '正常',
                color: 'success',
                description: '下降率在正常范围内'
            };
        } else if (absVs <= 1500) {
            return {
                level: 'moderate',
                text: '中等',
                color: 'warning',
                description: '下降率偏高，需要适当减速'
            };
        } else {
            return {
                level: 'high',
                text: '偏高',
                color: 'danger',
                description: '下降率过高，建议减速或减小下滑角'
            };
        }
    },

    /**
     * 格式化垂直速度显示
     * @param {number} vs - 垂直速度
     * @returns {string} 格式化字符串
     */
    formatVerticalSpeed(vs) {
        const sign = vs >= 0 ? '+' : '';
        return `${sign}${vs.toLocaleString()}`;
    },

    /**
     * 获取飞行员建议
     * @param {number} vs - 垂直速度
     * @param {number} gs - 地速
     * @param {number} angle - 下滑角
     * @returns {string} 建议文本
     */
    getAdvice(vs, gs, angle) {
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

    /**
     * 快速计算: 已知 VS 和 GS，求下滑角
     * @param {number} groundSpeed - 地速 (kt)
     * @param {number} targetVs - 目标垂直速度 (ft/min)
     * @returns {object} 计算结果
     */
    calculateAngleFromVs(groundSpeed, targetVs) {
        if (groundSpeed <= 0) {
            return { success: false, error: '地速必须大于零' };
        }

        const feetPerNm = 6076;
        const ratio = (targetVs * 60) / (groundSpeed * feetPerNm);

        if (Math.abs(ratio) > 1) {
            return {
                success: false,
                error: '所需下滑角超过 90°，请调整参数'
            };
        }

        const angleRadians = Math.asin(ratio);
        const angleDegrees = angleRadians * (180 / Math.PI);

        return {
            success: true,
            result: {
                angle: angleDegrees,
                angleFormatted: angleDegrees.toFixed(1)
            },
            advice: `需要保持 ${angleDegrees.toFixed(1)}° 的下滑角来达到 ${Math.abs(targetVs)} ft/min 的下降率`
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
                    id: 'groundSpeed',
                    label: '地速',
                    labelEn: 'Ground Speed',
                    unit: 'kt',
                    placeholder: '150',
                    hint: '当前地速（从 FMS 或 GPS 获取）',
                    min: 30,
                    max: 600,
                    step: 5
                },
                {
                    id: 'glideAngle',
                    label: '下滑角',
                    labelEn: 'Glide Angle',
                    unit: '°',
                    placeholder: '3',
                    hint: '目标下滑角度，通常为 3°',
                    min: 0.1,
                    max: 10,
                    step: 0.1
                }
            ],
            resultLabel: '垂直速度',
            resultUnit: 'ft/min'
        };
    }
};

if (typeof window !== 'undefined') {
    window.VerticalSpeedCalculator = verticalSpeedCalculator;
}