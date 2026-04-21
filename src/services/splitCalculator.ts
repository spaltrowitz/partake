import type { Bill, BillItem, BillSplit, PartnerGroup } from "@/types";

export function calculateSplits(
  bill: Bill,
  partnerGroup?: PartnerGroup
): BillSplit[] {
  const itemTotals: Record<string, { subtotal: number; items: BillItem[] }> =
    {};

  // Initialize all participants
  for (const p of bill.participants) {
    itemTotals[p.id] = { subtotal: 0, items: [] };
  }

  // Calculate per-person item subtotals
  for (const item of bill.items) {
    if (item.claimedBy.length === 0) continue;
    const perPerson = (item.price * item.quantity) / item.claimedBy.length;
    for (const claimerId of item.claimedBy) {
      if (!itemTotals[claimerId]) continue;
      itemTotals[claimerId].subtotal += perPerson;
      itemTotals[claimerId].items.push(item);
    }
  }

  // Birthday mode: redistribute birthday person's total
  if (bill.birthdayPersonId && itemTotals[bill.birthdayPersonId]) {
    const birthdayTotal = itemTotals[bill.birthdayPersonId];
    const others = bill.participants.filter(
      (p) => p.id !== bill.birthdayPersonId
    );
    if (others.length > 0) {
      const perPerson = birthdayTotal.subtotal / others.length;
      for (const other of others) {
        itemTotals[other.id].subtotal += perPerson;
      }
      itemTotals[bill.birthdayPersonId] = {
        subtotal: 0,
        items: birthdayTotal.items,
      };
    }
  }

  // Partner groups: roll up to payer
  if (partnerGroup) {
    const nonPayers = partnerGroup.memberIds.filter(
      (id) => id !== partnerGroup.payerId
    );
    for (const memberId of nonPayers) {
      if (itemTotals[memberId]) {
        const payerData = itemTotals[partnerGroup.payerId] ?? {
          subtotal: 0,
          items: [],
        };
        payerData.subtotal += itemTotals[memberId].subtotal;
        payerData.items.push(...itemTotals[memberId].items);
        itemTotals[partnerGroup.payerId] = payerData;
        itemTotals[memberId] = { subtotal: 0, items: itemTotals[memberId].items };
      }
    }
  }

  // Proportional tax & tip
  const totalItemsSubtotal = Object.values(itemTotals).reduce(
    (sum, d) => sum + d.subtotal,
    0
  );

  if (totalItemsSubtotal === 0) {
    return bill.participants.map((p) => ({
      participantId: p.id,
      participantName: p.name,
      itemsSubtotal: 0,
      taxShare: 0,
      tipShare: 0,
      total: 0,
      items: [],
      venmoUsername: p.venmoUsername,
    }));
  }

  return bill.participants
    .map((p) => {
      const data = itemTotals[p.id] ?? { subtotal: 0, items: [] };
      const proportion = data.subtotal / totalItemsSubtotal;
      const taxShare = Math.round(bill.tax * proportion * 100) / 100;
      const tipShare = Math.round(bill.tipAmount * proportion * 100) / 100;
      const total =
        Math.round((data.subtotal + taxShare + tipShare) * 100) / 100;

      return {
        participantId: p.id,
        participantName: p.name,
        itemsSubtotal: Math.round(data.subtotal * 100) / 100,
        taxShare,
        tipShare,
        total,
        items: data.items,
        venmoUsername: p.venmoUsername,
      };
    })
    .sort((a, b) => b.total - a.total);
}
