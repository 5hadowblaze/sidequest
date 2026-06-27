import SwiftUI

/// Simple black-and-white stickman on a side quest.
struct BrandLogo: View {
    var size: CGFloat = 36

    var body: some View {
        StickmanQuestIcon()
            .foregroundStyle(BrandTheme.textPrimary)
            .frame(width: size, height: size)
            .accessibilityLabel("Sidequest")
    }
}

private struct StickmanQuestIcon: View {
    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            let stroke = max(w * 0.055, 1.5)

            ZStack {
                Circle()
                    .fill(.primary.opacity(0.2))
                    .frame(width: w * 0.11)
                    .position(x: w * 0.17, y: h * 0.73)
                Circle()
                    .fill(.primary.opacity(0.3))
                    .frame(width: w * 0.09)
                    .position(x: w * 0.27, y: h * 0.77)
                Circle()
                    .fill(.primary.opacity(0.4))
                    .frame(width: w * 0.07)
                    .position(x: w * 0.35, y: h * 0.8)

                Path { path in
                    path.move(to: CGPoint(x: w * 0.46, y: h * 0.8))
                    path.addLine(to: CGPoint(x: w * 0.41, y: h * 0.94))
                    path.move(to: CGPoint(x: w * 0.46, y: h * 0.8))
                    path.addLine(to: CGPoint(x: w * 0.52, y: h * 0.94))
                    path.move(to: CGPoint(x: w * 0.46, y: h * 0.8))
                    path.addLine(to: CGPoint(x: w * 0.46, y: h * 0.56))
                    path.move(to: CGPoint(x: w * 0.46, y: h * 0.68))
                    path.addLine(to: CGPoint(x: w * 0.38, y: h * 0.76))
                    path.move(to: CGPoint(x: w * 0.46, y: h * 0.63))
                    path.addLine(to: CGPoint(x: w * 0.57, y: h * 0.51))
                }
                .stroke(.primary, style: StrokeStyle(lineWidth: stroke, lineCap: .round, lineJoin: .round))

                Circle()
                    .fill(.primary)
                    .frame(width: w * 0.17)
                    .position(x: w * 0.46, y: h * 0.46)

                Circle()
                    .strokeBorder(.primary, lineWidth: stroke * 1.1)
                    .frame(width: w * 0.22)
                    .overlay {
                        Text("!")
                            .font(.system(size: w * 0.14, weight: .heavy, design: .rounded))
                            .foregroundStyle(.primary)
                            .offset(y: -w * 0.01)
                    }
                    .position(x: w * 0.67, y: h * 0.41)
            }
        }
        .aspectRatio(1, contentMode: .fit)
    }
}

#Preview {
    HStack(spacing: 16) {
        BrandLogo(size: 36)
        BrandLogo(size: 56)
        BrandLogo(size: 80)
    }
    .padding()
}
