import SwiftUI

struct SignInView: View {
    @Environment(ExplorerViewModel.self) private var vm
    @State private var isSigningIn = false
    @State private var errorMessage: String?
    @State private var appear = false

    var body: some View {
        ZStack {
            GlowBackground()

            VStack(spacing: Space.xxl) {
                Spacer()

                VStack(spacing: Space.lg) {
                    BrandLogo(size: 88)
                        .scaleEffect(appear ? 1 : 0.8)
                        .opacity(appear ? 1 : 0)

                    VStack(spacing: Space.sm) {
                        Text("Sidequest")
                            .font(.system(size: 40, weight: .bold))
                            .foregroundStyle(Theme.textPrimary)
                        Text("your weekend, verified")
                            .font(.sqBody)
                            .foregroundStyle(Theme.textMuted)
                    }
                    .opacity(appear ? 1 : 0)
                    .offset(y: appear ? 0 : 12)
                }

                Text("Discover local events, then let a deterministic agent plan a verified weekend around your schedule.")
                    .font(.sqBody)
                    .foregroundStyle(Theme.textMuted)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Space.xl)
                    .opacity(appear ? 1 : 0)

                Spacer()

                VStack(spacing: Space.md) {
                    Button(action: signIn) {
                        HStack(spacing: Space.md) {
                            if isSigningIn {
                                QuestSpinner(size: 18, lineWidth: 2)
                            } else {
                                GoogleGlyph()
                            }
                            Text(isSigningIn ? "Signing in…" : "Continue with Google")
                        }
                    }
                    .buttonStyle(SQPrimaryButtonStyle(gradient: Theme.logoGradient))
                    .disabled(isSigningIn)
                    .accessibilityIdentifier("signInButton")

                    if vm.isMockAuth {
                        Label("Demo mode — no Firebase configured", systemImage: "wand.and.stars")
                            .font(.sqCaption)
                            .foregroundStyle(Theme.textFaint)
                    }

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.sqCaption)
                            .foregroundStyle(Theme.coral)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, Space.lg)
                            .padding(.vertical, Space.sm)
                            .frame(maxWidth: .infinity)
                            .background(Theme.coralSoft, in: RoundedRectangle(cornerRadius: Radius.md))
                    }
                }
                .padding(.horizontal, Space.xxl)
                .padding(.bottom, Space.xxxl)
                .opacity(appear ? 1 : 0)
            }
        }
        .accessibilityIdentifier("signInView")
        .onAppear {
            withAnimation(.spring(response: 0.7, dampingFraction: 0.75)) { appear = true }
        }
    }

    private func signIn() {
        errorMessage = nil
        isSigningIn = true
        Task {
            do {
                // On success, RootView switches to ExplorerView, whose `.task`
                // runs bootstrap (profile → calendar → discover).
                try await vm.auth.signIn()
            } catch {
                errorMessage = error.localizedDescription
            }
            isSigningIn = false
        }
    }
}

/// The multicolor Google "G" glyph.
private struct GoogleGlyph: View {
    var body: some View {
        ZStack {
            Circle().fill(.white).frame(width: 22, height: 22)
            Text("G")
                .font(.system(size: 15, weight: .bold, design: .rounded))
                .foregroundStyle(
                    LinearGradient(
                        colors: [Color(hex: 0x4285F4), Color(hex: 0x34A853), Color(hex: 0xFBBC04), Color(hex: 0xEA4335)],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    )
                )
        }
    }
}
