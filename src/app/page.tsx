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
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    setSavedContacts(getSavedContacts());
  }, []);

  function addParticipant() {
    if (!newName.trim()) return;
    if (participants.some((p) => p.name.toLowerCase() === newName.trim().toLowerCase())) return;
    // Auto-detect payment app from username format
    const paymentHandle = newVenmo.trim();
    const isCashApp = paymentHandle.startsWith("$");
    const p: Participant = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      venmoUsername: !isCashApp && paymentHandle ? paymentHandle : undefined,
      cashAppUsername: isCashApp ? paymentHandle : undefined,
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

  function loadTestData() {
    const testParticipants: Participant[] = [
      { id: "test-1", name: "Sam", venmoUsername: "sam-test", isAppUser: false },
      { id: "test-2", name: "Alex", venmoUsername: "alex-test", isAppUser: false },
      { id: "test-3", name: "Jordan", isAppUser: false },
    ];

    const testItems: BillItem[] = [
      { id: "item-1", name: "Margherita Pizza", price: 18.00, claimedBy: [], quantity: 1 },
      { id: "item-2", name: "Caesar Salad", price: 14.00, claimedBy: [], quantity: 1 },
      { id: "item-3", name: "Pasta Bolognese", price: 22.00, claimedBy: [], quantity: 1 },
      { id: "item-4", name: "Garlic Bread", price: 8.00, claimedBy: [], quantity: 1 },
      { id: "item-5", name: "Tiramisu", price: 12.00, claimedBy: [], quantity: 1 },
      { id: "item-6", name: "Sparkling Water", price: 5.00, claimedBy: [], quantity: 2 },
      { id: "item-7", name: "Glass of Red Wine", price: 15.00, claimedBy: [], quantity: 1 },
    ];

    const subtotal = testItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const tax = Math.round(subtotal * 0.08875 * 100) / 100; // NYC tax
    const tipAmount = Math.round(subtotal * 0.20 * 100) / 100;

    const testBill: Bill = {
      id: crypto.randomUUID(),
      name: "Test Dinner",
      restaurantName: "Luca's Trattoria",
      items: testItems,
      subtotal,
      tax,
      tipAmount,
      tipPercent: 20,
      total: Math.round((subtotal + tax + tipAmount) * 100) / 100,
      participants: testParticipants,
      createdBy: "local",
      createdAt: new Date(),
      status: "splitting",
      shareCode: "test01",
    };

    setParticipants(testParticipants);
    setBill(testBill);
    setStep("split");
  }

  // Landing
  if (step === "landing") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-6">
        {/* Logo mark — overlapping circles representing people sharing */}
        <div className="flex -space-x-3">
          <div className="w-12 h-12 rounded-full bg-[#FF8A80] opacity-90" />
          <div className="w-12 h-12 rounded-full bg-[#FFAB91] opacity-90" />
          <div className="w-12 h-12 rounded-full bg-[#FFD180] opacity-90" />
        </div>
        <h1 className="text-5xl font-bold gradient-text tracking-tight">Partake</h1>
        <p className="text-lg text-[#8B9BB4] text-center max-w-sm">
          No math. No stress.
        </p>
        <PrimaryButton onClick={() => setStep("participants")} className="max-w-xs">
          Let&apos;s settle up
        </PrimaryButton>
        <p className="text-xs text-[#8B9BB4]">Free to use. Sign up for Partake to learn your habits over time.</p>
        <button
          onClick={loadTestData}
          className="text-xs text-[#4A5568] hover:text-[#8B9BB4] transition-colors mt-4"
        >
          🧪 Test mode — skip to splitting with sample data
        </button>
      </main>
    );
  }

  // Participants
  if (step === "participants") {
    const unusedContacts = savedContacts.filter(
      (c) => !participants.some((p) => p.name.toLowerCase() === c.name.toLowerCase())
    );

    return (
      <main className="p-6 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">Who&apos;s here?</h1>

        {/* Current participants */}
        {participants.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-[#8B9BB4] mb-2 text-center">Splitting with</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {participants.map((p) => (
                <span
                  key={p.id}
                  className="flex items-center gap-1 bg-[#1C2A4A] px-3 py-1 rounded-full text-sm"
                >
                  {p.name}
                  {p.venmoUsername && (
                    <span className="text-[#8B9BB4]">@{p.venmoUsername}</span>
                  )}
                  <button
                    onClick={() => removeParticipant(p.id)}
                    className="text-[#8B9BB4] hover:text-[#FF8A80] ml-1"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Saved contacts — quick tap to add */}
        {unusedContacts.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-[#8B9BB4] mb-2 text-center">Tap to add</p>
            <div className="flex gap-3 overflow-x-auto pb-2 justify-center">
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

        {/* Add new person — collapsed by default */}
        {showAddForm ? (
          <div className="flex flex-col gap-3 mb-6">
            <input
              type="text"
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="px-4 py-3 rounded-xl border border-[#1C2A4A] bg-transparent text-center"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && addParticipant()}
            />
            <input
              type="text"
              placeholder="Venmo or $CashApp (optional)"
              value={newVenmo}
              onChange={(e) => setNewVenmo(e.target.value)}
              className="px-4 py-3 rounded-xl border border-[#1C2A4A] bg-transparent text-sm text-center"
              onKeyDown={(e) => e.key === "Enter" && addParticipant()}
            />
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => { addParticipant(); setShowAddForm(false); }}
                disabled={!newName.trim()}
                className="text-[#FF8A80] font-semibold disabled:opacity-30"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-[#8B9BB4]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="text-[#FF8A80] font-semibold mb-6 text-center"
          >
            + Add someone new
          </button>
        )}

        <div className="mt-8">
          <PrimaryButton
            onClick={() => setStep("scan")}
            disabled={participants.length < 1}
          >
            Next: Add the receipt
          </PrimaryButton>
          {participants.length < 1 && (
            <p className="text-xs text-[#8B9BB4] text-center mt-2">
              Add at least 1 person
            </p>
          )}
        </div>
      </main>
    );
  }

  // Scan
  if (step === "scan") {
    return (
      <main className="min-h-screen p-6 max-w-md mx-auto">
        <button
          onClick={() => setStep("participants")}
          className="text-sm text-[#8B9BB4] mb-4"
        >
          ← Back to people
        </button>
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
        <button
          onClick={() => setStep("scan")}
          className="text-sm text-[#8B9BB4] mb-4"
        >
          ← Re-scan or re-enter
        </button>
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
