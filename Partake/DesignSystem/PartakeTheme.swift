import SwiftUI

enum PartakeTheme {
    // MARK: - Colors

    static let accentColor = Color("AccentColor")

    static let primaryGradient = LinearGradient(
        colors: [Color(hex: "FF6B6B"), Color(hex: "FF8E53")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let secondaryGradient = LinearGradient(
        colors: [Color(hex: "A18CD1"), Color(hex: "FBC2EB")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let cardBackground = Color(.systemBackground)
    static let surfaceBackground = Color(.secondarySystemBackground)
    static let subtleText = Color(.secondaryLabel)

    // Participant colors for claiming items
    static let participantColors: [Color] = [
        Color(hex: "FF6B6B"), // coral
        Color(hex: "4ECDC4"), // teal
        Color(hex: "FFE66D"), // yellow
        Color(hex: "A18CD1"), // purple
        Color(hex: "FF8E53"), // orange
        Color(hex: "45B7D1"), // sky blue
        Color(hex: "96E6A1"), // mint
        Color(hex: "DDA0DD"), // plum
        Color(hex: "F7DC6F"), // gold
        Color(hex: "82E0AA"), // sage
    ]

    static func colorForParticipant(at index: Int) -> Color {
        participantColors[index % participantColors.count]
    }

    // MARK: - Typography

    static let largeTitle = Font.system(.largeTitle, design: .rounded, weight: .bold)
    static let title = Font.system(.title2, design: .rounded, weight: .semibold)
    static let headline = Font.system(.headline, design: .rounded, weight: .semibold)
    static let body = Font.system(.body, design: .rounded)
    static let caption = Font.system(.caption, design: .rounded)
    static let price = Font.system(.title3, design: .rounded, weight: .bold)

    // MARK: - Spacing

    static let spacingXS: CGFloat = 4
    static let spacingSM: CGFloat = 8
    static let spacingMD: CGFloat = 16
    static let spacingLG: CGFloat = 24
    static let spacingXL: CGFloat = 32

    // MARK: - Corner Radius

    static let cornerRadiusSM: CGFloat = 8
    static let cornerRadiusMD: CGFloat = 12
    static let cornerRadiusLG: CGFloat = 20
    static let cornerRadiusFull: CGFloat = 100

    // MARK: - Shadows

    static let cardShadow = ShadowStyle.drop(
        color: .black.opacity(0.08),
        radius: 8,
        x: 0,
        y: 4
    )
}

// MARK: - Color Hex Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: .alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
