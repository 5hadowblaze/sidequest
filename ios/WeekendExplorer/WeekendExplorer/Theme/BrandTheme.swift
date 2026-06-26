import SwiftUI

#if canImport(UIKit)
import UIKit
#endif

enum BrandTheme {
    // MARK: - Hex tokens (web-aligned)

    static let accentHex = "#1a73e8"
    static let accentDarkHex = "#1765cc"
    static let primaryHex = accentHex
    static let textPrimaryHex = "#202124"
    static let textSecondaryHex = "#3c4043"
    static let textBodyHex = "#5f6368"
    static let mutedHex = "#80868b"
    static let successHex = "#137333"
    static let errorHex = "#c5221f"
    static let backgroundHex = "#f8f9fa"
    static let borderHex = "#dadce0"
    static let borderLightHex = "#e8eaed"
    static let surfaceHex = "#f1f3f4"
    static let surfaceLightHex = "#f8f9fa"
    static let badgeBackgroundHex = "#e8f0fe"
    static let warningHex = "#f9ab00"
    static let mapPinHex = "#ea4335"
    static let googleBlueHex = "#4285f4"
    static let googleGreenHex = "#34a853"
    static let googleYellowHex = "#fbbc04"

    // MARK: - Colors

    static let primary = Color(hex: primaryHex)
    static let accent = primary
    static let accentDark = Color(hex: accentDarkHex)
    static let textPrimary = Color(hex: textPrimaryHex)
    static let textSecondary = Color(hex: textSecondaryHex)
    static let textBody = Color(hex: textBodyHex)
    static let textMuted = Color(hex: textBodyHex)
    static let muted = Color(hex: mutedHex)
    static let success = Color(hex: successHex)
    static let successLight = Color(hex: "#e6f4ea")
    static let error = Color(hex: errorHex)
    static let errorBackground = Color(hex: "#fce8e6")
    static let background = Color(hex: backgroundHex)
    static let surface = Color.white
    static let surfaceMuted = Color(hex: surfaceHex)
    static let surfaceLight = Color(hex: surfaceLightHex)
    static let border = Color(hex: borderHex)
    static let borderLight = Color(hex: borderLightHex)
    static let primaryLight = Color(hex: badgeBackgroundHex)
    static let badgeBackground = primaryLight
    static let warning = Color(hex: warningHex)
    static let mapPin = Color(hex: mapPinHex)
    static let googleBlue = Color(hex: googleBlueHex)
    static let googleGreen = Color(hex: googleGreenHex)
    static let googleYellow = Color(hex: googleYellowHex)

    // MARK: - Gradients

    static var googleGradient: LinearGradient {
        LinearGradient(
            colors: [googleBlue, googleGreen, googleYellow],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    // MARK: - Typography

    static func titleFont(size: CGFloat = 22) -> Font {
        .system(size: size, weight: .medium)
    }

    static func headlineFont(size: CGFloat = 17) -> Font {
        .system(size: size, weight: .medium)
    }

    static func bodyFont(size: CGFloat = 15, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight)
    }

    static func captionFont(size: CGFloat = 12, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight)
    }

    static func buttonFont(size: CGFloat = 15) -> Font {
        .system(size: size, weight: .medium)
    }
}

extension Color {
    init(hex: String) {
        let sanitized = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var value: UInt64 = 0
        Scanner(string: sanitized).scanHexInt64(&value)

        let red = Double((value >> 16) & 0xFF) / 255
        let green = Double((value >> 8) & 0xFF) / 255
        let blue = Double(value & 0xFF) / 255

        self.init(red: red, green: green, blue: blue)
    }

    var hexString: String {
        #if canImport(UIKit)
        guard let components = UIColor(self).cgColor.components, components.count >= 3 else {
            return "#000000"
        }
        let red = Int(components[0] * 255)
        let green = Int(components[1] * 255)
        let blue = Int(components[2] * 255)
        return String(format: "#%02x%02x%02x", red, green, blue)
        #else
        return "#000000"
        #endif
    }
}
