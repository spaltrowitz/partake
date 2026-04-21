import Foundation
import UIKit

@MainActor
class ScannerViewModel: ObservableObject {
    @Published var parsedReceipt: ParsedReceipt?
    @Published var isScanning = false
    @Published var errorMessage: String?

    private let ocrService = OCRService()
    private let parser = ReceiptParser()

    func processImage(_ image: UIImage) async {
        isScanning = true
        errorMessage = nil

        do {
            let lines = try await ocrService.recognizeText(from: image)
            let receipt = parser.parse(lines: lines)
            parsedReceipt = receipt
        } catch {
            errorMessage = error.localizedDescription
        }

        isScanning = false
    }

    func addItem(name: String, price: Double) {
        let item = ParsedItem(name: name, price: price, confidence: 1.0)
        parsedReceipt?.items.append(item)
    }

    func removeItem(at index: Int) {
        parsedReceipt?.items.remove(at: index)
    }

    func updateItem(at index: Int, name: String, price: Double) {
        guard var receipt = parsedReceipt, index < receipt.items.count else { return }
        receipt.items[index] = ParsedItem(
            name: name,
            price: price,
            confidence: 1.0,
            quantity: receipt.items[index].quantity
        )
        parsedReceipt = receipt
    }

    func createBill(participants: [Participant], tipPercent: Double, createdBy: String) -> Bill {
        let receipt = parsedReceipt ?? ParsedReceipt(items: [], tax: nil, subtotal: nil, total: nil)

        let items = receipt.items.map { parsed in
            BillItem(
                name: parsed.name,
                price: parsed.price,
                quantity: parsed.quantity
            )
        }

        let subtotal = receipt.subtotal ?? items.reduce(0) { $0 + $1.price * Double($1.quantity) }
        let tax = receipt.tax ?? 0
        let tipAmount = subtotal * tipPercent / 100

        return Bill(
            id: UUID().uuidString,
            name: receipt.restaurantName ?? "New bill",
            restaurantName: receipt.restaurantName,
            items: items,
            subtotal: subtotal,
            tax: tax,
            tipAmount: tipAmount,
            tipPercent: tipPercent,
            total: subtotal + tax + tipAmount,
            participants: participants,
            createdBy: createdBy,
            createdAt: Date(),
            status: .splitting,
            shareCode: generateShareCode()
        )
    }

    private func generateShareCode() -> String {
        let chars = "abcdefghjkmnpqrstuvwxyz23456789"
        return String((0..<6).map { _ in chars.randomElement()! })
    }
}
