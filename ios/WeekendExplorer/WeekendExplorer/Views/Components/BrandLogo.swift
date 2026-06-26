import SwiftUI

/// Gradient "S" badge matching the Sidequest web app.
struct BrandLogo: View {
    var size: CGFloat = 36
    var cornerRadius: CGFloat = 10
    var fontSize: CGFloat = 16

    private static let googleBlue = Color(hex: "#4285f4")
    private static let googleGreen = Color(hex: "#34a853")
    private static let googleYellow = Color(hex: "#fbbc04")

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [Self.googleBlue, Self.googleGreen, Self.googleYellow],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .shadow(color: .black.opacity(0.08), radius: 4, y: 2)

            Text("S")
                .font(.system(size: fontSize, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
        }
        .frame(width: size, height: size)
        .accessibilityLabel("Sidequest")
    }
}

#Preview {
    BrandLogo(size: 56, cornerRadius: 14, fontSize: 22)
        .padding()
}
