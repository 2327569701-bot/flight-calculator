import SwiftUI

struct SettingsView: View {
    @ObservedObject var units: UnitSystem
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    block("单位预设") {
                        HStack(spacing: 8) {
                            ForEach(UnitPreset.all) { preset in
                                Button {
                                    units.applyPreset(preset)
                                } label: {
                                    Text(preset.name)
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(units.presetId == preset.id ? .white : Theme.secondary)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 10)
                                        .background(units.presetId == preset.id ? Theme.blue : Theme.input)
                                        .clipShape(RoundedRectangle(cornerRadius: 9))
                                        .overlay(RoundedRectangle(cornerRadius: 9).stroke(Theme.line, lineWidth: 1))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    block("逐项单位") {
                        VStack(spacing: 0) {
                            ForEach(Array(UnitType.allCases.enumerated()), id: \.element.id) { index, type in
                                HStack {
                                    Text(type.title)
                                        .font(.system(size: 13, weight: .medium))
                                        .foregroundColor(Theme.text)
                                    Spacer()
                                    Menu {
                                        ForEach(type.options) { option in
                                            Button(option.label) { units.setUnit(type, option.value) }
                                        }
                                    } label: {
                                        HStack(spacing: 5) {
                                            Text(units.label(type))
                                                .font(.system(size: 12, weight: .semibold))
                                                .foregroundColor(Theme.blue)
                                            Image(systemName: "chevron.up.chevron.down")
                                                .font(.system(size: 9))
                                                .foregroundColor(Theme.muted)
                                        }
                                    }
                                }
                                .padding(.vertical, 11)
                                if index < UnitType.allCases.count - 1 {
                                    Divider().overlay(Theme.line)
                                }
                            }
                        }
                    }

                    Text("当前预设：\(units.presetName())")
                        .font(.system(size: 10))
                        .foregroundColor(Theme.muted)
                }
                .padding(16)
            }
            .background(Theme.bg)
            .navigationTitle("设置")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("完成") { dismiss() }
                        .font(.system(size: 14, weight: .semibold))
                }
            }
        }
    }

    @ViewBuilder
    private func block<Content: View>(_ title: String, @ViewBuilder _ content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Eyebrow(text: title)
            content()
                .padding(14)
                .panel()
        }
    }
}
