import Foundation
import UIKit

class VenmoService {
    static let shared = VenmoService()

    func requestPayment(from venmoUsername: String, amount: Double, note: String) -> Bool {
        let amountStr = String(format: "%.2f", amount)
        let encodedNote = note.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""

        guard let url = URL(string: "venmo://paycharge?txn=request&recipients=\(venmoUsername)&amount=\(amountStr)&note=\(encodedNote)") else {
            return false
        }

        guard UIApplication.shared.canOpenURL(url) else {
            return false
        }

        UIApplication.shared.open(url)
        return true
    }

    func canOpenVenmo() -> Bool {
        guard let url = URL(string: "venmo://") else { return false }
        return UIApplication.shared.canOpenURL(url)
    }

    func venmoDeepLink(username: String, amount: Double, note: String) -> URL? {
        let amountStr = String(format: "%.2f", amount)
        let encodedNote = note.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        return URL(string: "venmo://paycharge?txn=request&recipients=\(username)&amount=\(amountStr)&note=\(encodedNote)")
    }
}
