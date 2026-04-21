import Foundation

struct ParsedReceipt {
    var items: [ParsedItem]
    var tax: Double?
    var subtotal: Double?
    var total: Double?
    var restaurantName: String?
}

struct ParsedItem: Identifiable {
    let id = UUID()
    var name: String
    var price: Double
    var confidence: Float
    var quantity: Int

    init(name: String, price: Double, confidence: Float = 1.0, quantity: Int = 1) {
        self.name = name
        self.price = price
        self.confidence = confidence
        self.quantity = quantity
    }

    var isLowConfidence: Bool {
        confidence < 0.7
    }
}

struct RecognizedLine {
    let text: String
    let confidence: Float
    let boundingBox: CGRect
}
