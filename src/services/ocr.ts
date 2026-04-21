import Tesseract from "tesseract.js";

export async function recognizeText(
  imageFile: File
): Promise<string[]> {
  const imageUrl = URL.createObjectURL(imageFile);

  try {
    const result = await Tesseract.recognize(imageUrl, "eng", {
      logger: () => {},
    });

    const lines = result.data.text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return lines;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
