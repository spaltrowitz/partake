"use client";

import { useState, useCallback } from "react";
import type { Bill, BillSplit, SplitMethod } from "@/types";
import { calculateSplits, calculateEvenSplit, calculatePercentageSplit, calculateSharesSplit, calculateExactSplit } from "@/services/splitCalculator";
import { requestPayment, copyToClipboard } from "@/services/venmo";
import { PrimaryButton } from "./UI";
import { SplitMethodSelector } from "./SplitMethodSelector";
import { ItemizedView, ItemizedParticipantBar } from "./ItemizedView";
import { EvenSplitView } from "./EvenSplitView";
import { PercentageSplitView } from "./PercentageSplitView";
import { SharesSplitView } from "./SharesSplitView";
import { ExactSplitView } from "./ExactSplitView";
import { TipSelector } from "./TipSelector";
import { Settlement } from "./Settlement";
import { PartnerPairSelector } from "./PartnerPairSelector";

export function BillSplitter({ bill: initialBill, onBack }: { bill: Bill; onBack?: () => void }) {
  const [bill, setBill] = useState(initialBill);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("itemized");
  const [selectedParticipant, setSelectedParticipant] = useState<string>(
    bill.participants[0]?.id ?? ""
  );
  const [showSettlement, setShowSettlement] = useState(false);
  const [settledIds, setSettledIds] = useState<Set<string>>(new Set());
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
  const [partnerPair, setPartnerPair] = useState<{ payerId: string; partnerId: string } | null>(null);

  const effectiveBill = (() => {
    if (!partnerPair) return bill;
    const updatedItems = bill.items.map((item) => {
      if (item.claimedBy.includes(partnerPair.partnerId)) {
        const withoutPartner = item.claimedBy.filter((id) => id !== partnerPair.partnerId);
        if (!withoutPartner.includes(partnerPair.payerId)) {
          withoutPartner.push(partnerPair.payerId);
        }
        return { ...item, claimedBy: withoutPartner };
      }
      return item;
    });
    return { ...bill, items: updatedItems };
  })();

  const splits = (() => {
    const b = splitMethod === "itemized" ? effectiveBill : bill;
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
    [selectedParticipant]
  );

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

  function handlePayment(split: BillSplit) {
    const note = `Partake: ${bill.name || "Bill split"}`;
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
        onPayment={handlePayment}
        onCopy={(split) => {
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
        <div className="p-3 bg-[#FFFFFF]">
          <button onClick={onBack} className="text-sm text-[#9C8E80]">
            ← Back to people
          </button>
        </div>
      )}
      <SplitMethodSelector splitMethod={splitMethod} onSelect={setSplitMethod} />

      <PartnerPairSelector
        participants={bill.participants}
        partnerPair={partnerPair}
        onSetPartnerPair={setPartnerPair}
      />

      {splitMethod === "itemized" && (
        <ItemizedParticipantBar
          participants={bill.participants}
          selectedParticipant={selectedParticipant}
          onSelectParticipant={setSelectedParticipant}
        />
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {splitMethod === "itemized" && (
          <ItemizedView
            items={bill.items}
            participants={bill.participants}
            selectedParticipant={selectedParticipant}
            onToggleClaim={toggleClaim}
          />
        )}
        {splitMethod === "even" && (
          <EvenSplitView total={bill.total} participantCount={bill.participants.length} />
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

        <TipSelector
          tipPercent={bill.tipPercent}
          tipAmount={bill.tipAmount}
          customTipMode={customTipMode}
          onSelectTip={(pct) => { updateTip(pct); setCustomTipMode(false); }}
          onEnableCustom={() => setCustomTipMode(true)}
        />
      </div>

      <div className="px-4 pt-4 pb-safe border-t border-[#F5EDE3] bg-[#FBF8F4]">
        <div className="flex justify-between items-center mb-3">
          <span className="font-semibold">Total</span>
          <span className="text-xl font-bold">${bill.total.toFixed(2)}</span>
        </div>
        <PrimaryButton onClick={() => setShowSettlement(true)}>
          See the split
        </PrimaryButton>
      </div>
    </div>
  );
}
