import Foundation
import Vision
import UIKit
import CoreImage

class OCRService {
    private let context = CIContext()

    func recognizeText(from image: UIImage) async throws -> [RecognizedLine] {
        guard let cgImage = preprocessImage(image) else {
            throw OCRError.invalidImage
        }

        return try await withCheckedThrowingContinuation { continuation in
            let request = VNRecognizeTextRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }

                guard let observations = request.results as? [VNRecognizedTextObservation] else {
                    continuation.resume(returning: [])
                    return
                }

                let lines = observations.compactMap { obs -> RecognizedLine? in
                    guard let candidate = obs.topCandidates(1).first else { return nil }
                    return RecognizedLine(
                        text: candidate.string,
                        confidence: candidate.confidence,
                        boundingBox: obs.boundingBox
                    )
                }
                continuation.resume(returning: lines)
            }

            request.recognitionLevel = .accurate
            request.recognitionLanguages = ["en-US"]
            request.usesLanguageCorrection = true

            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }

    private func preprocessImage(_ image: UIImage) -> CGImage? {
        guard let ciImage = CIImage(image: image) else { return nil }

        // Enhance contrast for receipt readability
        let adjusted = ciImage
            .applyingFilter("CIColorControls", parameters: [
                kCIInputContrastKey: 1.2,
                kCIInputBrightnessKey: 0.05,
            ])

        return context.createCGImage(adjusted, from: adjusted.extent)
    }
}

enum OCRError: LocalizedError {
    case invalidImage
    case recognitionFailed

    var errorDescription: String? {
        switch self {
        case .invalidImage:
            return "Couldn't read that image. Try a clearer pic."
        case .recognitionFailed:
            return "Had trouble reading the receipt. You can type items in manually — no judgment."
        }
    }
}
