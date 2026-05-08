"use client";

import { useState, useCallback, useEffect } from "react";
import type { Bill, BillSplit, SplitMethod } from "@/types";
import { calculateSplits, calculateEvenSplit, calculatePercentageSplit, calculateSharesSplit, calculateExactSplit } from "@/services/splitCalculator";
import { requestPayment, copyToClipboard } from "@/services/venmo";
import { getUserProfile } from "@/services/userProfile";
import { PrimaryButton } from "./UI";
import { SplitMethodSelector } from "./SplitMethodSelector";
import { ItemizedView, ItemizedParticipantBar } from "./ItemizedView";
import { EvenSplitView } from "./EvenSplitView";
import { PercentageSplitView } from "./PercentageSplitView";
import { SharesSplitView } from "./SharesSplitView";
import { ExactSplitView } from "./ExactSplitView";
import { TipSelector } from "./TipSelector";
import { Settlement } from "./Settlement";
import { PartnerGroupSelector } from "./PartnerPairSelector";
import { FeedbackWidget } from "./FeedbackWidget";

export function BillSplitter({ bill: initialBill, onBack, onEditReceipt, onHome }: { bill: Bill; onBack?: () => void; onEditReceipt?: () => void; onHome?: () => void }) {
  const [bill, setBill] = useState(initialBill);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("itemized");
  const [selectedParticipant, setSelectedParticipant] = useState<string>(
    bill.participants[0]?.id ?? ""
  );
  const [showSettlement, setShowSettlement] = useState(false);
  const [settledIds, setSettledIds] = useState<Set<string>>(new Set());
  const [claimLockError, setClaimLockError] = useState<string | null>(null);
  const [customTipMode, setCustomTipMode] = useState(false);
  const [percentages, setPercentages] = useState<Record<string, number>>(() => {
    const even = 100 / bill.participants.length;
    return Object.fromEntries(bill.participants.map((p) => [p.id, Math.round(even * 100) / 100]));
  });
  const [shares, setShares] = useState<Record<string, number>>(() =>
    Object.fromEntries(bill.participants.map((p) => [p.id, 1]))
  );
  const [exactAmounts, setExactAmounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(bill.participants.map((p) => [p.id, 0]))
  );
  const [payingGroups, setPayingGroups] = useState<{ payerId: string; memberIds: string[] }[]>([]);
  const claimsLocked = bill.status === "settled";

  // Sync bill when participants change (e.g., user goes back and adds someone)
  useEffect(() => {
    setBill(prev => {
      if (prev.participants.length !== initialBill.participants.length ||
          prev.participants.some((p, i) => p.id !== initialBill.participants[i]?.id)) {
        return { ...prev, participants: initialBill.participants };
      }
      return prev;
    });
    // Update percentage/shares/exact for new participants
    setPercentages(prev => {
      const updated = { ...prev };
      const even = 100 / initialBill.participants.length;
      for (const p of initialBill.participants) {
        if (!(p.id in updated)) updated[p.id] = Math.round(even * 100) / 100;
      }
      return updated;
    });
    setShares(prev => {
      const updated = { ...prev };
      for (const p of initialBill.participants) {
        if (!(p.id in updated)) updated[p.id] = 1;
      }
      return updated;
    });
    setExactAmounts(prev => {
      const updated = { ...prev };
      for (const p of initialBill.participants) {
        if (!(p.id in updated)) updated[p.id] = 0;
      }
      return updated;
    });
  }, [initialBill]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist bill state so it survives Venmo redirect + sync to Firestore
  useEffect(() => {
    try { localStorage.setItem("partake_active_session", JSON.stringify({ bill })); } catch {}
    // Sync claims to Firestore for shared links
    import("@/services/firestore").then(({ saveBill }) => {
      saveBill(bill).catch(() => {});
    }).catch(() => {});
  }, [bill]);

  const effectiveBill = (() => {
    if (payingGroups.length === 0) return bill;

    let updatedItems = [...bill.items];
    const excludedIds = new Set<string>();

    for (const group of payingGroups) {
      for (const memberId of group.memberIds) {
        excludedIds.add(memberId);
        updatedItems = updatedItems.map((item) => {
          if (item.claimedBy.includes(memberId)) {
            const without = item.claimedBy.filter((id) => id !== memberId);
            if (!without.includes(group.payerId)) {
              without.push(group.payerId);
            }
            return { ...item, claimedBy: without };
          }
          return item;
        });
      }
    }

    const updatedParticipants = bill.participants.filter(
      (p) => !excludedIds.has(p.id)
    );
    return { ...bill, items: updatedItems, participants: updatedParticipants };
  })();

  const splits = (() => {
    // Always use effectiveBill — it has partner removed when paired
    const b = effectiveBill;
    switch (splitMethod) {
      case "even":
        return calculateEvenSplit(b);
      case "percentage":
        return calculatePercentageSplit(b, percentages);
      case "shares":
        return calculateSharesSplit(b, shares);
      case "exact":
        return calculateExactSplit(b, exactAmounts);
      default:
        return calculateSplits(b);
    }
  })();

  const toggleClaim = useCallback(
    (itemId: string) => {
      if (claimsLocked) return;
      setBill((prev) => {
        const items = prev.items.map((item) => {
          if (item.id !== itemId) return item;
          const claimed = item.claimedBy.includes(selectedParticipant);
          return {
            ...item,
            claimedBy: claimed
              ? item.claimedBy.filter((id) => id !== selectedParticipant)
              : [...item.claimedBy, selectedParticipant],
          };
        });
        return { ...prev, items };
      });
    },
    [claimsLocked, selectedParticipant]
  );

  async function lockClaims(): Promise<boolean> {
    if (bill.status === "settled") return true;
    const lockedBill = { ...bill, status: "settled" as const };
    setBill(lockedBill);
    try {
      const { saveBill } = await import("@/services/firestore");
      await saveBill(lockedBill);
      return true;
    } catch (error) {
      console.error("Failed to persist claim lock state", error);
      return false;
    }
  }

  function updateTip(percent: number) {
    setBill((prev) => {
      const tipAmount = Math.round(prev.subtotal * percent) / 100;
      return {
        ...prev,
        tipPercent: percent,
        tipAmount,
        total: Math.round((prev.subtotal + prev.tax + tipAmount) * 100) / 100,
      };
    });
  }

  async function handlePayment(split: BillSplit) {
    const locked = await lockClaims();
    if (!locked) {
      setClaimLockError("Couldn't lock claims. Check your connection and try again.");
      return;
    }
    setClaimLockError(null);
    const note = `🧾 ${bill.name || "Bill split"} via Partake`;
    // Save state before navigating away to Venmo
    try { localStorage.setItem("partake_active_session", JSON.stringify({ bill })); } catch {}
    if (split.venmoUsername) {
      requestPayment("venmo", split.venmoUsername, split.total, note);
    } else {
      const participant = bill.participants.find((p) => p.id === split.participantId);
      if (participant?.cashAppUsername) {
        requestPayment("cashapp", participant.cashAppUsername, split.total, note);
      } else {
        return;
      }
    }
    setSettledIds((prev) => new Set([...prev, split.participantId]));
  }

  if (showSettlement) {
    return (
      <Settlement
        bill={bill}
        splits={splits}
        settledIds={settledIds}
        payingGroups={payingGroups}
        myName={getUserProfile()?.name}
        onPayment={handlePayment}
        onCopy={async (split) => {
          const locked = await lockClaims();
          if (!locked) {
            setClaimLockError("Couldn't lock claims. Check your connection and try again.");
            return;
          }
          setClaimLockError(null);
          copyToClipboard(split.total.toFixed(2));
          setSettledIds((prev) => new Set([...prev, split.participantId]));
        }}
        onDone={() => setShowSettlement(false)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {onBack && (
        <div className="p-3 bg-[#FFFFFF] flex justify-between">
          <button onClick={onBack} className="text-sm text-[#9C8E80]">
            ← Back to people
          </button>
          <div className="flex gap-3">
            {onEditReceipt && (
              <button onClick={onEditReceipt} className="text-sm text-[#E8613C]">
                Edit items
              </button>
            )}
            {onHome && (
              <button
                onClick={() => {
                  if (confirm("Exit this bill? You can reopen it from Recent Bills.")) {
                    onHome();
                  }
                }}
                className="text-sm text-[#9C8E80]"
              >
                ✕ Done
              </button>
            )}
          </div>
        </div>
      )}
      <SplitMethodSelector splitMethod={splitMethod} onSelect={setSplitMethod} />

      {splitMethod === "itemized" && (
        <ItemizedParticipantBar
          participants={bill.participants}
          selectedParticipant={selectedParticipant}
          onSelectParticipant={setSelectedParticipant}
        />
      )}

      <PartnerGroupSelector
        participants={bill.participants}
        payingGroups={payingGroups}
        onSetPayingGroups={setPayingGroups}
      />

      <div className="flex-1 overflow-y-auto p-4">
        {splitMethod === "itemized" && (
          <ItemizedView
            items={bill.items}
            participants={bill.participants}
            selectedParticipant={selectedParticipant}
            onToggleClaim={toggleClaim}
            claimsLocked={claimsLocked}
            onSplitItem={(itemId, count) => {
              if (claimsLocked) return;
              setBill((prev) => {
                const item = prev.items.find((i) => i.id === itemId);
                if (!item || item.quantity <= 1) return prev;
                const totalPrice = item.price * item.quantity;
                const perItemPrice = Math.round((totalPrice / count) * 100) / 100;
                const newItems = Array.from({ length: count }, (_, idx) => ({
                  id: idx === 0 ? item.id : crypto.randomUUID(),
                  name: item.name,
                  price: perItemPrice,
                  claimedBy: idx === 0 ? item.claimedBy : [],
                  quantity: 1,
                }));
                const index = prev.items.findIndex((i) => i.id === itemId);
                const updated = [...prev.items];
                updated.splice(index, 1, ...newItems);
                return { ...prev, items: updated };
              });
            }}
          />
        )}
        {splitMethod === "even" && (
          <EvenSplitView total={bill.total} participantCount={effectiveBill.participants.length} />
        )}
        {splitMethod === "percentage" && (
          <PercentageSplitView
            participants={bill.participants}
            percentages={percentages}
            total={bill.total}
            onChangePercentage={(id, value) => setPercentages((prev) => ({ ...prev, [id]: value }))}
          />
        )}
        {splitMethod === "shares" && (
          <SharesSplitView
            participants={bill.participants}
            shares={shares}
            total={bill.total}
            onChangeShares={(id, value) => setShares((prev) => ({ ...prev, [id]: value }))}
          />
        )}
        {splitMethod === "exact" && (
          <ExactSplitView
            participants={bill.participants}
            exactAmounts={exactAmounts}
            total={bill.total}
            onChangeAmount={(id, value) => setExactAmounts((prev) => ({ ...prev, [id]: value }))}
          />
        )}

        {bill.tipAmount > 0 && bill.tipPercent === undefined ? (
          // Tip was pre-filled from receipt — show read-only
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#9C8E80]">Tip (from receipt)</span>
              <span className="font-semibold">${bill.tipAmount.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <TipSelector
            tipPercent={bill.tipPercent}
            tipAmount={bill.tipAmount}
            customTipMode={customTipMode}
            onSelectTip={(pct) => { updateTip(pct); setCustomTipMode(false); }}
            onEnableCustom={() => setCustomTipMode(true)}
          />
        )}
      </div>

      <div className="px-4 pt-4 pb-safe border-t border-[#F5EDE3] bg-[#FBF8F4]">
        <div className="flex justify-between items-center mb-3">
          <span className="font-semibold">Total</span>
          <span className="text-xl font-bold">${bill.total.toFixed(2)}</span>
        </div>
        {claimsLocked && (
          <p className="text-xs text-[#9C8E80] mb-2">
            Claims are locked because payment requests were already sent.
          </p>
        )}
        {claimLockError && (
          <p className="text-xs text-[#E8613C] mb-2">{claimLockError}</p>
        )}
        <PrimaryButton onClick={() => setShowSettlement(true)}>
          See the split
        </PrimaryButton>
      </div>
    </div>
  );
}
