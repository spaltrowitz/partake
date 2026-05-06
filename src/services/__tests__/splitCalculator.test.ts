import { describe, it, expect } from "vitest";
import {
  calculateSplits,
  calculateEvenSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  calculateExactSplit,
} from "@/services/splitCalculator";
import type { Bill, BillItem } from "@/types";

function makeBill(overrides?: Partial<Bill>): Bill {
  return {
    id: "test-bill",
    name: "Test",
    items: [],
    subtotal: 100,
    tax: 8.88,
    tipAmount: 20,
    total: 128.88,
    participants: [
      { id: "p1", name: "Alice", venmoUsername: "alice", isAppUser: false },
      { id: "p2", name: "Bob", venmoUsername: "bob", isAppUser: false },
    ],
    createdBy: "local",
    createdAt: new Date(),
    status: "splitting" as const,
    ...overrides,
  };
}

function makeItem(overrides?: Partial<BillItem>): BillItem {
  return {
    id: "item-1",
    name: "Burger",
    price: 15,
    quantity: 1,
    claimedBy: [],
    ...overrides,
  };
}

// --------------- calculateSplits (itemized) ---------------

describe("calculateSplits", () => {
  it("assigns correct totals when each person claims different items", () => {
    const bill = makeBill({
      subtotal: 30,
      tax: 3,
      tipAmount: 6,
      total: 39,
      items: [
        makeItem({ id: "i1", name: "Burger", price: 20, claimedBy: ["p1"] }),
        makeItem({ id: "i2", name: "Salad", price: 10, claimedBy: ["p2"] }),
      ],
    });

    const splits = calculateSplits(bill);
    const alice = splits.find((s) => s.participantId === "p1")!;
    const bob = splits.find((s) => s.participantId === "p2")!;

    // Alice: 20/30 = 2/3 proportion
    expect(alice.itemsSubtotal).toBeCloseTo(20, 2);
    expect(alice.taxShare).toBeCloseTo(2, 2);
    expect(alice.tipShare).toBeCloseTo(4, 2);
    expect(alice.total).toBeCloseTo(26, 2);

    // Bob: 10/30 = 1/3 proportion
    expect(bob.itemsSubtotal).toBeCloseTo(10, 2);
    expect(bob.taxShare).toBeCloseTo(1, 2);
    expect(bob.tipShare).toBeCloseTo(2, 2);
    expect(bob.total).toBeCloseTo(13, 2);
  });

  it("splits shared item evenly between claimants", () => {
    const bill = makeBill({
      subtotal: 20,
      tax: 2,
      tipAmount: 4,
      total: 26,
      items: [
        makeItem({ id: "i1", name: "Pizza", price: 20, claimedBy: ["p1", "p2"] }),
      ],
    });

    const splits = calculateSplits(bill);
    const alice = splits.find((s) => s.participantId === "p1")!;
    const bob = splits.find((s) => s.participantId === "p2")!;

    expect(alice.itemsSubtotal).toBeCloseTo(10, 2);
    expect(bob.itemsSubtotal).toBeCloseTo(10, 2);
    expect(alice.total).toBeCloseTo(13, 2);
    expect(bob.total).toBeCloseTo(13, 2);
  });

  it("excludes unclaimed items from totals", () => {
    const bill = makeBill({
      subtotal: 30,
      tax: 3,
      tipAmount: 6,
      total: 39,
      items: [
        makeItem({ id: "i1", name: "Burger", price: 20, claimedBy: ["p1"] }),
        makeItem({ id: "i2", name: "Mystery Dish", price: 10, claimedBy: [] }),
      ],
    });

    const splits = calculateSplits(bill);
    const alice = splits.find((s) => s.participantId === "p1")!;
    const bob = splits.find((s) => s.participantId === "p2")!;

    expect(alice.itemsSubtotal).toBeCloseTo(20, 2);
    // Bob claimed nothing → pays $0
    expect(bob.total).toBeCloseTo(0, 2);
  });

  it("birthday person pays $0, their items split among others", () => {
    const bill = makeBill({
      subtotal: 30,
      tax: 3,
      tipAmount: 6,
      total: 39,
      birthdayPersonId: "p1",
      participants: [
        { id: "p1", name: "Alice", venmoUsername: "alice", isAppUser: false },
        { id: "p2", name: "Bob", venmoUsername: "bob", isAppUser: false },
        { id: "p3", name: "Carol", venmoUsername: "carol", isAppUser: false },
      ],
      items: [
        makeItem({ id: "i1", name: "Steak", price: 20, claimedBy: ["p1"] }),
        makeItem({ id: "i2", name: "Salad", price: 5, claimedBy: ["p2"] }),
        makeItem({ id: "i3", name: "Soup", price: 5, claimedBy: ["p3"] }),
      ],
    });

    const splits = calculateSplits(bill);
    const alice = splits.find((s) => s.participantId === "p1")!;
    const bob = splits.find((s) => s.participantId === "p2")!;
    const carol = splits.find((s) => s.participantId === "p3")!;

    expect(alice.itemsSubtotal).toBeCloseTo(0, 2);
    expect(alice.total).toBeCloseTo(0, 2);

    // Bob & Carol each absorb half of Alice's $20 → $15 each
    expect(bob.itemsSubtotal).toBeCloseTo(15, 2);
    expect(carol.itemsSubtotal).toBeCloseTo(15, 2);
  });

  it("one person claims everything → pays 100%", () => {
    const bill = makeBill({
      subtotal: 50,
      tax: 5,
      tipAmount: 10,
      total: 65,
      items: [
        makeItem({ id: "i1", name: "Feast", price: 50, claimedBy: ["p1"] }),
      ],
    });

    const splits = calculateSplits(bill);
    const alice = splits.find((s) => s.participantId === "p1")!;
    const bob = splits.find((s) => s.participantId === "p2")!;

    expect(alice.total).toBeCloseTo(65, 2);
    expect(bob.total).toBeCloseTo(0, 2);
  });
});

// --------------- calculateEvenSplit ---------------

describe("calculateEvenSplit", () => {
  it("splits $100 evenly among 3 people with penny distribution", () => {
    const bill = makeBill({
      subtotal: 80,
      tax: 7,
      tipAmount: 13,
      total: 100,
      participants: [
        { id: "p1", name: "Alice", isAppUser: false },
        { id: "p2", name: "Bob", isAppUser: false },
        { id: "p3", name: "Carol", isAppUser: false },
      ],
    });

    const splits = calculateEvenSplit(bill);
    // $100 / 3 = $33.33 each, 1 penny remainder → first person gets it
    const totals = splits.map((s) => s.total);
    expect(totals).toContain(33.34);
    expect(totals.filter((t) => t === 33.33).length).toBe(2);
    // Sum should equal total
    const sum = totals.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100, 2);
  });

  it("splits exact even amount with no remainder", () => {
    const bill = makeBill({
      subtotal: 80,
      tax: 8,
      tipAmount: 12,
      total: 100,
    });

    const splits = calculateEvenSplit(bill);
    expect(splits[0].total).toBeCloseTo(50, 2);
    expect(splits[1].total).toBeCloseTo(50, 2);
  });
});

// --------------- calculatePercentageSplit ---------------

describe("calculatePercentageSplit", () => {
  it("applies 60/40 split correctly", () => {
    const bill = makeBill({ total: 100, subtotal: 80, tax: 8, tipAmount: 12 });
    const splits = calculatePercentageSplit(bill, { p1: 60, p2: 40 });

    const alice = splits.find((s) => s.participantId === "p1")!;
    const bob = splits.find((s) => s.participantId === "p2")!;

    expect(alice.total).toBeCloseTo(60, 2);
    expect(bob.total).toBeCloseTo(40, 2);
    expect(alice.itemsSubtotal).toBeCloseTo(48, 2); // 80 * 0.6
    expect(alice.taxShare).toBeCloseTo(4.8, 2);
    expect(alice.tipShare).toBeCloseTo(7.2, 2);
  });

  it("handles percentages not summing to 100 proportionally", () => {
    const bill = makeBill({ total: 100, subtotal: 80, tax: 8, tipAmount: 12 });
    // 30 + 20 = 50, each gets their fraction of 100
    const splits = calculatePercentageSplit(bill, { p1: 30, p2: 20 });

    const alice = splits.find((s) => s.participantId === "p1")!;
    const bob = splits.find((s) => s.participantId === "p2")!;

    // 30% of 100 = 30, 20% of 100 = 20 (the function uses raw percentage / 100)
    expect(alice.total).toBeCloseTo(30, 2);
    expect(bob.total).toBeCloseTo(20, 2);
  });
});

// --------------- calculateSharesSplit ---------------

describe("calculateSharesSplit", () => {
  it("splits 2:1 shares as 2/3 and 1/3", () => {
    const bill = makeBill({ total: 90, subtotal: 70, tax: 7, tipAmount: 13 });
    const splits = calculateSharesSplit(bill, { p1: 2, p2: 1 });

    const alice = splits.find((s) => s.participantId === "p1")!;
    const bob = splits.find((s) => s.participantId === "p2")!;

    expect(alice.total).toBeCloseTo(60, 2);
    expect(bob.total).toBeCloseTo(30, 2);
  });

  it("falls back to even split when all shares are zero", () => {
    const bill = makeBill({ total: 100, subtotal: 80, tax: 8, tipAmount: 12 });
    const splits = calculateSharesSplit(bill, { p1: 0, p2: 0 });

    expect(splits[0].total).toBeCloseTo(50, 2);
    expect(splits[1].total).toBeCloseTo(50, 2);
  });
});

// --------------- calculateExactSplit ---------------

describe("calculateExactSplit", () => {
  it("returns custom amounts with $0 tax and tip shares", () => {
    const bill = makeBill();
    const splits = calculateExactSplit(bill, { p1: 75.5, p2: 53.38 });

    const alice = splits.find((s) => s.participantId === "p1")!;
    const bob = splits.find((s) => s.participantId === "p2")!;

    expect(alice.total).toBeCloseTo(75.5, 2);
    expect(alice.taxShare).toBe(0);
    expect(alice.tipShare).toBe(0);
    expect(alice.itemsSubtotal).toBeCloseTo(75.5, 2);

    expect(bob.total).toBeCloseTo(53.38, 2);
    expect(bob.taxShare).toBe(0);
    expect(bob.tipShare).toBe(0);
  });
});
