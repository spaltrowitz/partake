import Foundation

class SmartSuggestionService {
    private let defaults = UserDefaults.standard
    private let storageKey = "partake_group_habits"

    func getHabit(for participantIds: [String]) -> GroupHabit? {
        let hash = GroupHabit.hash(participantIds: participantIds)
        let habits = loadHabits()
        return habits[hash]
    }

    func recordBill(bill: Bill, splits: [BillSplit]) {
        let participantIds = bill.participants.map { $0.id }
        let hash = GroupHabit.hash(participantIds: participantIds)
        var habits = loadHabits()

        var habit = habits[hash] ?? GroupHabit(
            groupHash: hash,
            participantPatterns: [:],
            billCount: 0,
            lastUsed: Date()
        )

        // Update tip average
        if let tipPercent = bill.tipPercent {
            if let existing = habit.averageTipPercent {
                habit.averageTipPercent = (existing * Double(habit.billCount) + tipPercent) / Double(habit.billCount + 1)
            } else {
                habit.averageTipPercent = tipPercent
            }
        }

        // Detect participant patterns
        for split in splits {
            var pattern = habit.participantPatterns[split.participantId] ?? ParticipantPattern()

            // Check if they ordered drinks
            let hasDrinks = split.items.contains { item in
                let lower = item.name.lowercased()
                return lower.contains("beer") || lower.contains("wine") || lower.contains("cocktail")
                    || lower.contains("margarita") || lower.contains("ipa") || lower.contains("seltzer")
                    || lower.contains("vodka") || lower.contains("whiskey") || lower.contains("rum")
                    || lower.contains("gin") || lower.contains("tequila") || lower.contains("sake")
                    || lower.contains("mimosa") || lower.contains("sangria") || lower.contains("draft")
            }

            if let existing = pattern.typicallyOrdersDrinks {
                // Only mark as typical pattern after seeing it consistently
                pattern.typicallyOrdersDrinks = existing == hasDrinks ? hasDrinks : nil
            } else {
                pattern.typicallyOrdersDrinks = hasDrinks
            }

            // Track average spend
            if let existing = pattern.averageSpend {
                pattern.averageSpend = (existing * Double(habit.billCount) + split.total) / Double(habit.billCount + 1)
            } else {
                pattern.averageSpend = split.total
            }

            habit.participantPatterns[split.participantId] = pattern
        }

        habit.billCount += 1
        habit.lastUsed = Date()
        habits[hash] = habit
        saveHabits(habits)
    }

    func generateSuggestions(for participantIds: [String], currentTipPercent: Double?) -> [String] {
        guard let habit = getHabit(for: participantIds), habit.billCount >= 2 else {
            return []
        }

        var suggestions: [String] = []

        // Tip suggestion
        if let avgTip = habit.averageTipPercent, let current = currentTipPercent {
            let rounded = (avgTip * 100).rounded() / 100
            if abs(rounded - current) > 1 {
                suggestions.append("Your crew usually tips \(Int(rounded))%. Sound right?")
            }
        } else if let avgTip = habit.averageTipPercent {
            suggestions.append("Last time y'all tipped \(Int(avgTip))%. Want to start there?")
        }

        // Drink pattern suggestions
        let nonDrinkers = habit.participantPatterns.filter { $0.value.typicallyOrdersDrinks == false }
        if !nonDrinkers.isEmpty && nonDrinkers.count < participantIds.count {
            suggestions.append("Some folks in this group don't usually order drinks. Split drinks separately?")
        }

        return suggestions
    }

    // MARK: - Persistence

    private func loadHabits() -> [String: GroupHabit] {
        guard let data = defaults.data(forKey: storageKey),
              let habits = try? JSONDecoder().decode([String: GroupHabit].self, from: data) else {
            return [:]
        }
        return habits
    }

    private func saveHabits(_ habits: [String: GroupHabit]) {
        if let data = try? JSONEncoder().encode(habits) {
            defaults.set(data, forKey: storageKey)
        }
    }
}
