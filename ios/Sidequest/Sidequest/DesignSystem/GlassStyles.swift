import SwiftUI

/// Liquid Glass building blocks (iOS 26+).
///
/// These wrap Apple's native `glassEffect` / glass button styles so the rest of
/// the app can request on-brand glass surfaces with a single modifier.

extension Glass {
    /// Regular glass, optionally tinted with a brand color.
    static func sq(_ tint: Color? = nil, interactive: Bool = false) -> Glass {
        var glass = Glass.regular
        if let tint { glass = glass.tint(tint) }
        if interactive { glass = glass.interactive() }
        return glass
    }
}

extension View {
    /// A rounded glass card with a hairline highlight stroke for definition on
    /// dark backgrounds.
    func sqGlassCard(
        cornerRadius: CGFloat = Radius.card,
        tint: Color? = nil,
        interactive: Bool = false,
        strokeOpacity: Double = 0.10
    ) -> some View {
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
        return self
            .glassEffect(.sq(tint, interactive: interactive), in: shape)
            .overlay(shape.strokeBorder(Color.white.opacity(strokeOpacity), lineWidth: 0.75))
    }

    /// A capsule-shaped glass surface (pills, badges, floating controls).
    func sqGlassPill(tint: Color? = nil, interactive: Bool = false, strokeOpacity: Double = 0.12) -> some View {
        self
            .glassEffect(.sq(tint, interactive: interactive), in: Capsule())
            .overlay(Capsule().strokeBorder(Color.white.opacity(strokeOpacity), lineWidth: 0.75))
    }

    /// A circular glass surface (icon buttons, avatars, map controls).
    func sqGlassCircle(tint: Color? = nil, interactive: Bool = false, strokeOpacity: Double = 0.12) -> some View {
        self
            .glassEffect(.sq(tint, interactive: interactive), in: Circle())
            .overlay(Circle().strokeBorder(Color.white.opacity(strokeOpacity), lineWidth: 0.75))
    }
}

// MARK: - Button styles

/// Primary call-to-action — a bold gradient capsule with a press spring.
struct SQPrimaryButtonStyle: ButtonStyle {
    var gradient: LinearGradient = Theme.logoGradient
    var height: CGFloat = 52

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.sqHeadline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: height)
            .background(gradient, in: Capsule())
            .overlay(Capsule().strokeBorder(Color.white.opacity(0.14), lineWidth: 0.75))
            .shadow(color: Theme.purple.opacity(configuration.isPressed ? 0.15 : 0.35),
                    radius: configuration.isPressed ? 6 : 16, y: 6)
            .scaleEffect(configuration.isPressed ? 0.975 : 1)
            .opacity(configuration.isPressed ? 0.94 : 1)
            .animation(.spring(response: 0.28, dampingFraction: 0.7), value: configuration.isPressed)
            .contentShape(Capsule())
    }
}

/// Secondary action — an interactive glass capsule.
struct SQGlassButtonStyle: ButtonStyle {
    var tint: Color? = nil
    var height: CGFloat = 52

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.sqCallout)
            .foregroundStyle(Theme.textPrimary)
            .frame(maxWidth: .infinity, minHeight: height)
            .padding(.horizontal, Space.lg)
            .sqGlassPill(tint: tint, interactive: true)
            .scaleEffect(configuration.isPressed ? 0.975 : 1)
            .animation(.spring(response: 0.28, dampingFraction: 0.7), value: configuration.isPressed)
            .contentShape(Capsule())
    }
}

extension ButtonStyle where Self == SQPrimaryButtonStyle {
    static var sqPrimary: SQPrimaryButtonStyle { SQPrimaryButtonStyle() }
}

extension ButtonStyle where Self == SQGlassButtonStyle {
    static var sqGlass: SQGlassButtonStyle { SQGlassButtonStyle() }
}
