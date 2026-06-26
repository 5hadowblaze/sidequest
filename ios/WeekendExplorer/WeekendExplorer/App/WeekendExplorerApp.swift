import SwiftUI
import FirebaseCore
import GoogleSignIn

@main
struct WeekendExplorerApp: App {
    @State private var viewModel = ExplorerViewModel()

    init() {
        FirebaseApp.configure()
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if viewModel.isAuthLoading {
                    LoadingView(message: "Loading…")
                } else if viewModel.isSignedIn {
                    ExplorerView()
                        .task { await viewModel.bootstrapIfSignedIn() }
                } else {
                    SignInView(
                        isMockAuth: viewModel.isMockAuth,
                        onSignIn: {
                            Task { try? await viewModel.signInWithGoogle() }
                        }
                    )
                }
            }
            .environment(viewModel)
            .onOpenURL { url in
                GIDSignIn.sharedInstance.handle(url)
            }
        }
    }
}
