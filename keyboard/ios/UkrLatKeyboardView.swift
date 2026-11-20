import SwiftUI
import UIKit

@MainActor
final class UkrLatKeyboardModel: ObservableObject {
    @Published var page: KeyboardPage = .letters
    @Published var shiftState: ShiftState = .shifted
    @Published var returnKeyLabel: String = "return"
    @Published var needsGlobeKey: Bool = true

    private var lastShiftTapTime: TimeInterval = 0
    private var lastSpaceTapTime: TimeInterval = 0

    weak var controller: KeyboardViewController?

    func syncFromProxy() {
        guard let controller else { return }
        needsGlobeKey = controller.needsInputModeSwitchKey
        returnKeyLabel = Self.label(for: controller.textDocumentProxy.returnKeyType)

        if page == .letters && shiftState != .capsLock {
            let shouldCap = UkrLatKeyboardLayout.shouldAutoCapitalize(
                contextBeforeInput: controller.textDocumentProxy.documentContextBeforeInput
            )
            shiftState = shouldCap ? .shifted : .lowercase
        }
    }

    func insertText(_ text: String) {
        controller?.textDocumentProxy.insertText(text)
        if page == .letters && shiftState == .shifted {
            shiftState = .lowercase
        }
        lastSpaceTapTime = 0
    }

    func handleSpaceTap() {
        let now = Date().timeIntervalSinceReferenceDate
        let proxy = controller?.textDocumentProxy
        let before = proxy?.documentContextBeforeInput ?? ""

        if now - lastSpaceTapTime < 0.32,
           before.hasSuffix(" "),
           let prevChar = before.dropLast().last,
           prevChar.isLetter || prevChar.isNumber {
            proxy?.deleteBackward()
            proxy?.insertText(". ")
            lastSpaceTapTime = 0
            if page == .letters && shiftState != .capsLock {
                shiftState = .shifted
            }
            return
        }

        proxy?.insertText(" ")
        lastSpaceTapTime = now
        if page == .letters && shiftState != .capsLock {
            let shouldCap = UkrLatKeyboardLayout.shouldAutoCapitalize(
                contextBeforeInput: proxy?.documentContextBeforeInput
            )
            if shouldCap {
                shiftState = .shifted
            }
        }
    }

    func handleBackspace() {
        controller?.textDocumentProxy.deleteBackward()
        lastSpaceTapTime = 0
        if page == .letters && shiftState != .capsLock {
            let shouldCap = UkrLatKeyboardLayout.shouldAutoCapitalize(
                contextBeforeInput: controller?.textDocumentProxy.documentContextBeforeInput
            )
            shiftState = shouldCap ? .shifted : .lowercase
        }
    }

    func handleReturn() {
        controller?.textDocumentProxy.insertText("\n")
        lastSpaceTapTime = 0
        if page == .letters && shiftState != .capsLock {
            shiftState = .shifted
        }
    }

    func handleShiftTap() {
        let now = Date().timeIntervalSinceReferenceDate
        if shiftState == .shifted && (now - lastShiftTapTime) < 0.35 {
            shiftState = .capsLock
        } else if shiftState == .capsLock || shiftState == .shifted {
            shiftState = .lowercase
        } else {
            shiftState = .shifted
        }
        lastShiftTapTime = now
    }

    func togglePage() {
        switch page {
        case .letters:
            page = .numbers
        case .numbers, .symbols:
            page = .letters
            syncFromProxy()
        }
    }

    func toggleSymbolsPage() {
        page = (page == .numbers) ? .symbols : .numbers
    }

    func advanceToNextInputMode() {
        controller?.advanceToNextInputMode()
    }

    private static func label(for returnKeyType: UIReturnKeyType?) -> String {
        switch returnKeyType {
        case .search: return "search"
        case .go: return "go"
        case .send: return "send"
        case .done: return "done"
        case .next: return "next"
        case .join: return "join"
        case .continue: return "continue"
        default: return "return"
        }
    }
}

struct UkrLatKeyboardView: View {
    @ObservedObject var model: UkrLatKeyboardModel
    @Environment(\.colorScheme) private var colorScheme

    private var keyBackground: Color {
        colorScheme == .dark
            ? Color(white: 0.34)
            : Color.white
    }

    private var specialKeyBackground: Color {
        colorScheme == .dark
            ? Color(white: 0.22)
            : Color(red: 0.68, green: 0.70, blue: 0.74)
    }

    private var activeShiftBackground: Color {
        colorScheme == .dark
            ? Color.white
            : Color.white
    }

    private var keyForeground: Color {
        colorScheme == .dark ? .white : .black
    }

    private var hintForeground: Color {
        colorScheme == .dark ? Color.white.opacity(0.55) : Color.black.opacity(0.45)
    }

    private var keyShadow: Color {
        colorScheme == .dark ? Color.black.opacity(0.45) : Color.black.opacity(0.28)
    }

    private var rows: [[KeySpec]] {
        switch model.page {
        case .letters: return UkrLatKeyboardLayout.letterRows
        case .numbers: return UkrLatKeyboardLayout.numberRows
        case .symbols: return UkrLatKeyboardLayout.symbolRows
        }
    }

    var body: some View {
        GeometryReader { geo in
            let totalWidth = max(geo.size.width, 300)
            let horizontalPadding: CGFloat = 4
            let keySpacing: CGFloat = 5
            let rowSpacing: CGFloat = 10
            let keyHeight: CGFloat = geo.size.height > 235 ? 48 : 42
            let standardKeyWidth = (totalWidth - horizontalPadding * 2 - keySpacing * 9) / 10

            VStack(spacing: rowSpacing) {
                // Row 1 (10 keys)
                HStack(spacing: keySpacing) {
                    ForEach(rows[0]) { spec in
                        CharacterKeyButton(
                            spec: spec,
                            shift: model.page == .letters ? model.shiftState : .lowercase,
                            width: standardKeyWidth,
                            height: keyHeight,
                            background: keyBackground,
                            foreground: keyForeground,
                            hintColor: hintForeground,
                            shadowColor: keyShadow,
                            onInsert: { model.insertText($0) }
                        )
                    }
                }

                // Row 2 (9 or 10 keys)
                HStack(spacing: keySpacing) {
                    ForEach(rows[1]) { spec in
                        CharacterKeyButton(
                            spec: spec,
                            shift: model.page == .letters ? model.shiftState : .lowercase,
                            width: rows[1].count == 10 ? standardKeyWidth : standardKeyWidth,
                            height: keyHeight,
                            background: keyBackground,
                            foreground: keyForeground,
                            hintColor: hintForeground,
                            shadowColor: keyShadow,
                            onInsert: { model.insertText($0) }
                        )
                    }
                }

                // Row 3 (Shift / #+= , 7 keys , Backspace)
                HStack(spacing: keySpacing) {
                    let sideWidth = max(standardKeyWidth * 1.32, 42)
                    if model.page == .letters {
                        shiftButton(width: sideWidth, height: keyHeight)
                    } else {
                        specialButton(
                            title: model.page == .numbers ? "#+=" : "123",
                            width: sideWidth,
                            height: keyHeight,
                            action: { model.toggleSymbolsPage() }
                        )
                    }

                    Spacer(minLength: 2)

                    HStack(spacing: keySpacing) {
                        ForEach(rows[2]) { spec in
                            CharacterKeyButton(
                                spec: spec,
                                shift: model.page == .letters ? model.shiftState : .lowercase,
                                width: standardKeyWidth,
                                height: keyHeight,
                                background: keyBackground,
                                foreground: keyForeground,
                                hintColor: hintForeground,
                                shadowColor: keyShadow,
                                onInsert: { model.insertText($0) }
                            )
                        }
                    }

                    Spacer(minLength: 2)

                    BackspaceKeyButton(
                        width: sideWidth,
                        height: keyHeight,
                        background: specialKeyBackground,
                        foreground: keyForeground,
                        shadowColor: keyShadow,
                        onDelete: { model.handleBackspace() }
                    )
                }

                // Row 4 (123/ABC, Globe, Space, Return)
                HStack(spacing: keySpacing) {
                    specialButton(
                        title: model.page == .letters ? "123" : "ABC",
                        width: max(standardKeyWidth * 1.35, 44),
                        height: keyHeight,
                        action: { model.togglePage() }
                    )

                    if model.needsGlobeKey {
                        Button(action: { model.advanceToNextInputMode() }) {
                            Image(systemName: "globe")
                                .font(.system(size: 18, weight: .regular))
                                .foregroundStyle(keyForeground)
                                .frame(width: max(standardKeyWidth * 1.15, 38), height: keyHeight)
                                .background(
                                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                                        .fill(specialKeyBackground)
                                        .shadow(color: keyShadow, radius: 0, x: 0, y: 1)
                                )
                        }
                        .buttonStyle(.plain)
                    }

                    Button(action: { model.handleSpaceTap() }) {
                        Text("UkrLat")
                            .font(.system(size: 15, weight: .regular))
                            .foregroundStyle(keyForeground.opacity(0.75))
                            .frame(maxWidth: .infinity)
                            .frame(height: keyHeight)
                            .background(
                                RoundedRectangle(cornerRadius: 6, style: .continuous)
                                    .fill(keyBackground)
                                    .shadow(color: keyShadow, radius: 0, x: 0, y: 1)
                            )
                    }
                    .buttonStyle(.plain)

                    specialButton(
                        title: model.returnKeyLabel,
                        width: max(standardKeyWidth * 2.15, 74),
                        height: keyHeight,
                        action: { model.handleReturn() }
                    )
                }
            }
            .padding(.horizontal, horizontalPadding)
            .padding(.top, 8)
            .padding(.bottom, 6)
        }
    }

    @ViewBuilder
    private func shiftButton(width: CGFloat, height: CGFloat) -> some View {
        let iconName: String = {
            switch model.shiftState {
            case .lowercase: return "shift"
            case .shifted: return "shift.fill"
            case .capsLock: return "capslock.fill"
            }
        }()

        let isActive = model.shiftState.isUpper
        Button(action: { model.handleShiftTap() }) {
            Image(systemName: iconName)
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(isActive ? Color.black : keyForeground)
                .frame(width: width, height: height)
                .background(
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .fill(isActive ? activeShiftBackground : specialKeyBackground)
                        .shadow(color: keyShadow, radius: 0, x: 0, y: 1)
                )
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func specialButton(
        title: String,
        width: CGFloat,
        height: CGFloat,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 15, weight: .regular))
                .foregroundStyle(keyForeground)
                .frame(width: width, height: height)
                .background(
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .fill(specialKeyBackground)
                        .shadow(color: keyShadow, radius: 0, x: 0, y: 1)
                )
        }
        .buttonStyle(.plain)
    }
}

private struct CharacterKeyButton: View {
    let spec: KeySpec
    let shift: ShiftState
    let width: CGFloat
    let height: CGFloat
    let background: Color
    let foreground: Color
    let hintColor: Color
    let shadowColor: Color
    let onInsert: (String) -> Void

    @State private var isPressed = false
    @State private var showVariants = false
    @State private var selectedVariantIndex = 0
    @State private var longPressTask: Task<Void, Never>?

    private var variants: [String] {
        spec.variantTexts(for: shift)
    }

    private var primaryDisplay: String {
        spec.displayText(for: shift)
    }

    private var flickHint: String? {
        spec.flickText(for: shift)
    }

    var body: some View {
        ZStack(alignment: .topTrailing) {
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(isPressed ? background.opacity(0.75) : background)
                .shadow(color: shadowColor, radius: 0, x: 0, y: 1)

            if let hint = flickHint {
                Text(hint)
                    .font(.system(size: 9, weight: .medium))
                    .foregroundStyle(hintColor)
                    .padding(.top, 2)
                    .padding(.trailing, 3)
            }

            Text(primaryDisplay)
                .font(.system(size: 21, weight: .regular))
                .foregroundStyle(foreground)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .frame(width: width, height: height)
        .overlay(alignment: .top) {
            if showVariants && !variants.isEmpty {
                HStack(spacing: 4) {
                    ForEach(Array(variants.enumerated()), id: \.offset) { idx, item in
                        Text(item)
                            .font(.system(size: 20, weight: .medium))
                            .foregroundStyle(idx == selectedVariantIndex ? Color.white : foreground)
                            .frame(minWidth: 34, minHeight: 38)
                            .padding(.horizontal, 4)
                            .background(
                                RoundedRectangle(cornerRadius: 6, style: .continuous)
                                    .fill(idx == selectedVariantIndex ? Color.accentColor : background)
                            )
                    }
                }
                .padding(4)
                .background(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(background)
                        .shadow(color: Color.black.opacity(0.32), radius: 6, x: 0, y: 2)
                )
                .offset(y: -54)
                .zIndex(50)
            }
        }
        .zIndex(showVariants ? 50 : 0)
        .contentShape(Rectangle())
        .gesture(
            DragGesture(minimumDistance: 0)
                .onChanged { value in
                    if !isPressed {
                        isPressed = true
                        selectedVariantIndex = 0
                        if !variants.isEmpty {
                            longPressTask?.cancel()
                            longPressTask = Task { @MainActor in
                                try? await Task.sleep(nanoseconds: 280_000_000)
                                guard !Task.isCancelled, isPressed else { return }
                                showVariants = true
                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            }
                        }
                    }

                    if showVariants && variants.count > 1 {
                        let step: CGFloat = 38
                        let delta = Int((value.translation.width / step).rounded())
                        selectedVariantIndex = min(max(0, delta), variants.count - 1)
                    }
                }
                .onEnded { value in
                    longPressTask?.cancel()
                    longPressTask = nil

                    let output: String
                    if showVariants && !variants.isEmpty {
                        let idx = min(max(0, selectedVariantIndex), variants.count - 1)
                        output = variants[idx]
                    } else if value.translation.height <= -18, let flickOut = flickHint {
                        output = flickOut
                    } else {
                        output = primaryDisplay
                    }

                    isPressed = false
                    showVariants = false
                    selectedVariantIndex = 0
                    onInsert(output)
                }
        )
    }
}

private struct BackspaceKeyButton: View {
    let width: CGFloat
    let height: CGFloat
    let background: Color
    let foreground: Color
    let shadowColor: Color
    let onDelete: () -> Void

    @State private var isPressed = false
    @State private var repeatTask: Task<Void, Never>?

    var body: some View {
        Image(systemName: "delete.left")
            .font(.system(size: 17, weight: .regular))
            .foregroundStyle(foreground)
            .frame(width: width, height: height)
            .background(
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .fill(isPressed ? background.opacity(0.75) : background)
                    .shadow(color: shadowColor, radius: 0, x: 0, y: 1)
            )
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in
                        guard !isPressed else { return }
                        isPressed = true
                        onDelete()
                        repeatTask?.cancel()
                        repeatTask = Task { @MainActor in
                            try? await Task.sleep(nanoseconds: 400_000_000)
                            while !Task.isCancelled && isPressed {
                                onDelete()
                                try? await Task.sleep(nanoseconds: 90_000_000)
                            }
                        }
                    }
                    .onEnded { _ in
                        isPressed = false
                        repeatTask?.cancel()
                        repeatTask = nil
                    }
            )
    }
}
