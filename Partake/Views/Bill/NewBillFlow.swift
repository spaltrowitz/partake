import SwiftUI

struct NewBillFlow: View {
    let createdBy: String
    @Environment(\.dismiss) private var dismiss
    @State private var participants: [Participant] = []
    @State private var newName = ""
    @State private var showScanner = false
    @State private var scannedBill: Bill?
    @State private var contacts: [SavedContact] = []

    private let userRepository = UserRepository()

    var body: some View {
        NavigationStack {
            VStack(spacing: PartakeTheme.spacingLG) {
                Text("Who's splitting?")
                    .font(PartakeTheme.title)
                    .padding(.top, PartakeTheme.spacingLG)

                // Saved contacts
                if !contacts.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: PartakeTheme.spacingSM) {
                            ForEach(Array(contacts.enumerated()), id: \.element.id) { index, contact in
                                let isAdded = participants.contains { $0.id == contact.id }
                                VStack(spacing: PartakeTheme.spacingXS) {
                                    AvatarView(name: contact.name, colorIndex: index, size: 48)
                                        .overlay {
                                            if isAdded {
                                                Circle()
                                                    .fill(Color(hex: "4ECDC4").opacity(0.8))
                                                    .frame(width: 48, height: 48)
                                                    .overlay {
                                                        Image(systemName: "checkmark")
                                                            .foregroundStyle(.white)
                                                            .font(.body.bold())
                                                    }
                                            }
                                        }
                                    Text(contact.name)
                                        .font(PartakeTheme.caption)
                                        .lineLimit(1)
                                }
                                .frame(width: 64)
                                .onTapGesture {
                                    if isAdded {
                                        participants.removeAll { $0.id == contact.id }
                                    } else {
                                        participants.append(.from(contact: contact))
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, PartakeTheme.spacingMD)
                    }
                }

                // Add new person
                HStack {
                    TextField("Add someone new", text: $newName)
                        .font(PartakeTheme.body)
                        .textFieldStyle(.roundedBorder)

                    Button {
                        guard !newName.isEmpty else { return }
                        let participant = Participant(name: newName)
                        participants.append(participant)
                        newName = ""
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                            .foregroundStyle(Color(hex: "FF6B6B"))
                    }
                    .disabled(newName.isEmpty)
                }
                .padding(.horizontal, PartakeTheme.spacingMD)

                // Current participants
                if !participants.isEmpty {
                    VStack(alignment: .leading, spacing: PartakeTheme.spacingSM) {
                        Text("Splitting with")
                            .font(PartakeTheme.caption)
                            .foregroundStyle(PartakeTheme.subtleText)
                            .padding(.horizontal, PartakeTheme.spacingMD)

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: PartakeTheme.spacingSM) {
                                ForEach(Array(participants.enumerated()), id: \.element.id) { index, participant in
                                    HStack(spacing: PartakeTheme.spacingXS) {
                                        AvatarView(name: participant.name, colorIndex: index, size: 28)
                                        Text(participant.name)
                                            .font(PartakeTheme.body)
                                        Button {
                                            participants.removeAll { $0.id == participant.id }
                                        } label: {
                                            Image(systemName: "xmark.circle.fill")
                                                .font(.caption)
                                                .foregroundStyle(PartakeTheme.subtleText)
                                        }
                                    }
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 6)
                                    .background(PartakeTheme.surfaceBackground)
                                    .clipShape(Capsule())
                                }
                            }
                            .padding(.horizontal, PartakeTheme.spacingMD)
                        }
                    }
                }

                Spacer()

                PartakePrimaryButton(title: "Scan the receipt") {
                    showScanner = true
                }
                .disabled(participants.count < 2)
                .padding(.horizontal, PartakeTheme.spacingLG)

                if participants.count < 2 {
                    Text("Add at least 2 people to split with")
                        .font(PartakeTheme.caption)
                        .foregroundStyle(PartakeTheme.subtleText)
                }

                Spacer().frame(height: PartakeTheme.spacingMD)
            }
            .navigationTitle("New bill")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .sheet(isPresented: $showScanner) {
                ScannerView(
                    scannedBill: $scannedBill,
                    participants: participants,
                    createdBy: createdBy
                )
            }
            .onChange(of: scannedBill) { _, bill in
                if bill != nil {
                    // TODO: Navigate to BillSplitView with the scanned bill
                    dismiss()
                }
            }
            .task {
                contacts = (try? await userRepository.getContacts(for: createdBy)) ?? []
            }
        }
    }
}
