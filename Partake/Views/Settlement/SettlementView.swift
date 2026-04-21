import SwiftUI

struct SettlementView: View {
    @ObservedObject var viewModel: BillViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var showConfetti = false
    @State private var settledParticipants: Set<String> = []

    var body: some View {
        NavigationStack {
            ZStack {
                ScrollView {
                    VStack(spacing: PartakeTheme.spacingMD) {
                        // Header
                        VStack(spacing: PartakeTheme.spacingSM) {
                            Text(viewModel.bill.name.isEmpty ? "The split" : viewModel.bill.name)
                                .font(PartakeTheme.title)

                            Text("$\(viewModel.bill.total, specifier: "%.2f") total")
                                .font(PartakeTheme.body)
                                .foregroundStyle(PartakeTheme.subtleText)
                        }
                        .padding(.top, PartakeTheme.spacingLG)

                        // Per-person breakdown
                        ForEach(Array(viewModel.splits.enumerated()), id: \.element.participantId) { index, split in
                            PartakeCard {
                                VStack(spacing: PartakeTheme.spacingSM) {
                                    HStack {
                                        AvatarView(name: split.participantName, colorIndex: index, size: 40)

                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(split.participantName)
                                                .font(PartakeTheme.headline)
                                            Text("\(split.items.count) item\(split.items.count == 1 ? "" : "s")")
                                                .font(PartakeTheme.caption)
                                                .foregroundStyle(PartakeTheme.subtleText)
                                        }

                                        Spacer()

                                        Text("$\(split.total, specifier: "%.2f")")
                                            .font(PartakeTheme.price)
                                    }

                                    // Item breakdown
                                    VStack(spacing: 4) {
                                        ForEach(split.items, id: \.id) { item in
                                            HStack {
                                                Text(item.name)
                                                    .font(PartakeTheme.caption)
                                                    .foregroundStyle(PartakeTheme.subtleText)
                                                Spacer()
                                                let perPerson = item.claimedBy.count > 1
                                                    ? "$\(item.price / Double(item.claimedBy.count), specifier: "%.2f") (split \(item.claimedBy.count) ways)"
                                                    : "$\(item.price, specifier: "%.2f")"
                                                Text(perPerson)
                                                    .font(PartakeTheme.caption)
                                                    .foregroundStyle(PartakeTheme.subtleText)
                                            }
                                        }

                                        Divider()

                                        HStack {
                                            Text("Tax")
                                                .font(PartakeTheme.caption)
                                                .foregroundStyle(PartakeTheme.subtleText)
                                            Spacer()
                                            Text("$\(split.taxShare, specifier: "%.2f")")
                                                .font(PartakeTheme.caption)
                                                .foregroundStyle(PartakeTheme.subtleText)
                                        }

                                        HStack {
                                            Text("Tip")
                                                .font(PartakeTheme.caption)
                                                .foregroundStyle(PartakeTheme.subtleText)
                                            Spacer()
                                            Text("$\(split.tipShare, specifier: "%.2f")")
                                                .font(PartakeTheme.caption)
                                                .foregroundStyle(PartakeTheme.subtleText)
                                        }
                                    }

                                    // Venmo button
                                    if split.total > 0 {
                                        if let username = split.venmoUsername {
                                            Button {
                                                let sent = viewModel.requestVenmo(for: split)
                                                if sent {
                                                    withAnimation {
                                                        settledParticipants.insert(split.participantId)
                                                    }
                                                    checkAllSettled()
                                                }
                                            } label: {
                                                HStack {
                                                    Image(systemName: settledParticipants.contains(split.participantId)
                                                        ? "checkmark.circle.fill" : "paperplane.fill")
                                                    Text(settledParticipants.contains(split.participantId)
                                                        ? "Requested ✓" : "Request via Venmo")
                                                }
                                                .font(PartakeTheme.body.weight(.medium))
                                                .foregroundStyle(.white)
                                                .frame(maxWidth: .infinity)
                                                .padding(.vertical, 10)
                                                .background(
                                                    settledParticipants.contains(split.participantId)
                                                        ? AnyShapeStyle(Color(hex: "4ECDC4"))
                                                        : AnyShapeStyle(Color(hex: "3D95CE"))
                                                )
                                                .clipShape(RoundedRectangle(cornerRadius: PartakeTheme.cornerRadiusSM))
                                            }
                                            .disabled(settledParticipants.contains(split.participantId))
                                        } else {
                                            // Fallback — no Venmo username
                                            HStack {
                                                Text("$\(split.total, specifier: "%.2f")")
                                                    .font(PartakeTheme.body.weight(.medium))

                                                Spacer()

                                                Button("Copy amount") {
                                                    UIPasteboard.general.string = String(format: "%.2f", split.total)
                                                    withAnimation {
                                                        settledParticipants.insert(split.participantId)
                                                    }
                                                    checkAllSettled()
                                                }
                                                .font(PartakeTheme.caption.weight(.semibold))
                                                .foregroundStyle(Color(hex: "FF6B6B"))
                                            }
                                            .padding(.vertical, 4)
                                        }
                                    }
                                }
                            }
                            .padding(.horizontal, PartakeTheme.spacingMD)
                        }

                        // Share link
                        if let code = viewModel.bill.shareCode {
                            PartakeCard {
                                VStack(spacing: PartakeTheme.spacingSM) {
                                    Text("Share this bill")
                                        .font(PartakeTheme.headline)

                                    Text("Friends can claim items without the app")
                                        .font(PartakeTheme.caption)
                                        .foregroundStyle(PartakeTheme.subtleText)

                                    Button {
                                        UIPasteboard.general.string = "https://partakeapp.com/b/\(code)"
                                    } label: {
                                        HStack {
                                            Image(systemName: "link")
                                            Text("partakeapp.com/b/\(code)")
                                        }
                                        .font(PartakeTheme.body)
                                        .foregroundStyle(Color(hex: "FF6B6B"))
                                        .padding(.vertical, 8)
                                        .frame(maxWidth: .infinity)
                                        .background(Color(hex: "FF6B6B").opacity(0.1))
                                        .clipShape(RoundedRectangle(cornerRadius: PartakeTheme.cornerRadiusSM))
                                    }
                                }
                            }
                            .padding(.horizontal, PartakeTheme.spacingMD)
                        }

                        Spacer().frame(height: PartakeTheme.spacingXL)
                    }
                }

                // Confetti overlay
                ConfettiView(isActive: showConfetti)
                    .ignoresSafeArea()
            }
            .navigationTitle("Settlement")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        viewModel.markAsSettled()
                        dismiss()
                    }
                }
            }
        }
    }

    private func checkAllSettled() {
        let nonZeroSplits = viewModel.splits.filter { $0.total > 0 }
        if nonZeroSplits.allSatisfy({ settledParticipants.contains($0.participantId) }) {
            withAnimation(PartakeAnimations.celebrate) {
                showConfetti = true
            }
        }
    }
}
