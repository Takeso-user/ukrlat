import Foundation

enum KeyboardPage: Equatable {
    case letters
    case numbers
    case symbols
}

enum ShiftState: Equatable {
    case lowercase
    case shifted
    case capsLock

    var isUpper: Bool {
        self != .lowercase
    }
}

struct KeySpec: Identifiable, Hashable {
    let id: String
    let base: String
    let flick: String?
    let variants: [String]

    init(_ base: String, flick: String? = nil, variants: [String] = []) {
        self.id = base
        self.base = base
        self.flick = flick
        self.variants = variants
    }

    func displayText(for shift: ShiftState) -> String {
        Self.applyCase(base, shift: shift)
    }

    func flickText(for shift: ShiftState) -> String? {
        guard let flick else { return nil }
        return Self.applyCase(flick, shift: shift)
    }

    func variantTexts(for shift: ShiftState) -> [String] {
        variants.map { Self.applyCase($0, shift: shift) }
    }

    static func applyCase(_ text: String, shift: ShiftState) -> String {
        switch shift {
        case .lowercase:
            return text
        case .shifted:
            if text == "šč" {
                return "Šč"
            }
            return text.uppercased()
        case .capsLock:
            return text.uppercased()
        }
    }
}

enum UkrLatKeyboardLayout {
    // Complete QWERTY layout with all 16 UkrLat diacritic pairs (32 accented chars)
    // plus šč/Šč/ŠČ digraph, supporting both intuitive base-letter long-press and
    // macOS-compatible flick-up shortcuts (a→â, e→ê, i→î, u→û, g→ĝ, c→č/ć, s→š/ś/šč,
    // z→ž/ź, d→ď, t→ť, l→ĺ, n→ń, r→ŕ, q→šč, w→ś, x→ź, v→ć).
    static let letterRows: [[KeySpec]] = [
        [
            KeySpec("q", flick: "šč", variants: ["šč"]),
            KeySpec("w", flick: "ś", variants: ["ś"]),
            KeySpec("e", flick: "ê", variants: ["ê"]),
            KeySpec("r", flick: "ŕ", variants: ["ŕ"]),
            KeySpec("t", flick: "ť", variants: ["ť"]),
            KeySpec("y"),
            KeySpec("u", flick: "û", variants: ["û"]),
            KeySpec("i", flick: "î", variants: ["î"]),
            KeySpec("o"),
            KeySpec("p"),
        ],
        [
            KeySpec("a", flick: "â", variants: ["â"]),
            KeySpec("s", flick: "š", variants: ["š", "ś", "šč"]),
            KeySpec("d", flick: "ď", variants: ["ď"]),
            KeySpec("f"),
            KeySpec("g", flick: "ĝ", variants: ["ĝ"]),
            KeySpec("h"),
            KeySpec("j"),
            KeySpec("k"),
            KeySpec("l", flick: "ĺ", variants: ["ĺ"]),
        ],
        [
            KeySpec("z", flick: "ž", variants: ["ž", "ź"]),
            KeySpec("x", flick: "ź", variants: ["ź"]),
            KeySpec("c", flick: "č", variants: ["č", "ć"]),
            KeySpec("v", flick: "ć", variants: ["ć"]),
            KeySpec("b"),
            KeySpec("n", flick: "ń", variants: ["ń"]),
            KeySpec("m"),
        ],
    ]

    static let numberRows: [[KeySpec]] = [
        [
            KeySpec("1"),
            KeySpec("2"),
            KeySpec("3"),
            KeySpec("4", flick: "₴", variants: ["₴", "€", "$"]),
            KeySpec("5"),
            KeySpec("6"),
            KeySpec("7"),
            KeySpec("8"),
            KeySpec("9"),
            KeySpec("0"),
        ],
        [
            KeySpec("-", flick: "—", variants: ["–", "—"]),
            KeySpec("/"),
            KeySpec(":"),
            KeySpec(";"),
            KeySpec("("),
            KeySpec(")"),
            KeySpec("₴", flick: "$", variants: ["$", "€", "£"]),
            KeySpec("&"),
            KeySpec("@"),
            KeySpec("\"", flick: "«", variants: ["«", "»", "„", "“", "”"]),
        ],
        [
            KeySpec(".", flick: "…", variants: ["…"]),
            KeySpec(","),
            KeySpec("?"),
            KeySpec("!"),
            KeySpec("’", flick: "'", variants: ["'", "`"]),
            KeySpec("«"),
            KeySpec("»"),
        ],
    ]

    static let symbolRows: [[KeySpec]] = [
        [
            KeySpec("["),
            KeySpec("]"),
            KeySpec("{"),
            KeySpec("}"),
            KeySpec("#"),
            KeySpec("%"),
            KeySpec("^"),
            KeySpec("*"),
            KeySpec("+"),
            KeySpec("="),
        ],
        [
            KeySpec("_"),
            KeySpec("\\"),
            KeySpec("|"),
            KeySpec("~"),
            KeySpec("<"),
            KeySpec(">"),
            KeySpec("€"),
            KeySpec("£"),
            KeySpec("$"),
            KeySpec("•"),
        ],
        [
            KeySpec("."),
            KeySpec(","),
            KeySpec("?"),
            KeySpec("!"),
            KeySpec("'"),
            KeySpec("–"),
            KeySpec("—"),
        ],
    ]

    static func shouldAutoCapitalize(contextBeforeInput: String?) -> Bool {
        guard let before = contextBeforeInput else { return true }
        if before.isEmpty { return true }
        if before.hasSuffix("\n") { return true }
        let trimmed = before.trimmingCharacters(in: CharacterSet(charactersIn: " "))
        if trimmed.isEmpty { return true }
        guard let lastChar = trimmed.last else { return true }
        if [".", "!", "?"].contains(lastChar), before.hasSuffix(" ") {
            return true
        }
        return false
    }
}
