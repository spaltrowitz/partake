"use client";

import { useState } from "react";
import type { Bill, BillSplit } from "@/types";
import { copyToClipboard } from "@/services/venmo";
import { Avatar } from "./Avatar";
import { Card } from "./UI";

function ShareLinkButton({ shareCode, billName }: { shareCode: string; billName: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const basePath = window.location.pathname.startsWith("/partake") ? "/partake" : "";
    const url = `${window.location.origin}${basePath}/bill?code=${shareCode}`;
    const text = `Claim your items on "${billName || "our bill"}"`;

    if (navigator.share) {
      navigator.share({ text, url }).catch((err) => {
        if (err?.name === "AbortError") return; // User cancelled
        copyToClipboard(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      copyToClipboard(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="mt-2">
      <button
        onClick={handleShare}
        className="w-full py-2 text-sm font-medium text-[#2E7D32] hover:bg-[#F5EDE3] rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {copied ? "✓ Link copied!" : "🔗 Share bill link"}
      </button>
    </Card>
  );
}

export function Settlement({
  bill,
  splits,
  settledIds,
  payingGroups,
  onPayment,
  onCopy,
  onDone,
}: {
  bill: Bill;
  splits: BillSplit[];
  settledIds: Set<string>;
  payingGroups?: { payerId: string; memberIds: string[] }[];
  onPayment: (split: BillSplit) => void;
  onCopy: (split: BillSplit) => void;
  onDone: () => void;
}) {
  const allSettled =
    splits.filter((s) => s.total > 0).every((s) => settledIds.has(s.participantId));

  const groups = payingGroups ?? [];

  // Splits that have a payment app and owe money (for "Request all")
  const payableSplits = splits.filter((s) => {
    if (s.total <= 0 || settledIds.has(s.participantId)) return false;
    const participant = bill.participants.find((p) => p.id === s.participantId);
    return !!(s.venmoUsername || participant?.cashAppUsername);
  });

  function handleRequestAll() {
    // Open each payment request with a small delay to avoid popup blocking
    payableSplits.forEach((split, i) => {
      setTimeout(() => {
        onPayment(split);
      }, i * 500);
    });
  }

  return (
    <div className="p-4 pb-safe overflow-y-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">
          {bill.name || "The split"}
        </h2>
        <p className="text-[#9C8E80]">${bill.total.toFixed(2)} total</p>
      </div>

      {payableSplits.length > 1 && (
        <div className="mb-4">
          <button
            onClick={handleRequestAll}
            className="w-full py-3 rounded-xl text-white font-semibold gradient-bg hover:opacity-90 transition-opacity"
          >
            Request all {payableSplits.length} via Venmo
          </button>
          <p className="text-xs text-[#9C8E80] text-center mt-1">Best on desktop — mobile may only open the first</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {splits.map((split) => {
          const originalIndex = bill.participants.findIndex((p) => p.id === split.participantId);
          const payerGroup = groups.find(g => g.payerId === split.participantId);
          const coveredNames = payerGroup?.memberIds.map(id => bill.participants.find(p => p.id === id)?.name).filter(Boolean) ?? [];
          return (
          <Card key={split.participantId}>
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={split.participantName} index={originalIndex} size={40} allNames={bill.participants.map(p => p.name)} />
              <div className="flex-1">
                <p className="font-semibold">
                  {split.participantName}
                  {coveredNames.length > 0 && <span className="text-xs text-[#9C8E80] ml-1">+ {coveredNames.join(" & ")}</span>}
                </p>
                <p className="text-xs text-[#9C8E80]">
                  {split.items.length} item{split.items.length !== 1 && "s"}
                  {coveredNames.length > 0 && ` (covering ${coveredNames.join(" & ")})`}
                </p>
              </div>
              <span className="text-xl font-bold">
                ${split.total.toFixed(2)}
              </span>
            </div>

            {/* Item breakdown */}
            <div className="text-xs text-[#9C8E80] space-y-1 mb-3">
              {split.items.map((item) => {
                const lineTotal = item.price * item.quantity;
                const yourShare = item.claimedBy.length > 1
                  ? lineTotal / item.claimedBy.length
                  : lineTotal;
                return (
                <div key={item.id} className="flex justify-between">
                  <span>{item.name}</span>
                  <span>
                    {item.claimedBy.length > 1
                      ? `$${yourShare.toFixed(2)} / $${lineTotal.toFixed(2)}`
                      : `$${lineTotal.toFixed(2)}`}
                  </span>
                </div>
                );
              })}
              <hr className="border-[#F5EDE3]" />
              <div className="flex justify-between">
                <span>Tax</span>
                <span>${split.taxShare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tip{split.itemsSubtotal > 0 && bill.tipAmount > 0
                  ? ` (${Math.round((split.tipShare / split.itemsSubtotal) * 100)}%)`
                  : ""}</span>
                <span>${split.tipShare.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment action */}
            {split.total > 0 && (
              <>
                {(() => {
                  const participant = bill.participants.find((p) => p.id === split.participantId);
                  const hasVenmo = !!split.venmoUsername;
                  const hasCashApp = !!participant?.cashAppUsername;
                  const hasPaymentApp = hasVenmo || hasCashApp;
                  const appLabel = hasVenmo ? "Venmo" : "Cash App";

                  return hasPaymentApp ? (
                    <button
                      onClick={() => onPayment(split)}
                      disabled={settledIds.has(split.participantId)}
                      className={`w-full py-2 rounded-lg text-white text-sm font-medium transition-colors ${
                        settledIds.has(split.participantId)
                          ? "bg-[#2E7D32]"
                          : "bg-[#1976D2] hover:bg-[#1565C0]"
                      }`}
                    >
                      {settledIds.has(split.participantId)
                        ? "✓ Requested"
                        : `Request via ${appLabel}`}
                    </button>
                  ) : (
                    <button
                      onClick={() => onCopy(split)}
                      className="w-full py-2 text-sm font-medium text-[#E8613C] hover:bg-[#F5EDE3] rounded-lg transition-colors"
                    >
                      {settledIds.has(split.participantId)
                        ? "✓ Copied"
                        : `Copy amount: $${split.total.toFixed(2)}`}
                    </button>
                  );
                })()}
              </>
            )}
          </Card>
          );
        })}

        {/* Covered member cards */}
        {groups.length > 0 && groups.flatMap((group) =>
          group.memberIds.map((memberId) => {
            const member = bill.participants.find(p => p.id === memberId);
            const payer = bill.participants.find(p => p.id === group.payerId);
            if (!member || !payer) return null;
            return (
              <Card key={memberId}>
                <div className="flex items-center gap-3">
                  <Avatar name={member.name} index={bill.participants.findIndex(p => p.id === memberId)} size={40} allNames={bill.participants.map(p => p.name)} />
                  <div className="flex-1">
                    <p className="font-semibold">{member.name}</p>
                    <p className="text-xs text-[#9C8E80]">Covered by {payer.name} 👫</p>
                  </div>
                  <span className="text-lg font-bold text-[#2E7D32]">$0.00</span>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Share summary */}
      <Card className="mt-4">
        <button
          onClick={() => {
            const summary = splits
              .filter((s) => s.total > 0)
              .map((s) => `${s.participantName}: $${s.total.toFixed(2)}`)
              .join("\n");
            const text = `${bill.name || "Bill split"} — $${bill.total.toFixed(2)} total\n\n${summary}\n\nSplit with Partake`;

            if (navigator.share) {
              navigator.share({ text }).catch((err) => {
                if (err?.name === "AbortError") return; // User cancelled
                copyToClipboard(text);
              });
            } else {
              copyToClipboard(text);
            }
          }}
          className="w-full py-2 text-sm font-medium text-[#E8613C] hover:bg-[#F5EDE3] rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          📤 Share the breakdown
        </button>
      </Card>

      {/* Share link */}
      {bill.shareCode && (
        <ShareLinkButton shareCode={bill.shareCode} billName={bill.name} />
      )}

      {allSettled && (
        <div className="text-center mt-6 text-2xl">
          🎉 You&apos;re all square!
        </div>
      )}

      <button
        onClick={onDone}
        className="w-full mt-6 py-3 text-[#9C8E80] hover:text-[#2D2319]"
      >
        ← Back to bill
      </button>
    </div>
  );
}
