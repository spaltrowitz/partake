"use client";

import { useState, useCallback } from "react";
import type { Bill, BillItem, BillSplit, Participant } from "@/types";
import { calculateSplits } from "@/services/splitCalculator";
import { Avatar, getParticipantColor } from "./Avatar";
import { requestVenmo, copyToClipboard } from "@/services/venmo";
import { Card, PrimaryButton } from "./UI";

const TIP_OPTIONS = [15, 18, 20, 25];

export function BillSplitter({ bill: initialBill }: { bill: Bill }) {
  const [bill, setBill] = useState(initialBill);
  const [selectedParticipant, setSelectedParticipant] = useState<string>(
    bill.participants[0]?.id ?? ""
  );
  const [showSettlement, setShowSettlement] = useState(false);
  const [settledIds, setSettledIds] = useState<Set<string>>(new Set());

  const splits = calculateSplits(bill);

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
      {/* Participant selector */}
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

      {/* Item list */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-xs text-gray-400 mb-3">
          Tap items to claim them
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
