import { NextRequest, NextResponse } from "next/server";

// Google Cloud Vision API for receipt OCR
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("image") as File;

  if (!file) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OCR service not configured" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64 },
              features: [{ type: "TEXT_DETECTION" }],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    const textAnnotations = data.responses?.[0]?.textAnnotations;

    if (!textAnnotations || textAnnotations.length === 0) {
      return NextResponse.json({
        lines: [],
        message:
          "Couldn't read that one. Try a clearer pic or just type it in — no judgment.",
      });
    }

    // First annotation is the full text, rest are individual words
    const fullText = textAnnotations[0].description as string;
    const lines = fullText.split("\n").filter((line: string) => line.trim());

    return NextResponse.json({ lines });
  } catch (error) {
    console.error("OCR error:", error);
    return NextResponse.json(
      { error: "Had trouble reading the receipt. Try again or type it in." },
      { status: 500 }
    );
  }
}
