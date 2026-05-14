import Tesseract from "tesseract.js";

const OCR_TIMEOUT_MS = 30000;
const VALID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const TESSERACT_MAX_DIMENSION = 2200;

export interface OcrResult {
  lines: string[];
  engine: "vision" | "tesseract";
  warning?: string;
}

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

async function prepareForTesseract(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, TESSERACT_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.35 + 128));
    data[i] = contrasted;
    data[i + 1] = contrasted;
    data[i + 2] = contrasted;
  }

  ctx.putImageData(image, 0, 0);

  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.92)
  );

  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}

export async function recognizeText(imageFile: File): Promise<OcrResult> {
  const heic = isHEIC(imageFile);

  if (!heic && !VALID_IMAGE_TYPES.includes(imageFile.type) && imageFile.type !== "") {
    throw new Error("Please upload a JPG, PNG, WebP, or HEIC image.");
  }

  const visionResult = await recognizeWithVision(imageFile);
  if (visionResult.lines.length > 0) return visionResult;

  // Tesseract fallback — needs JPEG/PNG, so convert HEIC first
  if (heic) {
    try {
      const converted = await convertToJpeg(imageFile);
      const prepared = await prepareForTesseract(converted);
      const lines = await recognizeWithTesseract(prepared);
      return {
        lines,
        engine: "tesseract",
        warning: visionResult.warning ?? "Cloud receipt scanning was unavailable, so backup OCR was used. Please review the items and prices carefully.",
      };
    } catch {
      throw new Error("Couldn't process this HEIC image. Try taking a screenshot of the receipt instead.");
    }
  }

  const prepared = await prepareForTesseract(imageFile);
  const lines = await recognizeWithTesseract(prepared);
  return {
    lines,
    engine: "tesseract",
    warning: visionResult.warning ?? "Cloud receipt scanning was unavailable, so backup OCR was used. Please review the items and prices carefully.",
  };
}

async function recognizeWithVision(imageFile: File): Promise<OcrResult> {
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

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = typeof data.error === "string" ? data.error : "Cloud receipt scanning was unavailable.";
      return { lines: [], engine: "vision", warning: message };
    }

    const data = await res.json();
    const lines = data.lines || [];
    return {
      lines,
      engine: "vision",
      warning: lines.length === 0 ? "Cloud receipt scanning found no text, so backup OCR was used. Please review the items and prices carefully." : undefined,
    };
  } catch {
    clearTimeout(timeout);
    return {
      lines: [],
      engine: "vision",
      warning: "Cloud receipt scanning timed out, so backup OCR was used. Please review the items and prices carefully.",
    };
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
