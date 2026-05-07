import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Vision API not configured", lines: [] },
      { status: 503 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("image") as File;
    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{
            image: { content: base64 },
            features: [{ type: "TEXT_DETECTION" }],
          }],
        }),
      }
    );

    const visionData = await visionRes.json();

    if (visionData.error) {
      throw new Error(visionData.error.message);
    }

    const fullText = visionData.responses?.[0]?.fullTextAnnotation?.text || "";
    const lines = fullText
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 1);

    return NextResponse.json({ lines });
  } catch (error) {
    console.error("Vision API error:", error);
    return NextResponse.json(
      { error: "OCR failed", lines: [] },
      { status: 500 }
    );
  }
}
