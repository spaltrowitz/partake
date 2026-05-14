import { NextResponse } from "next/server";

export async function GET() {
  const configured = Boolean(process.env.GOOGLE_CLOUD_VISION_API_KEY?.trim());

  return NextResponse.json(
    {
      service: "ocr",
      provider: "google-cloud-vision",
      configured,
      status: configured ? "ok" : "missing_config",
    },
    { status: configured ? 200 : 503 }
  );
}
