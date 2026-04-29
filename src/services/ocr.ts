import Tesseract from "tesseract.js";

const OCR_TIMEOUT_MS = 30000; // 30 seconds max
const MIN_CONFIDENCE = 30; // Tesseract confidence threshold (0-100)
const VALID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export async function recognizeText(imageFile: File): Promise<string[]> {
  // Validate file type
  if (!VALID_IMAGE_TYPES.some((t) => imageFile.type.startsWith(t.split("/")[0]))) {
    throw new Error("Please upload an image file (JPG, PNG, or HEIC).");
  }

  const imageUrl = URL.createObjectURL(imageFile);

  try {
    // Race between OCR and timeout
    const result = await Promise.race([
      Tesseract.recognize(imageUrl, "eng", {
        logger: () => {},
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("OCR took too long. Try a clearer photo.")), OCR_TIMEOUT_MS)
      ),
    ]);

    if (!result?.data?.text) {
      throw new Error("Couldn't read that receipt. Try a clearer photo or type it in.");
    }

    // Check overall confidence
    if (result.data.confidence < MIN_CONFIDENCE) {
      console.warn(`Low OCR confidence: ${result.data.confidence}%`);
    }

    const lines = result.data.text
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 1); // skip single-char noise

    if (lines.length === 0) {
      throw new Error("Couldn't find any text. Make sure the receipt is in focus.");
    }

    return lines;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Something went wrong reading the receipt. Try again or type it in.");
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
