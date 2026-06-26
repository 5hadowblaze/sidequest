import SwiftUI

struct UserMenuView: View {
    let user: AuthUser
    let homeCity: String?
    let isMockAuth: Bool
    let onSignOut: () -> Void
    let onEditProfile: () -> Void

    private var initials: String {
        if let first = user.displayName?.first {
            return String(first).uppercased()
        }
        if let first = user.email?.first {
            return String(first).uppercased()
        }
        return "?"
    }

    var body: some View {
        HStack(spacing: 12) {
            if let homeCity, !homeCity.isEmpty {
                HStack(spacing: 6) {
                    Image(systemName: "mappin.and.ellipse")
                        .font(.caption)
                        .foregroundStyle(BrandTheme.muted)
                    Text(homeCity)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(BrandTheme.textSecondary)
                        .lineLimit(1)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(BrandTheme.surface)
                .clipShape(Capsule())
            }

            Menu {
                Section {
                    VStack(alignment: .leading) {
                        Text(user.displayName ?? "Signed in")
                            .font(.subheadline.weight(.medium))
                        if let email = user.email {
                            Text(email)
                                .font(.caption)
                                .foregroundStyle(BrandTheme.muted)
                        }
                        if isMockAuth {
                            Text("Demo auth (no Firebase)")
                                .font(.caption)
                                .foregroundStyle(BrandTheme.warning)
                        }
                    }
                }

                Button {
                    onEditProfile()
                } label: {
                    Label("Edit preferences", systemImage: "slider.horizontal.3")
                }
                .accessibilityIdentifier("editProfileButton")

                Button(role: .destructive) {
                    onSignOut()
                } label: {
                    Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
                }
                .accessibilityIdentifier("signOutButton")
            } label: {
                HStack(spacing: 8) {
                    avatar
                    Image(systemName: "chevron.down")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(BrandTheme.muted)
                }
                .padding(.leading, 4)
                .padding(.trailing, 10)
                .padding(.vertical, 4)
                .background(.white)
                .clipShape(Capsule())
                .overlay(
                    Capsule()
                        .stroke(BrandTheme.borderLight, lineWidth: 1)
                )
                .shadow(color: .black.opacity(0.04), radius: 2, y: 1)
            }
            .accessibilityIdentifier("userMenuButton")
        }
    }

    @ViewBuilder
    private var avatar: some View {
        if let photoURL = user.photoURL, let url = URL(string: photoURL) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                default:
                    initialsAvatar
                }
            }
            .frame(width: 32, height: 32)
            .clipShape(Circle())
        } else {
            initialsAvatar
        }
    }

    private var initialsAvatar: some View {
        Text(initials)
            .font(.subheadline.weight(.medium))
            .foregroundStyle(.white)
            .frame(width: 32, height: 32)
            .background(BrandTheme.accent)
            .clipShape(Circle())
    }
}

#Preview {
    UserMenuView(
        user: AuthUser(
            uid: "demo",
            displayName: "Alex Explorer",
            email: "alex@example.com",
            photoURL: nil
        ),
        homeCity: "Austin, TX",
        isMockAuth: true,
        onSignOut: {},
        onEditProfile: {}
    )
    .padding()
}
