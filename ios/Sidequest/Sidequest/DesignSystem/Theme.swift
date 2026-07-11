import SwiftUI

/// Sidequest design tokens — a native, dark-only port of the web app's
/// purple / teal identity (`frontend/app/globals.css`).
///
/// The app is intentionally dark-only for now (`UIUserInterfaceStyle = Dark`),
/// so these colors are fixed rather than adaptive.
enum Theme {
    // MARK: - Surfaces
    static let background = Color(hex: 0x0A0A0A)
    static let backgroundElevated = Color(hex: 0x0C0C0F)
    static let surface = Color(hex: 0x141416)
    static let surfaceMuted = Color(hex: 0x1C1C1F)
    static let border = Color(hex: 0x27272A)
    static let borderStrong = Color(hex: 0x3F3F46)

    // MARK: - Text
    static let textPrimary = Color(hex: 0xFAFAFA)
    static let textMuted = Color(hex: 0xA3A3A3)
    static let textFaint = Color(hex: 0x737373)

    // MARK: - Accents (match web tokens)
    static let purple = Color(hex: 0x818CF8)
    static let purpleDeep = Color(hex: 0x6366F1)
    static let purpleBright = Color(hex: 0xA5B4FC)
    static let teal = Color(hex: 0x2DD4BF)
    static let tealBright = Color(hex: 0x5EEAD4)
    static let coral = Color(hex: 0xFB7185)
    static let coralDeep = Color(hex: 0xF43F5E)
    static let amber = Color(hex: 0xFBBF24)

    // MARK: - Soft tinted fills (glass-friendly)
    static let purpleSoft = Color(hex: 0x6366F1, alpha: 0.18)
    static let tealSoft = Color(hex: 0x2DD4BF, alpha: 0.15)
    static let coralSoft = Color(hex: 0xFB7185, alpha: 0.15)
    static let amberSoft = Color(hex: 0xFBBF24, alpha: 0.15)

    // Primary tint used across the app.
    static let accent = purple

    // MARK: - Gradients
    static var questGradient: LinearGradient {
        LinearGradient(
            colors: [backgroundElevated, background],
            startPoint: .top,
            endPoint: .bottom
        )
    }

    static var logoGradient: LinearGradient {
        LinearGradient(
            colors: [purple, purpleDeep],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    static var brandGradient: LinearGradient {
        LinearGradient(
            colors: [purple, teal],
            startPoint: .leading,
            endPoint: .trailing
        )
    }

    static var progressGradient: LinearGradient {
        LinearGradient(
            colors: [purple, teal, coral],
            startPoint: .leading,
            endPoint: .trailing
        )
    }
}

// MARK: - Spacing & radius scale

enum Space {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 20
    static let xxl: CGFloat = 24
    static let xxxl: CGFloat = 32
}

enum Radius {
    static let sm: CGFloat = 10
    static let md: CGFloat = 14
    static let lg: CGFloat = 18
    static let card: CGFloat = 16
    static let sheet: CGFloat = 28
    static let pill: CGFloat = 999
}

// MARK: - Typography

extension Font {
    /// Tight-tracking SF Pro, echoing the web's Geist Sans (-1% tracking).
    static func sq(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .default)
    }
    static let sqDisplay = Font.system(size: 30, weight: .bold, design: .default)
    static let sqTitle = Font.system(size: 22, weight: .semibold, design: .default)
    static let sqHeadline = Font.system(size: 17, weight: .semibold, design: .default)
    static let sqBody = Font.system(size: 15, weight: .regular, design: .default)
    static let sqCallout = Font.system(size: 14, weight: .medium, design: .default)
    static let sqCaption = Font.system(size: 12, weight: .medium, design: .default)
    static let sqMicro = Font.system(size: 10.5, weight: .semibold, design: .default)
    static let sqMono = Font.system(size: 12, weight: .regular, design: .monospaced)
}

// MARK: - Color hex helper

extension Color {
    init(hex: UInt32, alpha: Double = 1.0) {
        let r = Double((hex >> 16) & 0xFF) / 255.0
        let g = Double((hex >> 8) & 0xFF) / 255.0
        let b = Double(hex & 0xFF) / 255.0
        self.init(.sRGB, red: r, green: g, blue: b, opacity: alpha)
    }
}
