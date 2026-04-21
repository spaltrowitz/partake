import Foundation
import FirebaseFirestore

class UserRepository {
    private let db = Firestore.firestore()
    private let collection = "users"

    func createUser(_ user: AppUser) async throws {
        try db.collection(collection).document(user.id).setData(from: user)
    }

    func getUser(id: String) async throws -> AppUser? {
        let doc = try await db.collection(collection).document(id).getDocument()
        return try doc.data(as: AppUser.self)
    }

    func updateUser(_ user: AppUser) async throws {
        try db.collection(collection).document(user.id).setData(from: user, merge: true)
    }

    func saveContact(_ contact: SavedContact, for userId: String) async throws {
        try db.collection(collection)
            .document(userId)
            .collection("contacts")
            .document(contact.id)
            .setData(from: contact)
    }

    func getContacts(for userId: String) async throws -> [SavedContact] {
        let snapshot = try await db.collection(collection)
            .document(userId)
            .collection("contacts")
            .getDocuments()
        return snapshot.documents.compactMap { try? $0.data(as: SavedContact.self) }
    }

    func deleteContact(id: String, for userId: String) async throws {
        try await db.collection(collection)
            .document(userId)
            .collection("contacts")
            .document(id)
            .delete()
    }

    func savePartnerGroup(_ group: PartnerGroup, for userId: String) async throws {
        try db.collection(collection)
            .document(userId)
            .collection("partnerGroups")
            .document(group.id)
            .setData(from: group)
    }

    func getPartnerGroups(for userId: String) async throws -> [PartnerGroup] {
        let snapshot = try await db.collection(collection)
            .document(userId)
            .collection("partnerGroups")
            .getDocuments()
        return snapshot.documents.compactMap { try? $0.data(as: PartnerGroup.self) }
    }

    func deletePartnerGroup(id: String, for userId: String) async throws {
        try await db.collection(collection)
            .document(userId)
            .collection("partnerGroups")
            .document(id)
            .delete()
    }
}
