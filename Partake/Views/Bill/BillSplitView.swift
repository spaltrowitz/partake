import SwiftUI

struct BillSplitView: View {
    @StateObject var viewModel: BillViewModel
    @State private var showSettlement = false

    var body: some View {
        VStack(spacing: 0) {
            // Suggestions
            if !viewModel.suggestions.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: PartakeTheme.spacingSM) {
                        ForEach(Array(viewModel.suggestions.enumerated()), id: \.offset) { index, suggestion in
                            SuggestionCard(
                                message: suggestion,
                                onAccept: { viewModel.suggestions.remove(at: index) },
                                onDismiss: { viewModel.suggestions.remove(at: index) }
                            )
                            .frame(width: 300)
                        }
                    }
                    .padding(.horizontal, PartakeTheme.spacingMD)
                }
                .padding(.vertical, PartakeTheme.spacingSM)
                .transition(.move(edge: .top).combined(with: .opacity))
            }

            // Participant selector
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: PartakeTheme.spacingSM) {
                    ForEach(Array(viewModel.bill.participants.enumerated()), id: \.element.id) { index, participant in
                        ParticipantChip(
                            name: participant.name,
                            colorIndex: index,
                            isSelected: viewModel.selectedParticipantId == participant.id,
                            isBirthday: viewModel.bill.birthdayPersonId == participant.id
                        )
                        .onTapGesture {
                            viewModel.selectParticipant(participant.id)
                        }
                        .onLongPressGesture {
                            viewModel.toggleBirthday(for: participant.id)
                        }
                    }
                }
                .padding(.horizontal, PartakeTheme.spacingMD)
                .padding(.vertical, PartakeTheme.spacingSM)
            }
            .background(PartakeTheme.surfaceBackground)

            // Item list
            List {
                Section {
                    ForEach(viewModel.bill.items) { item in
                        ItemRow(
                            item: item,
                            participants: viewModel.bill.participants,
                            selectedParticipantId: viewModel.selectedParticipantId,
                            onTap: {
                                withAnimation(PartakeAnimations.claimSpring) {
                                    viewModel.toggleClaim(itemId: item.id)
                                }
                            }
                        )
                    }
                } header: {
                    Text("Tap items to claim them")
                        .font(PartakeTheme.caption)
                        .foregroundStyle(PartakeTheme.subtleText)
                }

                // Tip selector
                Section("Tip") {
                    TipSelector(
                        tipPercent: viewModel.bill.tipPercent ?? 20,
                        onSelect: { viewModel.updateTip(percent: $0) }
                    )
                }
            }
            .listStyle(.insetGrouped)

            // Bottom bar
            VStack(spacing: PartakeTheme.spacingSM) {
                HStack {
                    Text("Total")
                        .font(PartakeTheme.headline)
                    Spacer()
                    Text("$\(viewModel.bill.total, specifier: "%.2f")")
                        .font(PartakeTheme.price)
                }
                .padding(.horizontal, PartakeTheme.spacingMD)

                PartakePrimaryButton(title: "See the split") {
                    showSettlement = true
                }
                .padding(.horizontal, PartakeTheme.spacingMD)
                .padding(.bottom, PartakeTheme.spacingSM)
            }
            .padding(.top, PartakeTheme.spacingSM)
            .background(PartakeTheme.cardBackground)
            .shadow(color: .black.opacity(0.05), radius: 8, y: -4)
        }
        .navigationTitle(viewModel.bill.name.isEmpty ? "Split the bill" : viewModel.bill.name)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showSettlement) {
            SettlementView(viewModel: viewModel)
        }
    }
}

// MARK: - Participant Chip

struct ParticipantChip: View {
    let name: String
    let colorIndex: Int
    let isSelected: Bool
    let isBirthday: Bool

    var body: some View {
        VStack(spacing: PartakeTheme.spacingXS) {
            ZStack {
                AvatarView(name: name, colorIndex: colorIndex, size: 48)
                    .overlay {
                        if isSelected {
                            Circle()
                                .stroke(PartakeTheme.colorForParticipant(at: colorIndex), lineWidth: 3)
                                .frame(width: 54, height: 54)
                        }
                    }

                if isBirthday {
                    Text("🎂")
                        .font(.caption)
                        .offset(x: 18, y: -18)
                }
            }

            Text(name)
                .font(PartakeTheme.caption)
                .foregroundStyle(isSelected ? .primary : PartakeTheme.subtleText)
                .lineLimit(1)
        }
        .frame(width: 64)
        .popEffect(isActive: isSelected)
    }
}

// MARK: - Item Row

struct ItemRow: View {
    let item: BillItem
    let participants: [Participant]
    let selectedParticipantId: String?
    let onTap: () -> Void

    @State private var justClaimed = false

    var isClaimed: Bool {
        guard let id = selectedParticipantId else { return false }
        return item.claimedBy.contains(id)
    }

    var body: some View {
        Button(action: {
            onTap()
            if !isClaimed {
                justClaimed = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    justClaimed = false
                }
            }
        }) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.name)
                        .font(PartakeTheme.body)
                        .foregroundStyle(.primary)

                    if !item.claimedBy.isEmpty {
                        HStack(spacing: -6) {
                            ForEach(item.claimedBy, id: \.self) { claimerId in
                                if let index = participants.firstIndex(where: { $0.id == claimerId }) {
                                    Circle()
                                        .fill(PartakeTheme.colorForParticipant(at: index))
                                        .frame(width: 14, height: 14)
                                        .overlay(Circle().stroke(.white, lineWidth: 1))
                                }
                            }
                        }
                    }
                }

                Spacer()

                Text("$\(item.price, specifier: "%.2f")")
                    .font(PartakeTheme.body.weight(.medium))
                    .foregroundStyle(.primary)

                Image(systemName: isClaimed ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(isClaimed ? Color(hex: "4ECDC4") : PartakeTheme.subtleText)
            }
        }
        .popEffect(isActive: justClaimed)
    }
}

// MARK: - Tip Selector

struct TipSelector: View {
    let tipPercent: Double
    let onSelect: (Double) -> Void

    private let options: [Double] = [15, 18, 20, 25]

    var body: some View {
        HStack(spacing: PartakeTheme.spacingSM) {
            ForEach(options, id: \.self) { percent in
                Button {
                    onSelect(percent)
                } label: {
                    Text("\(Int(percent))%")
                        .font(PartakeTheme.body.weight(.medium))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(
                            tipPercent == percent
                                ? AnyShapeStyle(PartakeTheme.primaryGradient)
                                : AnyShapeStyle(PartakeTheme.surfaceBackground)
                        )
                        .foregroundStyle(tipPercent == percent ? .white : .primary)
                        .clipShape(Capsule())
                }
            }
        }
    }
}
