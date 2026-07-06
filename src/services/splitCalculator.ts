import type { Bill, BillItem, BillSplit, PartnerGroup } from "@/types";

// Adjust the per-person `total` values by whole cents so they sum exactly to
// the target (largest remainders absorb the leftover pennies). Keeps every
// split mode reconciled to the bill instead of leaking a cent here and there.
function reconcileTotals(splits: BillSplit[], target: number): BillSplit[] {
  if (splits.length === 0) return splits;
  const targetCents = Math.round(target * 100);
  const currentCents = splits.reduce((sum, s) => sum + Math.round(s.total * 100), 0);
  let diff = targetCents - currentCents;
  if (diff === 0) return splits;
  const step = diff > 0 ? 1 : -1;
  // Give/take cents from the largest totals first so adjustments are least noticeable.
  const order = splits
    .map((s, i) => i)
    .sort((a, b) => splits[b].total - splits[a].total);
  let idx = 0;
  while (diff !== 0 && order.length > 0) {
    const s = splits[order[idx % order.length]];
    s.total = Math.round((s.total + step * 0.01) * 100) / 100;
    diff -= step;
    idx++;
  }
  return splits;
}

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
    // Only divide among claimers who are still actual participants, so a
    // removed/stale claimer never causes a fraction of the item to vanish.
    const validClaimers = item.claimedBy.filter((id) => itemTotals[id]);
    if (validClaimers.length === 0) continue;
    const perPerson = (item.price * item.quantity) / validClaimers.length;
    for (const claimerId of validClaimers) {
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
    }
    // Always zero out birthday person regardless of others count
    itemTotals[bill.birthdayPersonId] = {
      subtotal: 0,
      items: birthdayTotal.items,
    };
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
    const n = bill.participants.length;
    const evenTax = Math.round((bill.tax / n) * 100) / 100;
    const evenTip = Math.round((bill.tipAmount / n) * 100) / 100;
    return bill.participants.map((p) => ({
      participantId: p.id,
      participantName: p.name,
      itemsSubtotal: 0,
      taxShare: evenTax,
      tipShare: evenTip,
      total: Math.round((evenTax + evenTip) * 100) / 100,
      items: [],
      venmoUsername: p.venmoUsername,
    }));
  }

  // Discounts are baked into bill.subtotal (subtotal = full item sum − discount)
  // but items keep their full prices. Scale each person's claimed subtotal by the
  // same factor so the itemized split reflects the discount instead of overcharging.
  const fullItemsSum = bill.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountFactor =
    fullItemsSum > 0 ? Math.min(1, bill.subtotal / fullItemsSum) : 1;

  const splits = bill.participants
    .map((p) => {
      const data = itemTotals[p.id] ?? { subtotal: 0, items: [] };
      const proportion = data.subtotal / totalItemsSubtotal;
      const discountedSubtotal = data.subtotal * discountFactor;
      const taxShare = Math.round(bill.tax * proportion * 100) / 100;
      const tipShare = Math.round(bill.tipAmount * proportion * 100) / 100;
      const total =
        Math.round((discountedSubtotal + taxShare + tipShare) * 100) / 100;

      return {
        participantId: p.id,
        participantName: p.name,
        itemsSubtotal: Math.round(discountedSubtotal * 100) / 100,
        taxShare,
        tipShare,
        total,
        items: data.items,
        venmoUsername: p.venmoUsername,
      };
    });

  const targetTotal =
    totalItemsSubtotal * discountFactor + bill.tax + bill.tipAmount;
  return reconcileTotals(splits, targetTotal).sort((a, b) => b.total - a.total);
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
  const totalPct = Object.values(percentages).reduce((s, v) => s + v, 0);

  const splits = bill.participants
    .map((p) => {
      // Normalize so percentages always sum to 100%
      const pct = totalPct > 0 ? (percentages[p.id] ?? 0) / totalPct : 0;
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
    });
  return reconcileTotals(splits, totalPct > 0 ? bill.total : 0).sort((a, b) => b.total - a.total);
}

// Shares split: weighted portions (e.g., 2 shares vs 1 share)
export function calculateSharesSplit(
  bill: Bill,
  sharesMap: Record<string, number>
): BillSplit[] {
  const totalShares = Object.values(sharesMap).reduce((s, v) => s + v, 0);
  if (totalShares === 0) return calculateEvenSplit(bill);

  const splits = bill.participants
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
    });
  return reconcileTotals(splits, bill.total).sort((a, b) => b.total - a.total);
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
