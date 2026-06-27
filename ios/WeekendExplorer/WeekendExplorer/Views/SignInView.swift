import SwiftUI

struct SignInView: View {
    var isMockAuth: Bool = true
    var onSignIn: () -> Void = {}

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [BrandTheme.badgeBackground, .white],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                VStack(spacing: 24) {
                    BrandLogo(size: 56)

                    VStack(spacing: 12) {
                        Text("Sidequest")
                            .font(.title2.weight(.medium))
                            .foregroundStyle(BrandTheme.textPrimary)
                            .multilineTextAlignment(.center)

                        Text(
                            "Your weekend, verified. Discover local events on the map, then plan with Prometheux and Tavily."
                        )
                        .font(.subheadline)
                        .foregroundStyle(BrandTheme.muted)
                        .multilineTextAlignment(.center)
                        .lineSpacing(4)
                    }

                    Button(action: onSignIn) {
                        HStack(spacing: 12) {
                            GoogleSignInIcon()
                            Text("Continue with Google")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(BrandTheme.textSecondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(.white)
                        .clipShape(Capsule())
                        .overlay(
                            Capsule()
                                .stroke(BrandTheme.border, lineWidth: 1)
                        )
                        .shadow(color: .black.opacity(0.06), radius: 4, y: 2)
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("signInButton")

                    if isMockAuth {
                        Text("Firebase not configured — demo sign-in uses local storage")
                            .font(.caption)
                            .foregroundStyle(BrandTheme.muted)
                            .multilineTextAlignment(.center)
                    }
                }
                .padding(32)
                .background(.white)
                .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .stroke(BrandTheme.borderLight, lineWidth: 1)
                )
                .shadow(color: .black.opacity(0.12), radius: 24, y: 12)
                .padding(.horizontal, 24)

                Spacer()
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("signInView")
    }
}

private struct GoogleSignInIcon: View {
    var body: some View {
        ZStack {
            Circle().fill(Color(hex: "#4285f4")).frame(width: 8, height: 8).offset(x: 4, y: -4)
            Circle().fill(Color(hex: "#34a853")).frame(width: 8, height: 8).offset(x: 4, y: 4)
            Circle().fill(Color(hex: "#fbbc04")).frame(width: 8, height: 8).offset(x: -4, y: 4)
            Circle().fill(Color(hex: "#ea4335")).frame(width: 8, height: 8).offset(x: -4, y: -4)
        }
        .frame(width: 18, height: 18)
        .accessibilityHidden(true)
    }
}

#Preview {
    SignInView(isMockAuth: true, onSignIn: {})
}
