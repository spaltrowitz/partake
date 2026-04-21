"use client";

import { useState, useCallback } from "react";
import type { Bill, BillItem, BillSplit, Participant, SplitMethod } from "@/types";
import { calculateSplits, calculateEvenSplit, calculatePercentageSplit, calculateSharesSplit, calculateExactSplit } from "@/services/splitCalculator";
import { Avatar, getParticipantColor } from "./Avatar";
import { requestVenmo, copyToClipboard } from "@/services/venmo";
import { Card, PrimaryButton } from "./UI";

const TIP_OPTIONS = [15, 18, 20, 25];

const SPLIT_METHODS: { id: SplitMethod; label: string; description: string }[] = [
  { id: "itemized", label: "By item", description: "Everyone pays for what they got" },
  { id: "even", label: "Equally", description: "Same amount each" },
  { id: "percentage", label: "By %", description: "Custom percentage per person" },
  { id: "shares", label: "By shares", description: "Weighted portions" },
  { id: "exact", label: "Exact amounts", description: "Enter each person's amount" },
];

export function BillSplitter({ bill: initialBill }: { bill: Bill }) {
  const [bill, setBill] = useState(initialBill);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("itemized");
  const [selectedParticipant, setSelectedParticipant] = useState<string>(
    bill.participants[0]?.id ?? ""
  );
  const [showSettlement, setShowSettlement] = useState(false);
  const [settledIds, setSettledIds] = useState<Set<string>>(new Set());
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

  const splits = (() => {
    switch (splitMethod) {
      case "even":
        return calculateEvenSplit(bill);
      case "percentage":
        return calculatePercentageSplit(bill, percentages);
      case "shares":
        return calculateSharesSplit(bill, shares);
      case "exact":
        return calculateExactSplit(bill, exactAmounts);
      default:
        return calculateSplits(bill);
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

  function handleVenmo(split: BillSplit) {
    if (!split.venmoUsername) return;
    const note = `Partake: ${bill.name || "Bill split"}`;
    requestVenmo(split.venmoUsername, split.total, note);
    setSettledIds((prev) => new Set([...prev, split.participantId]));
  }

  if (showSettlement) {
    return (
      <Settlement
        bill={bill}
        splits={splits}
        settledIds={settledIds}
        onVenmo={handleVenmo}
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
      {/* Split method selector */}
      <div className="flex gap-1 overflow-x-auto p-3 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-800">
        {SPLIT_METHODS.map((method) => (
          <button
            key={method.id}
            onClick={() => setSplitMethod(method.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              splitMethod === method.id
                ? "gradient-bg text-white"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
            }`}
          >
            {method.label}
          </button>
        ))}
      </div>

      {/* Participant selector (for itemized mode) */}
      {splitMethod === "itemized" && (
        <div className="flex gap-2 overflow-x-auto p-4 bg-gray-50 dark:bg-gray-900">
          {bill.participants.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setSelectedParticipant(p.id)}
              className="flex flex-col items-center gap-1 min-w-[64px]"
            >
              <div
                className={`rounded-full transition-all ${
                  selectedParticipant === p.id
                    ? `ring-2 ring-offset-2`
                    : ""
                }`}
                style={
                  selectedParticipant === p.id
                    ? { outlineColor: getParticipantColor(i) }
                    : undefined
                }
              >
                <Avatar name={p.name} index={i} size={48} />
              </div>
              <span
                className={`text-xs truncate max-w-[64px] ${
                  selectedParticipant === p.id
                    ? "font-semibold"
                    : "text-gray-400"
                }`}
              >
                {p.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Content area based on split method */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* ITEMIZED: claim items per person */}
        {splitMethod === "itemized" && (
          <>
            <p className="text-xs text-gray-400 mb-3">
              Tap items to claim them for the selected person
            </p>
            <div className="flex flex-col gap-1">
              {bill.items.map((item) => {
                const isClaimed = item.claimedBy.includes(selectedParticipant);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleClaim(item.id)}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all text-left ${
                      isClaimed
                        ? "bg-teal-50 dark:bg-teal-950/30"
                        : "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
                    } ${isClaimed ? "pop-animation" : ""}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      {item.claimedBy.length > 0 && (
                        <div className="flex -space-x-1 mt-1">
                          {item.claimedBy.map((cid) => {
                            const idx = bill.participants.findIndex(
                              (p) => p.id === cid
                            );
                            return (
                              <div
                                key={cid}
                                className="w-4 h-4 rounded-full border border-white"
                                style={{
                                  backgroundColor: getParticipantColor(idx),
                                }}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <span className="font-semibold ml-4">
                      ${item.price.toFixed(2)}
                    </span>
                    <span className="ml-3 text-xl">
                      {isClaimed ? "✅" : "⭕"}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* EVEN: just show the equal amount */}
        {splitMethod === "even" && (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Everyone pays the same</p>
            <p className="text-4xl font-bold gradient-text">
              ${(bill.total / bill.participants.length).toFixed(2)}
            </p>
            <p className="text-sm text-gray-400 mt-2">each</p>
          </div>
        )}

        {/* PERCENTAGE: slider/input per person */}
        {splitMethod === "percentage" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-gray-400 mb-1">
              Set each person&apos;s percentage (should add up to 100%)
            </p>
            {bill.participants.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <Avatar name={p.name} index={i} size={32} />
                <span className="flex-1 font-medium text-sm">{p.name}</span>
                <input
                  type="number"
                  value={percentages[p.id] ?? 0}
                  onChange={(e) =>
                    setPercentages((prev) => ({
                      ...prev,
                      [p.id]: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-20 text-right px-2 py-1 rounded border dark:border-gray-700 bg-transparent text-sm font-bold"
                />
                <span className="text-sm text-gray-400">%</span>
                <span className="text-sm font-semibold w-20 text-right">
                  ${(bill.total * (percentages[p.id] ?? 0) / 100).toFixed(2)}
                </span>
              </div>
            ))}
            <p className={`text-xs text-center ${
              Math.abs(Object.values(percentages).reduce((s, v) => s + v, 0) - 100) < 0.01
                ? "text-green-500" : "text-orange-500"
            }`}>
              Total: {Object.values(percentages).reduce((s, v) => s + v, 0).toFixed(1)}%
            </p>
          </div>
        )}

        {/* SHARES: weighted portions */}
        {splitMethod === "shares" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-gray-400 mb-1">
              Give each person a number of shares — the bill divides proportionally
            </p>
            {bill.participants.map((p, i) => {
              const totalShares = Object.values(shares).reduce((s, v) => s + v, 0);
              const proportion = totalShares > 0 ? (shares[p.id] ?? 0) / totalShares : 0;
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <Avatar name={p.name} index={i} size={32} />
                  <span className="flex-1 font-medium text-sm">{p.name}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShares((prev) => ({ ...prev, [p.id]: Math.max(0, (prev[p.id] ?? 1) - 1) }))}
                      className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 text-sm font-bold"
                    >−</button>
                    <span className="w-8 text-center font-bold">{shares[p.id] ?? 1}</span>
                    <button
                      onClick={() => setShares((prev) => ({ ...prev, [p.id]: (prev[p.id] ?? 1) + 1 }))}
                      className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 text-sm font-bold"
                    >+</button>
                  </div>
                  <span className="text-sm font-semibold w-20 text-right">
                    ${(bill.total * proportion).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* EXACT: enter amounts directly */}
        {splitMethod === "exact" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-gray-400 mb-1">
              Enter each person&apos;s exact amount
            </p>
            {bill.participants.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <Avatar name={p.name} index={i} size={32} />
                <span className="flex-1 font-medium text-sm">{p.name}</span>
                <span className="text-sm text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={exactAmounts[p.id] ?? 0}
                  onChange={(e) =>
                    setExactAmounts((prev) => ({
                      ...prev,
                      [p.id]: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-24 text-right px-2 py-1 rounded border dark:border-gray-700 bg-transparent text-sm font-bold"
                />
              </div>
            ))}
            <p className={`text-xs text-center ${
              Math.abs(Object.values(exactAmounts).reduce((s, v) => s + v, 0) - bill.total) < 0.01
                ? "text-green-500" : "text-orange-500"
            }`}>
              Assigned: ${Object.values(exactAmounts).reduce((s, v) => s + v, 0).toFixed(2)} of ${bill.total.toFixed(2)}
            </p>
          </div>
        )}

        {/* Tip selector */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-2">Tip</h3>
          <div className="flex gap-2">
            {TIP_OPTIONS.map((pct) => (
              <button
                key={pct}
                onClick={() => updateTip(pct)}
                className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
                  bill.tipPercent === pct
                    ? "gradient-bg text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="p-4 border-t dark:border-gray-800 bg-white dark:bg-[#0a0a0a]">
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

// Settlement sub-component
function Settlement({
  bill,
  splits,
  settledIds,
  onVenmo,
  onCopy,
  onDone,
}: {
  bill: Bill;
  splits: BillSplit[];
  settledIds: Set<string>;
  onVenmo: (split: BillSplit) => void;
  onCopy: (split: BillSplit) => void;
  onDone: () => void;
}) {
  const allSettled =
    splits.filter((s) => s.total > 0).every((s) => settledIds.has(s.participantId));

  return (
    <div className="p-4 overflow-y-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">
          {bill.name || "The split"}
        </h2>
        <p className="text-gray-500">${bill.total.toFixed(2)} total</p>
      </div>

      <div className="flex flex-col gap-4">
        {splits.map((split, i) => (
          <Card key={split.participantId}>
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={split.participantName} index={i} size={40} />
              <div className="flex-1">
                <p className="font-semibold">{split.participantName}</p>
                <p className="text-xs text-gray-400">
                  {split.items.length} item{split.items.length !== 1 && "s"}
                </p>
              </div>
              <span className="text-xl font-bold">
                ${split.total.toFixed(2)}
              </span>
            </div>

            {/* Item breakdown */}
            <div className="text-xs text-gray-400 space-y-1 mb-3">
              {split.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.name}</span>
                  <span>
                    {item.claimedBy.length > 1
                      ? `$${(item.price / item.claimedBy.length).toFixed(2)} (split ${item.claimedBy.length} ways)`
                      : `$${item.price.toFixed(2)}`}
                  </span>
                </div>
              ))}
              <hr className="dark:border-gray-700" />
              <div className="flex justify-between">
                <span>Tax</span>
                <span>${split.taxShare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tip</span>
                <span>${split.tipShare.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment action */}
            {split.total > 0 && (
              <>
                {split.venmoUsername ? (
                  <button
                    onClick={() => onVenmo(split)}
                    disabled={settledIds.has(split.participantId)}
                    className={`w-full py-2 rounded-lg text-white text-sm font-medium transition-colors ${
                      settledIds.has(split.participantId)
                        ? "bg-[#4ECDC4]"
                        : "bg-[#3D95CE] hover:bg-[#2d7ab3]"
                    }`}
                  >
                    {settledIds.has(split.participantId)
                      ? "✓ Requested"
                      : "Request via Venmo"}
                  </button>
                ) : (
                  <button
                    onClick={() => onCopy(split)}
                    className="w-full py-2 text-sm font-medium text-[#FF6B6B] hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg transition-colors"
                  >
                    {settledIds.has(split.participantId)
                      ? "✓ Copied"
                      : `Copy amount: $${split.total.toFixed(2)}`}
                  </button>
                )}
              </>
            )}
          </Card>
        ))}
      </div>

      {/* Share link */}
      {bill.shareCode && (
        <Card className="mt-4 text-center">
          <p className="font-semibold mb-1">Share this bill</p>
          <p className="text-xs text-gray-400 mb-2">
            Friends can claim items without downloading anything
          </p>
          <button
            onClick={() =>
              copyToClipboard(`https://partakeapp.com/bill/${bill.shareCode}`)
            }
            className="text-sm text-[#FF6B6B] bg-red-50 dark:bg-red-950/30 py-2 px-4 rounded-lg hover:bg-red-100 transition-colors"
          >
            🔗 partakeapp.com/bill/{bill.shareCode}
          </button>
        </Card>
      )}

      {allSettled && (
        <div className="text-center mt-6 text-2xl">
          🎉 You&apos;re all square!
        </div>
      )}

      <button
        onClick={onDone}
        className="w-full mt-6 py-3 text-gray-500 hover:text-gray-700"
      >
        ← Back to bill
      </button>
    </div>
  );
}
