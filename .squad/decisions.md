# Decisions

> Canonical decision log. All agents read this before starting work.
> Scribe merges new decisions from `.squad/decisions/inbox/` and deduplicates.

## iOS Input Zoom Prevention
**Date:** 2026-05-07

All `<input>`, `<select>`, and `<textarea>` elements must render at 16px+ font-size on mobile. iOS Safari auto-zooms the page when focusing inputs below 16px, and the page stays zoomed after blur. Add `input, select, textarea { font-size: 16px !important; }` to globals.css on any web project.

---

## Safe Area Handling for Mobile Web
**Date:** 2026-05-07

Any bottom-fixed UI (nav bars, CTAs, sticky footers) must account for iPhone home indicator. Use `viewport-fit: cover` in the viewport meta and add `padding-bottom: env(safe-area-inset-bottom)` to bottom-fixed elements. This is not optional — content WILL be hidden behind the home indicator without it.

---

## Keyword Substring Matching is Dangerous
**Date:** 2026-05-07

Never use `.includes()` with short keywords for classification. "off" matched "coffee", "sale" matched false positives. Use word-boundary regex (`\b`) or require longer/more specific keywords (e.g., `"% off"` instead of `"off"`). This applies to any text classification, not just receipt parsing.

---

## Test With Real Data, Not Just Synthetic
**Date:** 2026-05-07

Unit tests with hand-written inputs miss real-world edge cases. The Talavera receipt had labels and prices on separate lines with metadata between them. The Jigglypuff receipt had a Pokémon card covering half the text. Synthetic tests passed but real scans broke. Always test with actual production data before shipping.

---

## Firebase Anonymous Auth Race Condition
**Date:** 2026-05-07

`signInAnonymously()` is async. Any code that depends on `user.uid` must wait for auth to complete. Pattern: expose `loading` state from auth hook, disable actions until `!loading`. Never use `user?.uid ?? "fallback"` without gating on loading state — the fallback will fire during the loading window.

---

## Vercel Free Tier: Clean Subdomains Require Auth
**Date:** 2026-05-07

On Vercel's free (Hobby) plan, the `{project}.vercel.app` system domain is always behind Vercel Authentication. Only the production alias (`{project}-{hash}.vercel.app`) is publicly accessible. To get a clean public URL, buy a custom domain (~$10/yr) — it works on the free plan with no auth wall.

---

## Receipt OCR: Google Cloud Vision >> Tesseract.js
**Date:** 2026-05-07

Tesseract.js (client-side) produces garbled text on real receipts — thermal paper, light fonts, background noise all cause failures. Google Cloud Vision (server-side) reads the same receipts perfectly. Cost: free for first 1,000/month. Always use Vision API with Tesseract as fallback. Requires GCP billing enabled.

---

## Partner/Couple Mode Must Apply to ALL Split Methods
**Date:** 2026-05-07

When two people are paired (one pays for both), the partner must be removed from participant lists for ALL calculation methods — not just itemized. Even splits, percentage, shares, and exact amounts all need to exclude the partner. Display still shows both people for clarity.
