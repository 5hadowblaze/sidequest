import SwiftUI

/// The signature Sidequest backdrop: a dark quest gradient with softly
/// drifting purple/teal/coral glow orbs. Used behind sign-in, onboarding,
/// and loading states.
struct GlowBackground: View {
    var animated: Bool = true
    @State private var drift = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            Theme.questGradient.ignoresSafeArea()

            orb(Theme.purple, size: 320)
                .offset(x: drift ? -110 : -140, y: drift ? -220 : -260)
            orb(Theme.teal, size: 280)
                .offset(x: drift ? 130 : 160, y: drift ? -60 : -30)
            orb(Theme.coral, size: 220)
                .offset(x: drift ? -90 : -60, y: drift ? 280 : 320)
        }
        .ignoresSafeArea()
        .onAppear {
            guard animated, !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 9).repeatForever(autoreverses: true)) {
                drift = true
            }
        }
    }

    private func orb(_ color: Color, size: CGFloat) -> some View {
        Circle()
            .fill(color.opacity(0.35))
            .frame(width: size, height: size)
            .blur(radius: 90)
    }
}
