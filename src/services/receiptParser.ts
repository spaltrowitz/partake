import type { ParsedReceipt, ParsedItem } from "@/types";

const PRICE_PATTERN = /\$?\s*(\d+\.\d{2})/;
const SUBTOTAL_KEYWORDS = ["subtotal", "sub total", "sub-total"];
const TAX_KEYWORDS = ["tax", "sales tax", "hst", "gst"];
const TOTAL_KEYWORDS = ["total", "amount due", "balance due", "total due"];
const TIP_KEYWORDS = ["tip", "gratuity"];
const SKIP_KEYWORDS = [
  "visa",
  "mastercard",
  "amex",
  "change",
  "cash",
  "credit",
  "debit",
  "card",
];

export function parseReceiptText(lines: string[]): ParsedReceipt {
  const items: ParsedItem[] = [];
  let tax: number | undefined;
  let subtotal: number | undefined;
  let total: number | undefined;
  let restaurantName: string | undefined;

  // First line with no price is often the restaurant name
  if (lines.length > 0 && !extractPrice(lines[0])) {
    restaurantName = lines[0].trim();
  }

  for (const line of lines) {
    const text = line.trim();
    const lower = text.toLowerCase();
    const price = extractPrice(text);

    if (price === undefined) continue;
    if (shouldSkip(lower)) continue;

    if (matchesKeywords(lower, SUBTOTAL_KEYWORDS)) {
      subtotal = price;
    } else if (matchesKeywords(lower, TAX_KEYWORDS)) {
      tax = price;
    } else if (matchesKeywords(lower, TIP_KEYWORDS)) {
      continue;
    } else if (matchesKeywords(lower, TOTAL_KEYWORDS)) {
      total = price;
    } else {
      const name = extractItemName(text);
      if (name) {
        items.push({
          id: crypto.randomUUID(),
          name,
          price,
          confidence: 1.0,
          quantity: extractQuantity(text),
        });
      }
    }
  }

  return { items, tax, subtotal, total, restaurantName };
}

function extractPrice(text: string): number | undefined {
  const match = text.match(PRICE_PATTERN);
  if (!match) return undefined;
  return parseFloat(match[1]);
}

function extractItemName(text: string): string {
  let name = text.replace(PRICE_PATTERN, "");
  name = name.replace(/^\d+\s*[xX]\s*/, ""); // remove quantity prefix
  name = name.replace(/\$/g, "");
  return name.trim();
}

function extractQuantity(text: string): number {
  const match = text.match(/^(\d+)\s*[xX]\s/);
  return match ? parseInt(match[1]) : 1;
}

function matchesKeywords(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

function shouldSkip(text: string): boolean {
  return SKIP_KEYWORDS.some((k) => text.includes(k));
}
