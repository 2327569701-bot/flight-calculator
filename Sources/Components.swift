import SwiftUI

enum Symbols {
    static func name(_ id: String) -> String {
        switch id {
        case "session": return "list.bullet.rectangle"
        case "glide": return "airplane"
        case "vs": return "arrow.up.arrow.down"
        case "tod": return "arrow.down.to.line"
        case "tri": return "triangle"
        case "atmo": return "gauge"
        case "vapp": return "speedometer"
        case "manual": return "book.closed"
        case "charts": return "map"
        case "history": return "clock.arrow.circlepath"
        case "settings": return "slider.horizontal.3"
        case "sliders": return "slider.horizontal.3"
        case "grid": return "square.grid.2x2"
        case "chevron": return "chevron.right"
        case "arrow": return "arrow.right"
        case "moon": return "moon.fill"
        case "sun": return "sun.max.fill"
        case "close": return "xmark"
        case "check": return "checkmark"
        case "info": return "info.circle"
        case "reset": return "arrow.counterclockwise"
        case "upload": return "square.and.arrow.up"
        case "lock": return "lock"
        case "wind": return "wind"
        case "copy": return "doc.on.doc"
        case "download": return "arrow.down.circle"
        case "trash": return "trash"
        case "print": return "printer"
        default: return "info.circle"
        }
    }
}

struct PageHeading: View {
    let eyebrow: String
    let title: String
    let description: String
    let symbolId: String

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            VStack(alignment: .leading, spacing: 7) {
                Eyebrow(text: eyebrow)
                Text(title)
                    .font(.system(size: 26, weight: .bold))
                    .foregroundColor(Theme.text)
                    .fixedSize(horizontal: false, vertical: true)
                if !description.isEmpty {
                    Text(description)
                        .font(.system(size: 12))
                        .foregroundColor(Theme.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            Spacer(minLength: 8)
            ZStack {
                RoundedRectangle(cornerRadius: 15)
                    .fill(Theme.blueSoft)
                Image(systemName: Symbols.name(symbolId))
                    .font(.system(size: 21, weight: .semibold))
                    .foregroundColor(Theme.blue)
            }
            .frame(width: 46, height: 46)
            .rotationEffect(.degrees(-7))
        }
    }
}

struct IconButton: View {
    let symbol: String
    var tint: Color = Theme.secondary
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: Symbols.name(symbol))
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(tint)
                .frame(width: 36, height: 36)
                .background(Theme.blueSoft.opacity(0.0001))
                .clipShape(RoundedRectangle(cornerRadius: 9))
        }
        .buttonStyle(.plain)
    }
}

struct PrimaryButton: View {
    let title: String
    var symbol: String = "arrow"
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Text(title).font(.system(size: 13, weight: .semibold))
                Image(systemName: Symbols.name(symbol)).font(.system(size: 13, weight: .semibold))
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(Theme.blue)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
    }
}

struct SecondaryButton: View {
    let title: String
    var symbol: String? = nil
    var danger: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if let symbol = symbol {
                    Image(systemName: Symbols.name(symbol)).font(.system(size: 12, weight: .semibold))
                }
                Text(title).font(.system(size: 12, weight: .medium))
            }
            .foregroundColor(danger ? Theme.danger : Theme.secondary)
            .padding(.horizontal, 14)
            .padding(.vertical, 9)
            .background(Theme.surface)
            .overlay(RoundedRectangle(cornerRadius: 9).stroke(Theme.line, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

struct NumberField: View {
    let label: String
    let placeholder: String
    let help: String
    let text: Binding<String>
    let unit: String
    let focusId: String
    @FocusState.Binding var focused: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(Theme.text)
            HStack(spacing: 6) {
                TextField(placeholder, text: text)
                    .font(.system(size: 16, weight: .regular))
                    .foregroundColor(Theme.text)
                    .keyboardType(.decimalPad)
                    .focused($focused, equals: focusId)
                if !unit.isEmpty {
                    Text(unit)
                        .font(.system(size: 11))
                        .foregroundColor(Theme.muted)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 11)
            .background(Theme.input)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.line, lineWidth: 1))
            if !help.isEmpty {
                Text(help).font(.system(size: 10)).foregroundColor(Theme.muted)
            }
        }
    }
}

struct MenuField: View {
    let label: String
    let options: [SelectOption]
    let selection: Binding<String>

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(Theme.text)
            Menu {
                ForEach(options) { option in
                    Button(option.label) { selection.wrappedValue = option.value }
                }
            } label: {
                HStack {
                    Text(options.first { $0.value == selection.wrappedValue }?.label ?? "选择")
                        .font(.system(size: 15))
                        .foregroundColor(Theme.text)
                    Spacer()
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.system(size: 11))
                        .foregroundColor(Theme.muted)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 12)
                .background(Theme.input)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.line, lineWidth: 1))
            }
            .buttonStyle(.plain)
        }
    }
}

struct ContextStrip: View {
    let title: String
    let note: String
    let tag: String

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "info.circle")
                .font(.system(size: 14))
                .foregroundColor(Theme.muted)
                .padding(.top, 2)
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.system(size: 11, weight: .semibold)).foregroundColor(Theme.secondary)
                Text(note)
                    .font(.system(size: 10))
                    .foregroundColor(Theme.muted)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 6)
            Text(tag)
                .font(.system(size: 9, weight: .medium))
                .foregroundColor(Theme.muted)
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Theme.line, lineWidth: 1))
        }
    }
}

struct ToastView: View {
    let message: String
    var body: some View {
        Text(message)
            .font(.system(size: 12, weight: .medium))
            .foregroundColor(Theme.text)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Theme.surface)
            .clipShape(RoundedRectangle(cornerRadius: 11))
            .overlay(RoundedRectangle(cornerRadius: 11).stroke(Theme.line, lineWidth: 1))
            .shadow(color: Color.black.opacity(0.12), radius: 12, x: 0, y: 4)
    }
}
