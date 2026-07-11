import SwiftUI

/// A small rule badge (e.g. "Budget", "Free Saturday Afternoon").
struct RuleBadge: View {
    let rule: String
    var body: some View {
        Text(formatRuleBadge(rule))
            .font(.sqMicro)
            .foregroundStyle(Theme.purpleBright)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(Theme.purpleSoft, in: Capsule())
            .overlay(Capsule().strokeBorder(Theme.purple.opacity(0.35), lineWidth: 0.75))
    }
}

/// "Verified" pill — Prometheux-gated events.
struct VerifiedBadge: View {
    var compact: Bool = false
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: compact ? 9 : 11, weight: .bold))
            Text("Verified")
                .font(compact ? .sqMicro : .sqCaption)
        }
        .foregroundStyle(Theme.tealBright)
        .padding(.horizontal, compact ? 8 : 10)
        .padding(.vertical, compact ? 4 : 5)
        .sqGlassPill(tint: Theme.teal)
    }
}

/// Price pill shown over event imagery.
struct PricePill: View {
    let label: String
    var body: some View {
        Text(label)
            .font(.sqCaption)
            .foregroundStyle(.white)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .sqGlassPill(strokeOpacity: 0.16)
    }
}

/// Uppercase category eyebrow label.
struct CategoryLabel: View {
    let category: String
    var body: some View {
        Text(category.uppercased())
            .font(.sqMicro)
            .tracking(0.8)
            .foregroundStyle(Theme.textMuted)
    }
}

/// Generic selectable chip (onboarding + quick search).
struct SelectChip: View {
    let title: String
    var isSelected: Bool
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.sqCallout)
                .foregroundStyle(isSelected ? .white : Theme.textPrimary)
                .padding(.horizontal, 14)
                .padding(.vertical, 9)
                .background {
                    if isSelected {
                        Capsule().fill(Theme.logoGradient)
                    }
                }
                .sqGlassPill(tint: isSelected ? Theme.purple : nil, interactive: true)
        }
        .buttonStyle(.plain)
    }
}
