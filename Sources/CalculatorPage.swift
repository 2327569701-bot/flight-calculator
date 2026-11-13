import SwiftUI

struct CalculatorPage: View {
    let section: CalculatorSection
    @ObservedObject var model: AppModel
    @ObservedObject var units: UnitSystem
    @ObservedObject var history: HistoryStore
    @FocusState private var focused: String?

    private var index: Int { min(model.modeIndex(section.id), max(0, section.cards.count - 1)) }
    private var card: CalcCard { section.cards[index] }
    private var result: CalcResult? { model.results[card.id] }
    private var label: String { section.labels.indices.contains(index) ? section.labels[index] : "" }

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            PageHeading(
                eyebrow: "\(section.en) · \(section.tag)",
                title: section.title,
                description: section.desc,
                symbolId: section.id
            )

            if section.cards.count > 1 && !section.modes.isEmpty {
                modeTabs
            }

            DiagramView(cardId: card.id, accent: section.id)

            cardForm

            if let result = result {
                resultPanel(result)
            }

            ContextStrip(title: "参考说明", note: section.note, tag: section.tag)

            if section.manual {
                manualBlock
            }
        }
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("完成") { focused = nil }
            }
        }
    }

    private var modeTabs: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 0) {
                ForEach(Array(section.modes.enumerated()), id: \.offset) { i, name in
                    Button { model.setMode(section.id, i) } label: {
                        VStack(spacing: 7) {
                            Text(name)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(i == index ? Theme.blue : Theme.muted)
                                .lineLimit(1)
                            Rectangle()
                                .fill(i == index ? Theme.blue : Color.clear)
                                .frame(height: 2)
                        }
                        .padding(.horizontal, 14)
                        .padding(.top, 6)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.line).frame(height: 1) }
    }

    private var cardForm: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .firstTextBaseline) {
                Text(card.title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(Theme.text)
                Spacer()
                Text(card.subtitle)
                    .font(.system(size: 10))
                    .foregroundColor(Theme.muted)
            }
            ForEach(card.fields) { field in
                fieldView(field)
            }
            PrimaryButton(title: card.button, symbol: "arrow") { calculate() }
        }
        .padding(16)
        .panel()
    }

    @ViewBuilder
    private func fieldView(_ field: FieldSpec) -> some View {
        switch field.kind {
        case .number(let type):
            let unit = field.unitOverride ?? (type.map { units.label($0) } ?? "")
            NumberField(
                label: field.label,
                placeholder: field.placeholder,
                help: field.help,
                text: textBinding(field),
                unit: unit,
                focusId: field.id,
                focused: $focused
            )
        case .select:
            MenuField(label: field.label, options: field.options, selection: selectBinding(field))
        }
    }

    private func textBinding(_ field: FieldSpec) -> Binding<String> {
        Binding(
            get: { model.drafts[card.id]?[field.id] ?? field.defaultValue },
            set: { newValue in
                var d = model.drafts[card.id] ?? [:]
                d[field.id] = newValue
                model.drafts[card.id] = d
            }
        )
    }

    private func selectBinding(_ field: FieldSpec) -> Binding<String> {
        Binding(
            get: { model.drafts[card.id]?[field.id] ?? field.options.first?.value ?? "" },
            set: { newValue in
                var d = model.drafts[card.id] ?? [:]
                d[field.id] = newValue
                model.drafts[card.id] = d
            }
        )
    }

    private func calculate() {
        var numbers: [String: Double?] = [:]
        var selects: [String: String] = [:]
        for field in card.fields {
            let raw = (model.drafts[card.id]?[field.id] ?? field.defaultValue).trimmed
            switch field.kind {
            case .number:
                numbers[field.id] = raw.isEmpty ? nil : Double(raw)
            case .select:
                selects[field.id] = model.drafts[card.id]?[field.id] ?? field.options.first?.value ?? ""
            }
        }
        let values = CalcInputValues(numbers: numbers, selects: selects)
        let computed = card.compute(values, units)
        model.results[card.id] = computed
        if computed.ok {
            history.add(card: card, section: section, modeIndex: index, values: values, result: computed, units: units)
        }
    }

    private func resultPanel(_ result: CalcResult) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(label)
                    .font(.system(size: 9, weight: .semibold))
                    .tracking(1.6)
                    .foregroundColor(Theme.muted)
                Spacer()
                HStack(spacing: 5) {
                    Circle()
                        .fill(result.ok ? Theme.success : Theme.muted)
                        .frame(width: 6, height: 6)
                    Text(result.ok ? "计算完成" : "输入不足")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(Theme.muted)
                }
            }
            if result.ok {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(result.value)
                        .font(.system(size: 42, weight: .bold))
                        .foregroundColor(Theme.blue)
                        .minimumScaleFactor(0.55)
                        .lineLimit(1)
                    if !result.unit.isEmpty {
                        Text(result.unit)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(Theme.muted)
                    }
                }
                if !result.advice.isEmpty {
                    Text(result.advice)
                        .font(.system(size: 12))
                        .foregroundColor(Theme.secondary)
                }
                if !result.detail.isEmpty {
                    Text(result.detail)
                        .font(.system(size: 10))
                        .foregroundColor(Theme.muted)
                }
            } else {
                Text(result.message)
                    .font(.system(size: 12))
                    .foregroundColor(Theme.muted)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Theme.result)
        .clipShape(RoundedRectangle(cornerRadius: Theme.panelRadius))
        .overlay(RoundedRectangle(cornerRadius: Theme.panelRadius).stroke(Theme.line, lineWidth: 1))
    }

    private var manualBlock: some View {
        HStack(spacing: 12) {
            Image(systemName: "book.closed.fill")
                .font(.system(size: 18))
                .foregroundColor(Theme.blue)
                .frame(width: 42, height: 42)
                .background(Theme.blueSoft)
                .clipShape(RoundedRectangle(cornerRadius: 9))
            VStack(alignment: .leading, spacing: 3) {
                Text("飞行手册参考")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(Theme.text)
                Text("VAPP 与风修正请以适用机型手册为准。")
                    .font(.system(size: 10))
                    .foregroundColor(Theme.muted)
            }
            Spacer()
        }
        .padding(12)
        .panel()
    }
}
