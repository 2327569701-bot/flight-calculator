import Foundation

struct CalcResult {
    var ok: Bool
    var value: String = ""
    var unit: String = ""
    var advice: String = ""
    var detail: String = ""
    var message: String = ""
    var openPDF: Bool = false

    static func fail(_ msg: String) -> CalcResult { CalcResult(ok: false, message: msg) }
    static func success(_ value: String, unit: String = "", advice: String = "", detail: String = "") -> CalcResult {
        CalcResult(ok: true, value: value, unit: unit, advice: advice, detail: detail)
    }
}

enum FieldKind {
    case number(UnitType?)
    case select
}

struct SelectOption: Identifiable {
    let label: String
    let value: String
    var id: String { value }
}

struct FieldSpec: Identifiable {
    let id: String
    let label: String
    let kind: FieldKind
    var placeholder: String = ""
    var help: String = ""
    var defaultValue: String = ""
    var unitOverride: String? = nil
    var options: [SelectOption] = []
    var controlsUnit: String? = nil

    var unitType: UnitType? {
        if case let .number(t) = kind { return t }
        return nil
    }
    var isSelect: Bool {
        if case .select = kind { return true }
        return false
    }
}

struct CalcInputValues {
    var numbers: [String: Double?] = [:]
    var selects: [String: String] = [:]
    func n(_ key: String) -> Double? { numbers[key] ?? nil }
    func s(_ key: String) -> String { selects[key] ?? "" }
}

struct CalcCard: Identifiable {
    let id: String
    let title: String
    let subtitle: String
    let button: String
    let fields: [FieldSpec]
    let compute: (CalcInputValues, UnitSystem) -> CalcResult
}

struct CalculatorSection: Identifiable {
    let id: String
    let title: String
    let short: String
    let en: String
    let tag: String
    let desc: String
    let modes: [String]
    let labels: [String]
    let note: String
    var manual: Bool = false
    let cards: [CalcCard]
}

enum Formulas {
    static func fmt(_ v: Double, _ digits: Int) -> String {
        String(format: "%.\(digits)f", v)
    }

    static func cleanNumber(_ v: Double) -> String {
        if v.rounded() == v { return String(Int(v)) }
        return String(format: "%.1f", v)
    }

    static func glideAngle(alt: Double?, dist: Double?, units: UnitSystem) -> CalcResult {
        guard let alt = alt, alt != 0 else { return .fail("请输入高度差") }
        guard let dist = dist, dist > 0 else { return .fail("距离必须大于零") }
        let altFt = units.toStd(.altitude, alt) ?? 0
        let distNm = units.toStd(.distance, dist) ?? 0
        let angle = atan2(altFt, distNm * 6076) * 180 / .pi
        let advice: String
        if angle < 2.5 { advice = "建议增加下滑角至 3°" }
        else if angle > 5 { advice = "警告: 过陡!" }
        else { advice = "符合标准进近" }
        return .success(fmt(angle, 1), unit: "°", advice: advice)
    }

    static func glideDistance(alt: Double?, angle: Double?, units: UnitSystem) -> CalcResult {
        guard let alt = alt, alt >= 0 else { return .fail("请输入有效高度差") }
        guard let angle = angle, angle > 0 else { return .fail("下滑角必须大于零") }
        let altFt = units.toStd(.altitude, alt) ?? 0
        let distNm = (altFt / tan(angle * .pi / 180)) / 6076
        let userDist = units.fromStd(.distance, distNm) ?? 0
        let unit = units.label(.distance)
        let text = fmt(userDist, 1)
        return .success(text, unit: unit, advice: "需要 \(text) \(unit)")
    }

    static func verticalSpeed(gs: Double?, angle: Double?, units: UnitSystem) -> CalcResult {
        guard let gs = gs, gs > 0 else { return .fail("地速必须大于零") }
        guard let angle = angle, angle > 0, angle < 90 else { return .fail("下滑角须在 0° 与 90° 之间") }
        let gsKt = units.toStd(.speed, gs) ?? 0
        let vsFtMin = gsKt * (6076.0 / 60.0) * tan(angle * .pi / 180)
        let disp = units.fromStd(.verticalSpeed, abs(vsFtMin)) ?? 0
        let unit = units.label(.verticalSpeed)
        let text = unit == "m/s" ? fmt(disp, 1) : String(Int(disp.rounded()))
        return .success(text, unit: unit, advice: "下降率 \(text) \(unit)")
    }

    static func todDistance(alt: Double?, angle: Double?, units: UnitSystem) -> CalcResult {
        guard let alt = alt, alt > 0 else { return .fail("高度差必须大于零") }
        if let a = angle, a != 0, a <= 0 || a >= 90 { return .fail("下降角须在 0° 与 90° 之间") }
        let a = (angle == nil || angle == 0) ? 3.0 : angle!
        let altFt = units.toStd(.altitude, alt) ?? 0
        let distNm = (altFt / tan(a * .pi / 180)) / 6076
        let userDist = units.fromStd(.distance, distNm) ?? 0
        let unit = units.label(.distance)
        let text = fmt(userDist, 1)
        return .success(text, unit: unit, advice: "在 \(text) \(unit) 处开始下降")
    }

    static func todTiming(dist: Double?, gs: Double?, units: UnitSystem) -> CalcResult {
        guard let dist = dist, dist > 0 else { return .fail("TOD 距离必须大于零") }
        guard let gs = gs, gs > 0 else { return .fail("地速必须大于零") }
        let distNm = units.toStd(.distance, dist) ?? 0
        let gsKt = units.toStd(.speed, gs) ?? 0
        let mins = (distNm / gsKt) * 60
        let m = Int(mins.rounded(.down))
        let s = Int(((mins - Double(m)) * 60).rounded())
        let time = s == 0 ? "\(m) 分钟" : "\(m) 分 \(s) 秒"
        return .success(time, advice: "从现在起 \(time) 后开始下降")
    }

    static func triangle(speed: Double?, dist: Double?, time: Double?, units: UnitSystem) -> CalcResult {
        let provided = [speed, dist, time].filter { ($0 ?? 0) > 0 }.count
        guard provided >= 2 else { return .fail("请至少输入两个值") }
        if speed == nil || (speed ?? 0) <= 0 {
            let d = units.toStd(.distance, dist) ?? 0
            let kt = (d / (time ?? 1)) * 60
            let us = units.fromStd(.speed, kt) ?? 0
            let su = units.label(.speed)
            let st = fmt(us, 1)
            return .success(st, unit: su, advice: "速度 \(st) \(su)")
        }
        if dist == nil || (dist ?? 0) <= 0 {
            let s = units.toStd(.speed, speed) ?? 0
            let nm = (s * (time ?? 0)) / 60
            let ud = units.fromStd(.distance, nm) ?? 0
            let du = units.label(.distance)
            let dt = fmt(ud, 1)
            return .success(dt, unit: du, advice: "距离 \(dt) \(du)")
        }
        let s2 = units.toStd(.speed, speed) ?? 0
        let d2 = units.toStd(.distance, dist) ?? 0
        let t = Int(((d2 / s2) * 60).rounded())
        return .success("\(t) 分", advice: "时间 \(t) 分钟")
    }

    static func vapp(vref: Double?, correction: Double?) -> CalcResult {
        guard let vref = vref, vref.isFinite, vref > 0 else { return .fail("请输入有效的 VREF") }
        guard let correction = correction, correction.isFinite, correction >= 0 else { return .fail("请输入非负的手动修正值") }
        let value = vref + correction
        let text = cleanNumber(value)
        return .success(text, unit: "kts", advice: "VAPP = \(text) kts", detail: "VREF 与手动修正值相加；请按适用机型资料确定修正值")
    }

    static func windComp(speed: Double?, angle: Double?) -> CalcResult {
        guard let speed = speed, speed.isFinite, speed >= 0 else { return .fail("请输入有效的风速") }
        guard let angle = angle, angle.isFinite, angle >= -180, angle <= 180 else { return .fail("风向角须在 -180° 与 180° 之间") }
        let rad = abs(angle) * .pi / 180
        let hw = Int((cos(rad) * speed).rounded())
        let xw = Int((sin(rad) * speed).rounded())
        let isHead = hw >= 0
        let advice = isHead
            ? "顶风: \(abs(hw)) kts, 侧风: \(xw) kts"
            : "顺风: \(abs(hw)) kts, 侧风: \(xw) kts"
        return .success("\(abs(hw)) / \(xw)", unit: (isHead ? "顶风" : "顺风") + " / 侧风 (kts)", advice: advice)
    }

    static func pressureAltitude(qnh: Double?, qnhUnit: String, elev: Double?, units: UnitSystem) -> CalcResult {
        guard let qnh = qnh, qnh.isFinite, qnh > 0 else { return .fail("请输入有效的修正海压 QNH") }
        guard let elev = elev, elev.isFinite else { return .fail("请输入机场标高") }
        let elevFt = units.toStd(.altitude, elev) ?? 0
        let paFt = qnhUnit == "inhg"
            ? elevFt + (29.92 - qnh) * 1000
            : elevFt + (1013.25 - qnh) * 29.53
        let user = units.fromStd(.altitude, paFt) ?? 0
        let unit = units.label(.altitude)
        let v = Int(user.rounded())
        let qtext = "\(cleanNumber(qnh)) \(qnhUnit == "inhg" ? "inHg" : "hPa")"
        return .success(String(v), unit: unit, advice: "在 QNH \(qtext) 下，压力高度 = \(v) \(unit)")
    }

    static func densityAltitude(pa: Double?, oat: Double?, units: UnitSystem) -> CalcResult {
        guard let pa = pa, pa.isFinite else { return .fail("请输入压力高度") }
        guard let oat = oat, oat.isFinite else { return .fail("请输入外界温度 OAT") }
        let paFt = units.toStd(.altitude, pa) ?? 0
        let isa = 15 - 2 * paFt / 1000
        let dev = oat - isa
        let daFt = paFt + 118.8 * dev
        let user = units.fromStd(.altitude, daFt) ?? 0
        let unit = units.label(.altitude)
        let v = Int(user.rounded())
        let sign = dev >= 0 ? "+" : ""
        let detail = "ISA \(fmt(isa, 1))°C · 偏差 \(sign)\(fmt(dev, 1))°C"
        return .success(String(v), unit: unit, advice: "密度高度 = \(v) \(unit)", detail: detail)
    }

    static func trueAirspeed(ias: Double?, pa: Double?, units: UnitSystem) -> CalcResult {
        guard let ias = ias, ias.isFinite, ias > 0 else { return .fail("请输入指示空速 IAS") }
        guard let pa = pa, pa.isFinite else { return .fail("请输入压力高度") }
        let iasKt = units.toStd(.speed, ias) ?? 0
        let paFt = units.toStd(.altitude, pa) ?? 0
        let tasKt = iasKt * (1 + 0.02 * paFt / 1000)
        let user = units.fromStd(.speed, tasKt) ?? 0
        let unit = units.label(.speed)
        let v = Int(user.rounded())
        return .success(String(v), unit: unit, advice: "真实空速 TAS ≈ \(v) \(unit)", detail: "每千英尺 +2% 经验修正，忽略压缩性")
    }
}

enum CalculatorCatalog {
    static let sections: [CalculatorSection] = [glide, vs, tod, tri, atmo, vapp, manual]

    static func section(_ id: String) -> CalculatorSection {
        sections.first { $0.id == id } ?? sessionSection
    }

    static let sessionSection = CalculatorSection(
        id: "session", title: "本次飞行", short: "本次飞行", en: "FLIGHT WORKSPACE", tag: "FLIGHT",
        desc: "输入一次，按需带入计算器。", modes: [], labels: [], note: "", cards: []
    )

    static let glide = CalculatorSection(
        id: "glide", title: "下滑角计算", short: "下滑角", en: "DESCENT & APPROACH", tag: "GLIDE",
        desc: "把握每一段下降，让进近更从容。",
        modes: ["计算下滑角", "反算水平距离"], labels: ["所需下滑角", "所需水平距离"],
        note: "输入高度差与水平距离，估算下滑角；也可以通过目标下滑角反算距离。",
        cards: [
            CalcCard(id: "g1", title: "下滑角计算", subtitle: "高度差 + 距离", button: "计算下滑角",
                     fields: [
                        FieldSpec(id: "alt1", label: "高度差", kind: .number(.altitude), placeholder: "例如 3000", help: "当前位置与目标位置的高度差"),
                        FieldSpec(id: "dist1", label: "水平距离", kind: .number(.distance), placeholder: "例如 10", help: "沿地面的水平距离")
                     ],
                     compute: { v, u in Formulas.glideAngle(alt: v.n("alt1"), dist: v.n("dist1"), units: u) }),
            CalcCard(id: "g2", title: "反向计算", subtitle: "下滑角 + 高度差", button: "计算距离",
                     fields: [
                        FieldSpec(id: "alt2", label: "目标高度差", kind: .number(.altitude), placeholder: "例如 3000", help: "当前位置与目标位置的高度差"),
                        FieldSpec(id: "angle1", label: "下滑角", kind: .number(nil), placeholder: "例如 3", help: "输入计划采用的下滑角", unitOverride: "°")
                     ],
                     compute: { v, u in Formulas.glideDistance(alt: v.n("alt2"), angle: v.n("angle1"), units: u) })
        ]
    )

    static let vs = CalculatorSection(
        id: "vs", title: "垂直速度", short: "垂直速度", en: "VERTICAL SPEED", tag: "V/S",
        desc: "结合地速与下滑角，规划平稳的下降率。",
        modes: ["计算垂直速度"], labels: ["目标垂直速度"],
        note: "使用地速与目标下滑角进行计算。图中的飞行剖面仅用于说明参数关系。",
        cards: [
            CalcCard(id: "v1", title: "垂直速度计算", subtitle: "地速 + 下滑角", button: "计算垂直速度",
                     fields: [
                        FieldSpec(id: "gs1", label: "地速", kind: .number(.speed), placeholder: "例如 140", help: "飞机相对地面的速度"),
                        FieldSpec(id: "angle2", label: "下滑角", kind: .number(nil), placeholder: "例如 3", help: "输入计划采用的下滑角", unitOverride: "°")
                     ],
                     compute: { v, u in Formulas.verticalSpeed(gs: v.n("gs1"), angle: v.n("angle2"), units: u) })
        ]
    )

    static let tod = CalculatorSection(
        id: "tod", title: "下降顶点", short: "下降顶点", en: "TOP OF DESCENT", tag: "TOD",
        desc: "提前规划下降距离，把握开始下降的时机。",
        modes: ["计算 TOD 距离", "计算下降时机"], labels: ["开始下降的距离", "距开始下降的时间"],
        note: "先根据高度差估算下降距离，再结合地速计算抵达下降顶点所需的时间。",
        cards: [
            CalcCard(id: "t1", title: "TOD 距离", subtitle: "高度差 + 下降角", button: "计算 TOD 距离",
                     fields: [
                        FieldSpec(id: "alt3", label: "高度差", kind: .number(.altitude), placeholder: "例如 30000", help: "巡航高度与目标高度之差"),
                        FieldSpec(id: "angle3", label: "下降角", kind: .number(nil), placeholder: "例如 3", help: "可根据计划调整下降角", defaultValue: "3", unitOverride: "°")
                     ],
                     compute: { v, u in Formulas.todDistance(alt: v.n("alt3"), angle: v.n("angle3"), units: u) }),
            CalcCard(id: "t2", title: "TOD 时机", subtitle: "TOD 距离 + 地速", button: "计算下降时机",
                     fields: [
                        FieldSpec(id: "dist2", label: "TOD 距离", kind: .number(.distance), placeholder: "例如 90", help: "距离下降顶点的剩余航程"),
                        FieldSpec(id: "gs2", label: "地速", kind: .number(.speed), placeholder: "例如 450", help: "用于估算飞行时间的地速")
                     ],
                     compute: { v, u in Formulas.todTiming(dist: v.n("dist2"), gs: v.n("gs2"), units: u) })
        ]
    )

    static let tri = CalculatorSection(
        id: "tri", title: "速度 · 距离 · 时间", short: "三角计算", en: "SPEED, DISTANCE & TIME", tag: "SDT",
        desc: "已知任意两项，轻松求出第三项。",
        modes: ["三角计算"], labels: ["计算结果"],
        note: "输入速度、距离、时间中的任意两项，并将需要计算的一项留空。时间以分钟为单位。",
        cards: [
            CalcCard(id: "r1", title: "三角计算", subtitle: "速度/距离/时间", button: "计算",
                     fields: [
                        FieldSpec(id: "spd", label: "速度", kind: .number(.speed), placeholder: "输入速度"),
                        FieldSpec(id: "dst", label: "距离", kind: .number(.distance), placeholder: "输入距离"),
                        FieldSpec(id: "tme", label: "时间", kind: .number(nil), placeholder: "输入分钟数", help: "将需要计算的一项留空", unitOverride: "min")
                     ],
                     compute: { v, u in Formulas.triangle(speed: v.n("spd"), dist: v.n("dst"), time: v.n("tme"), units: u) })
        ]
    )

    static let atmo = CalculatorSection(
        id: "atmo", title: "大气 · 空速", short: "大气·空速", en: "ATMOSPHERE & AIRSPEED", tag: "ATMO",
        desc: "压力高度、密度高度与真实空速，把天气与高度换算清楚。",
        modes: ["压力高度", "密度高度", "真实空速"], labels: ["压力高度", "密度高度", "真实空速"],
        note: "压力高度由 QNH 与机场标高求得；密度高度按 ISA 偏差估算（约每 °C 119 ft）；真实空速采用每千英尺约 2% 的经验修正、忽略压缩性，仅供模拟飞行参考。",
        cards: [
            CalcCard(id: "a1", title: "压力高度", subtitle: "QNH + 机场标高", button: "计算压力高度",
                     fields: [
                        FieldSpec(id: "qnh", label: "修正海压 QNH", kind: .number(nil), placeholder: "例如 1013", help: "修正海平面气压（altimeter setting）", defaultValue: "1013", unitOverride: "hPa"),
                        FieldSpec(id: "qnhu", label: "QNH 单位", kind: .select, options: [
                            SelectOption(label: "hPa", value: "hpa"),
                            SelectOption(label: "inHg", value: "inhg")
                        ], controlsUnit: "qnh"),
                        FieldSpec(id: "felev", label: "机场标高", kind: .number(.altitude), placeholder: "例如 1500", help: "机场场面的海拔高度")
                     ],
                     compute: { v, u in Formulas.pressureAltitude(qnh: v.n("qnh"), qnhUnit: v.s("qnhu"), elev: v.n("felev"), units: u) }),
            CalcCard(id: "a2", title: "密度高度", subtitle: "压力高度 + 外界温度", button: "计算密度高度",
                     fields: [
                        FieldSpec(id: "palta", label: "压力高度", kind: .number(.altitude), placeholder: "例如 5000", help: "由 QNH 与标高算出的压力高度"),
                        FieldSpec(id: "oat", label: "外界温度 OAT", kind: .number(nil), placeholder: "例如 25", help: "机场或当前高度的外界气温", unitOverride: "°C")
                     ],
                     compute: { v, u in Formulas.densityAltitude(pa: v.n("palta"), oat: v.n("oat"), units: u) }),
            CalcCard(id: "a3", title: "真实空速", subtitle: "指示空速 + 压力高度", button: "计算真实空速",
                     fields: [
                        FieldSpec(id: "ias", label: "指示空速 IAS", kind: .number(.speed), placeholder: "例如 140", help: "空速表指示速度（校准空速）"),
                        FieldSpec(id: "paltas", label: "压力高度", kind: .number(.altitude), placeholder: "例如 30000", help: "计划飞行高度对应的压力高度")
                     ],
                     compute: { v, u in Formulas.trueAirspeed(ias: v.n("ias"), pa: v.n("paltas"), units: u) })
        ]
    )

    static let vapp = CalculatorSection(
        id: "vapp", title: "进近速度", short: "进近速度", en: "APPROACH SPEED", tag: "VAPP",
        desc: "输入手册给出的 VREF 与修正值，并计算风分量。",
        modes: ["VAPP", "风分量"], labels: ["目标进近速度", "风分量"],
        note: "V4 不自动套用未经核实的机型风修正规则。请按适用机型资料提供 VREF 与修正值；仅供模拟飞行。",
        manual: true,
        cards: [
            CalcCard(id: "vapp1", title: "VAPP 计算", subtitle: "VREF + 手动修正", button: "计算 VAPP",
                     fields: [
                        FieldSpec(id: "vref", label: "VREF", kind: .number(nil), placeholder: "例如 135", help: "请按适用机型资料填写", unitOverride: "kts"),
                        FieldSpec(id: "correction", label: "手动修正值", kind: .number(nil), placeholder: "例如 5", help: "请按适用机型资料确定修正值", defaultValue: "0", unitOverride: "kts")
                     ],
                     compute: { v, _ in Formulas.vapp(vref: v.n("vref"), correction: v.n("correction")) }),
            CalcCard(id: "vapp2", title: "风分量计算", subtitle: "顶风/顺风/侧风", button: "计算分量",
                     fields: [
                        FieldSpec(id: "winds", label: "总风速", kind: .number(nil), placeholder: "例如 15", unitOverride: "kts"),
                        FieldSpec(id: "wangle", label: "风向角", kind: .number(nil), placeholder: "例如 30", help: "风向与跑道方向的真北夹角", unitOverride: "°")
                     ],
                     compute: { v, _ in Formulas.windComp(speed: v.n("winds"), angle: v.n("wangle")) })
        ]
    )

    static let manual = CalculatorSection(
        id: "manual", title: "飞行手册", short: "飞行手册", en: "FLIGHT LIBRARY", tag: "FCOM",
        desc: "常用参考随手可查，专注每一个飞行阶段。",
        modes: [], labels: [], note: "",
        cards: [
            CalcCard(id: "manual1", title: "FCOM 手册", subtitle: "波音737-800飞行手册", button: "打开手册",
                     fields: [], compute: { _, _ in CalcResult(ok: true, openPDF: true) })
        ]
    )
}
