import Foundation
import Combine

struct HistoryEntry: Codable, Identifiable, Equatable {
    var id: String
    var t: Double
    var section: String
    var card: String
    var title: String
    var mode: String
    var inputs: String
    var result: String
    var signature: String
    var sourceVersion: Int? = 4

    var date: Date { Date(timeIntervalSince1970: t / 1000) }
}

final class HistoryStore: ObservableObject {
    static let storageKey = "_flight_calc_history_swift"
    static let maxEntries = 50

    @Published private(set) var entries: [HistoryEntry] = []

    init() { load() }

    func load() {
        guard let data = UserDefaults.standard.data(forKey: Self.storageKey),
              let decoded = try? JSONDecoder().decode([HistoryEntry].self, from: data) else {
            entries = []
            return
        }
        entries = Array(decoded.prefix(Self.maxEntries))
    }

    private func persist() {
        if let data = try? JSONEncoder().encode(entries) {
            UserDefaults.standard.set(data, forKey: Self.storageKey)
        }
    }

    func add(card: CalcCard, section: CalculatorSection, modeIndex: Int, values: CalcInputValues, result: CalcResult, units: UnitSystem) {
        let inputsText = Self.formatInputs(card: card, values: values, units: units)
        let resultText = result.value + (result.unit.isEmpty ? "" : " \(result.unit)")
        let signature = "\(card.id)|\(values.numbers)|\(values.selects)|\(result.value)"
        if let first = entries.first, first.signature == signature {
            entries[0].t = Date().timeIntervalSince1970 * 1000
            persist()
            return
        }
        let entry = HistoryEntry(
            id: UUID().uuidString.prefix(10).description,
            t: Date().timeIntervalSince1970 * 1000,
            section: section.id,
            card: card.id,
            title: section.short,
            mode: section.modes.indices.contains(modeIndex) ? section.modes[modeIndex] : "",
            inputs: inputsText,
            result: resultText,
            signature: signature
        )
        entries.insert(entry, at: 0)
        entries = Array(entries.prefix(Self.maxEntries))
        persist()
    }

    func delete(_ id: String) {
        entries.removeAll { $0.id == id }
        persist()
    }

    func clear() {
        entries = []
        persist()
    }

    static func formatInputs(card: CalcCard, values: CalcInputValues, units: UnitSystem) -> String {
        card.fields.compactMap { field -> String? in
            if field.isSelect {
                let value = values.s(field.id)
                let shown = field.options.first { $0.value == value }?.label ?? value
                return shown.isEmpty ? nil : "\(field.label) \(shown)"
            }
            guard let n = values.n(field.id) else { return nil }
            var unit = field.unitOverride ?? field.unitType.map { units.label($0) } ?? ""
            if let controller = card.fields.first(where: { $0.isSelect && $0.controlsUnit == field.id }),
               let idx = controller.options.firstIndex(where: { $0.value == values.s(controller.id) }) {
                unit = controller.options[idx].label
            }
            let numberText = n.rounded() == n ? String(Int(n)) : String(format: "%.2f", n)
            return "\(field.label) \(numberText)\(unit.isEmpty ? "" : " \(unit)")"
        }.joined(separator: " · ")
    }

    func plainText(_ e: HistoryEntry) -> String {
        let legacy = e.section == "vapp" && (e.sourceVersion ?? 0) < 4 ? " · 旧版算法" : ""
        let df = DateFormatter()
        df.locale = Locale(identifier: "zh_CN")
        df.dateFormat = "yyyy/M/d HH:mm:ss"
        return "【\(e.title) · \(e.mode)\(legacy)】\(df.string(from: e.date))\n输入：\(e.inputs.isEmpty ? "—" : e.inputs)\n结果：\(e.result)"
    }

    func exportJSON() -> String {
        let iso = ISO8601DateFormatter()
        let payload: [[String: String]] = entries.map { e in
            ["time": iso.string(from: e.date), "calculator": e.title, "mode": e.mode, "inputs": e.inputs, "result": e.result]
        }
        let root: [String: Any] = ["exportedAt": iso.string(from: Date()), "count": entries.count, "entries": payload]
        if let data = try? JSONSerialization.data(withJSONObject: root, options: [.prettyPrinted, .sortedKeys]),
           let text = String(data: data, encoding: .utf8) {
            return text
        }
        return "{}"
    }

    func exportCSV() -> String {
        var rows = ["时间,计算器,模式,输入,结果"]
        let df = DateFormatter()
        df.locale = Locale(identifier: "zh_CN")
        df.dateFormat = "yyyy/M/d HH:mm:ss"
        for e in entries {
            let cells = [df.string(from: e.date), e.title, e.mode, e.inputs, e.result].map(Self.csvCell)
            rows.append(cells.joined(separator: ","))
        }
        return rows.joined(separator: "\r\n")
    }

    static func csvCell(_ v: String) -> String {
        if v.contains(",") || v.contains("\"") || v.contains("\n") {
            return "\"" + v.replacingOccurrences(of: "\"", with: "\"\"") + "\""
        }
        return v
    }
}

struct AircraftProfile: Codable, Identifiable, Equatable {
    var name: String
    var version: Int
    var aircraft: String
    var vrefKt: Double?
    var iasKt: Double?
    var savedAt: String
    var id: String { name }

    var config: ProfileConfig {
        ProfileConfig(version: version, aircraft: aircraft, vrefKt: vrefKt, iasKt: iasKt, units: nil)
    }
}

struct ProfileConfig: Codable, Equatable {
    var version: Int
    var aircraft: String
    var vrefKt: Double?
    var iasKt: Double?
    var units: [String: String]?
}

final class ProfilesStore: ObservableObject {
    static let storageKey = "_flight_calc_profiles_v4_swift"
    @Published private(set) var profiles: [AircraftProfile] = []

    init() { load() }

    func load() {
        guard let data = UserDefaults.standard.data(forKey: Self.storageKey),
              let decoded = try? JSONDecoder().decode([AircraftProfile].self, from: data) else {
            profiles = []
            return
        }
        profiles = decoded
    }

    private func persist() {
        if let data = try? JSONEncoder().encode(profiles) {
            UserDefaults.standard.set(data, forKey: Self.storageKey)
        }
    }

    func save(name: String, aircraft: String, vrefKt: Double?, iasKt: Double?) {
        let profile = AircraftProfile(
            name: name, version: 1, aircraft: aircraft, vrefKt: vrefKt, iasKt: iasKt,
            savedAt: ISO8601DateFormatter().string(from: Date())
        )
        if let idx = profiles.firstIndex(where: { $0.name == name }) {
            profiles[idx] = profile
        } else {
            profiles.append(profile)
        }
        persist()
    }

    func delete(_ name: String) {
        profiles.removeAll { $0.name == name }
        persist()
    }

    func profile(named name: String) -> AircraftProfile? {
        profiles.first { $0.name == name }
    }
}
