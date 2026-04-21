import Foundation

struct GroupHabit: Codable {
    var groupHash: String
    var preferredSplitMethod: SplitMethod?
    var averageTipPercent: Double?
    var participantPatterns: [String: ParticipantPattern]
    var billCount: Int
    var lastUsed: Date

    static func hash(participantIds: [String]) -> String {
        let sorted = participantIds.sorted()
        return sorted.joined(separator: "-")
    }
}

struct ParticipantPattern: Codable {
    var typicallyOrdersDrinks: Bool?
    var typicallySharesItems: Bool?
    var averageSpend: Double?
}

enum SplitMethod: String, Codable {
    case itemized
    case even
    case custom
}

struct Suggestion: Identifiable {
    let id = UUID()
    let message: String
    let action: () -> Void
}
