import Foundation
import FirebaseFirestore

class BillRepository {
    private let db = Firestore.firestore()
    private let collection = "bills"

    func saveBill(_ bill: Bill) async throws {
        try db.collection(collection).document(bill.id).setData(from: bill)
    }

    func getBill(id: String) async throws -> Bill? {
        let doc = try await db.collection(collection).document(id).getDocument()
        return try doc.data(as: Bill.self)
    }

    func getBillByShareCode(_ code: String) async throws -> Bill? {
        let snapshot = try await db.collection(collection)
            .whereField("shareCode", isEqualTo: code)
            .limit(to: 1)
            .getDocuments()
        return snapshot.documents.first.flatMap { try? $0.data(as: Bill.self) }
    }

    func getBills(for userId: String) async throws -> [Bill] {
        let snapshot = try await db.collection(collection)
            .whereField("createdBy", isEqualTo: userId)
            .order(by: "createdAt", descending: true)
            .getDocuments()
        return snapshot.documents.compactMap { try? $0.data(as: Bill.self) }
    }

    func listenToBill(id: String, onChange: @escaping (Bill?) -> Void) -> ListenerRegistration {
        return db.collection(collection).document(id).addSnapshotListener { snapshot, _ in
            let bill = try? snapshot?.data(as: Bill.self)
            onChange(bill)
        }
    }

    func deleteBill(id: String) async throws {
        try await db.collection(collection).document(id).delete()
    }
}
