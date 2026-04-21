"use client";

import { useState, useEffect } from "react";
import type { ParsedReceipt, Bill, BillItem, Participant, SavedContact } from "@/types";
import { ReceiptScanner } from "@/components/ReceiptScanner";
import { ReceiptEditor } from "@/components/ReceiptEditor";
import { BillSplitter } from "@/components/BillSplitter";
import { PrimaryButton } from "@/components/UI";
import { Avatar } from "@/components/Avatar";
import { getSavedContacts, saveAllParticipantsAsContacts } from "@/services/localContacts";

type Step = "landing" | "participants" | "scan" | "edit" | "split";

export default function Home() {
  const [step, setStep] = useState<Step>("landing");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newName, setNewName] = useState("");
  const [newVenmo, setNewVenmo] = useState("");
  const [receipt, setReceipt] = useState<ParsedReceipt | null>(null);
  const [bill, setBill] = useState<Bill | null>(null);
  const [tipPercent] = useState(20);
  const [savedContacts, setSavedContacts] = useState<SavedContact[]>([]);

  useEffect(() => {
    setSavedContacts(getSavedContacts());
  }, []);

  function addParticipant() {
    if (!newName.trim()) return;
    const p: Participant = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      venmoUsername: newVenmo.trim() || undefined,
      isAppUser: false,
    };
    setParticipants((prev) => [...prev, p]);
    setNewName("");
    setNewVenmo("");
  }

  function removeParticipant(id: string) {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  }

  function createBill() {
    if (!receipt) return;
    const items: BillItem[] = receipt.items.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      claimedBy: [],
      quantity: p.quantity,
    }));

    const subtotal =
      receipt.subtotal ?? items.reduce((s, i) => s + i.price * i.quantity, 0);
    const tax = receipt.tax ?? 0;
    const tipAmount = Math.round(subtotal * tipPercent) / 100;

    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    const shareCode = Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");

    const newBill: Bill = {
      id: crypto.randomUUID(),
      name: receipt.restaurantName ?? "",
      restaurantName: receipt.restaurantName,
      items,
      subtotal,
      tax,
      tipAmount,
      tipPercent,
      total: Math.round((subtotal + tax + tipAmount) * 100) / 100,
      participants,
      createdBy: "local",
      createdAt: new Date(),
      status: "splitting",
      shareCode,
    };

    setBill(newBill);
    // Save participants for next time
    saveAllParticipantsAsContacts(participants);
    setStep("split");
  }

  // Landing
  if (step === "landing") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
        <span className="text-7xl">🍽️</span>
        <h1 className="text-4xl font-bold gradient-text">Partake</h1>
        <p className="text-lg text-gray-500 text-center max-w-sm">
          No math. No stress.
        </p>
        <PrimaryButton onClick={() => setStep("participants")} className="max-w-xs">
          Let&apos;s eat 🍕
        </PrimaryButton>
        <p className="text-xs text-gray-400">No app. No account. Just vibes.</p>
      </main>
    );
  }

  // Participants
  if (step === "participants") {
    const unusedContacts = savedContacts.filter(
      (c) => !participants.some((p) => p.name.toLowerCase() === c.name.toLowerCase())
    );

    return (
      <main className="min-h-screen p-6 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">Who&apos;s here?</h1>

        {/* Saved contacts — quick tap to add */}
        {unusedContacts.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-2">Your people</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {unusedContacts.map((contact, i) => (
                <button
                  key={contact.id}
                  onClick={() => {
                    setParticipants((prev) => [
                      ...prev,
                      {
                        id: contact.id,
                        name: contact.name,
                        venmoUsername: contact.venmoUsername,
                        isAppUser: false,
                      },
                    ]);
                  }}
                  className="flex flex-col items-center gap-1 min-w-[64px]"
                >
                  <Avatar name={contact.name} index={i} size={48} />
                  <span className="text-xs truncate max-w-[64px]">{contact.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add someone new */}
        <div className="flex flex-col gap-3 mb-6">
          <input
            type="text"
            placeholder="Add someone new"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="px-4 py-3 rounded-xl border dark:border-gray-700 bg-transparent"
            onKeyDown={(e) => e.key === "Enter" && addParticipant()}
          />
          <input
            type="text"
            placeholder="Venmo username (optional)"
            value={newVenmo}
            onChange={(e) => setNewVenmo(e.target.value)}
            className="px-4 py-3 rounded-xl border dark:border-gray-700 bg-transparent text-sm"
            onKeyDown={(e) => e.key === "Enter" && addParticipant()}
          />
          <button
            onClick={addParticipant}
            disabled={!newName.trim()}
            className="text-[#FF6B6B] font-semibold disabled:opacity-30"
          >
            + Add person
          </button>
        </div>

        {/* Current participants */}
        {participants.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-2">Splitting with</p>
            <div className="flex flex-wrap gap-2">
              {participants.map((p) => (
                <span
                  key={p.id}
                  className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-sm"
                >
                  {p.name}
                  {p.venmoUsername && (
                    <span className="text-gray-400">@{p.venmoUsername}</span>
                  )}
                  <button
                    onClick={() => removeParticipant(p.id)}
                    className="text-gray-400 hover:text-red-500 ml-1"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <PrimaryButton
          onClick={() => setStep("scan")}
          disabled={participants.length < 1}
        >
          Next: Add the receipt
        </PrimaryButton>
        {participants.length < 1 && (
          <p className="text-xs text-gray-400 text-center mt-2">
            Add at least 1 person
          </p>
        )}
      </main>
    );
  }

  // Scan
  if (step === "scan") {
    return (
      <main className="min-h-screen p-6 max-w-md mx-auto">
        <ReceiptScanner
          onReceipt={(r) => {
            setReceipt(r);
            setStep("edit");
          }}
        />
      </main>
    );
  }

  // Edit receipt
  if (step === "edit" && receipt) {
    return (
      <main className="min-h-screen p-6 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">Review the receipt</h1>
        <ReceiptEditor receipt={receipt} onChange={setReceipt} />
        <div className="mt-6">
          <PrimaryButton
            onClick={createBill}
            disabled={receipt.items.length === 0}
          >
            Looks good — start splitting
          </PrimaryButton>
        </div>
      </main>
    );
  }

  // Split
  if (step === "split" && bill) {
    return (
      <main className="min-h-screen max-w-md mx-auto">
        <BillSplitter bill={bill} />
      </main>
    );
  }

  return null;
}
