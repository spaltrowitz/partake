import Foundation
import FirebaseFirestore

struct AppUser: Codable, Identifiable {
    var id: String
    var displayName: String
    var email: String
    var venmoUsername: String?
    var avatarURL: String?
    var partnerGroupIds: [String]
    var createdAt: Date

    static let placeholder = AppUser(
        id: "preview",
        displayName: "Preview User",
        email: "preview@partake.app",
        venmoUsername: nil,
        avatarURL: nil,
        partnerGroupIds: [],
        createdAt: Date()
    )
}
