import Foundation

struct FlightSession: Codable, Equatable {
    static let version = 1
    static let storageKey = "_flight_calc_session_v4_swift"

    var departure: String = ""
    var arrival: String = ""
    var runway: String = ""
    var aircraft: String = ""
    var qnhHpa: Double? = nil
    var fieldElevFt: Double? = nil
    var oatC: Double? = nil
    var groundSpeedKt: Double? = nil
    var currentAltFt: Double? = nil
    var targetAltFt: Double? = nil
    var iasKt: Double? = nil
    var vrefKt: Double? = nil
    var windDirTrue: Double? = nil
    var runwayDirTrue: Double? = nil
    var windSpeedKt: Double? = nil
    var gustKt: Double? = nil
    var fieldSources: [String: String] = [:]
    var weatherRaw: String = ""
    var weatherTime: String = ""
    var weatherFetchedAt: String = ""
    var weatherStation: String = ""
    var updatedAt: String = ""

    static let limits: [String: ClosedRange<Double>] = [
        "qnhHpa": 800...1100,
        "fieldElevFt": -1500...20000,
        "oatC": -90...65,
        "groundSpeedKt": 0...1000,
        "currentAltFt": -1500...65000,
        "targetAltFt": -1500...65000,
        "iasKt": 0...700,
        "vrefKt": 0...400,
        "windDirTrue": 0...360,
        "runwayDirTrue": 0...360,
        "windSpeedKt": 0...250,
        "gustKt": 0...250
    ]

    static func load() -> FlightSession {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              var decoded = try? JSONDecoder().decode(FlightSession.self, from: data) else {
            return FlightSession()
        }
        decoded.normalize()
        return decoded
    }

    func save() -> FlightSession {
        var copy = self
        copy.updatedAt = ISO8601DateFormatter().string(from: Date())
        copy.normalize()
        if let data = try? JSONEncoder().encode(copy) {
            UserDefaults.standard.set(data, forKey: Self.storageKey)
        }
        return copy
    }

    mutating func normalize() {
        let dict: [String: Double?] = [
            "qnhHpa": qnhHpa, "fieldElevFt": fieldElevFt, "oatC": oatC,
            "groundSpeedKt": groundSpeedKt, "currentAltFt": currentAltFt, "targetAltFt": targetAltFt,
            "iasKt": iasKt, "vrefKt": vrefKt, "windDirTrue": windDirTrue, "runwayDirTrue": runwayDirTrue,
            "windSpeedKt": windSpeedKt, "gustKt": gustKt
        ]
        for (key, range) in Self.limits {
            guard let value = dict[key] ?? nil, value.isFinite, range.contains(value) else {
                setValue(nil, for: key)
                continue
            }
            setValue(value, for: key)
        }
        departure = String(departure.trimmed.prefix(40))
        arrival = String(arrival.trimmed.prefix(40))
        runway = String(runway.trimmed.prefix(40))
        aircraft = String(aircraft.trimmed.prefix(40))
        weatherRaw = String(weatherRaw.prefix(600))
        weatherTime = String(weatherTime.prefix(80))
        weatherFetchedAt = String(weatherFetchedAt.prefix(80))
        weatherStation = String(weatherStation.prefix(80))
        updatedAt = String(updatedAt.prefix(80))
    }

    private mutating func setValue(_ value: Double?, for key: String) {
        switch key {
        case "qnhHpa": qnhHpa = value
        case "fieldElevFt": fieldElevFt = value
        case "oatC": oatC = value
        case "groundSpeedKt": groundSpeedKt = value
        case "currentAltFt": currentAltFt = value
        case "targetAltFt": targetAltFt = value
        case "iasKt": iasKt = value
        case "vrefKt": vrefKt = value
        case "windDirTrue": windDirTrue = value
        case "runwayDirTrue": runwayDirTrue = value
        case "windSpeedKt": windSpeedKt = value
        case "gustKt": gustKt = value
        default: break
        }
    }

    static func value(_ s: FlightSession, _ key: String) -> Double? {
        switch key {
        case "qnhHpa": return s.qnhHpa
        case "fieldElevFt": return s.fieldElevFt
        case "oatC": return s.oatC
        case "groundSpeedKt": return s.groundSpeedKt
        case "currentAltFt": return s.currentAltFt
        case "targetAltFt": return s.targetAltFt
        case "iasKt": return s.iasKt
        case "vrefKt": return s.vrefKt
        case "windDirTrue": return s.windDirTrue
        case "runwayDirTrue": return s.runwayDirTrue
        case "windSpeedKt": return s.windSpeedKt
        case "gustKt": return s.gustKt
        default: return nil
        }
    }

    var pressureAltitudeFt: Double? {
        guard let qnh = qnhHpa, let elev = fieldElevFt else { return nil }
        return elev + (1013.25 - qnh) * 29.53
    }

    var heightDifferenceFt: Double? {
        guard let cur = currentAltFt, let tgt = targetAltFt, cur > tgt else { return nil }
        return cur - tgt
    }

    var relativeWindAngle: Double? {
        guard let wind = windDirTrue, let runway = runwayDirTrue else { return nil }
        return ((wind - runway + 540).truncatingRemainder(dividingBy: 360)) - 180
    }

    /// Returns per-card prefilled values, matching the web projections() contract.
    func projections(units: UnitSystem) -> [String: [String: String]] {
        var result: [String: [String: String]] = [:]
        let pa = pressureAltitudeFt
        let delta = heightDifferenceFt
        func disp(_ type: UnitType, _ v: Double?) -> String {
            guard let v = v else { return "" }
            let converted = units.fromStd(type, v) ?? v
            return String(NumberFormatterPool.math.string(from: NSNumber(value: (converted * 1000).rounded() / 1000)) ?? "\(converted)")
        }
        if let qnh = qnhHpa, let elev = fieldElevFt {
            result["a1"] = ["qnh": dispNumber(qnh), "qnhu": "hpa", "felev": disp(.altitude, elev)]
        }
        if let pa = pa, let oat = oatC {
            result["a2"] = ["palta": disp(.altitude, pa), "oat": dispNumber(oat)]
        }
        if let pa = pa, let ias = iasKt {
            result["a3"] = ["ias": disp(.speed, ias), "paltas": disp(.altitude, pa)]
        }
        if let delta = delta {
            result["t1"] = ["alt3": disp(.altitude, delta), "angle3": "3"]
            if let gs = groundSpeedKt, gs > 0 {
                let distanceNm = delta / tan(3 * .pi / 180) / 6076
                result["t2"] = ["dist2": disp(.distance, distanceNm), "gs2": disp(.speed, gs)]
            }
        }
        if let gs = groundSpeedKt, gs > 0 {
            result["v1"] = ["gs1": disp(.speed, gs), "angle2": "3"]
        }
        if let vref = vrefKt, vref > 0 {
            result["vapp1"] = ["vref": dispNumber(vref), "correction": "0"]
        }
        if let angle = relativeWindAngle, let wind = windSpeedKt {
            result["vapp2"] = ["winds": dispNumber(wind), "wangle": dispNumber(angle)]
        }
        return result
    }

    private func dispNumber(_ v: Double) -> String {
        if v.rounded() == v { return String(Int(v)) }
        return String(format: "%.3f", v)
    }

    func applyMetar(_ obs: MetarObservation, now: Date = Date()) throws -> FlightSession {
        let station = (obs.icaoId ?? "").uppercased()
        guard station.range(of: "^[A-Z]{4}$", options: .regularExpression) != nil else {
            throw MetarError.invalidStation
        }
        guard let time = MetarObservation.parseTime(obs.reportTime) else { throw MetarError.invalidTime }
        let age = now.timeIntervalSince(time)
        guard age <= 90 * 60, time.timeIntervalSince(now) <= 10 * 60 else { throw MetarError.stale }

        var next = self
        func apply(_ key: String, _ value: Double?) {
            guard let value = value, value.isFinite, let range = Self.limits[key], range.contains(value) else { return }
            next.setValue(value, for: key)
            next.fieldSources[key] = "METAR \(station) · \(obs.reportTime ?? "")"
        }
        apply("qnhHpa", obs.altim)
        apply("fieldElevFt", obs.elev.map { $0 * 3.28084 })
        apply("oatC", obs.temp)
        apply("windDirTrue", obs.wdir)
        apply("windSpeedKt", obs.wspd)
        apply("gustKt", obs.wgst)
        next.weatherRaw = String((obs.rawOb ?? "").prefix(600))
        next.weatherTime = obs.reportTime ?? ""
        next.weatherFetchedAt = ISO8601DateFormatter().string(from: now)
        next.weatherStation = station
        next.normalize()
        return next
    }
}

enum MetarError: LocalizedError {
    case invalidStation, invalidTime, stale, network
    var errorDescription: String? {
        switch self {
        case .invalidStation: return "METAR 机场代码无效"
        case .invalidTime: return "METAR 时间无效"
        case .stale: return "METAR 超过 90 分钟或时间无效"
        case .network: return "无法获取 METAR"
        }
    }
}

struct MetarObservation: Decodable {
    let icaoId: String?
    let reportTime: String?
    let temp: Double?
    let wdir: Double?
    let wspd: Double?
    let wgst: Double?
    let altim: Double?
    let elev: Double?
    let rawOb: String?

    enum CodingKeys: String, CodingKey {
        case icaoId, reportTime, temp, wdir, wspd, wgst, altim, elev, rawOb
    }

    static func parseTime(_ s: String?) -> Date? {
        guard let s = s else { return nil }
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = f.date(from: s) { return d }
        f.formatOptions = [.withInternetDateTime]
        if let d = f.date(from: s) { return d }
        let df = DateFormatter()
        df.locale = Locale(identifier: "en_US_POSIX")
        df.dateFormat = "yyyy-MM-dd'T'HH:mm:ss'Z'"
        df.timeZone = TimeZone(identifier: "UTC")
        return df.date(from: s)
    }
}

enum MetarService {
    static func fetch(station: String) async throws -> MetarObservation {
        let code = station.uppercased()
        guard code.range(of: "^[A-Z]{4}$", options: .regularExpression) != nil else {
            throw MetarError.invalidStation
        }
        var components = URLComponents(string: "https://aviationweather.gov/api/data/metar")!
        components.queryItems = [
            URLQueryItem(name: "ids", value: code),
            URLQueryItem(name: "format", value: "json"),
            URLQueryItem(name: "hours", value: "3")
        ]
        guard let url = components.url else { throw MetarError.network }
        var request = URLRequest(url: url)
        request.timeoutInterval = 10
        let (data, _) = try await URLSession.shared.data(for: request)
        let items = try JSONDecoder().decode([MetarObservation].self, from: data)
        guard let first = items.first else { throw MetarError.network }
        return first
    }
}

extension String {
    var trimmed: String { trimmingCharacters(in: .whitespacesAndNewlines) }
}

enum NumberFormatterPool {
    static let math: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.maximumFractionDigits = 3
        f.minimumFractionDigits = 0
        f.usesGroupingSeparator = false
        return f
    }()
}
