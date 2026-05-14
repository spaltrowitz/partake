import { describe, it, expect } from "vitest";
import { parseReceiptText } from "../receiptParser";

describe("receiptParser - real-world receipt formats", () => {

  it("Swiss restaurant (CHF, European format)", () => {
    // From actual OCR of a Swiss receipt (Berghotel Grosse Scheidegg)
    const lines = [
      "Berghotel", "Grosse Scheidegg", "Rech. Nr. 4572", "Bar",
      "3818 Grindelwald", "Familie R.Müller", "30.07.2007/13:29:17",
      "Tisch 7/01", "2xLatte Macchiato à 4.50 CHF 9.00",
      "1xGloki", "à 5.00 CHF 5.00", "1xSchweinschnitzel à 22.00 CHF 22.00",
      "1xChässpätzli", "à 18.50 CHF 18.50", "Total : CHF", "54.50",
      "Incl. 7.6% MwSt 54.50 CHF: 3.85",
      "Entspricht in Euro 36.33 EUR", "Es bediente Sie: Ursula",
      "MwSt Nr. 430 234", "Tel.: 033 853 67 16", "Fax.: 033 853 67 19",
    ];
    const r = parseReceiptText(lines);
    // Should at least detect some items and a total
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.restaurantName).toBe("Berghotel");
  });

  it("NYC bar tab with long item names", () => {
    const lines = [
      "THE DEAD RABBIT",
      "30 Water St, New York, NY 10004",
      "Server: Mike K",
      "Check #1247",
      "Table 12",
      "Old Fashioned (Bulleit Bourbon) $18.00",
      "Manhattan (Rittenhouse Rye) $19.00",
      "Cheese Board (for sharing) $24.00",
      "Irish Coffee (Jameson) $16.00",
      "2 Draft Beer (Guinness) $20.00",
      "Subtotal $97.00",
      "Tax $8.63",
      "Total $105.63",
      "Gratuity not included",
      "Thank you for visiting!",
    ];
    const r = parseReceiptText(lines);
    expect(r.items.length).toBe(5);
    expect(r.subtotal).toBeCloseTo(97, 0);
    expect(r.tax).toBeCloseTo(8.63, 1);
    expect(r.total).toBeCloseTo(105.63, 1);
    expect(r.restaurantName).toBe("The Dead Rabbit");
  });

  it("Sushi restaurant with shared plates", () => {
    const lines = [
      "SUGARFISH by sushi nozawa",
      "Server: Yuki",
      "Check# 892",
      "Trust Me (Nozawa) $30.00",
      "Trust Me (Nozawa) $30.00",
      "Edamame $6.00",
      "Blue Crab Hand Roll $15.00",
      "Subtotal $81.00",
      "Tax $7.20",
      "Tip $16.20",
      "Total $104.40",
    ];
    const r = parseReceiptText(lines);
    expect(r.items.length).toBe(4);
    expect(r.subtotal).toBeCloseTo(81, 0);
    expect(r.tip).toBeCloseTo(16.20, 1);
    expect(r.total).toBeCloseTo(104.40, 1);
  });

  it("Pizza place with modifiers and add-ons", () => {
    const lines = [
      "JOE'S PIZZA",
      "7 Carmine St, New York",
      "1 Lg Cheese Pizza $22.00",
      "  Add Pepperoni $3.00",
      "  Add Mushrooms $2.50",
      "2 Garlic Knots $6.00",
      "1 Cannoli $5.00",
      "Subtotal $38.50",
      "Sales Tax $3.42",
      "Total $41.92",
    ];
    const r = parseReceiptText(lines);
    expect(r.items.length).toBeGreaterThanOrEqual(3);
    expect(r.subtotal).toBeCloseTo(38.50, 1);
    expect(r.tax).toBeCloseTo(3.42, 1);
    expect(r.total).toBeCloseTo(41.92, 1);
  });

  it("Brunch with auto-gratuity", () => {
    const lines = [
      "BALTHAZAR",
      "80 Spring St, New York",
      "Server: Jean-Pierre",
      "French Toast $19.00",
      "Eggs Benedict $22.00",
      "Mimosa $14.00",
      "Mimosa $14.00",
      "Coffee $5.00",
      "Subtotal $74.00",
      "Auto Gratuity (20%) $14.80",
      "Tax $6.58",
      "Total $95.38",
    ];
    const r = parseReceiptText(lines);
    expect(r.items.length).toBe(5);
    expect(r.subtotal).toBeCloseTo(74, 0);
    // Auto gratuity should be treated as tax (mandatory add-on)
    expect(r.tax).toBeCloseTo(21.38, 1); // 14.80 + 6.58
    expect(r.total).toBeCloseTo(95.38, 1);
  });

  it("Vision API two-column output (Korean BBQ)", () => {
    // Vision API sometimes reads left column then right column
    const lines = [
      "KANG HO DONG BAEKJEONG",
      "1 E 32nd St, New York",
      "Server: Min",
      "Check #445",
      "Ordered:",
      "Premium Combo A (2ppl)",
      "Kimchi Jjigae",
      "2 Soju",
      "Japchae",
      "Subtotal",
      "Tax",
      "Total",
      "$89.00",
      "$15.00",
      "$18.00",
      "$12.00",
      "$134.00",
      "$11.91",
      "$145.91",
    ];
    const r = parseReceiptText(lines);
    expect(r.items.length).toBe(4);
    expect(r.subtotal).toBeCloseTo(134, 0);
    expect(r.tax).toBeCloseTo(11.91, 1);
    expect(r.total).toBeCloseTo(145.91, 1);
  });

  it("Receipt with comp/void items", () => {
    const lines = [
      "THE SMITH",
      "956 2nd Ave, New York",
      "Grilled Salmon $28.00",
      "Caesar Salad $16.00",
      "Glass Pinot Noir $0.00",
      "Subtotal $44.00",
      "Tax $3.91",
      "Total $47.91",
    ];
    const r = parseReceiptText(lines);
    // $0 items should be skipped
    expect(r.items.length).toBe(2);
    expect(r.subtotal).toBeCloseTo(44, 0);
  });

  it("Long receipt with many items (group dinner)", () => {
    const lines = [
      "CARBONE",
      "181 Thompson St, New York",
      "Server: Marco",
      "Spicy Rigatoni Vodka $32.00",
      "Spicy Rigatoni Vodka $32.00",
      "Veal Parm $56.00",
      "Meatballs $28.00",
      "Caesar Salad (large) $24.00",
      "Garlic Bread $14.00",
      "2 Negroni $40.00",
      "3 Glass of Barolo $72.00",
      "Tiramisu $18.00",
      "Cheesecake $18.00",
      "Subtotal $334.00",
      "Tax $29.67",
      "Tip $66.80",
      "Total $430.47",
    ];
    const r = parseReceiptText(lines);
    expect(r.items.length).toBe(10);
    expect(r.subtotal).toBeCloseTo(334, 0);
    expect(r.tax).toBeCloseTo(29.67, 1);
    expect(r.tip).toBeCloseTo(66.80, 1);
    expect(r.total).toBeCloseTo(430.47, 1);
    // Check quantity items
    const negroni = r.items.find(i => i.name.includes("Negroni"));
    expect(negroni?.quantity).toBe(2);
    const barolo = r.items.find(i => i.name.includes("Barolo"));
    expect(barolo?.quantity).toBe(3);
  });

  it("recovers Golden Hof receipt when Vision reads item names and prices in separate columns", () => {
    const lines = [
      "GOLDEN HOF",
      "KOREAN BAR & GRILL",
      "Golden HOF - Korean Bar & Grill",
      "Check #112",
      "Guest Count: 5",
      "16 West 48th Street",
      "New York, NY 10036",
      "Ordered:",
      "1 HH Ruby Spritz",
      "5/13/26 5:29 PM",
      "$14.00",
      "2 HH Ssuk Negroni",
      "$28.00",
      "1 HH Coco Daiquiri",
      "$14.00",
      "2 Pint HH Other Half Session IPA",
      "$12.00",
      "3 HH Caesar Salad",
      "$48.00",
      "2 HH Brussels",
      "2 HH Golden Cheeseburger",
      "1 HH Rigatoni",
      "1 Doenjang Jjigae",
      "$32.00",
      "1 Persimmon Old Fashioned",
      "$20.00",
      "$40.00",
      "$16.00",
      "$24.00",
      "1 HOF Bibimbap",
      "$22.00",
      "Tofu",
      "$3.00",
      "1 Japchae",
      "$22.00",
      "Beef",
      "$5.00",
      "2 Mini Honey Butter Pancakes",
      "$32.00",
      "Subtotal",
      "$332.00",
      "Tax",
      "$29.45",
      "Tip",
      "$66.40",
      "Total",
      "$427.85",
    ];

    const r = parseReceiptText(lines);
    expect(r.items).toHaveLength(15);
    expect(r.items.reduce((sum, item) => sum + item.price * item.quantity, 0)).toBeCloseTo(332, 2);
    expect(r.items[0]).toMatchObject({ name: "HH Ruby Spritz", quantity: 1, price: 14 });
    expect(r.items[5]).toMatchObject({ name: "HH Brussels", quantity: 2, price: 16 });
    expect(r.items[7]).toMatchObject({ name: "HH Golden Cheeseburger", quantity: 2, price: 20 });
    expect(r.items[9]).toMatchObject({ name: "Doenjang Jjigae", quantity: 1, price: 24 });
    expect(r.tax).toBeCloseTo(29.45, 2);
    expect(r.tip).toBeCloseTo(66.4, 2);
    expect(r.total).toBeCloseTo(427.85, 2);
  });

  it("parses Golden Hof converted HEIC OCR consistently with pre-tip total", () => {
    const lines = [
      "GOLDEN HOF",
      "KOREAN BAR & GRILL,",
      "Golden HOF - Korean Bar & Grill",
      "16 West 48th Street",
      "New York, NY 10036",
      "Server: Tina H",
      "Check #112",
      "Table 7C",
      "Guest Count: 5",
      "Ordered:",
      "5/13/26 5:29 PM",
      "1 Japchae",
      "$22.00",
      "Beef",
      "$5.00",
      "1 Doenjang Jjigae",
      "$24.00",
      "1 HH Ruby Spritz",
      "2 HH Ssuk Negroni",
      "1 HH Coco Daiquiri",
      "$14.00",
      "$28.00",
      "$14.00",
      "2 Pint HH Other Half Session IPA $12.00",
      "3 HH Caesar Salad",
      "$48.00",
      "2 HH Brussels",
      "$32.00",
      "1 Persimmon Old Fashioned",
      "$20.00",
      "2 HH Golden Cheeseburger",
      "$40.00",
      "1 HH Rigatoni",
      "$16.00",
      "1 HOF Bibimbap",
      "$22.00",
      "Tofu",
      "$3.00",
      "2 Mini Honey Butter Pancakes",
      "$32.00",
      "Subtotal",
      "$332.00",
      "Tax",
      "$29.45",
      "Total",
      "$361.45",
    ];

    const r = parseReceiptText(lines);
    expect(r.items).toHaveLength(15);
    expect(r.items.reduce((sum, item) => sum + item.price * item.quantity, 0)).toBeCloseTo(332, 2);
    expect(r.tip).toBeUndefined();
    expect(r.total).toBeCloseTo(361.45, 2);
  });
});
