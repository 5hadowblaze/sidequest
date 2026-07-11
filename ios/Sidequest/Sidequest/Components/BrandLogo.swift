import SwiftUI

/// The Sidequest mark — a stick-figure adventurer walking toward a quest
/// marker (hollow circle with a bold "!"), with a fading trail behind.
/// Drawn as a gradient fill masked by vector paths, so it scales crisply.
struct BrandLogo: View {
    var size: CGFloat = 44
    var gradient: LinearGradient = Theme.brandGradient

    var body: some View {
        gradient
            .frame(width: size, height: size)
            .mask {
                BrandLogoShape()
                    .frame(width: size, height: size)
            }
            .accessibilityHidden(true)
    }
}

private struct BrandLogoShape: View {
    var body: some View {
        Canvas { context, canvasSize in
            let s = min(canvasSize.width, canvasSize.height)
            let stroke = s * 0.055
            let white = GraphicsContext.Shading.color(.white)

            // Fading trail behind the figure.
            for i in 0..<3 {
                let x = s * (0.10 + Double(i) * 0.055)
                let y = s * 0.74
                let r = s * 0.018
                var dot = Path()
                dot.addEllipse(in: CGRect(x: x - r, y: y - r, width: r * 2, height: r * 2))
                context.fill(dot, with: .color(.white.opacity(0.3 + Double(i) * 0.12)))
            }

            // Head.
            let headR = s * 0.055
            let headCenter = CGPoint(x: s * 0.34, y: s * 0.34)
            var head = Path()
            head.addEllipse(in: CGRect(
                x: headCenter.x - headR, y: headCenter.y - headR,
                width: headR * 2, height: headR * 2
            ))
            context.fill(head, with: white)

            // Body + limbs (mid-stride).
            var body = Path()
            body.move(to: CGPoint(x: s * 0.34, y: s * 0.41)); body.addLine(to: CGPoint(x: s * 0.34, y: s * 0.60))
            body.move(to: CGPoint(x: s * 0.34, y: s * 0.46)); body.addLine(to: CGPoint(x: s * 0.26, y: s * 0.52))
            body.move(to: CGPoint(x: s * 0.34, y: s * 0.46)); body.addLine(to: CGPoint(x: s * 0.44, y: s * 0.50))
            body.move(to: CGPoint(x: s * 0.34, y: s * 0.60)); body.addLine(to: CGPoint(x: s * 0.27, y: s * 0.72))
            body.move(to: CGPoint(x: s * 0.34, y: s * 0.60)); body.addLine(to: CGPoint(x: s * 0.43, y: s * 0.71))
            context.stroke(body, with: white, style: StrokeStyle(lineWidth: stroke, lineCap: .round, lineJoin: .round))

            // Quest marker: hollow circle + stem.
            let markerCenter = CGPoint(x: s * 0.70, y: s * 0.36)
            let markerR = s * 0.15
            var marker = Path()
            marker.addEllipse(in: CGRect(
                x: markerCenter.x - markerR, y: markerCenter.y - markerR,
                width: markerR * 2, height: markerR * 2
            ))
            context.stroke(marker, with: white, style: StrokeStyle(lineWidth: stroke * 1.1))

            var stem = Path()
            stem.move(to: CGPoint(x: markerCenter.x, y: markerCenter.y + markerR))
            stem.addLine(to: CGPoint(x: markerCenter.x, y: s * 0.70))
            context.stroke(stem, with: white, style: StrokeStyle(lineWidth: stroke * 1.1, lineCap: .round))

            // Exclamation mark.
            var bang = Path()
            bang.move(to: CGPoint(x: markerCenter.x, y: markerCenter.y - markerR * 0.55))
            bang.addLine(to: CGPoint(x: markerCenter.x, y: markerCenter.y + markerR * 0.15))
            context.stroke(bang, with: white, style: StrokeStyle(lineWidth: stroke * 1.2, lineCap: .round))

            var bangDot = Path()
            let dotR = stroke * 0.75
            bangDot.addEllipse(in: CGRect(
                x: markerCenter.x - dotR, y: markerCenter.y + markerR * 0.42 - dotR,
                width: dotR * 2, height: dotR * 2
            ))
            context.fill(bangDot, with: white)
        }
    }
}
