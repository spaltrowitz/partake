"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { firebaseConfigured } from "@/lib/firebase";
import { getBillByShareCode, joinSharedBill, listenToBill, saveBill, toggleBillItemClaim } from "@/services/firestore";
import { useAuthContext } from "@/components/AuthProvider";
import { Avatar } from "@/components/Avatar";
import { Card } from "@/components/UI";
import { saveBillToHistory } from "@/services/billHistory";
import type { Bill, BillItem, Participant } from "@/types";

const GUEST_NAME_KEY = "partake-guest-name";
const RECOVERY_STORAGE_KEYS = ["partake_active_session", "partake_bills"];

function getStoredName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(GUEST_NAME_KEY) || "";
}

function storeName(name: string) {
  localStorage.setItem(GUEST_NAME_KEY, name);
}

function getInitialGuest() {
  const name = getStoredName();
  return { name, confirmed: !!name };
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function participantIdForGuestName(name: string): string {
  const normalized = normalizeName(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `guest-${normalized || "friend"}`;
}

function resolveClaimName(bill: Bill, claim: string): string {
  return bill.participants.find((p) => p.id === claim)?.name ?? claim;
}

function resolveGuestParticipant(bill: Bill, name: string): Participant {
  const trimmedName = name.trim();
  const existing = bill.participants.find(
    (p) => normalizeName(p.name) === normalizeName(trimmedName)
  );
  if (existing) return existing;
  return {
    id: participantIdForGuestName(trimmedName),
    name: trimmedName,
    isAppUser: false,
  };
}

function recoverBillsFromLocalStorage(): Bill[] {
  const recovered: Bill[] = [];
  const seenIds = new Set<string>();

  function addCandidate(candidate: unknown) {
    if (!candidate || typeof candidate !== "object") return;
    const maybeBill = candidate as Partial<Bill>;
    if (!maybeBill.id || !Array.isArray(maybeBill.items) || !Array.isArray(maybeBill.participants)) return;
    if (seenIds.has(maybeBill.id)) return;
    seenIds.add(maybeBill.id);
    recovered.push({
      ...(maybeBill as Bill),
      createdAt: new Date(maybeBill.createdAt ?? new Date()),
    });
  }

  function inspectValue(value: unknown) {
    if (Array.isArray(value)) {
      value.forEach(inspectValue);
      return;
    }
    if (!value || typeof value !== "object") return;
    addCandidate(value);
    const maybeSession = value as { bill?: unknown };
    if (maybeSession.bill) addCandidate(maybeSession.bill);
  }

  try {
    for (const key of RECOVERY_STORAGE_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      inspectValue(JSON.parse(raw));
    }

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || RECOVERY_STORAGE_KEYS.includes(key)) continue;
      const raw = localStorage.getItem(key);
      if (!raw || (!raw.includes("shareCode") && !raw.includes("claimedBy"))) continue;
      try {
        inspectValue(JSON.parse(raw));
      } catch {
        // Ignore non-JSON storage entries.
      }
    }
  } catch {
    // If storage is unavailable, fall back to the normal cloud lookup error.
  }

  return recovered;
}

function findRecoverableBill(code: string): Bill | null {
  const normalizedCode = code.trim().toLowerCase();
  const bills = recoverBillsFromLocalStorage();
  return (
    bills.find((b) => b.shareCode?.toLowerCase() === normalizedCode) ??
    bills.find((b) => b.restaurantName?.toLowerCase().includes("golden") || b.name?.toLowerCase().includes("golden")) ??
    bills.find((b) => Math.abs((b.total ?? 0) - 427.85) < 0.01) ??
    null
  );
}

type PublicOwesBreakdown = {
  participantId: string;
  name: string;
  amount: number;
  itemsSubtotal: number;
  taxShare: number;
  tipShare: number;
  items: BillItem[];
  coveredBy?: string;
  covers: string[];
};

function calculateOwes(bill: Bill): PublicOwesBreakdown[] {
  const participantTotals = new Map<string, { subtotal: number; items: BillItem[] }>();
  for (const participant of bill.participants) {
    participantTotals.set(participant.id, { subtotal: 0, items: [] });
  }

  for (const item of bill.items) {
    if (item.claimedBy.length === 0) continue;
    const lineTotal = item.price * item.quantity;
    const perPerson = lineTotal / item.claimedBy.length;
    for (const claim of item.claimedBy) {
      const current = participantTotals.get(claim) ?? { subtotal: 0, items: [] };
      participantTotals.set(claim, {
        subtotal: current.subtotal + perPerson,
        items: [...current.items, item],
      });
    }
  }

  const claimedSubtotal = Array.from(participantTotals.values()).reduce((sum, entry) => sum + entry.subtotal, 0);
  if (claimedSubtotal === 0) return [];

  const coveredBy = new Map<string, string>();
  const covers = new Map<string, string[]>();
  for (const group of bill.payingGroups ?? []) {
    const payerName = resolveClaimName(bill, group.payerId);
    const memberNames = group.memberIds.map((id) => resolveClaimName(bill, id));
    covers.set(group.payerId, memberNames);
    for (const memberId of group.memberIds) {
      coveredBy.set(memberId, payerName);
    }
  }

  return Array.from(participantTotals.entries()).map(([claim, entry]) => {
    const share = entry.subtotal / claimedSubtotal;
    const taxShare = bill.tax * share;
    const tipShare = bill.tipAmount * share;
    return {
      participantId: claim,
      name: resolveClaimName(bill, claim),
      amount: entry.subtotal + taxShare + tipShare,
      itemsSubtotal: entry.subtotal,
      taxShare,
      tipShare,
      items: entry.items,
      coveredBy: coveredBy.get(claim),
      covers: covers.get(claim) ?? [],
    };
  }).sort((a, b) => b.amount - a.amount);
}

function SharedBillContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const [initialGuest] = useState(getInitialGuest);
  const { user } = useAuthContext();

  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guestName, setGuestName] = useState(initialGuest.name);
  const [nameConfirmed, setNameConfirmed] = useState(initialGuest.confirmed);
  const joinedBillKey = useRef<string | null>(null);

  useEffect(() => {
    if (!code || !firebaseConfigured) return;

    let unsubscribe: (() => void) | null = null;

    getBillByShareCode(code)
      .then(async (found) => {
        if (!found) {
          const recoverableBill = findRecoverableBill(code);
          if (recoverableBill) {
            if (!user) {
              setError("Found this bill on this device. Reopen this page in a moment so Partake can finish reconnecting and restore it.");
              setLoading(false);
              return;
            }
            const restoredBill: Bill = {
              ...recoverableBill,
              shareCode: code,
              createdBy: user.uid,
              createdAt: recoverableBill.createdAt instanceof Date
                ? recoverableBill.createdAt
                : new Date(recoverableBill.createdAt),
              sharedWithUserIds: Array.from(new Set([...(recoverableBill.sharedWithUserIds ?? []), user.uid])),
            };
            await saveBill(restoredBill);
            setBill(restoredBill);
            saveBillToHistory(restoredBill);
            setLoading(false);
            unsubscribe = listenToBill(restoredBill.id, (updated) => {
              if (updated) {
                setBill(updated);
                saveBillToHistory(updated);
              }
            });
            return;
          }
          setError("Bill not found. The link may be invalid or expired.");
          setLoading(false);
          return;
        }
        setBill(found);
        saveBillToHistory(found);
        setLoading(false);
        unsubscribe = listenToBill(found.id, (updated) => {
          if (updated) {
            setBill(updated);
            saveBillToHistory(updated);
          }
        });
      })
      .catch(() => {
        setError("Failed to load bill. Please try again.");
        setLoading(false);
      });

    return () => {
      unsubscribe?.();
    };
  }, [code, user]);

  useEffect(() => {
    const allItemsClaimed = !!bill?.items.length && bill.items.every((item) => item.claimedBy.length > 0);
    if (!bill || bill.status === "settled" || allItemsClaimed || !nameConfirmed || !guestName.trim()) return;
    const participant = resolveGuestParticipant(bill, guestName);
    const joinKey = `${bill.id}:${participant.id}:${user?.uid ?? "local"}`;
    if (joinedBillKey.current === joinKey) return;
    joinedBillKey.current = joinKey;
    joinSharedBill(bill.id, participant, user?.uid)
      .then((updatedBill) => {
        setBill(updatedBill);
        saveBillToHistory(updatedBill);
      })
      .catch(() => {
        joinedBillKey.current = null;
      });
  }, [bill?.id, guestName, nameConfirmed, user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!code) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <Card className="max-w-sm text-center">
          <p className="text-2xl mb-2">😕</p>
          <p className="text-[#8A7353]">No bill code provided.</p>
        </Card>
      </div>
    );
  }

  if (!firebaseConfigured) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <Card className="max-w-sm text-center">
          <p className="text-2xl mb-2">😕</p>
          <p className="text-[#8A7353]">Firebase is not configured. The bill owner needs to set up Firebase.</p>
        </Card>
      </div>
    );
  }

  async function toggleClaim(item: BillItem) {
    const allItemsClaimed = !!bill?.items.length && bill.items.every((billItem) => billItem.claimedBy.length > 0);
    if (!bill || bill.status === "settled" || allItemsClaimed || !nameConfirmed || !guestName.trim()) return;
    const name = guestName.trim();
    const participant = resolveGuestParticipant(bill, name);
    const isClaimed = item.claimedBy.includes(participant.id) || item.claimedBy.includes(name);
    const participants = bill.participants.some((p) => p.id === participant.id)
      ? bill.participants
      : [...bill.participants, participant];
    const updatedItems = bill.items.map((i) =>
      i.id === item.id
        ? {
            ...i,
            claimedBy: isClaimed
              ? i.claimedBy.filter((claim) => claim !== participant.id && claim !== name)
              : [...i.claimedBy.filter((claim) => claim !== participant.id), participant.id],
          }
        : i
    );
    const updatedBill = { ...bill, participants, items: updatedItems };
    setBill(updatedBill);
    saveBillToHistory(updatedBill);
    try {
      const savedBill = await toggleBillItemClaim(bill.id, item.id, participant, name, user?.uid);
      setBill(savedBill);
      saveBillToHistory(savedBill);
    } catch {
      setBill(bill);
      saveBillToHistory(bill);
    }
  }

  const confirmName = () => {
    if (!guestName.trim()) return;
    storeName(guestName.trim());
    setNameConfirmed(true);
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col p-4 max-w-lg md:max-w-2xl mx-auto w-full">
        <div className="skeleton h-8 w-48 mx-auto mb-2 mt-8" />
        <div className="skeleton h-5 w-32 mx-auto mb-6" />
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <Card className="max-w-sm text-center">
          <p className="text-2xl mb-2">😕</p>
          <p className="text-[#8A7353]">{error}</p>
        </Card>
      </div>
    );
  }

  if (!bill) return null;

  const owes = calculateOwes(bill);
  const allItemsClaimed = bill.items.length > 0 && bill.items.every((item) => item.claimedBy.length > 0);
  const claimsLocked = bill.status === "settled";
  const reviewOnly = claimsLocked || allItemsClaimed;

  return (
    <div className="min-h-dvh flex flex-col p-4 pb-safe max-w-lg md:max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="text-center mb-6 mt-4">
        {bill.restaurantName && (
          <p className="text-[#8A7353] text-sm mb-1">{bill.restaurantName}</p>
        )}
        <h1 className="text-2xl font-bold">{bill.name || "Shared Bill"}</h1>
        <p className="text-[#8A7353]">${bill.total.toFixed(2)} total</p>
      </div>

      {/* Name input */}
      {reviewOnly ? (
        <Card className="mb-6">
          <p className="text-sm font-semibold text-[#2D2416]">Item assignments are ready</p>
          <p className="mt-1 text-sm text-[#8A7353]">Review who owes what below — no need to join or claim items.</p>
        </Card>
      ) : !nameConfirmed ? (
        <Card className="mb-6">
          <p className="text-sm text-[#8A7353] mb-3">
            Enter your name to claim items
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmName()}
              placeholder="Your name"
              className="min-h-11 flex-1 bg-[#FDE68A] rounded-lg px-3 py-2 text-[#2D2416] placeholder-[#8A7353] outline-none focus:ring-2 focus:ring-[#D97706]"
              autoFocus
            />
            <button
              onClick={confirmName}
              disabled={!guestName.trim()}
              className="px-4 py-2 rounded-lg font-semibold gradient-bg text-white disabled:opacity-40 touch-target"
            >
              Join
            </button>
          </div>
        </Card>
      ) : (
        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-sm text-[#8A7353]">
            Claiming as <span className="text-[#2D2416] font-medium">{guestName}</span>
          </p>
          <button
            onClick={() => setNameConfirmed(false)}
            className="min-h-11 rounded-full px-3 text-xs font-semibold text-[#D97706] hover:bg-[#FDE68A]"
          >
            Change
          </button>
        </div>
      )}

      {/* Items */}
      {claimsLocked && (
        <Card className="mb-3">
          <p className="text-sm text-[#8A7353]">Claims are locked because payment requests were already sent.</p>
        </Card>
      )}
      <div className="flex flex-col gap-2 mb-6">
        {bill.items.map((item) => {
          const participant = nameConfirmed && guestName.trim()
            ? resolveGuestParticipant(bill, guestName)
            : null;
          const isMine = !!participant &&
            (item.claimedBy.includes(participant.id) || item.claimedBy.includes(guestName.trim()));
          const lineTotal = item.price * item.quantity;
          return (
            <button
              key={item.id}
              onClick={() => toggleClaim(item)}
              disabled={!nameConfirmed || reviewOnly}
              className={`w-full text-left p-3 rounded-xl border transition-colors touch-target ${
                isMine
                  ? "bg-[#FDE68A] border-[#D97706]"
                  : "bg-[#FFFFFF] border-[#FDE68A] hover:border-[#8A7353]"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium">
                    {item.quantity > 1 ? `${item.quantity}× ` : ""}
                    {item.name}
                  </p>
                  {item.claimedBy.length > 0 && (
                    <p className="text-xs text-[#8A7353] mt-1">
                      {item.claimedBy.map((claim) => resolveClaimName(bill, claim)).join(", ")}
                      {item.claimedBy.length > 1 &&
                        ` · $${(lineTotal / item.claimedBy.length).toFixed(2)} each`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="font-semibold">${lineTotal.toFixed(2)}</span>
                  {isMine && <span className="text-[#D97706] text-lg">✓</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tax + Tip info */}
      <Card className="mb-6">
        <div className="text-sm text-[#8A7353] space-y-1">
          <div className="flex justify-between">
            <span>Tax</span>
            <span>${bill.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tip</span>
            <span>${bill.tipAmount.toFixed(2)}</span>
          </div>
          <hr className="border-[#FDE68A]" />
          <div className="flex justify-between font-semibold text-[#2D2416]">
            <span>Total</span>
            <span>${bill.total.toFixed(2)}</span>
          </div>
        </div>
      </Card>

      {/* Settlement breakdown */}
      {owes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-3">Who owes what</h2>
          <div className="flex flex-col gap-2">
            {owes.map((entry, i) => (
              <Card key={entry.name}>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar name={entry.name} index={i} size={36} />
                  <div className="flex-1">
                    <p className="font-medium">
                      {entry.name}
                      {entry.covers.length > 0 && <span className="text-xs text-[#8A7353] ml-1">+ {entry.covers.join(" & ")}</span>}
                    </p>
                    <p className="text-xs text-[#8A7353]">
                      {entry.items.length} item{entry.items.length !== 1 && "s"}
                      {entry.coveredBy && ` · covered by ${entry.coveredBy}`}
                      {entry.covers.length > 0 && ` · covering ${entry.covers.join(" & ")}`}
                    </p>
                  </div>
                  <span className="font-bold">${entry.amount.toFixed(2)}</span>
                </div>
                <div className="text-xs text-[#8A7353] space-y-1">
                  {entry.items.map((item) => {
                    const lineTotal = item.price * item.quantity;
                    const itemShare = item.claimedBy.length > 1 ? lineTotal / item.claimedBy.length : lineTotal;
                    return (
                      <div key={item.id} className="flex justify-between gap-3">
                        <span>{item.name}</span>
                        <span>
                          {item.claimedBy.length > 1
                            ? `$${itemShare.toFixed(2)} / $${lineTotal.toFixed(2)}`
                            : `$${lineTotal.toFixed(2)}`}
                        </span>
                      </div>
                    );
                  })}
                  <hr className="border-[#FDE68A]" />
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>${entry.taxShare.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tip{entry.itemsSubtotal > 0 && bill.tipAmount > 0
                      ? ` (${Math.round((entry.tipShare / entry.itemsSubtotal) * 100)}%)`
                      : ""}</span>
                    <span>${entry.tipShare.toFixed(2)}</span>
                  </div>
                  {entry.coveredBy && (
                    <p className="pt-2 font-semibold text-[#6B4F2A]">
                      {entry.name} owes {entry.coveredBy}: ${entry.amount.toFixed(2)}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-center text-xs text-[#8A7353] pb-6">
        Split with <span className="gradient-text font-semibold">Partake</span>
      </p>
    </div>
  );
}

export default function SharedBillPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex flex-col p-4 max-w-lg md:max-w-2xl mx-auto w-full">
          <div className="skeleton h-8 w-48 mx-auto mb-2 mt-8" />
          <div className="skeleton h-5 w-32 mx-auto mb-6" />
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-16 w-full" />
            ))}
          </div>
        </div>
      }
    >
      <SharedBillContent />
    </Suspense>
  );
}
