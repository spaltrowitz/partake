# Partake

**Split what you share.**

Partake is an iOS app that makes splitting bills effortless. Snap a photo of your receipt, claim your items, and request payment via Venmo — all in seconds.

## Why Partake?

Existing bill-splitting apps are frustrating: bad OCR, 4-character name limits, no support for couples or trips. Partake fixes all of that.

## Key Features

- 📸 **Smart Receipt Scanning** — Vision framework OCR with manual correction for accuracy
- 👫 **Partner/Couple Mode** — Pre-group people so their items auto-combine for one payment
- 💸 **Venmo Deep Link** — One tap to request payment with pre-filled amounts
- 🏝️ **Trip Mode** — Track expenses across multiple meals (like Splitwise for dining)
- 🍽️ **Toast Import** — Share a Toast Tab receipt link directly into the app
- 👤 **Saved Profiles** — No character limits, save frequent dining companions
- 🎂 **Birthday Mode** — Split someone's meal across everyone else

## Tech Stack

- **Platform**: iOS 16+ (Swift, SwiftUI)
- **Architecture**: MVVM + Repository pattern
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Functions)
- **OCR**: Apple Vision framework (on-device, private)
- **Payments**: Venmo deep linking

## Status

🚧 In development