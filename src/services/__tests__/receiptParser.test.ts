import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseReceiptText } from "@/services/receiptParser";

let uuidCounter = 0;
beforeEach(() => {
  uuidCounter = 0;
  vi.stubGlobal("crypto", {
    randomUUID: () => `test-uuid-${++uuidCounter}`,
  });
});

describe("parseReceiptText", () => {
  it("parses a simple receipt with items, tax, subtotal, and total", () => {
    const lines = [
      "Joe's Grill",
      "Burger $12.99",
      "Fries $4.99",
      "Subtotal $17.98",
      "Tax $1.60",
      "Total $19.58",
    ];

    const result = parseReceiptText(lines);

    expect(result.items).toHaveLength(2);
    expect(result.items[0].name).toBe("Burger");
    expect(result.items[0].price).toBeCloseTo(12.99, 2);
    expect(result.items[1].name).toBe("Fries");
    expect(result.items[1].price).toBeCloseTo(4.99, 2);
    expect(result.tax).toBeCloseTo(1.6, 2);
    expect(result.subtotal).toBeCloseTo(17.98, 2);
    expect(result.total).toBeCloseTo(19.58, 2);
  });

  it("parses multi-line item (name on one line, price on next)", () => {
    const lines = [
      "Restaurant",
      "Chicken Wings",
      "$14.99",
    ];

    const result = parseReceiptText(lines);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("Chicken Wings");
    expect(result.items[0].price).toBeCloseTo(14.99, 2);
    expect(result.items[0].confidence).toBe(0.8);
  });

  it("parses quantity prefix", () => {
    const lines = [
      "Bar",
      "2x Beer $8.00",
    ];

    const result = parseReceiptText(lines);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("Beer");
    expect(result.items[0].price).toBeCloseTo(8, 2);
    expect(result.items[0].quantity).toBe(2);
  });

  it("skips payment metadata lines", () => {
    const lines = [
      "Restaurant",
      "Pasta $15.00",
      "VISA ****1234 $15.00",
      "Thank you!",
    ];

    const result = parseReceiptText(lines);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("Pasta");
  });

  it("uses first non-price line as restaurant name", () => {
    const lines = [
      "The Fancy Place",
      "Steak $45.00",
    ];

    const result = parseReceiptText(lines);
    expect(result.restaurantName).toBe("The Fancy Place");
  });

  it("does not count discount lines as items", () => {
    const lines = [
      "Restaurant",
      "Burger $12.99",
      "-$5.00 Coupon discount",
      "Total $7.99",
    ];

    const result = parseReceiptText(lines);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("Burger");
    expect(result.total).toBeCloseTo(7.99, 2);
  });

  it("assigns truthy IDs to parsed items", () => {
    const lines = [
      "Place",
      "Wings $10.00",
      "Nachos $8.00",
    ];

    const result = parseReceiptText(lines);

    for (const item of result.items) {
      expect(item.id).toBeTruthy();
    }
    // IDs should be unique
    const ids = result.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
