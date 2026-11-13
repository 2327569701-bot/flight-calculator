import SwiftUI

struct UnitOption: Identifiable {
    let value: String
    let label: String
    let toStd: (Double) -> Double
    let fromStd: (Double) -> Double
    var id: String { value }
}

enum UnitType: String, CaseIterable, Identifiable {
    case distance, speed, altitude, verticalSpeed, weight
    var id: String { rawValue }

    var title: String {
        switch self {
        case .distance: return "距离"
        case .speed: return "速度"
        case .altitude: return "高度"
        case .verticalSpeed: return "垂直速度"
        case .weight: return "重量"
        }
    }

    var standard: String {
        switch self {
        case .distance: return "NM"
        case .speed: return "kt"
        case .altitude: return "ft"
        case .verticalSpeed: return "ft/min"
        case .weight: return "kg"
        }
    }

    var options: [UnitOption] {
        switch self {
        case .distance:
            return [
                UnitOption(value: "NM", label: "NM", toStd: { $0 }, fromStd: { $0 }),
                UnitOption(value: "km", label: "km", toStd: { $0 / 1.852 }, fromStd: { $0 * 1.852 }),
                UnitOption(value: "mi", label: "mi", toStd: { $0 * 1.15078 }, fromStd: { $0 / 1.15078 })
            ]
        case .speed:
            return [
                UnitOption(value: "kt", label: "kt", toStd: { $0 }, fromStd: { $0 }),
                UnitOption(value: "km/h", label: "km/h", toStd: { $0 / 1.852 }, fromStd: { $0 * 1.852 })
            ]
        case .altitude:
            return [
                UnitOption(value: "ft", label: "ft", toStd: { $0 }, fromStd: { $0 }),
                UnitOption(value: "m", label: "m", toStd: { $0 * 3.28084 }, fromStd: { $0 / 3.28084 })
            ]
        case .verticalSpeed:
            return [
                UnitOption(value: "ft/min", label: "ft/min", toStd: { $0 }, fromStd: { $0 }),
                UnitOption(value: "m/s", label: "m/s", toStd: { $0 * 196.85 }, fromStd: { $0 / 196.85 })
            ]
        case .weight:
            return [
                UnitOption(value: "kg", label: "kg", toStd: { $0 }, fromStd: { $0 }),
                UnitOption(value: "lb", label: "lb", toStd: { $0 / 2.20462 }, fromStd: { $0 * 2.20462 })
            ]
        }
    }
}

struct UnitPreset: Identifiable {
    let id: String
    let name: String
    let values: [String: String]

    static let metric = UnitPreset(id: "metric", name: "公制", values: [
        "distance": "km", "speed": "km/h", "altitude": "m", "verticalSpeed": "m/s", "weight": "kg"
    ])
    static let imperial = UnitPreset(id: "imperial", name: "英制", values: [
        "distance": "NM", "speed": "kt", "altitude": "ft", "verticalSpeed": "ft/min", "weight": "lb"
    ])
    static let mixed = UnitPreset(id: "mixed", name: "混合", values: [
        "distance": "NM", "speed": "kt", "altitude": "ft", "verticalSpeed": "ft/min", "weight": "kg"
    ])
    static let all: [UnitPreset] = [.metric, .imperial, .mixed]
}

final class UnitSystem: ObservableObject {
    static let shared = UnitSystem()
    private static let storageKey = "_flight_calc_units_swift"

    @Published var current: [String: String] = UnitPreset.mixed.values
    @Published var presetId: String = "mixed"

    init() { load() }

    func toStd(_ type: UnitType, _ value: Double?) -> Double? {
        guard let v = value, v.isFinite else { return value }
        let unit = current[type.rawValue] ?? type.standard
        let opt = type.options.first { $0.value == unit } ?? type.options[0]
        return opt.toStd(v)
    }

    func fromStd(_ type: UnitType, _ value: Double?) -> Double? {
        guard let v = value, v.isFinite else { return value }
        let unit = current[type.rawValue] ?? type.standard
        let opt = type.options.first { $0.value == unit } ?? type.options[0]
        return opt.fromStd(v)
    }

    func label(_ type: UnitType) -> String {
        current[type.rawValue] ?? type.standard
    }

    func display(_ type: UnitType, _ std: Double?, _ digits: Int = 0) -> String {
        guard let std = std, std.isFinite else { return "—" }
        guard let v = fromStd(type, std) else { return "—" }
        if digits == 0 { return String(Int(v.rounded())) }
        return String(format: "%.\(digits)f", v)
    }

    func presetName() -> String {
        switch presetId {
        case "metric": return "公制单位"
        case "imperial": return "英制单位"
        case "mixed": return "混合单位"
        default: return "自定义单位"
        }
    }

    func applyPreset(_ preset: UnitPreset) {
        current = preset.values
        presetId = preset.id
        save()
    }

    func setUnit(_ type: UnitType, _ value: String) {
        current[type.rawValue] = value
        presetId = "custom"
        save()
    }

    func save() {
        UserDefaults.standard.set(current, forKey: Self.storageKey)
        UserDefaults.standard.set(presetId, forKey: Self.storageKey + "_preset")
    }

    func load() {
        if let saved = UserDefaults.standard.dictionary(forKey: Self.storageKey) as? [String: String] {
            current = saved
        }
        if let id = UserDefaults.standard.string(forKey: Self.storageKey + "_preset") {
            presetId = id
        }
        // Guard against obsolete values.
        for type in UnitType.allCases where !type.options.contains(where: { $0.value == current[type.rawValue] }) {
            current[type.rawValue] = type.standard
        }
    }
}
