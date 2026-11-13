import SwiftUI

struct SessionPage: View {
    @Binding var session: FlightSession
    @ObservedObject var units: UnitSystem
    @ObservedObject var history: HistoryStore
    @ObservedObject var profiles: ProfilesStore
    @ObservedObject var model: AppModel

    @State private var profileName: String = ""
    @State private var status: String = ""
    @State private var fetching = false
    @FocusState private var focused: String?

    private let grid = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            PageHeading(
                eyebrow: "FLIGHT WORKSPACE · SESSION",
                title: "本次飞行",
                description: "输入一次，按需带入计算器。",
                symbolId: "session"
            )

            formPanel
            actionsPanel
            if !session.weatherRaw.isEmpty { weatherPanel }
            summaryPanel
            toolsPanel
            profilesPanel
        }
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("完成") { focused = nil }
            }
        }
    }

    // MARK: Form

    private var formPanel: some View {
        VStack(alignment: .leading, spacing: 16) {
            group("航线与机型") {
                textField("起飞机场", $session.departure, "例如 ZBAA", "departure")
                textField("目的地机场", $session.arrival, "例如 ZSPD", "arrival")
                textField("跑道", $session.runway, "例如 36L", "runway")
                textField("机型", $session.aircraft, "例如 B738", "aircraft")
            }
            group("机场与天气") {
                numberField("修正海压 QNH", \.qnhHpa, "hPa", "qnhHpa")
                numberField("机场标高", \.fieldElevFt, units.label(.altitude), "fieldElevFt")
                numberField("外界温度 OAT", \.oatC, "°C", "oatC")
            }
            group("飞行参数") {
                numberField("地速", \.groundSpeedKt, units.label(.speed), "groundSpeedKt")
                numberField("当前高度", \.currentAltFt, units.label(.altitude), "currentAltFt")
                numberField("目标高度", \.targetAltFt, units.label(.altitude), "targetAltFt")
                numberField("指示空速 IAS", \.iasKt, units.label(.speed), "iasKt")
                numberField("VREF", \.vrefKt, "kts", "vrefKt")
            }
            group("风与跑道") {
                numberField("风向（真北）", \.windDirTrue, "°", "windDirTrue")
                numberField("跑道方向（真北）", \.runwayDirTrue, "°", "runwayDirTrue")
                numberField("风速", \.windSpeedKt, "kts", "windSpeedKt")
                numberField("阵风", \.gustKt, "kts", "gustKt")
            }
            HStack(spacing: 6) {
                Image(systemName: "info.circle").font(.system(size: 11)).foregroundColor(Theme.muted)
                Text("风向与跑道方向都填真北。")
                    .font(.system(size: 10))
                    .foregroundColor(Theme.muted)
            }
        }
        .padding(16)
        .panel()
    }

    @ViewBuilder
    private func group<Content: View>(_ title: String, @ViewBuilder _ content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Eyebrow(text: title)
            LazyVGrid(columns: grid, spacing: 12) {
                content()
            }
        }
    }

    private func textField(_ label: String, _ text: Binding<String>, _ placeholder: String, _ focusId: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(Theme.text)
            TextField(placeholder, text: text)
                .font(.system(size: 15))
                .foregroundColor(Theme.text)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.characters)
                .focused($focused, equals: focusId)
                .padding(.horizontal, 12)
                .padding(.vertical, 11)
                .background(Theme.input)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.line, lineWidth: 1))
        }
    }

    private func numberField(_ label: String, _ keyPath: WritableKeyPath<FlightSession, Double?>, _ unit: String, _ focusId: String) -> some View {
        NumberField(
            label: label,
            placeholder: "",
            help: "",
            text: numberBinding(keyPath),
            unit: unit,
            focusId: focusId,
            focused: $focused
        )
    }

    private func numberBinding(_ keyPath: WritableKeyPath<FlightSession, Double?>) -> Binding<String> {
        Binding(
            get: {
                guard let v = session[keyPath: keyPath] else { return "" }
                if v.rounded() == v { return String(Int(v)) }
                return String(format: "%.1f", v)
            },
            set: { text in
                let t = text.trimmed.replacingOccurrences(of: ",", with: ".")
                if t.isEmpty {
                    session[keyPath: keyPath] = nil
                } else if let v = Double(t) {
                    session[keyPath: keyPath] = v
                }
            }
        )
    }

    // MARK: Actions

    private var actionsPanel: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                PrimaryButton(title: "保存本次飞行", symbol: "check") {
                    session = session.save()
                    model.showToast("本次飞行已保存")
                }
                Button {
                    loadMetar()
                } label: {
                    HStack(spacing: 6) {
                        if fetching {
                            ProgressView().controlSize(.small)
                        } else {
                            Image(systemName: "cloud.sun").font(.system(size: 12, weight: .semibold))
                        }
                        Text(fetching ? "读取中…" : "读取目的地 METAR")
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundColor(Theme.blue)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Theme.blueSoft)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .buttonStyle(.plain)
                .disabled(fetching)
            }
            if !status.isEmpty {
                Text(status).font(.system(size: 10)).foregroundColor(Theme.muted)
            }
        }
    }

    private func loadMetar() {
        let station = session.arrival.trimmed.uppercased()
        guard !station.isEmpty else {
            model.showToast("请先填写目的地机场")
            return
        }
        fetching = true
        status = "正在读取 \(station) 的 METAR…"
        Task { @MainActor in
            do {
                let obs = try await MetarService.fetch(station: station)
                let updated = try session.applyMetar(obs)
                session = updated
                status = "已载入 \(station) 的气象数据"
                model.showToast("METAR 已载入")
            } catch {
                status = error.localizedDescription
                model.showToast("METAR 读取失败")
            }
            fetching = false
        }
    }

    private var weatherPanel: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Eyebrow(text: "气象报文")
                Spacer()
                if !session.weatherTime.isEmpty {
                    Text(session.weatherTime)
                        .font(.system(size: 9))
                        .foregroundColor(Theme.muted)
                }
            }
            Text(session.weatherRaw)
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(Theme.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(14)
        .panel()
    }

    // MARK: Summary

    private var summaryPanel: some View {
        VStack(alignment: .leading, spacing: 12) {
            Eyebrow(text: "会话概览")
            HStack(spacing: 10) {
                metric("压力高度", session.pressureAltitudeFt.map { units.display(.altitude, $0, 0) } ?? "—", units.label(.altitude))
                metric("待下降高度", session.heightDifferenceFt.map { units.display(.altitude, $0, 0) } ?? "—", units.label(.altitude))
                metric("相对跑道风向", session.relativeWindAngle.map { String(Int($0.rounded())) } ?? "—", "°")
            }
        }
        .padding(14)
        .panel()
    }

    private func metric(_ title: String, _ value: String, _ unit: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.system(size: 9, weight: .medium)).foregroundColor(Theme.muted)
            HStack(alignment: .firstTextBaseline, spacing: 3) {
                Text(value)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(Theme.text)
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
                Text(unit).font(.system(size: 9)).foregroundColor(Theme.muted)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: Tools

    private var toolDefinitions: [(id: String, title: String, section: String)] {
        [
            ("a1", "压力高度", "atmo"),
            ("a2", "密度高度", "atmo"),
            ("a3", "真实空速", "atmo"),
            ("t1", "TOD 距离", "tod"),
            ("t2", "TOD 时机", "tod"),
            ("v1", "垂直速度", "vs"),
            ("vapp2", "风分量", "vapp"),
            ("vapp1", "VAPP", "vapp")
        ]
    }

    private var toolsPanel: some View {
        let projections = session.projections(units: units)
        return VStack(alignment: .leading, spacing: 12) {
            Eyebrow(text: "带入计算器")
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                ForEach(toolDefinitions, id: \.id) { tool in
                    let values = projections[tool.id]
                    Button {
                        guard let values = values else { return }
                        model.prefill(cardId: tool.id, sectionId: tool.section, values: values)
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: Symbols.name(tool.section))
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(values == nil ? Theme.muted : Theme.blue)
                            Text(tool.title)
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(values == nil ? Theme.muted : Theme.text)
                            Spacer(minLength: 2)
                            Image(systemName: "arrow.right")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(Theme.muted)
                        }
                        .padding(.horizontal, 11)
                        .padding(.vertical, 10)
                        .frame(maxWidth: .infinity)
                        .background(Theme.input)
                        .clipShape(RoundedRectangle(cornerRadius: 9))
                        .overlay(RoundedRectangle(cornerRadius: 9).stroke(Theme.line, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                    .disabled(values == nil)
                }
            }
        }
        .padding(14)
        .panel()
    }

    // MARK: Profiles

    private var profilesPanel: some View {
        VStack(alignment: .leading, spacing: 12) {
            Eyebrow(text: "机型档案与备份")
            HStack(spacing: 8) {
                TextField("档案名", text: $profileName)
                    .font(.system(size: 14))
                    .foregroundColor(Theme.text)
                    .autocorrectionDisabled()
                    .padding(.horizontal, 11)
                    .padding(.vertical, 10)
                    .background(Theme.input)
                    .clipShape(RoundedRectangle(cornerRadius: 9))
                    .overlay(RoundedRectangle(cornerRadius: 9).stroke(Theme.line, lineWidth: 1))
                SecondaryButton(title: "保存", symbol: "check") {
                    let name = profileName.trimmed.isEmpty ? session.aircraft.trimmed : profileName.trimmed
                    guard !name.isEmpty else {
                        model.showToast("请填写档案名")
                        return
                    }
                    profiles.save(name: name, aircraft: session.aircraft, vrefKt: session.vrefKt, iasKt: session.iasKt)
                    model.showToast("机型档案已保存")
                }
            }
            if !profiles.profiles.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(profiles.profiles) { profile in
                            Button {
                                applyProfile(profile)
                            } label: {
                                Text(profile.name)
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundColor(Theme.blue)
                                    .padding(.horizontal, 11)
                                    .padding(.vertical, 7)
                                    .background(Theme.blueSoft)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            Divider().overlay(Theme.line)
            HStack(spacing: 8) {
                SecondaryButton(title: "导出会话", symbol: "upload") {
                    UIPasteboard.general.string = sessionExportText()
                    model.showToast("会话 JSON 已复制")
                }
                SecondaryButton(title: "导入会话", symbol: "download") {
                    importSessionFromPasteboard()
                }
                SecondaryButton(title: "清空档案", symbol: "trash", danger: true) {
                    if let first = profiles.profiles.first {
                        profiles.delete(first.name)
                    } else {
                        model.showToast("没有可删除的档案")
                    }
                }
            }
        }
        .padding(14)
        .panel()
    }

    private func applyProfile(_ profile: AircraftProfile) {
        if let aircraft = Optional(profile.aircraft), !aircraft.isEmpty {
            session.aircraft = aircraft
        }
        session.vrefKt = profile.vrefKt
        session.iasKt = profile.iasKt
        model.showToast("已载入机型档案 \(profile.name)")
    }

    private func sessionExportText() -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        if let data = try? encoder.encode(session), let text = String(data: data, encoding: .utf8) {
            return text
        }
        return "{}"
    }

    private func importSessionFromPasteboard() {
        guard let text = UIPasteboard.general.string, let data = text.data(using: .utf8),
              var decoded = try? JSONDecoder().decode(FlightSession.self, from: data) else {
            model.showToast("剪贴板里没有有效的会话 JSON")
            return
        }
        decoded.normalize()
        session = decoded
        model.showToast("会话已导入")
    }
}
