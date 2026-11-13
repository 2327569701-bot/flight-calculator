import SwiftUI

final class AppModel: ObservableObject {
    @Published var section: String = "session"
    @Published var modes: [String: Int] = [:]
    @Published var drafts: [String: [String: String]] = [:]
    @Published var results: [String: CalcResult] = [:]
    @Published var toast: String?

    private var toastToken = 0

    func modeIndex(_ id: String) -> Int { modes[id] ?? 0 }

    func setMode(_ id: String, _ index: Int) {
        modes[id] = index
    }

    func showToast(_ message: String) {
        toastToken += 1
        let token = toastToken
        toast = message
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.4) { [weak self] in
            guard let self = self, self.toastToken == token else { return }
            self.toast = nil
        }
    }

    func prefill(cardId: String, sectionId: String, values: [String: String]) {
        drafts[cardId] = values
        if let index = CalculatorCatalog.section(sectionId).cards.firstIndex(where: { $0.id == cardId }) {
            modes[sectionId] = index
        }
        section = sectionId
    }

    func go(_ id: String) {
        section = id
    }
}
