# Partake

**Split what you share.**

Partake is a web app that makes splitting bills effortless. Scan a receipt, claim your items, and request payment via Venmo — no downloads, no sign-ups.

## How It Works

1. Go to **partakeapp.com** → add who's splitting
2. Snap a pic of the receipt → we read the items and prices
3. Everyone claims their items → tax & tip split proportionally
4. One tap → Venmo requests go out
5. Nobody downloaded anything

## Key Features

- 📸 **Smart Receipt Scanning** — Google Cloud Vision OCR with manual correction
- 👫 **Partner/Couple Mode** — Pre-group people so their items auto-combine
- 💸 **Venmo Deep Link** — One tap to request payment with pre-filled amounts
- 🧠 **Smart Suggestions** — Learns your group's habits (tip %, split preferences)
- 🔗 **Shareable Links** — Friends claim items in the browser, no download needed
- 🎂 **Birthday Mode** — Split someone's meal across everyone else
- 👤 **No Name Limits** — Because 4 characters is ridiculous

## Tech Stack

- **Frontend**: Next.js 16, React, TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage)
- **OCR**: Google Cloud Vision API
- **Payments**: Venmo deep linking
- **Hosting**: Vercel (or Firebase Hosting)

## Getting Started

```bash
npm install
cp .env.example .env.local
# Fill in your Firebase + Google Cloud Vision keys
npm run dev
```

## Environment Variables

See `.env.example` for required configuration:
- Firebase project credentials
- Google Cloud Vision API key

For production deploys, set both:

```bash
GOOGLE_CLOUD_VISION_API_KEY=...
REQUIRE_GOOGLE_CLOUD_VISION=1
```

`REQUIRE_GOOGLE_CLOUD_VISION=1` makes the build fail if Vision OCR is not configured. Leave it unset or `0` for local development and non-production previews.

Runtime OCR health is available at `/api/health/ocr`; it returns `503` when the Vision key is missing.

## Status

🚧 In development

---

🍕 [Cover my share](https://spaltrowitz.github.io/#support)
