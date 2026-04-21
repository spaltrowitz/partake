import Foundation

struct SavedContact: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var venmoUsername: String?
    var createdBy: String

    static let preview = SavedContact(
        id: "contact-preview",
        name: "Sarah",
        venmoUsername: "sarah-jones",
        createdBy: "preview"
    )
}
