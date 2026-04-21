import Foundation

struct PartnerGroup: Codable, Identifiable {
    var id: String
    var name: String
    var memberIds: [String]
    var payerId: String
    var createdBy: String

    static let preview = PartnerGroup(
        id: "group-preview",
        name: "Sam & Alex",
        memberIds: ["user1", "user2"],
        payerId: "user1",
        createdBy: "user1"
    )
}
