import { describe, it, expect } from "vitest";
import { parseReceiptText } from "../receiptParser";

function expectParse(lines: string[], expected: { items: number; subtotal?: number; tax?: number; tip?: number; total?: number }) {
  const r = parseReceiptText(lines);
  expect(r.items.length).toBe(expected.items);
  if (expected.subtotal !== undefined) expect(r.subtotal).toBeCloseTo(expected.subtotal, 1);
  if (expected.tax !== undefined) expect(r.tax).toBeCloseTo(expected.tax, 1);
  if (expected.tip !== undefined) expect(r.tip).toBeCloseTo(expected.tip, 1);
  if (expected.total !== undefined) expect(r.total).toBeCloseTo(expected.total, 1);
  return r;
}

describe("receiptParser - comprehensive formats", () => {
  it("standard inline (item + price same line)", () => {
    expectParse([
      "Joes Pizza", "Margherita Pizza $14.99", "Caesar Salad $9.50",
      "Garlic Bread $6.00", "Subtotal $30.49", "Tax $2.71", "Total $33.20",
    ], { items: 3, subtotal: 30.49, tax: 2.71, total: 33.20 });
  });

  it("multi-line pairs (name then price on next line)", () => {
    expectParse([
      "RESTAURANT", "Burger", "$12.00", "Fries", "$5.00", "Beer", "$8.00",
      "Subtotal", "$25.00", "Tax", "$2.22", "Total", "$27.22",
    ], { items: 3, subtotal: 25, tax: 2.22, total: 27.22 });
  });

  it("keywords then prices with gap (Talavera style)", () => {
    expectParse([
      "TALAVERA", "Burger", "$12.00", "Salad", "$10.00",
      "Subtotal", "Tax", "Tip", "Total", "VISA CREDIT",
      "$22.00", "$1.96", "$4.40", "$28.36",
    ], { items: 2, subtotal: 22, tax: 1.96, tip: 4.40, total: 28.36 });
  });

  it("two-column layout (items first, prices later)", () => {
    expectParse([
      "Ruta Oaxaca", "Brooklyn, NY 11201", "Server: Diego A", "Check #30", "Ordered:",
      "2 A-Wevos", "2 Tacos Mixtos", "Vegetable empanadas",
      "Subtotal", "Tax", "Total", "Table 10",
      "$20.60", "$32.96", "$15.45", "$69.01", "$6.12", "$75.13",
    ], { items: 3, subtotal: 69.01, tax: 6.12, total: 75.13 });
  });

  it("suggested tip lines skipped", () => {
    expectParse([
      "Restaurant", "Pasta $18.00", "Wine $12.00",
      "Subtotal $30.00", "Tax $2.67", "Tip $6.00", "Total $38.67",
      "Suggested Tip:", "18%: (Tip $5.40 Total $38.07)",
      "20%: (Tip $6.00 Total $38.67)", "25%: (Tip $7.50 Total $40.17)",
      "Tip percentages are based on the check",
    ], { items: 2, subtotal: 30, tax: 2.67, tip: 6, total: 38.67 });
  });

  it("quantity items with line totals", () => {
    const r = expectParse([
      "Bar Tab", "2x Beer $16.00", "3x Wings $27.00", "Nachos $12.00",
      "Subtotal $55.00", "Tax $4.89", "Total $59.89",
    ], { items: 3, subtotal: 55, tax: 4.89, total: 59.89 });
    const sum = r.items.reduce((s, i) => s + i.price * i.quantity, 0);
    expect(sum).toBeCloseTo(55, 1);
  });

  it("discounts detected", () => {
    expectParse([
      "Cafe", "Latte $5.50", "Muffin $4.00", "Discount -$2.00",
      "Subtotal $7.50", "Tax $0.67", "Total $8.17",
    ], { items: 2, subtotal: 7.50, tax: 0.67, total: 8.17 });
  });

  it("service charge treated as tax", () => {
    const r = expectParse([
      "Fancy Place", "Steak $45.00", "Service Charge $9.00", "Tax $4.00", "Total $58.00",
    ], { items: 1, total: 58 });
    expect(r.tax).toBeCloseTo(13, 1);
  });

  it("payment metadata skipped", () => {
    expectParse([
      "Diner", "Eggs $8.00", "Coffee $3.00", "Subtotal $11.00", "Tax $0.98", "Total $11.98",
      "VISA ****1234", "Auth Code 123456", "Transaction Type Sale", "Thank you!",
    ], { items: 2, subtotal: 11, tax: 0.98, total: 11.98 });
  });

  it("zero dollar items skipped", () => {
    expectParse([
      "Bistro", "Entree $22.00", "Bread $0.00", "Water $0.00",
      "Subtotal $22.00", "Tax $1.96", "Total $23.96",
    ], { items: 1, subtotal: 22, tax: 1.96, total: 23.96 });
  });

  it("empty receipt", () => {
    expectParse([], { items: 0 });
  });

  it("obstructed receipt (Pokemon card covering text)", () => {
    expectParse([
      "Jigglypuff", "50 HP", "Basic Pok", "weakunews",
      "Tempting Eyes Choose 1 of your", "Balloon Pokemon Length: Weight 17 b",
      "switch it with the Defending Pokemo", "Sing Flip a coin. If heads, the",
      "Defendi", "hon is now Asleep",
      "Brooklyn, NY 11201", "Server: Diego A", "Check #30", "Ordered:",
      "2 A-Wevos", "2 Tacos Mixtos", "Vegetable empanadas",
      "Subtotal", "Tax", "Total", "Table", "10", "4/7/26 6:52 PM",
      "$20.60", "$32.96", "$15.45", "$69.01", "$6.12", "$75.13",
      "Suggested Tip:", "18%: (Tip $12.42 Total $87.55)",
      "20%: (Tip $13.80 Total $88.93)", "23%: (Tip $15.87 Total $91.00)",
      "Tip percentages are based on the check", "price before taxes.",
    ], { items: 3, subtotal: 69.01, tax: 6.12, total: 75.13 });
  });
});
