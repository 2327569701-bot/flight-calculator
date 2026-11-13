import SwiftUI

extension UIColor {
    convenience init(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.hasPrefix("#") { s.removeFirst() }
        var v: UInt64 = 0
        Scanner(string: s).scanHexInt64(&v)
        let r = CGFloat((v >> 16) & 0xFF) / 255
        let g = CGFloat((v >> 8) & 0xFF) / 255
        let b = CGFloat(v & 0xFF) / 255
        self.init(red: r, green: g, blue: b, alpha: 1)
    }
}

extension Color {
    init(hex: String) { self.init(UIColor(hex: hex)) }

    static func dyn(_ light: String, _ dark: String) -> Color {
        Color(UIColor { traits in
            traits.userInterfaceStyle == .dark ? UIColor(hex: dark) : UIColor(hex: light)
        })
    }
}

enum Theme {
    static let bg = Color.dyn("F4F6F9", "121822")
    static let surface = Color.dyn("FFFFFF", "1B2432")
    static let text = Color.dyn("202B3B", "E7EEF9")
    static let secondary = Color.dyn("647185", "A5B3C7")
    static let muted = Color.dyn("778497", "93A4BD")
    static let line = Color.dyn("E9EDF3", "2D394C")
    static let input = Color.dyn("F8F9FC", "202C3E")
    static let blue = Color.dyn("2876E5", "78AEFF")
    static let blueHover = Color.dyn("1762CF", "8FBCFF")
    static let blueSoft = Color.dyn("EAF2FF", "253C5B")
    static let result = Color.dyn("F3F7FF", "1E2E44")
    static let diagramTeal = Color.dyn("508F9A", "7FBBC5")
    static let danger = Color.dyn("D15353", "FF6B6B")
    static let success = Color.dyn("368469", "5DAD90")

    static let panelRadius: CGFloat = 19
    static let inputRadius: CGFloat = 10
    static let buttonRadius: CGFloat = 10

    static let monoDigits: Font = .system(size: 15, weight: .regular, design: .default)
}

struct PanelStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(Theme.surface)
            .clipShape(RoundedRectangle(cornerRadius: Theme.panelRadius))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.panelRadius)
                    .stroke(Theme.line, lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.035), radius: 12, x: 0, y: 3)
    }
}

extension View {
    func panel() -> some View { modifier(PanelStyle()) }
}

struct FieldLabel: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.system(size: 12, weight: .semibold))
            .foregroundColor(Theme.text)
    }
}

struct Eyebrow: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.system(size: 9, weight: .semibold))
            .tracking(2)
            .foregroundColor(Theme.muted)
    }
}
