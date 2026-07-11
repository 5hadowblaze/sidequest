import SwiftUI

/// A lightweight confetti burst used on the onboarding finish and plan confirm.
struct ConfettiView: View {
    var isActive: Bool
    private let colors: [Color] = [Theme.purple, Theme.teal, Theme.coral, Theme.amber, Theme.purpleBright]
    @State private var pieces: [Piece] = []
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    struct Piece: Identifiable {
        let id = UUID()
        var x: CGFloat
        var delay: Double
        var color: Color
        var rotation: Double
        var size: CGFloat
    }

    var body: some View {
        GeometryReader { geo in
            ZStack {
                ForEach(pieces) { piece in
                    ConfettiPiece(piece: piece, height: geo.size.height, active: isActive && !reduceMotion)
                        .position(x: piece.x * geo.size.width, y: -20)
                }
            }
        }
        .allowsHitTesting(false)
        .onAppear(perform: build)
    }

    private func build() {
        pieces = (0..<40).map { _ in
            Piece(
                x: .random(in: 0...1),
                delay: .random(in: 0...0.5),
                color: colors.randomElement() ?? Theme.purple,
                rotation: .random(in: 0...360),
                size: .random(in: 6...11)
            )
        }
    }
}

private struct ConfettiPiece: View {
    let piece: ConfettiView.Piece
    let height: CGFloat
    let active: Bool
    @State private var fall = false

    var body: some View {
        RoundedRectangle(cornerRadius: 2)
            .fill(piece.color)
            .frame(width: piece.size, height: piece.size * 0.5)
            .rotationEffect(.degrees(fall ? piece.rotation + 220 : piece.rotation))
            .offset(y: fall ? height + 60 : 0)
            .opacity(fall ? 0 : 1)
            .onChange(of: active) { _, isActive in
                guard isActive else { return }
                withAnimation(.easeIn(duration: 1.8).delay(piece.delay)) { fall = true }
            }
            .onAppear {
                guard active else { return }
                withAnimation(.easeIn(duration: 1.8).delay(piece.delay)) { fall = true }
            }
    }
}
