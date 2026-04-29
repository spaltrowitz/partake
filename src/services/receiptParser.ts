import type { ParsedReceipt, ParsedItem } from "@/types";

// Matches prices like $12.99, 12.99, $1,234.56 — requires 2 decimal places
const PRICE_PATTERN = /\$?\s*(\d{1,3}(?:,\d{3})*\.\d{2})/;

// Negative prices for discounts: -$5.00, ($5.00)
const NEGATIVE_PRICE_PATTERN = /[-\(]\s*\$?\s*(\d{1,3}(?:,\d{3})*\.\d{2})\)?/;

const SUBTOTAL_KEYWORDS = ["subtotal", "sub total", "sub-total"];
const TAX_KEYWORDS = ["tax", "sales tax", "hst", "gst", "service tax"];
const TOTAL_KEYWORDS = ["total", "amount due", "balance due", "total due", "grand total"];
const TIP_KEYWORDS = ["tip", "gratuity", "suggested tip"];
const SKIP_KEYWORDS = [
  "visa", "mastercard", "amex", "discover", "change due",
  "credit card", "debit card", "card ending", "auth code",
  "merchant", "transaction", "receipt #", "check #",
  "server:", "table:", "date:", "time:", "order #",
  "thank you", "come again", "welcome",
];
const SERVICE_CHARGE_KEYWORDS = ["service charge", "auto gratuity", "auto-gratuity", "autograt"];
const DISCOUNT_KEYWORDS = ["discount", "coupon", "promo", "off", "comp"];

// Quantity patterns: "2x ", "2 x ", "qty 2", "2) ", or bare "2 " at start followed by a word
const QUANTITY_PATTERNS = [
  /^(\d+)\s*[xX×]\s+/,       // 2x Burger, 2 X burger, 2× burger
  /^qty\s*:?\s*(\d+)\s+/i,   // qty: 2 Burger, Qty 2 Burger
  /^(\d+)\)\s+/,              // 2) Burger
  /^(\d+)\s+(?=[A-Z])/,      // 2 Burger (digit + space + capital letter)
];

// Item code patterns to strip
const ITEM_CODE_PATTERN = /^[#]?\d{2,6}\s+/; // #142 Burger, 1234 Burger

export function parseReceiptText(lines: string[]): ParsedReceipt {
  const items: ParsedItem[] = [];
  let tax: number | undefined;
  let subtotal: number | undefined;
  let total: number | undefined;
  let restaurantName: string | undefined;
  let discount: number | undefined;

  // First non-empty line without a price is often the restaurant name
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip decorative lines (all dashes, asterisks, equals)
    if (/^[\-=*_~.#]{3,}$/.test(trimmed)) continue;
    if (!extractPrice(trimmed)) {
      restaurantName = trimmed
        .replace(/^[\-=*_~.#\s]+|[\-=*_~.#\s]+$/g, "") // strip decorations
        .trim();
      break;
    }
    break;
  }

  // Handle multi-line items: if a line has no price, peek at next line
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i].trim();
    const lower = text.toLowerCase();

    // Skip empty lines and decorative separators
    if (!text || /^[\-=*_~.#]{3,}$/.test(text)) continue;

    // Check for negative prices (discounts)
    const negMatch = text.match(NEGATIVE_PRICE_PATTERN);
    if (negMatch && matchesAny(lower, DISCOUNT_KEYWORDS)) {
      discount = (discount ?? 0) + parseFloat(negMatch[1].replace(/,/g, ""));
      continue;
    }

    const price = extractPrice(text);

    // Line has no price — check if next line is a standalone price
    if (price === undefined) {
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const nextPrice = extractPrice(nextLine);
        // Next line is ONLY a price (no letters except $ sign)
        if (nextPrice !== undefined && /^\$?\s*[\d,]+\.\d{2}\s*$/.test(nextLine)) {
          const name = cleanItemName(text);
          if (name && !isMetadataLine(lower)) {
            items.push({
              id: crypto.randomUUID(),
              name,
              price: nextPrice,
              confidence: 0.8, // lower confidence for multi-line
              quantity: extractQuantity(text),
            });
            i++; // skip the price line
          }
        }
      }
      continue;
    }

    // Skip payment/metadata lines
    if (shouldSkip(lower)) continue;

    // Categorize by keywords
    if (matchesAny(lower, SUBTOTAL_KEYWORDS)) {
      subtotal = price;
    } else if (matchesAny(lower, TAX_KEYWORDS)) {
      tax = price;
    } else if (matchesAny(lower, TIP_KEYWORDS)) {
      continue; // tip is on the receipt but we let user set their own
    } else if (matchesAny(lower, TOTAL_KEYWORDS)) {
      total = price;
    } else if (matchesAny(lower, SERVICE_CHARGE_KEYWORDS)) {
      // Treat service charge like tax — it's a mandatory add-on
      tax = (tax ?? 0) + price;
    } else if (matchesAny(lower, DISCOUNT_KEYWORDS)) {
      discount = (discount ?? 0) + price;
    } else {
      const name = cleanItemName(text);
      if (name) {
        // Skip $0.00 items (complimentary sides, included items)
        if (price === 0) continue;

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
  return parseFloat(match[1].replace(/,/g, ""));
}

function cleanItemName(text: string): string {
  let name = text;

  // Remove price
  name = name.replace(PRICE_PATTERN, "");

  // Remove quantity prefixes
  for (const pattern of QUANTITY_PATTERNS) {
    name = name.replace(pattern, "");
  }

  // Remove item codes
  name = name.replace(ITEM_CODE_PATTERN, "");

  // Remove dollar signs, leading/trailing decorations
  name = name.replace(/\$/g, "");
  name = name.replace(/^[\-*•·\s]+|[\-*•·\s]+$/g, "");

  // Remove parenthesized percentages like "(50% off)"
  name = name.replace(/\(\d+%\s*off\)/i, "");

  return name.trim();
}

function extractQuantity(text: string): number {
  for (const pattern of QUANTITY_PATTERNS) {
    const match = text.match(pattern);
    if (match) return parseInt(match[1]);
  }
  return 1;
}

function matchesAny(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

function shouldSkip(text: string): boolean {
  return SKIP_KEYWORDS.some((k) => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text));
}

function isMetadataLine(text: string): boolean {
  // Lines that are dates, times, addresses, phone numbers
  return /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(text) || // date
    /^\d{1,2}:\d{2}/.test(text) || // time
    /^\(\d{3}\)/.test(text) || // phone
    /^\d+\s+(st|nd|rd|th|ave|blvd|dr|ln|way|rd)\b/i.test(text); // address
}
