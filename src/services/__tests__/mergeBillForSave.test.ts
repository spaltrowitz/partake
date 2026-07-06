import { describe, it, expect } from "vitest";
import { mergeBillForSave } from "../firestore";
import type { Bill, BillItem, Participant } from "@/types";

function participant(id: string): Participant {
  return { id, name: id, isAppUser: false };
}

function item(id: string, claimedBy: string[]): BillItem {
  return { id, name: id, price: 10, quantity: 1, claimedBy };
}

function bill(overrides: Partial<Bill>): Bill {
  return {
    id: "bill1",
    name: "Dinner",
    items: [],
    subtotal: 0,
    tax: 0,
    tipAmount: 0,
    total: 0,
    participants: [],
    createdBy: "owner",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    status: "splitting",
    ...overrides,
  };
}

describe("mergeBillForSave", () => {
  it("preserves a guest's concurrent claim on a participant the owner still has", () => {
    const p = [participant("owner"), participant("guest")];
    const owner = bill({ participants: p, items: [item("i1", ["owner"])] });
    const cloud = bill({ participants: p, items: [item("i1", ["owner", "guest"])] });

    const merged = mergeBillForSave(owner, cloud);

    expect(merged.items[0].claimedBy.sort()).toEqual(["guest", "owner"]);
  });

  it("does not resurrect claims from a participant the owner removed", () => {
    // Owner dropped "guest" from participants and their claim; cloud is stale.
    const owner = bill({ participants: [participant("owner")], items: [item("i1", ["owner"])] });
    const cloud = bill({
      participants: [participant("owner"), participant("guest")],
      items: [item("i1", ["owner", "guest"])],
    });

    const merged = mergeBillForSave(owner, cloud);

    expect(merged.items[0].claimedBy).toEqual(["owner"]);
  });

  it("keeps the owner authoritative for bill structure (tax, tip, total)", () => {
    const owner = bill({ tax: 5, tipAmount: 8, total: 100, name: "Updated" });
    const cloud = bill({ tax: 1, tipAmount: 1, total: 50, name: "Stale" });

    const merged = mergeBillForSave(owner, cloud);

    expect(merged.tax).toBe(5);
    expect(merged.tipAmount).toBe(8);
    expect(merged.total).toBe(100);
    expect(merged.name).toBe("Updated");
  });

  it("unions sharedWithUserIds from both copies", () => {
    const owner = bill({ sharedWithUserIds: ["a"] });
    const cloud = bill({ sharedWithUserIds: ["b", "a"] });

    const merged = mergeBillForSave(owner, cloud);

    expect(merged.sharedWithUserIds!.sort()).toEqual(["a", "b"]);
  });

  it("keeps the cloud paying groups when they have more members than the owner's", () => {
    const owner = bill({ payingGroups: [{ payerId: "owner", memberIds: ["owner"] }] });
    const cloud = bill({ payingGroups: [{ payerId: "owner", memberIds: ["owner", "guest"] }] });

    const merged = mergeBillForSave(owner, cloud);

    expect(merged.payingGroups).toEqual(cloud.payingGroups);
  });

  it("keeps the owner paying groups when they are at least as complete", () => {
    const owner = bill({ payingGroups: [{ payerId: "owner", memberIds: ["owner", "guest"] }] });
    const cloud = bill({ payingGroups: [{ payerId: "owner", memberIds: ["owner"] }] });

    const merged = mergeBillForSave(owner, cloud);

    expect(merged.payingGroups).toEqual(owner.payingGroups);
  });
});
