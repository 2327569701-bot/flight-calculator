import SwiftUI

struct DiagramView: View {
    let cardId: String
    var accent: String = "glide"

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            let left: CGFloat = 30
            let right = max(left + 20, w - 36)
            let top: CGFloat = 20
            let bottom = max(top + 20, h - 26)

            ZStack {
                RoundedRectangle(cornerRadius: 14).fill(Theme.result)
                RoundedRectangle(cornerRadius: 14).stroke(Theme.line, lineWidth: 1)

                Path { p in
                    p.move(to: CGPoint(x: left, y: bottom))
                    p.addLine(to: CGPoint(x: right, y: bottom))
                }
                .stroke(Theme.muted.opacity(0.45), style: StrokeStyle(lineWidth: 1.1, dash: [3, 4]))

                Path { p in
                    p.move(to: CGPoint(x: left, y: top))
                    p.addLine(to: CGPoint(x: left, y: bottom))
                }
                .stroke(Theme.muted.opacity(0.45), style: StrokeStyle(lineWidth: 1.1, dash: [3, 4]))

                Path { p in
                    p.move(to: CGPoint(x: left, y: top))
                    p.addLine(to: CGPoint(x: right, y: bottom))
                }
                .stroke(Theme.diagramTeal, style: StrokeStyle(lineWidth: 2, lineCap: .round))

                Circle().fill(Theme.blue).frame(width: 9, height: 9)
                    .position(x: left, y: top)
                Circle().fill(Theme.diagramTeal).frame(width: 9, height: 9)
                    .position(x: right, y: bottom)

                Text("高度差")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundColor(Theme.muted)
                    .position(x: left + 30, y: (top + bottom) / 2)
                Text("水平距离")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundColor(Theme.muted)
                    .position(x: (left + right) / 2, y: bottom + 13)
                Text("下滑角")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundColor(Theme.diagramTeal)
                    .position(x: right - 26, y: bottom - 16)
            }
            .frame(width: w, height: h)
        }
        .frame(height: 118)
    }
}
