import type { ParsedReceipt, ParsedItem } from "@/types";

// Matches prices like $12.99, 12.99, $1,234.56 — requires 2 decimal places
const PRICE_PATTERN = /\$?\s*(\d{1,3}(?:,\d{3})*\.\d{2})(?!\s*%)/;
const PRICE_PATTERN_GLOBAL = /\$?\s*(\d{1,3}(?:,\d{3})*\.\d{2})(?!\s*%)/g;

// Negative prices for discounts: -$5.00, ($5.00)
const NEGATIVE_PRICE_PATTERN = /[-\(]\s*\$?\s*(\d{1,3}(?:,\d{3})*\.\d{2})\)?/;

const SUBTOTAL_KEYWORDS = ["subtotal", "sub total", "sub-total"];
const TAX_KEYWORDS = ["tax", "sales tax", "hst", "gst", "service tax"];
const TOTAL_KEYWORDS = ["total", "amount due", "balance due", "total due", "grand total"];
const TIP_KEYWORDS = ["tip", "gratuity"];
const SKIP_KEYWORDS = [
  "visa", "mastercard", "amex", "discover", "change due",
  "credit card", "debit card", "card ending", "auth code",
  "merchant", "transaction", "receipt #", "check #",
  "server:", "table:", "date:", "time:", "order #",
  "thank you", "come again", "welcome",
  "input type", "transaction type", "authorization", "approval code",
  "payment id", "application id", "application label", "device id",
  "card reader", "emv chip", "suggested additional tip",
  "tip percentages", "dine in", "ordered:", "join us",
  "happy hour", "lunch", "bbpos", "approved",
  "suggested tip", "suggested additional tip", "total savings",
  "savings with prime", "savings with prine", "net sales",
  "reg", "regular price",
];
const SERVICE_CHARGE_KEYWORDS = ["service charge", "auto gratuity", "auto-gratuity", "autograt"];
const DISCOUNT_KEYWORDS = ["discount", "coupon", "promo", "% off", "comp"];
const PAYMENT_TOTAL_KEYWORDS = ["balance due", "amount paid", "change due"];
const KEYWORD_FUZZY_MATCHES: Record<string, string[]> = {
  subtotal: ["subtotal"],
  total: ["total", "tatal", "otald"],
  tax: ["tax"],
  tip: ["tip"],
  gratuity: ["gratuity"],
};
const NON_TOTAL_SUMMARY_PATTERN = /\b(total\s+savings|savings|saved|net\s+sales|reg(?:ular)?\s+price)\b/i;

// Quantity patterns: "2x ", "2 x ", "qty 2", "2) ", or bare "2 " at start followed by a word
const QUANTITY_PATTERNS = [
  /^(\d+)\s*[xX×]\s+/,       // 2x Burger, 2 X burger, 2× burger
  /^qty\s*:?\s*(\d+)\s+/i,   // qty: 2 Burger, Qty 2 Burger
  /^(\d+)\)\s+/,              // 2) Burger
  /^(\d+)\s*[|\\]\s*/,        // 2 | Burger, 2 \ Burger
  /^(\d+)\s+(?=[A-Z])/,      // 2 Burger (digit + space + capital letter)
];

// Item code patterns to strip
const ITEM_CODE_PATTERN = /^[#]?\d{2,6}\s+/; // #142 Burger, 1234 Burger

export function parseReceiptText(lines: string[]): ParsedReceipt {
  const items: ParsedItem[] = [];
  let tax: number | undefined;
  let subtotal: number | undefined;
  let total: number | undefined;
  let tip: number | undefined;
  let restaurantName: string | undefined;
  let discount: number | undefined;
  const warnings: string[] = [];
  const seenTaxValues: number[] = [];

  function addWarning(message: string) {
    if (!warnings.includes(message)) warnings.push(message);
  }

  function setAmount(label: "subtotal" | "tip" | "total", current: number | undefined, value: number): number {
    if (current !== undefined && Math.abs(current - value) > 0.01) {
      addWarning(`Found conflicting ${label} values. Please verify the receipt totals.`);
      return current;
    }
    return value;
  }

  function addTax(value: number) {
    if (seenTaxValues.some((existing) => Math.abs(existing - value) <= 0.01)) return;
    seenTaxValues.push(value);
    tax = Math.round(seenTaxValues.reduce((sum, amount) => sum + amount, 0) * 100) / 100;
  }

  // First non-empty line without a price is often the restaurant name
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^[\-=*_~.#]{3,}$/.test(trimmed)) continue;
    if (!extractPrice(trimmed)) {
      const raw = trimmed
        .replace(/^[\-=*_~.#\s]+|[\-=*_~.#\s]+$/g, "")
        .trim();
      // Title-case if all caps (common in OCR output)
      restaurantName = /^[A-Z\s\-'&]+$/.test(raw)
        ? raw.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
        : raw;
      break;
    }
    break;
  }

  // Handle multi-line items: if a line has no price, peek at next line
  // Use a queue for keyword labels that appear on separate lines from their prices
  const pendingKeywords: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i].trim();
    const lower = text.toLowerCase();

    // Skip empty lines and decorative separators
    if (!text || /^[\-=*_~.#]{3,}$/.test(text)) continue;

    // Skip suggested tip lines early — before any keyword matching
    if (/^\+?\d+%/.test(text)) continue;
    if (/tip percentages/i.test(text)) continue;
    if (/price before taxes/i.test(text)) continue;
    // Lines containing BOTH "tip" and "total" with dollar amounts are suggestion lines
    if (/tip/i.test(text) && /total/i.test(text) && /\$/.test(text)) continue;
    // Lines with parenthesized tip amounts like "(Tip $2.40 Total $133.08)"
    if (/\(tip\s+\$/i.test(text)) continue;

    // Check for negative prices (discounts)
    const negMatch = text.match(NEGATIVE_PRICE_PATTERN);
    if (negMatch && matchesAny(lower, DISCOUNT_KEYWORDS)) {
      discount = (discount ?? 0) + parseFloat(negMatch[1].replace(/,/g, ""));
      continue;
    }

    const price = extractPrice(text);

    // Line has no price — could be a keyword label or item name
    if (price === undefined) {
      // Check if this is a keyword label (subtotal, tax, tip, total)
      if (matchesAny(lower, SUBTOTAL_KEYWORDS)) { pendingKeywords.push("subtotal"); continue; }
      if (matchesAny(lower, TAX_KEYWORDS)) { pendingKeywords.push("tax"); continue; }
      if (matchesAny(lower, SERVICE_CHARGE_KEYWORDS)) { pendingKeywords.push("service"); continue; }
      if (matchesAny(lower, TIP_KEYWORDS)) { pendingKeywords.push("tip"); continue; }
      if (matchesAny(lower, TOTAL_KEYWORDS)) { pendingKeywords.push("total"); continue; }
      if (matchesAny(lower, DISCOUNT_KEYWORDS)) { pendingKeywords.push("discount"); continue; }

      // Not a keyword — but if we have pending keywords, skip non-keyword lines
      // (handles gaps between keyword labels and their prices)
      if (pendingKeywords.length > 0) continue;

      // Check if next line is a standalone price (multi-line item)
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const nextPrice = extractPrice(nextLine);
        // Next line is ONLY a price (no letters except $ sign)
        if (nextPrice !== undefined && /^\$?\s*[\d,]+\.\d{2}\s*$/.test(nextLine)) {
          const name = cleanItemName(text);
          if (name && !isMetadataLine(lower) && !shouldSkip(lower)) {
            const qty = extractQuantity(text);
            const unitPrice = qty > 1 ? Math.round((nextPrice / qty) * 100) / 100 : nextPrice;
            items.push({
              id: crypto.randomUUID(),
              name,
              price: unitPrice,
              confidence: 0.8,
              quantity: qty,
            });
            i++; // skip the price line
          }
        }
      }
      continue;
    }

    // Line HAS a price — check if it belongs to a pending keyword
    if (pendingKeywords.length > 0) {
      const isStandalonePrice = /^\$?\s*[\d,]+\.\d{2}\s*$/.test(text);
      if (isStandalonePrice) {
        // Collect ALL consecutive standalone prices from here
        const allPrices: number[] = [price];
        let lookAhead = i + 1;
        while (lookAhead < lines.length) {
          const nextText = lines[lookAhead].trim();
          if (!nextText || shouldSkip(nextText.toLowerCase())) { lookAhead++; continue; }
          const nextPrice = extractPrice(nextText);
          if (nextPrice !== undefined && /^\$?\s*[\d,]+\.\d{2}\s*$/.test(nextText)) {
            allPrices.push(nextPrice);
            lookAhead++;
          } else {
            break;
          }
        }

        const kwCount = pendingKeywords.length;
        if (allPrices.length >= kwCount) {
          // Take the LAST kwCount prices (keyword values come after item prices)
          const kwPrices = allPrices.slice(allPrices.length - kwCount);
          // Assign keyword values
          for (let k = 0; k < kwCount; k++) {
            const kw = pendingKeywords[k];
            const kPrice = kwPrices[k];
            switch (kw) {
              case "subtotal": subtotal = setAmount("subtotal", subtotal, kPrice); break;
              case "tax": addTax(kPrice); break;
              case "tip": tip = setAmount("tip", tip, kPrice); break;
              case "total": total = setAmount("total", total, kPrice); break;
              case "service": addTax(kPrice); break;
              case "discount": discount = (discount ?? 0) + kPrice; break;
            }
          }

          // Remaining prices are item prices — add them as unnamed items
          // (they'll be matched with orphan item names in post-parse recovery)
          // For now, skip them — post-parse recovery handles this case
          i = lookAhead - 1;
          pendingKeywords.length = 0;
          continue;
        }

        // Not enough prices — clear queue and process normally
        pendingKeywords.length = 0;
      } else {
        // Non-standalone-price line — skip while searching for keyword prices
        continue;
      }
    }

    // Skip payment/metadata lines
    if (shouldSkip(lower)) continue;
    if (NON_TOTAL_SUMMARY_PATTERN.test(lower)) continue;

    // Categorize by keywords
    if (matchesAny(lower, SUBTOTAL_KEYWORDS)) {
      subtotal = setAmount("subtotal", subtotal, price);
    } else if (matchesAny(lower, SERVICE_CHARGE_KEYWORDS)) {
      addTax(price);
    } else if (matchesAny(lower, TAX_KEYWORDS)) {
      addTax(price);
    } else if (matchesAny(lower, TIP_KEYWORDS)) {
      tip = setAmount("tip", tip, price);
    } else if (matchesAny(lower, TOTAL_KEYWORDS)) {
      if (matchesAny(lower, PAYMENT_TOTAL_KEYWORDS) && total !== undefined) {
        continue;
      }
      total = setAmount("total", total, price);
    } else if (matchesAny(lower, DISCOUNT_KEYWORDS)) {
      discount = (discount ?? 0) + price;
    } else {
      const name = cleanItemName(text);
      if (name) {
        if (price === 0) continue;

        const qty = extractQuantity(text);
        const unitPrice = qty > 1 ? Math.round((price / qty) * 100) / 100 : price;

        items.push({
          id: crypto.randomUUID(),
          name,
          price: unitPrice,
          confidence: 1.0,
          quantity: qty,
        });
      }
    }
  }

  // Post-parse recovery: if we have subtotal/total but no items,
  // the receipt likely has items and prices in separate columns.
  // Find item-name lines (before keywords) and standalone prices (after keywords),
  // then pair them in order.
  if (items.length === 0 && (subtotal || total)) {
    const itemNames: { name: string; qty: number }[] = [];
    const orphanPrices: number[] = [];
    let seenKeyword = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();

      if (matchesAny(lower, [...SUBTOTAL_KEYWORDS, ...TAX_KEYWORDS, ...TIP_KEYWORDS, ...TOTAL_KEYWORDS])) {
        seenKeyword = true;
        continue;
      }
      if (shouldSkip(lower)) continue;
      if (/^\+?\d+%/.test(trimmed)) continue;
      if (/tip/i.test(trimmed) && /total/i.test(trimmed) && /\$/.test(trimmed)) continue;
      if (/tip percentages/i.test(trimmed)) continue;

      const price = extractPrice(trimmed);
      const isStandalonePrice = price !== undefined && /^\$?\s*[\d,]+\.\d{2}\s*$/.test(trimmed);

      if (!seenKeyword && price === undefined) {
        // Potential item name (before keyword section)
        const name = cleanItemName(trimmed);
        if (name && !isMetadataLine(lower) && name.length > 1) {
          itemNames.push({ name, qty: extractQuantity(trimmed) });
        }
      } else if (isStandalonePrice && price !== undefined) {
        // Standalone price — could be item price or keyword value
        // Skip if it matches a known keyword value
        if (price !== subtotal && price !== tax && price !== tip && price !== total) {
          orphanPrices.push(price);
        }
      }
    }

    // Pair names with prices in order
    const pairCount = Math.min(itemNames.length, orphanPrices.length);
    for (let i = 0; i < pairCount; i++) {
      const { name, qty } = itemNames[i];
      const price = orphanPrices[i];
      const unitPrice = qty > 1 ? Math.round((price / qty) * 100) / 100 : price;
      items.push({
        id: crypto.randomUUID(),
        name,
        price: unitPrice,
        confidence: 0.7,
        quantity: qty,
      });
    }
  }

  const itemSumBeforeColumnRecovery = Math.round(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;
  if (subtotal !== undefined && Math.abs(itemSumBeforeColumnRecovery - subtotal) > 2) {
    const recoveredItems = recoverOrderedColumnItems(lines, subtotal);
    if (recoveredItems.length > items.length) {
      const recoveredSum = Math.round(recoveredItems.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;
      if (Math.abs(recoveredSum - subtotal) < Math.abs(itemSumBeforeColumnRecovery - subtotal)) {
        items.length = 0;
        items.push(...recoveredItems);
      }
    }
  }

  // Fix restaurant name if it's clearly not a restaurant (e.g., Pokémon card text)
  if (restaurantName && items.length > 0) {
    // Check if any item name looks more like a restaurant name
    const knownNonRestaurant = /pokemon|jigglypuff|pikachu|charizard|yugioh|magic.the/i;
    if (knownNonRestaurant.test(restaurantName)) {
      // Try to find a better restaurant name from lines near "server:" or address
      for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].trim().toLowerCase();
        if (lower.includes("server:") || lower.includes("check #") || /\d{5}/.test(lower)) {
          // Look 1-3 lines before for the restaurant name
          for (let j = Math.max(0, i - 3); j < i; j++) {
            const candidate = lines[j].trim();
            if (candidate && !knownNonRestaurant.test(candidate) && !extractPrice(candidate) && candidate.length > 2) {
              restaurantName = candidate;
              break;
            }
          }
          break;
        }
      }
    }
  }

  const itemSum = Math.round(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;
  if (subtotal !== undefined && items.length > 0 && Math.abs(itemSum - subtotal) > 2) {
    addWarning("Item prices do not add up to the subtotal. Please review for missing or misread items.");
  }

  if (items.length === 0 && (subtotal !== undefined || total !== undefined)) {
    addWarning("Found receipt totals but no line items. Please add items manually.");
  }

  return { items, tax, tip, discount, subtotal, total, restaurantName, warnings: warnings.length > 0 ? warnings : undefined };
}

function extractPrice(text: string): number | undefined {
  const matches = [...text.matchAll(PRICE_PATTERN_GLOBAL)];
  if (matches.length === 0) return undefined;
  const match = matches[matches.length - 1];
  return parseFloat(match[1].replace(/,/g, ""));
}

function recoverOrderedColumnItems(lines: string[], subtotal: number): ParsedItem[] {
  const recovered: ParsedItem[] = [];
  let pendingNames: { name: string; qty: number }[] = [];
  let inOrderedSection = false;
  let stalePendingNames = false;

  function addRecovered(name: string, qty: number, linePrice: number) {
    const unitPrice = qty > 1 ? Math.round((linePrice / qty) * 100) / 100 : linePrice;
    recovered.push({
      id: crypto.randomUUID(),
      name,
      price: unitPrice,
      confidence: 0.7,
      quantity: qty,
    });
  }

  function getItemName(line: string): { name: string; qty: number } | null {
    const lower = line.toLowerCase();
    if (shouldSkip(lower) || isMetadataLine(lower) || /^\+?\d+%/.test(line)) return null;
    const name = cleanItemName(line);
    if (!name || !/[a-z]/i.test(name) || isMetadataLine(lower) || shouldSkip(lower)) return null;
    return { name, qty: extractQuantity(line) };
  }

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();

    if (/\bordered\b/i.test(trimmed)) {
      inOrderedSection = true;
      continue;
    }

    if (!inOrderedSection) continue;

    if (matchesAny(lower, [...SUBTOTAL_KEYWORDS, ...TAX_KEYWORDS, ...TIP_KEYWORDS, ...TOTAL_KEYWORDS])) {
      break;
    }

    if (shouldSkip(lower) || isMetadataLine(lower) || /^\+?\d+%/.test(trimmed)) continue;

    const price = extractPrice(trimmed);
    const isStandalonePrice = price !== undefined && /^\$?\s*[\d,]+\.\d{2}\s*$/.test(trimmed);

    if (isStandalonePrice) {
      const priceRun: number[] = [];
      let lookAhead = i;
      while (lookAhead < lines.length) {
        const candidate = lines[lookAhead].trim();
        const candidatePrice = extractPrice(candidate);
        if (candidatePrice === undefined || !/^\$?\s*[\d,]+\.\d{2}\s*$/.test(candidate)) break;
        if (candidatePrice !== subtotal) priceRun.push(candidatePrice);
        lookAhead++;
      }

      if (pendingNames.length > 0 && priceRun.length > 0) {
        let orderedNames = pendingNames;
        if (stalePendingNames && priceRun.length >= pendingNames.length && pendingNames.length > 1) {
          orderedNames = [pendingNames[pendingNames.length - 1], ...pendingNames.slice(0, -1)];
        }
        const pairCount = Math.min(orderedNames.length, priceRun.length);
        for (let j = 0; j < pairCount; j++) {
          addRecovered(orderedNames[j].name, orderedNames[j].qty, priceRun[j]);
        }
        pendingNames = orderedNames.slice(pairCount);
        stalePendingNames = pendingNames.length > 0;
      }

      i = lookAhead - 1;
      continue;
    }

    const itemName = getItemName(trimmed);
    if (!itemName) continue;

    if (price !== undefined && price !== subtotal) {
      addRecovered(itemName.name, itemName.qty, price);
      stalePendingNames = pendingNames.length > 0;
    } else {
      pendingNames.push(itemName);
    }
  }

  return recovered.length >= 2 ? recovered : [];
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
  name = name.replace(/[\\|]+/g, " ");
  name = name.replace(/^[\-*•·\s]+|[\-*•·\s]+$/g, "");

  // Remove parenthesized percentages like "(50% off)"
  name = name.replace(/\(\d+%\s*off\)/i, "");

  name = name.replace(/\s{2,}/g, " ").trim();

  // Title-case if all caps
  if (/^[A-Z\s\-'&]+$/.test(name) && name.length > 2) {
    name = name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return name;
}

function extractQuantity(text: string): number {
  for (const pattern of QUANTITY_PATTERNS) {
    const match = text.match(pattern);
    if (match) return parseInt(match[1]);
  }
  return 1;
}

function matchesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => matchesKeyword(text, keyword));
}

function matchesKeyword(text: string, keyword: string): boolean {
  if (keyword === "% off") return /%\s*off\b/i.test(text);

  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  if (new RegExp(`\\b${escaped}\\b`, "i").test(text)) return true;

  const canonical = KEYWORD_FUZZY_MATCHES[keyword];
  if (!canonical) return false;

  const tokens = text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);

  return canonical.some((target) =>
    tokens.some((token) => {
      if (target.length < 5) return false;
      const maxDistance = target.length >= 6 ? 2 : 1;
      return Math.abs(token.length - target.length) <= maxDistance &&
        editDistance(token, target) <= maxDistance;
    })
  );
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[a.length][b.length];
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
