import SwiftUI

/// A gradient ring spinner used across loading states.
struct QuestSpinner: View {
    var size: CGFloat = 32
    var lineWidth: CGFloat = 3
    @State private var spin = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        Circle()
            .trim(from: 0, to: 0.72)
            .stroke(
                AngularGradient(colors: [Theme.purple, Theme.teal, Theme.purple], center: .center),
                style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
            )
            .frame(width: size, height: size)
            .rotationEffect(.degrees(spin ? 360 : 0))
            .onAppear {
                guard !reduceMotion else { return }
                withAnimation(.linear(duration: 0.9).repeatForever(autoreverses: false)) {
                    spin = true
                }
            }
            .accessibilityLabel("Loading")
    }
}

/// The pipeline eyebrow shown during discover/plan: Tavily → Prometheux → Gemini.
struct PipelineFlow: View {
    var body: some View {
        HStack(spacing: 6) {
            stage("Tavily", Theme.teal)
            arrow
            stage("Prometheux", Theme.purple)
            arrow
            stage("Gemini", Theme.amber)
        }
        .font(.sqMicro)
    }

    private func stage(_ name: String, _ color: Color) -> some View {
        HStack(spacing: 4) {
            Circle().fill(color).frame(width: 5, height: 5)
            Text(name).foregroundStyle(Theme.textMuted)
        }
    }

    private var arrow: some View {
        Image(systemName: "arrow.right")
            .font(.system(size: 8, weight: .bold))
            .foregroundStyle(Theme.textFaint)
    }
}

/// A shimmering placeholder block for skeleton cards.
struct Shimmer: View {
    @State private var phase: CGFloat = -1
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        GeometryReader { geo in
            Theme.surfaceMuted
                .overlay {
                    LinearGradient(
                        colors: [.clear, Color.white.opacity(0.06), .clear],
                        startPoint: .leading, endPoint: .trailing
                    )
                    .frame(width: geo.size.width * 0.6)
                    .offset(x: phase * geo.size.width)
                }
                .onAppear {
                    guard !reduceMotion else { return }
                    withAnimation(.linear(duration: 1.4).repeatForever(autoreverses: false)) {
                        phase = 1.6
                    }
                }
        }
    }
}
