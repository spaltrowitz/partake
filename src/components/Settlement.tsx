"use client";

import { useState } from "react";
import type { Bill, BillSplit, CoveredReimbursement } from "@/types";
import { copyToClipboard } from "@/services/venmo";
import { Avatar } from "./Avatar";
import { Card, TopBarButton } from "./UI";

function ShareLinkButton({ shareCode, billName, cloudSynced }: { shareCode: string; billName: string; cloudSynced?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (cloudSynced === false) return;
    const url = `${window.location.origin}/bill?code=${shareCode}`;
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

  const syncing = cloudSynced === false;

  return (
    <Card className="mt-2">
      <button
        onClick={handleShare}
        disabled={syncing}
        className={`w-full py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
          syncing
            ? "text-[#8A7353] cursor-wait"
            : "text-[#2E7D32] hover:bg-[#FDE68A]"
        }`}
      >
        {syncing ? "⏳ Syncing bill…" : copied ? "✓ Link copied!" : "🔗 Share bill link"}
      </button>
    </Card>
  );
}

export function Settlement({
  bill,
  splits,
  settledIds,
  payingGroups,
  coveredReimbursements,
  myName,
  onPayment,
  onCopy,
  onDone,
  onHome,
  cloudSynced,
}: {
  bill: Bill;
  splits: BillSplit[];
  settledIds: Set<string>;
  payingGroups?: { payerId: string; memberIds: string[] }[];
  coveredReimbursements?: CoveredReimbursement[];
  myName?: string;
  onPayment: (split: BillSplit) => void;
  onCopy: (split: BillSplit) => void;
  onDone: () => void;
  onHome?: () => void;
  cloudSynced?: boolean;
}) {
  const allSettled =
    splits.filter((s) => s.total > 0).every((s) => settledIds.has(s.participantId));

  const groups = payingGroups ?? [];
  const reimbursements = coveredReimbursements ?? [];

  return (
    <div className="p-4 pb-safe overflow-y-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">
          {bill.name || "The split"}
        </h2>
        <p className="text-[#8A7353]">${bill.total.toFixed(2)} total</p>
      </div>

      <Card className="mb-4">
        <p className="text-center text-xs text-[#8A7353]">
          Venmo may block rapid or repeated requests. Send these one at a time and finish each Venmo screen before opening the next.
        </p>
      </Card>

      <div className="flex flex-col gap-4">
        {splits.map((split) => {
          const originalIndex = bill.participants.findIndex((p) => p.id === split.participantId);
          const payerGroup = groups.find(g => g.payerId === split.participantId);
          const coveredNames = payerGroup?.memberIds.map(id => bill.participants.find(p => p.id === id)?.name).filter(Boolean) ?? [];
          const payerReimbursements = reimbursements.filter((r) => r.payerId === split.participantId);
          return (
          <Card key={split.participantId}>
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={split.participantName} index={originalIndex} size={40} allNames={bill.participants.map(p => p.name)} />
              <div className="flex-1">
                <p className="font-semibold">
                  {split.participantName}
                  {coveredNames.length > 0 && <span className="text-xs text-[#8A7353] ml-1">+ {coveredNames.join(" & ")}</span>}
                </p>
                <p className="text-xs text-[#8A7353]">
                  {split.items.length} item{split.items.length !== 1 && "s"}
                  {coveredNames.length > 0 && ` (covering ${coveredNames.join(" & ")})`}
                </p>
              </div>
              <span className="text-xl font-bold">
                ${split.total.toFixed(2)}
              </span>
            </div>

            {payerReimbursements.length > 0 && (
              <div className="mb-3 rounded-xl bg-[#FDE68A] p-3 text-xs text-[#6B4F2A] space-y-1">
                <p className="font-semibold">People paying {split.participantName} back</p>
                {payerReimbursements.map((reimbursement) => (
                  <div key={`${reimbursement.payerId}-${reimbursement.memberId}`} className="flex justify-between gap-3">
                    <span>{reimbursement.memberName} owes {split.participantName}</span>
                    <span className="font-bold">${reimbursement.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Item breakdown */}
            <div className="text-xs text-[#8A7353] space-y-1 mb-3">
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
              <hr className="border-[#FDE68A]" />
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

            {/* Payment action — skip for yourself */}
            {split.total > 0 && !(myName && split.participantName.toLowerCase() === myName.toLowerCase()) && (
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
                      className={`w-full min-h-11 py-2 rounded-lg text-white text-sm font-medium transition-colors ${
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
                      className="w-full min-h-11 py-2 text-sm font-medium text-[#D97706] hover:bg-[#FDE68A] rounded-lg transition-colors"
                    >
                      {settledIds.has(split.participantId)
                        ? "✓ Copied"
                        : `Copy amount: $${split.total.toFixed(2)}`}
                    </button>
                  );
                })()}
              </>
            )}
            {myName && split.participantName.toLowerCase() === myName.toLowerCase() && split.total > 0 && (
              <p className="text-xs text-[#8A7353] text-center py-1">Your share</p>
            )}
          </Card>
          );
        })}

        {/* Covered member cards */}
        {groups.length > 0 && groups.flatMap((group) =>
          group.memberIds.map((memberId) => {
            const member = bill.participants.find(p => p.id === memberId);
            const payer = bill.participants.find(p => p.id === group.payerId);
            const reimbursement = reimbursements.find((r) => r.payerId === group.payerId && r.memberId === memberId);
            if (!member || !payer) return null;
            return (
              <Card key={memberId}>
                <div className="flex items-center gap-3">
                  <Avatar name={member.name} index={bill.participants.findIndex(p => p.id === memberId)} size={40} allNames={bill.participants.map(p => p.name)} />
                   <div className="flex-1">
                     <p className="font-semibold">{member.name}</p>
                     <p className="text-xs text-[#8A7353]">
                       Covered by {payer.name} 👫
                       {reimbursement && ` — owes ${payer.name} $${reimbursement.amount.toFixed(2)}`}
                     </p>
                   </div>
                   <span className="text-lg font-bold text-[#2E7D32]">
                     {reimbursement ? `$${reimbursement.amount.toFixed(2)}` : "$0.00"}
                   </span>
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
            const reimbursementSummary = reimbursements.length > 0
              ? `\n\nPay-back notes:\n${reimbursements.map((r) => `${r.memberName} owes ${r.payerName}: $${r.amount.toFixed(2)}`).join("\n")}`
              : "";
            const text = `${bill.name || "Bill split"} — $${bill.total.toFixed(2)} total\n\n${summary}${reimbursementSummary}\n\nSplit with Partake`;

            if (navigator.share) {
              navigator.share({ text }).catch((err) => {
                if (err?.name === "AbortError") return; // User cancelled
                copyToClipboard(text);
              });
            } else {
              copyToClipboard(text);
            }
          }}
          className="w-full min-h-11 py-2 text-sm font-medium text-[#D97706] hover:bg-[#FDE68A] rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          📤 Share the breakdown
        </button>
      </Card>

      {/* Share link */}
      {bill.shareCode && (
        <ShareLinkButton shareCode={bill.shareCode} billName={bill.name} cloudSynced={cloudSynced} />
      )}

      {allSettled && (
        <div className="text-center mt-6 text-2xl">
          🎉 You&apos;re all square!
        </div>
      )}

      <TopBarButton
        onClick={onDone}
        className="mt-6 w-full"
      >
        ← Back to bill
      </TopBarButton>
      {onHome && (
        <TopBarButton
          onClick={onHome}
          className="mt-3 w-full"
        >
          Done — back home
        </TopBarButton>
      )}
    </div>
  );
}
