import Foundation

class BillSplitCalculator {

    /// Calculate each participant's share including proportional tax and tip
    static func calculateSplits(bill: Bill, partnerGroup: PartnerGroup? = nil) -> [BillSplit] {
        var itemTotals: [String: (subtotal: Double, items: [BillItem])] = [:]

        // Initialize all participants
        for participant in bill.participants {
            itemTotals[participant.id] = (0, [])
        }

        // Calculate per-person item subtotals
        for item in bill.items {
            guard !item.claimedBy.isEmpty else { continue }
            let perPerson = item.price * Double(item.quantity) / Double(item.claimedBy.count)
            for claimerId in item.claimedBy {
                var current = itemTotals[claimerId] ?? (0, [])
                current.subtotal += perPerson
                current.items.append(item)
                itemTotals[claimerId] = current
            }
        }

        // Handle birthday mode: redistribute birthday person's total
        if let birthdayId = bill.birthdayPersonId,
           let birthdayTotal = itemTotals[birthdayId] {
            let otherParticipants = bill.participants.filter { $0.id != birthdayId }
            guard !otherParticipants.isEmpty else { break }
            let perPerson = birthdayTotal.subtotal / Double(otherParticipants.count)
            for other in otherParticipants {
                var current = itemTotals[other.id] ?? (0, [])
                current.subtotal += perPerson
                itemTotals[other.id] = current
            }
            itemTotals[birthdayId] = (0, birthdayTotal.items)
        }

        // Handle partner groups: roll up to payer
        if let group = partnerGroup {
            let nonPayerMembers = group.memberIds.filter { $0 != group.payerId }
            for memberId in nonPayerMembers {
                if let memberTotal = itemTotals[memberId] {
                    var payerTotal = itemTotals[group.payerId] ?? (0, [])
                    payerTotal.subtotal += memberTotal.subtotal
                    payerTotal.items += memberTotal.items
                    itemTotals[group.payerId] = payerTotal
                    itemTotals[memberId] = (0, memberTotal.items)
                }
            }
        }

        // Calculate proportional tax & tip
        let totalItemsSubtotal = itemTotals.values.reduce(0) { $0 + $1.subtotal }
        guard totalItemsSubtotal > 0 else {
            return bill.participants.map { p in
                BillSplit(
                    participantId: p.id,
                    participantName: p.name,
                    itemsSubtotal: 0,
                    taxShare: 0,
                    tipShare: 0,
                    total: 0,
                    items: [],
                    venmoUsername: p.venmoUsername
                )
            }
        }

        let participantMap = Dictionary(uniqueKeysWithValues: bill.participants.map { ($0.id, $0) })

        return bill.participants.map { participant in
            let data = itemTotals[participant.id] ?? (0, [])
            let proportion = data.subtotal / totalItemsSubtotal
            let taxShare = bill.tax * proportion
            let tipShare = bill.tipAmount * proportion

            // Round to nearest cent
            let total = (data.subtotal + taxShare + tipShare * 100).rounded() / 100

            return BillSplit(
                participantId: participant.id,
                participantName: participant.name,
                itemsSubtotal: (data.subtotal * 100).rounded() / 100,
                taxShare: (taxShare * 100).rounded() / 100,
                tipShare: (tipShare * 100).rounded() / 100,
                total: total,
                items: data.items,
                venmoUsername: participant.venmoUsername
            )
        }.sorted { $0.total > $1.total }
    }
}
