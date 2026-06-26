import SwiftUI

struct LoadingView: View {
    var message: String = "Loading…"

    var body: some View {
        VStack(spacing: 12) {
            ProgressView()
                .progressViewStyle(.circular)
                .tint(BrandTheme.accent)
                .scaleEffect(1.15)

            Text(message)
                .font(.subheadline)
                .foregroundStyle(BrandTheme.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(BrandTheme.surfaceLight)
    }
}

#Preview {
    LoadingView(message: "Finding local events…")
}
