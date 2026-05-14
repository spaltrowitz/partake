import { describe, expect, it, vi, beforeEach } from "vitest";
import { parseReceiptText } from "../receiptParser";

let uuidCounter = 0;

beforeEach(() => {
  uuidCounter = 0;
  vi.stubGlobal("crypto", {
    randomUUID: () => `desktop-fixture-${++uuidCounter}`,
  });
});

describe("receiptParser - sanitized desktop receipt fixtures", () => {
  it("parses a clean restaurant receipt with suggested tip lines", () => {
    const receipt = parseReceiptText([
      "Server: MAIN BAR",
      "Check #10 Table 19",
      "Ordered: 1/31/26 1:18 PM",
      "3 Olympic Fix Helles $30.00",
      "1 GL Avra Assyrtiko $18.00",
      "1 Gr Salmon $39.95",
      "2 Daily Fish $79.90",
      "1 Whole Fish $39.95",
      "1 Brochette $39.95",
      "1 Chicken Frite $39.95",
      "Subtotal $287.70",
      "Tax $25.57",
      "Total $313.21",
      "Suggested Tip:",
      "20%: (Tip $57.54 Total $370.81)",
      "22%: (Tip $63.29 Total $376.56)",
      "Tip percentages are based on the check",
      "price before taxes.",
    ]);

    expect(receipt.items).toHaveLength(7);
    expect(receipt.subtotal).toBeCloseTo(287.70, 2);
    expect(receipt.tax).toBeCloseTo(25.57, 2);
    expect(receipt.total).toBeCloseTo(313.21, 2);
    expect(receipt.warnings).toBeUndefined();
  });

  it("recognizes OCR-typo subtotal and total labels", () => {
    const receipt = parseReceiptText([
      "Server: Diego",
      "Check #30 Table 10",
      "Ordered: 4/1/26 6:52 PM",
      "2 A-Wevos $20.60",
      "2 Tacos Mixtos $32.96",
      "Vegetable empanadas $15.45",
      "swtotal $69.01",
      "Tax $6.12",
      "Tatal $75.13",
      "Suggested Tip:",
      "18%: (Tip $12.42 Total $87.55)",
    ]);

    expect(receipt.items).toHaveLength(3);
    expect(receipt.subtotal).toBeCloseTo(69.01, 2);
    expect(receipt.tax).toBeCloseTo(6.12, 2);
    expect(receipt.total).toBeCloseTo(75.13, 2);
  });

  it("deduplicates repeated summary totals from payment-terminal receipts", () => {
    const receipt = parseReceiptText([
      "Server: Milica",
      "Hacker Pschorr 1/2 LTR 11.00",
      "Soup 1/2 Sandwich 20.00",
      "Jager Schnitzel 29.50",
      "Trout Filet 30.00",
      "Kasespatzle 25.00",
      "Weiss 1/2 LTR 11.00",
      "Subtotal 126.50",
      "Tax 9.82",
      "Total 136.32",
      "Subtotal 126.50",
      "Tax 9.82",
      "Total 136.32",
      "Balance Due 136.32",
      "20% = 25.30",
    ]);

    expect(receipt.items).toHaveLength(6);
    expect(receipt.subtotal).toBeCloseTo(126.50, 2);
    expect(receipt.tax).toBeCloseTo(9.82, 2);
    expect(receipt.total).toBeCloseTo(136.32, 2);
  });

  it("uses the dollar amount, not the percent, for auto gratuity", () => {
    const receipt = parseReceiptText([
      "1 House Roll $8.00",
      "5 Dim Sum $26.00",
      "1 Peking Duck $98.00",
      "2 Seafood Fried Rice $64.00",
      "Subtotal $196.00",
      "Auto Gratuity (20.00%) $39.20",
      "Tax $17.40",
      "Total $252.60",
      "Suggested Additional Tip:",
      "+ 3%: (Tip $5.88 Total $258.48)",
    ]);

    expect(receipt.items).toHaveLength(4);
    expect(receipt.subtotal).toBeCloseTo(196, 2);
    expect(receipt.tax).toBeCloseTo(56.60, 2);
    expect(receipt.total).toBeCloseTo(252.60, 2);
  });

  it("keeps noisy grocery scans editable and marks them for review", () => {
    const receipt = parseReceiptText([
      "MARKET",
      "BLUEBERRY $6.99",
      "Savings with Prime ($2.38)",
      "Reg $8.99",
      "PIZZA STARS $6.79",
      "Savings with Prine ($1.71)",
      "BUTTERNUT LENTIL SOUP $4.91",
      "57:4 subtotal $205.72",
      "Total Savings $37.22",
      "Net Sales: $166.50",
      "Bag Fee $0.05EA $0.20",
      "Taxis <3 8.88% $1.29",
      "otald $169.99",
    ]);

    expect(receipt.items.length).toBeGreaterThan(0);
    expect(receipt.subtotal).toBeCloseTo(205.72, 2);
    expect(receipt.total).toBeCloseTo(169.99, 2);
    expect(receipt.warnings).toContain("Item prices do not add up to the subtotal. Please review for missing or misread items.");
  });
});
