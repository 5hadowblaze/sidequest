import SwiftUI

/// Full-screen loading state with the brand backdrop.
struct LoadingView: View {
    var message: String = "Loading…"
    var showPipeline: Bool = false

    var body: some View {
        ZStack {
            GlowBackground()
            VStack(spacing: Space.lg) {
                BrandLogo(size: 64)
                QuestSpinner(size: 30)
                Text(message)
                    .font(.sqBody)
                    .foregroundStyle(Theme.textMuted)
                    .multilineTextAlignment(.center)
                if showPipeline {
                    PipelineFlow()
                        .padding(.top, Space.xs)
                }
            }
            .padding(Space.xxl)
        }
        .accessibilityIdentifier("loadingView")
    }
}
