const requiredWhenEnabled = [
  "GOOGLE_CLOUD_VISION_API_KEY",
];

const requireVision = process.env.REQUIRE_GOOGLE_CLOUD_VISION === "1";

if (!requireVision) {
  process.exit(0);
}

const missing = requiredWhenEnabled.filter((key) => !process.env[key]?.trim());

if (missing.length > 0) {
  console.error(
    [
      "Missing required production OCR environment variables:",
      ...missing.map((key) => `- ${key}`),
      "",
      "Set REQUIRE_GOOGLE_CLOUD_VISION=1 only in environments where Google Cloud Vision must be available.",
    ].join("\n")
  );
  process.exit(1);
}
