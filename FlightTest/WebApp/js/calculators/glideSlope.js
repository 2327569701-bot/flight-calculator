/**
 * 下滑角计算器 (Glide Slope Calculator)
 *
 * 公式: 下滑角 = arctan(高度差 / 水平距离)
 *
 * 用途: 计算飞机从当前位置到目标点的最佳下滑角度
 * 标准下滑道角度: 3° (进场), 2.5°-3.5° (精密进场)
 */

export const glideSlopeCalculator = {
    id: 'glide-slope',
    name: '下滑角计算器',
    nameEn: 'Glide Slope Calculator',
    icon: '📐',
    description: '根据高度差和水平距离计算下滑角度',

    /**
     * 计算下滑角
     * @param {number} altitudeDiff - 高度差 (ft)
     * @param {number} distance - 水平距离 (NM)
     * @returns {object} 计算结果
     */
    calculate(altitudeDiff, distance) {
        // 验证输入
        if (altitudeDiff < 0 || distance <= 0) {
            return {
                success: false,
                error: '高度差必须为正值，距离必须大于零'
            };
        }

        // 转换 NM to feet: 1 NM = 6076 ft
        const distanceInFeet = distance * 6076;

        // 计算下滑角 (弧度转角度)
        const angleRadians = Math.atan2(altitudeDiff, distanceInFeet);
        const angleDegrees = angleRadians * (180 / Math.PI);

        // 评估下滑角是否合理
        let assessment = this.assessGlideAngle(angleDegrees);

        return {
            success: true,
            result: {
                angle: angleDegrees,
                angleFormatted: angleDegrees.toFixed(1),
                rawAngle: angleDegrees,
                assessment: assessment
            },
            advice: this.getAdvice(angleDegrees, distance)
        };
    },

    /**
     * 评估下滑角
     * @param {number} angle - 下滑角度 (度)
     * @returns {object} 评估结果
     */
    assessGlideAngle(angle) {
        if (angle < 2.5) {
            return {
                level: 'low',
                text: '偏缓',
                color: 'warning',
                description: '下滑角度较缓，需要较长的进近距离'
            };
        } else if (angle <= 3.5) {
            return {
                level: 'normal',
                text: '正常',
                color: 'success',
                description: '下滑角度良好，适合常规进近'
            };
        } else if (angle <= 5) {
            return {
                level: 'steep',
                text: '偏陡',
                color: 'warning',
                description: '下滑角度较陡，需要较高下降率'
            };
        } else {
            return {
                level: 'danger',
                text: '过陡',
                color: 'danger',
                description: '下滑角度过陡，可能难以控制'
            };
        }
    },

    /**
     * 获取飞行员建议
     * @param {number} angle - 下滑角度
     * @param {number} distance - 距离
     * @returns {string} 建议文本
     */
    getAdvice(angle, distance) {
        if (angle < 2.5) {
            return `建议增加下滑角至 3°，当前距离 ${distance.toFixed(1)} NM 可在更远距离开始下降`;
        } else if (angle > 5) {
            return `⚠️ 警告: 下滑角 ${angle.toFixed(1)}° 过陡！建议减小角度或增加距离`;
        } else if (angle > 3.5) {
            return `建议适当减小下滑角，目标 3° 可获得更平稳的进近`;
        }
        return `下滑角 ${angle.toFixed(1)}° 符合标准进近程序`;
    },

    /**
     * 获取模块配置（用于 UI 渲染）
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
                    placeholder: '3000',
                    hint: '当前高度与目标高度之差',
                    min: 0,
                    step: 100
                },
                {
                    id: 'distance',
                    label: '水平距离',
                    labelEn: 'Distance',
                    unit: 'NM',
                    placeholder: '10',
                    hint: '到目标点的水平距离',
                    min: 0.1,
                    step: 0.1
                }
            ],
            resultLabel: '下滑角',
            resultUnit: '°'
        };
    }
};

// 注册为全局插件（可选，用于扩展）
if (typeof window !== 'undefined') {
    window.GlideSlopeCalculator = glideSlopeCalculator;
}
