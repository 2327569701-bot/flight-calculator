import SwiftUI
import UIKit

struct ChartsPage: View {
    @ObservedObject var units: UnitSystem

    private let chartfoxURL = URL(string: "https://chartfox.org")!
    @State private var toast: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            PageHeading(
                eyebrow: "CHARTS",
                title: "航图",
                description: "在 ChartFox 查看机场航图。",
                symbolId: "charts"
            )

            chartfoxCard

            VStack(alignment: .leading, spacing: 8) {
                Eyebrow(text: "使用说明")
                Text("ChartFox 是免费的公开航图站点。输入 ICAO 代码即可查看机场的进离场、进近与机场图。建议在 Safari 中打开，横屏查看更清晰。")
                    .font(.system(size: 12))
                    .foregroundColor(Theme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .lineSpacing(3)
            }
            .padding(14)
            .panel()

            if let toast = toast {
                Text(toast)
                    .font(.system(size: 10))
                    .foregroundColor(Theme.muted)
            }
        }
    }

    private var chartfoxCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            ZStack(alignment: .bottomLeading) {
                RoundedRectangle(cornerRadius: 13)
                    .fill(
                        LinearGradient(
                            colors: [Color(hex: "0E1B2E"), Color(hex: "173253")],
                            startPoint: .top, endPoint: .bottom
                        )
                    )
                Image(systemName: "map")
                    .font(.system(size: 74, weight: .ultraLight))
                    .foregroundColor(Color.white.opacity(0.10))
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                    .padding(12)
                VStack(alignment: .leading, spacing: 4) {
                    Text("CHARTS")
                        .font(.system(size: 8, weight: .bold))
                        .tracking(2.4)
                        .foregroundColor(Color(hex: "7FBBC5"))
                    Text("ChartFox 航图")
                        .font(.system(size: 19, weight: .bold))
                        .foregroundColor(.white)
                    Text("进离场 · 进近 · 机场图")
                        .font(.system(size: 10))
                        .foregroundColor(Color(hex: "9CB0C9"))
                }
                .padding(16)
            }
            .frame(height: 150)

            HStack(spacing: 8) {
                SecondaryButton(title: "复制链接", symbol: "copy") {
                    UIPasteboard.general.string = chartfoxURL.absoluteString
                    toast = "ChartFox 链接已复制"
                }
                PrimaryButton(title: "打开 ChartFox", symbol: "arrow") {
                    UIApplication.shared.open(chartfoxURL)
                }
            }
        }
        .padding(14)
        .panel()
    }
}
