import { describe, it, expect } from "vitest";
import { getPaymentLink, getPaymentAppLabel } from "@/services/venmo";

describe("getPaymentLink", () => {
  it("generates correct Venmo URL", () => {
    const url = getPaymentLink("venmo", "alice123", 25.5, "Dinner split");
    expect(url).toBe(
      "https://venmo.com/?txn=charge&recipients=alice123&amount=25.50&note=Dinner%20split&audience=private"
    );
  });

  it("strips @ prefix from Venmo usernames", () => {
    const url = getPaymentLink("venmo", "@alice123", 25.5, "Dinner split");
    expect(url).toContain("recipients=alice123");
  });

  it("generates correct CashApp URL without $ prefix", () => {
    const url = getPaymentLink("cashapp", "bob", 10, "Pizza");
    expect(url).toBe("https://cash.app/$bob/10.00");
  });

  it("generates correct CashApp URL with $ prefix already present", () => {
    const url = getPaymentLink("cashapp", "$bob", 10, "Pizza");
    expect(url).toBe("https://cash.app/$bob/10.00");
  });

  it("returns null for Zelle (no web link)", () => {
    const url = getPaymentLink("zelle", "zelle@email.com", 30, "Brunch");
    expect(url).toBeNull();
  });

  it("encodes special characters in note", () => {
    const url = getPaymentLink("venmo", "user", 5, "Bob's share & tax");
    expect(url).toContain("Bob's%20share%20%26%20tax");
  });
});

describe("getPaymentAppLabel", () => {
  it("returns 'Venmo' for venmo", () => {
    expect(getPaymentAppLabel("venmo")).toBe("Venmo");
  });

  it("returns 'Cash App' for cashapp", () => {
    expect(getPaymentAppLabel("cashapp")).toBe("Cash App");
  });

  it("returns 'Zelle' for zelle", () => {
    expect(getPaymentAppLabel("zelle")).toBe("Zelle");
  });
});
