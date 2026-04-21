import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var displayName = ""
    @State private var venmoUsername = ""
    @State private var contacts: [SavedContact] = []
    @State private var partnerGroups: [PartnerGroup] = []
    @State private var showAddContact = false
    @State private var showAddPartnerGroup = false
    @State private var isSaving = false

    private let userRepository = UserRepository()

    var body: some View {
        NavigationStack {
            List {
                // Profile info
                Section {
                    HStack(spacing: PartakeTheme.spacingMD) {
                        AvatarView(
                            name: displayName.isEmpty ? "?" : displayName,
                            colorIndex: 0,
                            size: 56
                        )

                        VStack(alignment: .leading, spacing: 4) {
                            Text(displayName.isEmpty ? "Set your name" : displayName)
                                .font(PartakeTheme.headline)
                            Text(authViewModel.currentUser?.email ?? "")
                                .font(PartakeTheme.caption)
                                .foregroundStyle(PartakeTheme.subtleText)
                        }
                    }
                    .padding(.vertical, PartakeTheme.spacingSM)
                }

                Section("Your info") {
                    HStack {
                        Text("Name")
                            .font(PartakeTheme.body)
                        Spacer()
                        TextField("Your name", text: $displayName)
                            .font(PartakeTheme.body)
                            .multilineTextAlignment(.trailing)
                    }

                    HStack {
                        Text("Venmo")
                            .font(PartakeTheme.body)
                        Spacer()
                        TextField("@username", text: $venmoUsername)
                            .font(PartakeTheme.body)
                            .multilineTextAlignment(.trailing)
                            .autocapitalization(.none)
                    }

                    Button("Save changes") {
                        Task { await saveProfile() }
                    }
                    .font(PartakeTheme.body.weight(.medium))
                    .foregroundStyle(Color(hex: "FF6B6B"))
                    .disabled(isSaving)
                }

                // Saved contacts
                Section {
                    ForEach(contacts) { contact in
                        HStack {
                            AvatarView(
                                name: contact.name,
                                colorIndex: contacts.firstIndex(where: { $0.id == contact.id }) ?? 0,
                                size: 32
                            )
                            VStack(alignment: .leading) {
                                Text(contact.name)
                                    .font(PartakeTheme.body)
                                if let venmo = contact.venmoUsername {
                                    Text("@\(venmo)")
                                        .font(PartakeTheme.caption)
                                        .foregroundStyle(PartakeTheme.subtleText)
                                }
                            }
                        }
                        .swipeActions {
                            Button(role: .destructive) {
                                Task { await deleteContact(contact) }
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                    }

                    Button {
                        showAddContact = true
                    } label: {
                        Label("Add person", systemImage: "plus")
                            .font(PartakeTheme.body)
                            .foregroundStyle(Color(hex: "FF6B6B"))
                    }
                } header: {
                    Text("Your people")
                } footer: {
                    Text("Save friends you eat with often for quick splitting")
                }

                // Partner groups
                Section {
                    ForEach(partnerGroups) { group in
                        HStack {
                            Text("👫")
                            VStack(alignment: .leading) {
                                Text(group.name)
                                    .font(PartakeTheme.body)
                                Text("\(group.memberIds.count) people")
                                    .font(PartakeTheme.caption)
                                    .foregroundStyle(PartakeTheme.subtleText)
                            }
                        }
                    }

                    Button {
                        showAddPartnerGroup = true
                    } label: {
                        Label("Create partner group", systemImage: "plus")
                            .font(PartakeTheme.body)
                            .foregroundStyle(Color(hex: "FF6B6B"))
                    }
                } header: {
                    Text("Partner groups")
                } footer: {
                    Text("Group people who always pay together (couples, partners)")
                }

                // Sign out
                Section {
                    Button("Sign out") {
                        authViewModel.signOut()
                    }
                    .font(PartakeTheme.body)
                    .foregroundStyle(.red)
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Profile")
            .sheet(isPresented: $showAddContact) {
                AddContactSheet { contact in
                    Task { await saveContact(contact) }
                }
            }
            .task {
                loadProfile()
                await loadData()
            }
        }
    }

    private func loadProfile() {
        displayName = authViewModel.currentUser?.displayName ?? ""
        venmoUsername = authViewModel.currentUser?.venmoUsername ?? ""
    }

    private func saveProfile() async {
        guard var user = authViewModel.currentUser else { return }
        isSaving = true
        user.displayName = displayName
        user.venmoUsername = venmoUsername.isEmpty ? nil : venmoUsername
        try? await userRepository.updateUser(user)
        authViewModel.currentUser = user
        isSaving = false
    }

    private func loadData() async {
        guard let userId = authViewModel.currentUser?.id else { return }
        contacts = (try? await userRepository.getContacts(for: userId)) ?? []
        partnerGroups = (try? await userRepository.getPartnerGroups(for: userId)) ?? []
    }

    private func saveContact(_ contact: SavedContact) async {
        guard let userId = authViewModel.currentUser?.id else { return }
        try? await userRepository.saveContact(contact, for: userId)
        contacts.append(contact)
    }

    private func deleteContact(_ contact: SavedContact) async {
        guard let userId = authViewModel.currentUser?.id else { return }
        try? await userRepository.deleteContact(id: contact.id, for: userId)
        contacts.removeAll { $0.id == contact.id }
    }
}

struct AddContactSheet: View {
    @State private var name = ""
    @State private var venmoUsername = ""
    @Environment(\.dismiss) private var dismiss
    let onSave: (SavedContact) -> Void

    var body: some View {
        NavigationStack {
            Form {
                TextField("Name", text: $name)
                    .font(PartakeTheme.body)

                TextField("Venmo username (optional)", text: $venmoUsername)
                    .font(PartakeTheme.body)
                    .autocapitalization(.none)
            }
            .navigationTitle("Add person")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        let contact = SavedContact(
                            id: UUID().uuidString,
                            name: name,
                            venmoUsername: venmoUsername.isEmpty ? nil : venmoUsername,
                            createdBy: ""
                        )
                        onSave(contact)
                        dismiss()
                    }
                    .disabled(name.isEmpty)
                }
            }
        }
        .presentationDetents([.medium])
    }
}
