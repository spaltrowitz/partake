import Foundation

struct Bill: Codable, Identifiable {
    var id: String
    var name: String
    var restaurantName: String?
    var receiptImageURL: String?
    var items: [BillItem]
    var subtotal: Double
    var tax: Double
    var tipAmount: Double
    var tipPercent: Double?
    var total: Double
    var participants: [Participant]
    var activePartnerGroupId: String?
    var createdBy: String
    var createdAt: Date
    var status: BillStatus
    var shareCode: String?

    var isBirthdayMode: Bool {
        birthdayPersonId != nil
    }
    var birthdayPersonId: String?

    static let empty = Bill(
        id: UUID().uuidString,
        name: "",
        items: [],
        subtotal: 0,
        tax: 0,
        tipAmount: 0,
        total: 0,
        participants: [],
        createdBy: "",
        createdAt: Date(),
        status: .splitting
    )
}

struct BillItem: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var price: Double
    var claimedBy: [String]
    var quantity: Int

    init(id: String = UUID().uuidString, name: String, price: Double, claimedBy: [String] = [], quantity: Int = 1) {
        self.id = id
        self.name = name
        self.price = price
        self.claimedBy = claimedBy
        self.quantity = quantity
    }
}

struct Participant: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var venmoUsername: String?
    var isAppUser: Bool

    init(id: String = UUID().uuidString, name: String, venmoUsername: String? = nil, isAppUser: Bool = false) {
        self.id = id
        self.name = name
        self.venmoUsername = venmoUsername
        self.isAppUser = isAppUser
    }

    static func from(contact: SavedContact) -> Participant {
        Participant(
            id: contact.id,
            name: contact.name,
            venmoUsername: contact.venmoUsername,
            isAppUser: false
        )
    }

    static func from(user: AppUser) -> Participant {
        Participant(
            id: user.id,
            name: user.displayName,
            venmoUsername: user.venmoUsername,
            isAppUser: true
        )
    }
}

enum BillStatus: String, Codable {
    case splitting
    case settled
}

struct BillSplit {
    let participantId: String
    let participantName: String
    let itemsSubtotal: Double
    let taxShare: Double
    let tipShare: Double
    let total: Double
    let items: [BillItem]
    let venmoUsername: String?
}
