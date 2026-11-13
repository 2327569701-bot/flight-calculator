import SwiftUI
import UniformTypeIdentifiers

struct ManualPage: View {
    @State private var importing = false
    @State private var importedName: String = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            PageHeading(
                eyebrow: "FLIGHT LIBRARY",
                title: "飞行手册",
                description: "把常用手册放在手边，随时翻阅。",
                symbolId: "manual"
            )

            bookCover

            VStack(alignment: .leading, spacing: 10) {
                SecondaryButton(title: "导入本地 PDF", symbol: "upload") {
                    importing = true
                }
                if !importedName.isEmpty {
                    Text("已导入：\(importedName)")
                        .font(.system(size: 10))
                        .foregroundColor(Theme.muted)
                }
            }
            .padding(14)
            .panel()

            VStack(alignment: .leading, spacing: 8) {
                Eyebrow(text: "参考摘录")
                Text("下滑角与下降率：3° 下滑约对应 318 ft/NM。若地速为 140 kt，所需下降率约 742 ft/min。")
                    .font(.system(size: 12))
                    .foregroundColor(Theme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .lineSpacing(3)
            }
            .padding(14)
            .panel()
        }
        .fileImporter(
            isPresented: $importing,
            allowedContentTypes: [.pdf],
            allowsMultipleSelection: false
        ) { result in
            if case .success(let urls) = result, let url = urls.first {
                importedName = url.lastPathComponent
            }
        }
    }

    private var bookCover: some View {
        ZStack(alignment: .bottomLeading) {
            RoundedRectangle(cornerRadius: 13)
                .fill(
                    LinearGradient(
                        colors: [Color(hex: "1B2B44"), Color(hex: "11304A")],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    )
                )
            Image(systemName: "book.closed")
                .font(.system(size: 82, weight: .ultraLight))
                .foregroundColor(Color.white.opacity(0.09))
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                .padding(12)
            VStack(alignment: .leading, spacing: 5) {
                Text("OPERATIONS MANUAL")
                    .font(.system(size: 8, weight: .bold))
                    .tracking(2.4)
                    .foregroundColor(Color(hex: "7FBBC5"))
                Text("飞行手册")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)
                Text("起飞 · 巡航 · 进近 · 复飞")
                    .font(.system(size: 10))
                    .foregroundColor(Color(hex: "9CB0C9"))
            }
            .padding(16)
        }
        .frame(height: 150)
    }
}
