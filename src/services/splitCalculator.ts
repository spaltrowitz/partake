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

// Even split: everyone pays the same, with remainder distributed
export function calculateEvenSplit(bill: Bill): BillSplit[] {
  const n = bill.participants.length;
  const basePerPerson = Math.floor((bill.total / n) * 100) / 100;
  const totalAssigned = Math.round(basePerPerson * n * 100) / 100;
  const remainder = Math.round((bill.total - totalAssigned) * 100) / 100;
  const pennies = Math.round(remainder * 100);

  return bill.participants.map((p, i) => {
    const extra = i < pennies ? 0.01 : 0;
    const total = Math.round((basePerPerson + extra) * 100) / 100;
    return {
      participantId: p.id,
      participantName: p.name,
      itemsSubtotal: Math.round((bill.subtotal / n) * 100) / 100,
      taxShare: Math.round((bill.tax / n) * 100) / 100,
      tipShare: Math.round((bill.tipAmount / n) * 100) / 100,
      total,
      items: [],
      venmoUsername: p.venmoUsername,
    };
  });
}

// Percentage split: each person pays a custom percentage
export function calculatePercentageSplit(
  bill: Bill,
  percentages: Record<string, number>
): BillSplit[] {
  return bill.participants
    .map((p) => {
      const pct = (percentages[p.id] ?? 0) / 100;
      return {
        participantId: p.id,
        participantName: p.name,
        itemsSubtotal: Math.round(bill.subtotal * pct * 100) / 100,
        taxShare: Math.round(bill.tax * pct * 100) / 100,
        tipShare: Math.round(bill.tipAmount * pct * 100) / 100,
        total: Math.round(bill.total * pct * 100) / 100,
        items: [],
        venmoUsername: p.venmoUsername,
      };
    })
    .sort((a, b) => b.total - a.total);
}

// Shares split: weighted portions (e.g., 2 shares vs 1 share)
export function calculateSharesSplit(
  bill: Bill,
  sharesMap: Record<string, number>
): BillSplit[] {
  const totalShares = Object.values(sharesMap).reduce((s, v) => s + v, 0);
  if (totalShares === 0) return calculateEvenSplit(bill);

  return bill.participants
    .map((p) => {
      const proportion = (sharesMap[p.id] ?? 0) / totalShares;
      return {
        participantId: p.id,
        participantName: p.name,
        itemsSubtotal: Math.round(bill.subtotal * proportion * 100) / 100,
        taxShare: Math.round(bill.tax * proportion * 100) / 100,
        tipShare: Math.round(bill.tipAmount * proportion * 100) / 100,
        total: Math.round(bill.total * proportion * 100) / 100,
        items: [],
        venmoUsername: p.venmoUsername,
      };
    })
    .sort((a, b) => b.total - a.total);
}

// Exact amounts: enter each person's total directly
export function calculateExactSplit(
  bill: Bill,
  amounts: Record<string, number>
): BillSplit[] {
  return bill.participants
    .map((p) => {
      const total = Math.round((amounts[p.id] ?? 0) * 100) / 100;
      return {
        participantId: p.id,
        participantName: p.name,
        itemsSubtotal: total,
        taxShare: 0,
        tipShare: 0,
        total,
        items: [],
        venmoUsername: p.venmoUsername,
      };
    })
    .sort((a, b) => b.total - a.total);
}
