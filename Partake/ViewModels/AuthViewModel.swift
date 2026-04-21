import Foundation
import FirebaseAuth
import AuthenticationServices

@MainActor
class AuthViewModel: ObservableObject {
    @Published var currentUser: AppUser?
    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let userRepository = UserRepository()

    init() {
        checkAuthState()
    }

    func checkAuthState() {
        if let firebaseUser = Auth.auth().currentUser {
            isAuthenticated = true
            Task {
                await loadUserProfile(uid: firebaseUser.uid)
            }
        }
    }

    func signInWithEmail(email: String, password: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let result = try await Auth.auth().signIn(withEmail: email, password: password)
            await loadOrCreateUser(firebaseUser: result.user)
            isAuthenticated = true
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func signUpWithEmail(email: String, password: String, displayName: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let result = try await Auth.auth().createUser(withEmail: email, password: password)
            let user = AppUser(
                id: result.user.uid,
                displayName: displayName,
                email: email,
                partnerGroupIds: [],
                createdAt: Date()
            )
            try await userRepository.createUser(user)
            currentUser = user
            isAuthenticated = true
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func signOut() {
        do {
            try Auth.auth().signOut()
            currentUser = nil
            isAuthenticated = false
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func loadUserProfile(uid: String) async {
        currentUser = try? await userRepository.getUser(id: uid)
    }

    private func loadOrCreateUser(firebaseUser: FirebaseAuth.User) async {
        if let user = try? await userRepository.getUser(id: firebaseUser.uid) {
            currentUser = user
        } else {
            let user = AppUser(
                id: firebaseUser.uid,
                displayName: firebaseUser.displayName ?? "Friend",
                email: firebaseUser.email ?? "",
                partnerGroupIds: [],
                createdAt: Date()
            )
            try? await userRepository.createUser(user)
            currentUser = user
        }
    }
}
