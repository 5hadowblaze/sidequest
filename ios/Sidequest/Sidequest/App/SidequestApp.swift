import SwiftUI
import FirebaseCore
import GoogleSignIn

@main
struct SidequestApp: App {
    @State private var viewModel = ExplorerViewModel()

    init() {
        if AppConfig.isFirebaseConfigured {
            FirebaseApp.configure()
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(viewModel)
                .preferredColorScheme(.dark)
                .tint(Theme.accent)
                .onOpenURL { url in
                    if AppConfig.isFirebaseConfigured {
                        _ = GIDSignIn.sharedInstance.handle(url)
                    }
                }
        }
    }
}

/// Switches between loading / sign-in / explorer based on auth state.
struct RootView: View {
    @Environment(ExplorerViewModel.self) private var vm

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            if vm.isAuthLoading {
                LoadingView(message: "Getting your quest ready…")
            } else if vm.isSignedIn {
                ExplorerView()
                    .task { await vm.bootstrap() }
                    .transition(.opacity)
            } else {
                SignInView()
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.35), value: vm.isSignedIn)
        .animation(.easeInOut(duration: 0.35), value: vm.isAuthLoading)
    }
}
