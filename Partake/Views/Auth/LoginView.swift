import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var displayName = ""
    @State private var isSignUp = false

    var body: some View {
        NavigationStack {
            VStack(spacing: PartakeTheme.spacingXL) {
                Spacer()

                // Logo area
                VStack(spacing: PartakeTheme.spacingSM) {
                    Text("🍽️")
                        .font(.system(size: 60))

                    Text("Partake")
                        .font(PartakeTheme.largeTitle)
                        .foregroundStyle(PartakeTheme.primaryGradient)

                    Text("Split what you share")
                        .font(PartakeTheme.body)
                        .foregroundStyle(PartakeTheme.subtleText)
                }

                // Form
                VStack(spacing: PartakeTheme.spacingMD) {
                    if isSignUp {
                        TextField("Your name", text: $displayName)
                            .textFieldStyle(.roundedBorder)
                            .textContentType(.name)
                            .font(PartakeTheme.body)
                    }

                    TextField("Email", text: $email)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .font(PartakeTheme.body)

                    SecureField("Password", text: $password)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(isSignUp ? .newPassword : .password)
                        .font(PartakeTheme.body)
                }
                .padding(.horizontal, PartakeTheme.spacingLG)

                if let error = authViewModel.errorMessage {
                    Text(error)
                        .font(PartakeTheme.caption)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }

                // Buttons
                VStack(spacing: PartakeTheme.spacingMD) {
                    PartakePrimaryButton(title: isSignUp ? "Create account" : "Sign in") {
                        Task {
                            if isSignUp {
                                await authViewModel.signUpWithEmail(
                                    email: email,
                                    password: password,
                                    displayName: displayName.isEmpty ? "Friend" : displayName
                                )
                            } else {
                                await authViewModel.signInWithEmail(email: email, password: password)
                            }
                        }
                    }
                    .disabled(authViewModel.isLoading)
                    .padding(.horizontal, PartakeTheme.spacingLG)

                    Button(isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up") {
                        withAnimation(PartakeAnimations.smooth) {
                            isSignUp.toggle()
                        }
                    }
                    .font(PartakeTheme.caption)
                    .foregroundStyle(Color(hex: "FF6B6B"))
                }

                Spacer()
                Spacer()
            }
            .overlay {
                if authViewModel.isLoading {
                    ProgressView()
                        .scaleEffect(1.5)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(.ultraThinMaterial)
                }
            }
        }
    }
}
