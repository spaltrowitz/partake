"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { firebaseConfigured } from "@/lib/firebase";
import { getBillByShareCode, listenToBill, saveBill } from "@/services/firestore";
import { Avatar } from "@/components/Avatar";
import { Card } from "@/components/UI";
import type { Bill, BillItem } from "@/types";

const GUEST_NAME_KEY = "partake-guest-name";

function getStoredName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(GUEST_NAME_KEY) || "";
}

function storeName(name: string) {
  localStorage.setItem(GUEST_NAME_KEY, name);
}

function calculateOwes(bill: Bill): { name: string; amount: number }[] {
  const participantTotals = new Map<string, number>();

  for (const item of bill.items) {
    if (item.claimedBy.length === 0) continue;
    const lineTotal = item.price * item.quantity;
    const perPerson = lineTotal / item.claimedBy.length;
    for (const name of item.claimedBy) {
      participantTotals.set(name, (participantTotals.get(name) || 0) + perPerson);
    }
  }

  const claimedSubtotal = Array.from(participantTotals.values()).reduce((a, b) => a + b, 0);
  if (claimedSubtotal === 0) return [];

  return Array.from(participantTotals.entries()).map(([name, itemTotal]) => {
    const share = itemTotal / claimedSubtotal;
    const taxShare = bill.tax * share;
    const tipShare = bill.tipAmount * share;
    return { name, amount: itemTotal + taxShare + tipShare };
  }).sort((a, b) => b.amount - a.amount);
}

function SharedBillContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [nameConfirmed, setNameConfirmed] = useState(false);

  useEffect(() => {
    const stored = getStoredName();
    if (stored) {
      setGuestName(stored);
      setNameConfirmed(true);
    }
  }, []);

  useEffect(() => {
    if (!code) {
      setError("No bill code provided.");
      setLoading(false);
      return;
    }
    if (!firebaseConfigured) {
      setError("Firebase is not configured. The bill owner needs to set up Firebase.");
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    getBillByShareCode(code)
      .then((found) => {
        if (!found) {
          setError("Bill not found. The link may be invalid or expired.");
          setLoading(false);
          return;
        }
        setBill(found);
        setLoading(false);
        unsubscribe = listenToBill(found.id, (updated) => {
          if (updated) setBill(updated);
        });
      })
      .catch(() => {
        setError("Failed to load bill. Please try again.");
        setLoading(false);
      });

    return () => {
      unsubscribe?.();
    };
  }, [code]);

  const toggleClaim = useCallback(
    async (item: BillItem) => {
      if (!bill || !nameConfirmed || !guestName.trim()) return;
      const name = guestName.trim();
      const isClaimed = item.claimedBy.includes(name);
      const updatedItems = bill.items.map((i) =>
        i.id === item.id
          ? {
              ...i,
              claimedBy: isClaimed
                ? i.claimedBy.filter((n) => n !== name)
                : [...i.claimedBy, name],
            }
          : i
      );
      const updatedBill = { ...bill, items: updatedItems };
      setBill(updatedBill);
      try {
        await saveBill(updatedBill);
      } catch {
        setBill(bill);
      }
    },
    [bill, guestName, nameConfirmed]
  );

  const confirmName = () => {
    if (!guestName.trim()) return;
    storeName(guestName.trim());
    setNameConfirmed(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col p-4 max-w-lg mx-auto w-full">
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-sm text-center">
          <p className="text-2xl mb-2">😕</p>
          <p className="text-[#8B9BB4]">{error}</p>
        </Card>
      </div>
    );
  }

  if (!bill) return null;

  const owes = calculateOwes(bill);

  return (
    <div className="min-h-screen flex flex-col p-4 max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="text-center mb-6 mt-4">
        {bill.restaurantName && (
          <p className="text-[#8B9BB4] text-sm mb-1">{bill.restaurantName}</p>
        )}
        <h1 className="text-2xl font-bold">{bill.name || "Shared Bill"}</h1>
        <p className="text-[#8B9BB4]">${bill.total.toFixed(2)} total</p>
      </div>

      {/* Name input */}
      {!nameConfirmed ? (
        <Card className="mb-6">
          <p className="text-sm text-[#8B9BB4] mb-3">
            Enter your name to claim items
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmName()}
              placeholder="Your name"
              className="flex-1 bg-[#1C2A4A] rounded-lg px-3 py-2 text-white placeholder-[#8B9BB4] outline-none focus:ring-2 focus:ring-[#FF8A80]"
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
          <p className="text-sm text-[#8B9BB4]">
            Claiming as <span className="text-white font-medium">{guestName}</span>
          </p>
          <button
            onClick={() => setNameConfirmed(false)}
            className="text-xs text-[#FF8A80] hover:underline"
          >
            Change
          </button>
        </div>
      )}

      {/* Items */}
      <div className="flex flex-col gap-2 mb-6">
        {bill.items.map((item) => {
          const isMine = nameConfirmed && item.claimedBy.includes(guestName.trim());
          const lineTotal = item.price * item.quantity;
          return (
            <button
              key={item.id}
              onClick={() => toggleClaim(item)}
              disabled={!nameConfirmed}
              className={`w-full text-left p-3 rounded-xl border transition-colors touch-target ${
                isMine
                  ? "bg-[#1C2A4A] border-[#FF8A80]"
                  : "bg-[#152038] border-[#1C2A4A] hover:border-[#8B9BB4]"
              } disabled:opacity-60`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium">
                    {item.quantity > 1 ? `${item.quantity}× ` : ""}
                    {item.name}
                  </p>
                  {item.claimedBy.length > 0 && (
                    <p className="text-xs text-[#8B9BB4] mt-1">
                      {item.claimedBy.join(", ")}
                      {item.claimedBy.length > 1 &&
                        ` · $${(lineTotal / item.claimedBy.length).toFixed(2)} each`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="font-semibold">${lineTotal.toFixed(2)}</span>
                  {isMine && <span className="text-[#FF8A80] text-lg">✓</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tax + Tip info */}
      <Card className="mb-6">
        <div className="text-sm text-[#8B9BB4] space-y-1">
          <div className="flex justify-between">
            <span>Tax</span>
            <span>${bill.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tip</span>
            <span>${bill.tipAmount.toFixed(2)}</span>
          </div>
          <hr className="border-[#1C2A4A]" />
          <div className="flex justify-between font-semibold text-white">
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
                <div className="flex items-center gap-3">
                  <Avatar name={entry.name} index={i} size={36} />
                  <span className="flex-1 font-medium">{entry.name}</span>
                  <span className="font-bold">${entry.amount.toFixed(2)}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-center text-xs text-[#8B9BB4] pb-6">
        Split with <span className="gradient-text font-semibold">Partake</span>
      </p>
    </div>
  );
}

export default function SharedBillPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col p-4 max-w-lg mx-auto w-full">
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
