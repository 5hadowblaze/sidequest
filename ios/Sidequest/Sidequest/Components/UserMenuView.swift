import SwiftUI

/// Avatar button in the explorer header that opens a menu with the user's
/// details, an edit-preferences action, and sign out.
struct UserMenuView: View {
    let user: AuthUser?
    let isMockAuth: Bool
    var onEditPreferences: () -> Void
    var onSignOut: () -> Void

    var body: some View {
        Menu {
            if let user {
                Section {
                    Text(user.displayName ?? "Explorer")
                    if let email = user.email { Text(email) }
                }
            }
            if isMockAuth {
                Section { Label("Demo mode", systemImage: "wand.and.stars") }
            }
            Button(action: onEditPreferences) {
                Label("Edit preferences", systemImage: "slider.horizontal.3")
            }
            Divider()
            Button(role: .destructive, action: onSignOut) {
                Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
            }
        } label: {
            avatar
        }
        .accessibilityIdentifier("userMenu")
    }

    @ViewBuilder private var avatar: some View {
        Group {
            if let photo = user?.photoURL, let url = URL(string: photo) {
                AsyncImage(url: url) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    initials
                }
            } else {
                initials
            }
        }
        .frame(width: 38, height: 38)
        .clipShape(Circle())
        .sqGlassCircle(strokeOpacity: 0.18)
    }

    private var initials: some View {
        Text(initialsText)
            .font(.sqCallout)
            .foregroundStyle(.white)
            .frame(width: 38, height: 38)
            .background(Theme.logoGradient, in: Circle())
    }

    private var initialsText: String {
        let name = user?.displayName ?? user?.email ?? "S"
        let parts = name.split(separator: " ")
        if let first = parts.first?.first {
            if parts.count > 1, let second = parts[1].first {
                return "\(first)\(second)".uppercased()
            }
            return String(first).uppercased()
        }
        return "S"
    }
}
