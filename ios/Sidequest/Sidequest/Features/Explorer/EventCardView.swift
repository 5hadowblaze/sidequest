import SwiftUI

/// Resolves possibly-relative `image_url` values to a loadable URL.
enum EventImage {
    static func url(from raw: String) -> URL? {
        let trimmed = raw.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return nil }
        if trimmed.hasPrefix("http://") || trimmed.hasPrefix("https://") {
            return URL(string: trimmed)
        }
        // Relative path from the backend asset origin.
        return URL(string: trimmed, relativeTo: AppConfig.assetOrigin)
    }
}

/// Async image with a branded gradient fallback.
struct EventImageView: View {
    let raw: String
    var body: some View {
        Group {
            if let url = EventImage.url(from: raw) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    case .empty:
                        placeholder.overlay(QuestSpinner(size: 22))
                    case .failure:
                        placeholder
                    @unknown default:
                        placeholder
                    }
                }
            } else {
                placeholder
            }
        }
    }

    private var placeholder: some View {
        ZStack {
            LinearGradient(
                colors: [Theme.surfaceMuted, Theme.surface],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
            BrandLogo(size: 40).opacity(0.5)
        }
    }
}

struct EventCardView: View {
    let event: DiscoverEvent
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 0) {
                imageHeader
                VStack(alignment: .leading, spacing: Space.sm) {
                    CategoryLabel(category: event.category)
                    Text(event.title)
                        .font(.sqHeadline)
                        .foregroundStyle(Theme.textPrimary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    Text(event.description)
                        .font(.sqBody)
                        .foregroundStyle(Theme.textMuted)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    if !event.passedRules.isEmpty {
                        FlowLayout(spacing: 6, rowSpacing: 6) {
                            ForEach(event.passedRules.prefix(4), id: \.self) { RuleBadge(rule: $0) }
                            if event.passedRules.count > 4 {
                                Text("+\(event.passedRules.count - 4)")
                                    .font(.sqMicro)
                                    .foregroundStyle(Theme.textFaint)
                                    .padding(.horizontal, 8).padding(.vertical, 5)
                            }
                        }
                    }

                    footer
                }
                .padding(Space.lg)
            }
            .background(Theme.surface, in: RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Radius.card, style: .continuous)
                    .strokeBorder(isSelected ? Theme.purple : Theme.border,
                                  lineWidth: isSelected ? 1.5 : 0.75)
            )
            .shadow(color: isSelected ? Theme.purple.opacity(0.3) : .black.opacity(0.25),
                    radius: isSelected ? 14 : 8, y: 4)
        }
        .buttonStyle(.plain)
        .animation(.spring(response: 0.35, dampingFraction: 0.8), value: isSelected)
    }

    private var imageHeader: some View {
        EventImageView(raw: event.imageURL)
            .frame(height: 150)
            .frame(maxWidth: .infinity)
            .clipped()
            .overlay(
                LinearGradient(colors: [.clear, .black.opacity(0.35)], startPoint: .center, endPoint: .bottom)
            )
            .overlay(alignment: .topLeading) {
                if event.prometheuxVerified {
                    VerifiedBadge(compact: true).padding(Space.md)
                }
            }
            .overlay(alignment: .topTrailing) {
                PricePill(label: event.priceLabel).padding(Space.md)
            }
    }

    private var footer: some View {
        HStack(spacing: Space.md) {
            if let hint = event.dateHint, !hint.isEmpty {
                Label(hint, systemImage: "calendar")
            }
            Label(event.location, systemImage: "mappin.and.ellipse")
                .lineLimit(1)
            Spacer()
        }
        .font(.sqCaption)
        .foregroundStyle(Theme.textFaint)
        .padding(.top, 2)
    }
}
