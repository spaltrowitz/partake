import Foundation

class ReceiptParser {
    private let pricePattern = #"\$?\s*(\d+\.\d{2})"#
    private let subtotalKeywords = ["subtotal", "sub total", "sub-total"]
    private let taxKeywords = ["tax", "sales tax", "hst", "gst"]
    private let totalKeywords = ["total", "amount due", "balance due", "total due"]
    private let tipKeywords = ["tip", "gratuity"]
    private let skipKeywords = ["visa", "mastercard", "amex", "change", "cash", "credit", "debit", "card"]

    func parse(lines: [RecognizedLine]) -> ParsedReceipt {
        var items: [ParsedItem] = []
        var tax: Double?
        var subtotal: Double?
        var total: Double?
        var restaurantName: String?

        // First line with no price is often the restaurant name
        if let firstLine = lines.first, extractPrice(from: firstLine.text) == nil {
            restaurantName = firstLine.text.trimmingCharacters(in: .whitespaces)
        }

        for line in lines {
            let text = line.text.trimmingCharacters(in: .whitespaces)
            let lower = text.lowercased()

            guard let price = extractPrice(from: text) else { continue }

            if shouldSkip(lower) {
                continue
            } else if matchesKeywords(lower, keywords: subtotalKeywords) {
                subtotal = price
            } else if matchesKeywords(lower, keywords: taxKeywords) {
                tax = price
            } else if matchesKeywords(lower, keywords: tipKeywords) {
                // Tip detected on receipt — store but don't add as item
                continue
            } else if matchesKeywords(lower, keywords: totalKeywords) {
                total = price
            } else {
                let name = extractItemName(from: text)
                if !name.isEmpty {
                    let quantity = extractQuantity(from: text)
                    items.append(ParsedItem(
                        name: name,
                        price: price,
                        confidence: line.confidence,
                        quantity: quantity
                    ))
                }
            }
        }

        return ParsedReceipt(
            items: items,
            tax: tax,
            subtotal: subtotal,
            total: total,
            restaurantName: restaurantName
        )
    }

    private func extractPrice(from text: String) -> Double? {
        guard let regex = try? NSRegularExpression(pattern: pricePattern),
              let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
              let range = Range(match.range(at: 1), in: text) else {
            return nil
        }
        return Double(text[range])
    }

    private func extractItemName(from text: String) -> String {
        // Remove the price portion from the text
        var name = text
        if let regex = try? NSRegularExpression(pattern: pricePattern) {
            name = regex.stringByReplacingMatches(
                in: name,
                range: NSRange(name.startIndex..., in: name),
                withTemplate: ""
            )
        }
        // Remove leading quantity patterns like "1x" or "2 x"
        if let qtyRegex = try? NSRegularExpression(pattern: #"^\d+\s*[xX]\s*"#) {
            name = qtyRegex.stringByReplacingMatches(
                in: name,
                range: NSRange(name.startIndex..., in: name),
                withTemplate: ""
            )
        }
        // Clean up dollar signs and extra whitespace
        name = name.replacingOccurrences(of: "$", with: "")
        name = name.trimmingCharacters(in: .whitespaces)
        return name
    }

    private func extractQuantity(from text: String) -> Int {
        if let regex = try? NSRegularExpression(pattern: #"^(\d+)\s*[xX]\s"#),
           let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
           let range = Range(match.range(at: 1), in: text),
           let qty = Int(text[range]) {
            return qty
        }
        return 1
    }

    private func matchesKeywords(_ text: String, keywords: [String]) -> Bool {
        keywords.contains { text.contains($0) }
    }

    private func shouldSkip(_ text: String) -> Bool {
        skipKeywords.contains { text.contains($0) }
    }
}
