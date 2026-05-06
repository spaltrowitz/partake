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
        className="w-full py-2 text-sm font-medium text-[#4ECDC4] hover:bg-[#1C2A4A] rounded-lg transition-colors flex items-center justify-center gap-2"
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
  onPayment,
  onCopy,
  onDone,
}: {
  bill: Bill;
  splits: BillSplit[];
  settledIds: Set<string>;
  onPayment: (split: BillSplit) => void;
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
        <p className="text-[#8B9BB4]">${bill.total.toFixed(2)} total</p>
      </div>

      <div className="flex flex-col gap-4">
        {splits.map((split) => {
          const originalIndex = bill.participants.findIndex((p) => p.id === split.participantId);
          return (
          <Card key={split.participantId}>
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={split.participantName} index={originalIndex} size={40} />
              <div className="flex-1">
                <p className="font-semibold">{split.participantName}</p>
                <p className="text-xs text-[#8B9BB4]">
                  {split.items.length} item{split.items.length !== 1 && "s"}
                </p>
              </div>
              <span className="text-xl font-bold">
                ${split.total.toFixed(2)}
              </span>
            </div>

            {/* Item breakdown */}
            <div className="text-xs text-[#8B9BB4] space-y-1 mb-3">
              {split.items.map((item) => {
                const lineTotal = item.price * item.quantity;
                return (
                <div key={item.id} className="flex justify-between">
                  <span>{item.quantity > 1 ? `${item.quantity}× ` : ""}{item.name}</span>
                  <span>
                    {item.claimedBy.length > 1
                      ? `$${(lineTotal / item.claimedBy.length).toFixed(2)} (split ${item.claimedBy.length} ways)`
                      : `$${lineTotal.toFixed(2)}`}
                  </span>
                </div>
                );
              })}
              <hr className="border-[#1C2A4A]" />
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
                          ? "bg-[#4ECDC4]"
                          : "bg-[#3D95CE] hover:bg-[#2d7ab3]"
                      }`}
                    >
                      {settledIds.has(split.participantId)
                        ? "✓ Requested"
                        : `Request via ${appLabel}`}
                    </button>
                  ) : (
                    <button
                      onClick={() => onCopy(split)}
                      className="w-full py-2 text-sm font-medium text-[#FF8A80] hover:bg-[#1C2A4A] rounded-lg transition-colors"
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
          className="w-full py-2 text-sm font-medium text-[#FF8A80] hover:bg-[#1C2A4A] rounded-lg transition-colors flex items-center justify-center gap-2"
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
        className="w-full mt-6 py-3 text-[#8B9BB4] hover:text-gray-700"
      >
        ← Back to bill
      </button>
    </div>
  );
}
