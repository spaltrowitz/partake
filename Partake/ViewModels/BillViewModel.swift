import Foundation
import UIKit

@MainActor
class BillViewModel: ObservableObject {
    @Published var bill: Bill
    @Published var splits: [BillSplit] = []
    @Published var selectedParticipantId: String?
    @Published var suggestions: [String] = []
    @Published var isSettled = false
    @Published var activePartnerGroup: PartnerGroup?

    private let billRepository = BillRepository()
    private let suggestionService = SmartSuggestionService()

    init(bill: Bill) {
        self.bill = bill
        if let first = bill.participants.first {
            selectedParticipantId = first.id
        }
        recalculate()
        loadSuggestions()
    }

    // MARK: - Item Claiming

    func toggleClaim(itemId: String) {
        guard let participantId = selectedParticipantId,
              let index = bill.items.firstIndex(where: { $0.id == itemId }) else { return }

        if bill.items[index].claimedBy.contains(participantId) {
            bill.items[index].claimedBy.removeAll { $0 == participantId }
        } else {
            bill.items[index].claimedBy.append(participantId)
        }

        // Haptic feedback
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()

        recalculate()
    }

    func selectParticipant(_ id: String) {
        selectedParticipantId = id
    }

    // MARK: - Tip

    func updateTip(percent: Double) {
        bill.tipPercent = percent
        bill.tipAmount = bill.subtotal * percent / 100
        bill.total = bill.subtotal + bill.tax + bill.tipAmount
        recalculate()
    }

    // MARK: - Birthday Mode

    func toggleBirthday(for participantId: String) {
        if bill.birthdayPersonId == participantId {
            bill.birthdayPersonId = nil
        } else {
            bill.birthdayPersonId = participantId
        }
        recalculate()
    }

    // MARK: - Partner Mode

    func setPartnerGroup(_ group: PartnerGroup?) {
        activePartnerGroup = group
        bill.activePartnerGroupId = group?.id
        recalculate()
    }

    // MARK: - Settlement

    func requestVenmo(for split: BillSplit) -> Bool {
        guard let username = split.venmoUsername else { return false }
        let note = "Partake: \(bill.name.isEmpty ? "Bill split" : bill.name)"
        return VenmoService.shared.requestPayment(from: username, amount: split.total, note: note)
    }

    func markAsSettled() {
        bill.status = .settled
        isSettled = true

        // Record habits for smart suggestions
        suggestionService.recordBill(bill: bill, splits: splits)

        Task {
            try? await billRepository.saveBill(bill)
        }
    }

    // MARK: - Save

    func saveBill() async {
        try? await billRepository.saveBill(bill)
    }

    // MARK: - Calculations

    private func recalculate() {
        splits = BillSplitCalculator.calculateSplits(
            bill: bill,
            partnerGroup: activePartnerGroup
        )
    }

    private func loadSuggestions() {
        let participantIds = bill.participants.map { $0.id }
        suggestions = suggestionService.generateSuggestions(
            for: participantIds,
            currentTipPercent: bill.tipPercent
        )
    }
}
