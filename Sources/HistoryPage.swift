import SwiftUI
import UIKit

struct HistoryPage: View {
    @ObservedObject var history: HistoryStore
    @ObservedObject var model: AppModel

    @State private var showClearConfirm = false

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            PageHeading(
                eyebrow: "HISTORY",
                title: "历史记录",
                description: "最近 50 条计算，可复制、导出或清空。",
                symbolId: "history"
            )

            if history.entries.isEmpty {
                emptyState
            } else {
                toolbar
                VStack(spacing: 10) {
                    ForEach(history.entries) { entry in
                        entryCard(entry)
                    }
                }
            }
        }
        .confirmationDialog("清空全部历史记录？", isPresented: $showClearConfirm, titleVisibility: .visible) {
            Button("清空", role: .destructive) {
                history.clear()
                model.showToast("历史记录已清空")
            }
            Button("取消", role: .cancel) {}
        }
    }

    private var toolbar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                SecondaryButton(title: "全部复制", symbol: "copy") {
                    let text = history.entries.map { history.plainText($0) }.joined(separator: "\n\n")
                    UIPasteboard.general.string = text
                    model.showToast("已复制 \(history.entries.count) 条记录")
                }
                SecondaryButton(title: "导出 JSON", symbol: "upload") {
                    UIPasteboard.general.string = history.exportJSON()
                    model.showToast("JSON 已复制")
                }
                SecondaryButton(title: "导出 CSV", symbol: "upload") {
                    UIPasteboard.general.string = history.exportCSV()
                    model.showToast("CSV 已复制")
                }
                SecondaryButton(title: "打印", symbol: "print") {
                    printEntries()
                }
                SecondaryButton(title: "清空", symbol: "trash", danger: true) {
                    showClearConfirm = true
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 10) {
            Image(systemName: "clock.arrow.circlepath")
                .font(.system(size: 30, weight: .light))
                .foregroundColor(Theme.muted)
            Text("还没有计算记录")
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(Theme.secondary)
            Text("在任一计算器里点「计算」后，结果会自动出现在这里。")
                .font(.system(size: 11))
                .foregroundColor(Theme.muted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
        .panel()
    }

    private func entryCard(_ entry: HistoryEntry) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("\(entry.title) · \(entry.mode)")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(Theme.text)
                Spacer()
                Text(timeString(entry.date))
                    .font(.system(size: 9))
                    .foregroundColor(Theme.muted)
            }
            if !entry.inputs.isEmpty {
                Text("输入：\(entry.inputs)")
                    .font(.system(size: 10))
                    .foregroundColor(Theme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Text("结果：\(entry.result)")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(Theme.blue)
            HStack(spacing: 8) {
                Spacer()
                Button {
                    UIPasteboard.general.string = history.plainText(entry)
                    model.showToast("已复制")
                } label: {
                    Image(systemName: "doc.on.doc")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(Theme.muted)
                }
                .buttonStyle(.plain)
                Button {
                    history.delete(entry.id)
                } label: {
                    Image(systemName: "trash")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(Theme.muted)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(13)
        .panel()
    }

    private func timeString(_ date: Date) -> String {
        let df = DateFormatter()
        df.locale = Locale(identifier: "zh_CN")
        df.dateFormat = "M/d HH:mm"
        return df.string(from: date)
    }

    private func printEntries() {
        let text = history.entries.map { history.plainText($0) }.joined(separator: "\n\n")
        let controller = UIPrintInteractionController.shared
        let info = UIPrintInfo(dictionary: nil)
        info.outputType = .general
        info.jobName = "Flight Calculator 历史记录"
        controller.printInfo = info
        controller.printFormatter = UIMarkupTextPrintFormatter(markupText: "<pre style=\"font-size:11px\">\(text)</pre>")
        controller.present(animated: true)
    }
}
