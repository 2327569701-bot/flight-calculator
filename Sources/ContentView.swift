import SwiftUI

struct ContentView: View {
    @StateObject private var model = AppModel()
    @StateObject private var units = UnitSystem.shared
    @StateObject private var history = HistoryStore()
    @StateObject private var profiles = ProfilesStore()
    @State private var session = FlightSession.load()
    @State private var showSettings = false
    @State private var themeOverride: ColorScheme? = nil
    @Environment(\.colorScheme) private var colorScheme

    private var meta: (title: String, short: String, en: String) {
        switch model.section {
        case "session": return ("本次飞行", "本次飞行", "FLIGHT WORKSPACE")
        case "history": return ("历史记录", "历史记录", "HISTORY")
        case "charts": return ("航图", "航图", "CHARTS")
        case "manual": return ("飞行手册", "飞行手册", "FLIGHT LIBRARY")
        default:
            let s = CalculatorCatalog.section(model.section)
            return (s.title, s.short, s.en)
        }
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            Theme.bg.ignoresSafeArea()
            VStack(spacing: 0) {
                topBar
                ScrollView {
                    content
                        .padding(.horizontal, 16)
                        .padding(.top, 16)
                        .padding(.bottom, 30)
                }
                bottomNav
            }
            if let toast = model.toast {
                ToastView(message: toast)
                    .padding(.bottom, 84)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .preferredColorScheme(themeOverride)
        .sheet(isPresented: $showSettings) { SettingsView(units: units) }
        .animation(.easeInOut(duration: 0.22), value: model.toast)
        .animation(.easeInOut(duration: 0.22), value: model.section)
    }

    private var topBar: some View {
        HStack(spacing: 10) {
            Image(systemName: Symbols.name("grid"))
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(Theme.muted)
            HStack(spacing: 4) {
                Text("飞行工具").foregroundColor(Theme.secondary)
                Text("/").foregroundColor(Theme.muted)
                Text(meta.short).foregroundColor(Theme.text)
            }
            .font(.system(size: 11, weight: .medium))
            Spacer(minLength: 6)
            Button { showSettings = true } label: {
                HStack(spacing: 6) {
                    Image(systemName: Symbols.name("sliders")).font(.system(size: 12, weight: .semibold))
                    Text(units.presetName()).font(.system(size: 11, weight: .medium))
                    Image(systemName: "chevron.down").font(.system(size: 8, weight: .bold))
                }
                .foregroundColor(Theme.secondary)
                .padding(.horizontal, 10)
                .padding(.vertical, 7)
                .background(Theme.surface)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.line, lineWidth: 1))
            }
            .buttonStyle(.plain)

            Button { themeOverride = (colorScheme == .dark ? .light : .dark) } label: {
                Image(systemName: colorScheme == .dark ? "sun.max.fill" : "moon.fill")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(Theme.secondary)
                    .frame(width: 34, height: 34)
                    .background(Theme.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 9))
                    .overlay(RoundedRectangle(cornerRadius: 9).stroke(Theme.line, lineWidth: 1))
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 9)
        .background(Theme.bg)
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.line).frame(height: 1) }
    }

    @ViewBuilder
    private var content: some View {
        switch model.section {
        case "session":
            SessionPage(session: $session, units: units, history: history, profiles: profiles, model: model)
        case "history":
            HistoryPage(history: history, model: model)
        case "charts":
            ChartsPage(units: units)
        case "manual":
            ManualPage()
        default:
            CalculatorPage(section: CalculatorCatalog.section(model.section), model: model, units: units, history: history)
        }
    }

    private var bottomNav: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                navItem("session", "本次飞行", "session")
                navItem("glide", "下滑角", "glide")
                navItem("vs", "垂直速度", "vs")
                navItem("tod", "下降顶点", "tod")
                navItem("tri", "三角", "tri")
            }
            .padding(.top, 6)
            HStack(spacing: 0) {
                navItem("atmo", "大气·空速", "atmo")
                navItem("vapp", "进近速度", "vapp")
                navItem("manual", "飞行手册", "manual")
                navItem("charts", "航图", "charts")
                navItem("history", "历史", "history")
            }
            .padding(.bottom, 4)
        }
        .background(Theme.bg)
        .overlay(alignment: .top) { Rectangle().fill(Theme.line).frame(height: 1) }
    }

    private func navItem(_ id: String, _ label: String, _ symbol: String) -> some View {
        let active = model.section == id
        return Button { model.go(id) } label: {
            VStack(spacing: 3) {
                Image(systemName: Symbols.name(symbol))
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(active ? Theme.blue : Theme.muted)
                Text(label)
                    .font(.system(size: 8.5, weight: .medium))
                    .foregroundColor(active ? Theme.blue : Theme.muted)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 5)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    ContentView()
}
