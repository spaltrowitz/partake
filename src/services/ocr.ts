import Tesseract from "tesseract.js";

const OCR_TIMEOUT_MS = 30000;
const VALID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function isHEIC(file: File): boolean {
  return file.type === "image/heic" || file.type === "image/heif" || 
    file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif");
}

async function convertToJpeg(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9)
  );
  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}

export async function recognizeText(imageFile: File): Promise<string[]> {
  let file = imageFile;
  
  // Convert HEIC to JPEG (common on iOS/macOS)
  if (isHEIC(imageFile)) {
    try {
      file = await convertToJpeg(imageFile);
    } catch {
      throw new Error("Couldn't process this image format. Try taking a screenshot of the receipt instead.");
    }
  } else if (!VALID_IMAGE_TYPES.includes(imageFile.type) && imageFile.type !== "") {
    throw new Error("Please upload a JPG, PNG, or WebP image.");
  }

  // Try server-side Google Cloud Vision first
  try {
    const lines = await recognizeWithVision(file);
    if (lines.length > 0) return lines;
  } catch {
    // Fall through to Tesseract
  }

  return recognizeWithTesseract(file);
}

async function recognizeWithVision(imageFile: File): Promise<string[]> {
  const formData = new FormData();
  formData.append("image", imageFile);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch("/api/ocr", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const data = await res.json();
    return data.lines || [];
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

async function recognizeWithTesseract(imageFile: File): Promise<string[]> {
  const imageUrl = URL.createObjectURL(imageFile);

  try {
    const result = await Promise.race([
      Tesseract.recognize(imageUrl, "eng", { logger: () => {} }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("OCR took too long. Try a clearer photo.")), OCR_TIMEOUT_MS)
      ),
    ]);

    if (!result?.data?.text) {
      throw new Error("Couldn't read that receipt. Try a clearer photo or type it in.");
    }

    const lines = result.data.text
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 1);

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
