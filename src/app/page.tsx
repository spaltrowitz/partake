"use client";

import { useState, useEffect } from "react";
import type { ParsedReceipt, Bill, BillItem, Participant, SavedContact } from "@/types";
import { ReceiptScanner } from "@/components/ReceiptScanner";
import { ReceiptEditor } from "@/components/ReceiptEditor";
import { BillSplitter } from "@/components/BillSplitter";
import { PrimaryButton } from "@/components/UI";
import { Avatar } from "@/components/Avatar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { getSavedContacts, saveAllParticipantsAsContacts } from "@/services/localContacts";
import { getBillHistory, saveBillToHistory, deleteBillFromHistory } from "@/services/billHistory";
import { getUserProfile, saveUserProfile } from "@/services/userProfile";
import type { UserProfile } from "@/services/userProfile";
import { useAuthContext } from "@/components/AuthProvider";
import { saveBill } from "@/services/firestore";

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
  const [billHistory, setBillHistory] = useState<Bill[]>([]);
  const [showRescanConfirm, setShowRescanConfirm] = useState(false);
  const [rescanReasons, setRescanReasons] = useState<string[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const { user, loading: authLoading } = useAuthContext();

  useEffect(() => {
    setSavedContacts(getSavedContacts());
    setBillHistory(getBillHistory());
    setMyProfile(getUserProfile());

    // Restore active session (e.g., after Venmo redirect)
    try {
      const saved = localStorage.getItem("partake_active_session");
      if (saved) {
        const session = JSON.parse(saved);
        if (session.bill) {
          setBill({ ...session.bill, createdAt: new Date(session.bill.createdAt) });
          setParticipants(session.bill.participants);
          setStep("split");
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (step === "participants" && myProfile) {
      setParticipants(prev => {
        if (prev.some(p => p.name.toLowerCase() === myProfile.name.toLowerCase())) return prev;
        const paymentHandle = (myProfile.venmoUsername || myProfile.cashAppUsername || "").replace(/^@/, "");
        const isCashApp = paymentHandle.startsWith("$");
        return [{
          id: crypto.randomUUID(),
          name: myProfile.name,
          venmoUsername: !isCashApp && paymentHandle ? paymentHandle : undefined,
          cashAppUsername: isCashApp ? paymentHandle : undefined,
          isAppUser: true,
        }, ...prev];
      });
    }
  }, [step, myProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  function addParticipant() {
    if (!newName.trim()) return;
    if (participants.some((p) => p.name.toLowerCase() === newName.trim().toLowerCase())) return;
    // Auto-detect payment app from username format
    const paymentHandle = newVenmo.trim().replace(/^@/, "");
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
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
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

    const rawSubtotal =
      receipt.subtotal ?? items.reduce((s, i) => s + i.price * i.quantity, 0);
    const discount = receipt.discount ?? 0;
    const subtotal = Math.max(0, rawSubtotal - discount);
    const tax = receipt.tax ?? 0;
    const tipAmount = receipt.tip ?? Math.round(subtotal * tipPercent) / 100;

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
      tipPercent: receipt.tip !== undefined ? undefined : tipPercent,
      total: Math.round((subtotal + tax + tipAmount) * 100) / 100,
      participants,
      createdBy: user?.uid ?? "local",
      createdAt: new Date(),
      status: "splitting",
      shareCode,
    };

    setBill(newBill);
    saveBillToHistory(newBill);
    saveBill(newBill).catch((err) => console.warn("Cloud sync failed:", err));
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
      <main className="min-h-dvh flex flex-col items-center gap-8 p-6 pt-16">
        {/* Logo mark — overlapping circles representing people sharing */}
        <div className="flex -space-x-3">
          <div className="w-12 h-12 rounded-full bg-[#E8613C] opacity-90" />
          <div className="w-12 h-12 rounded-full bg-[#F4A261] opacity-90" />
          <div className="w-12 h-12 rounded-full bg-[#FFD6A5] opacity-90" />
        </div>
        <h1 className="text-5xl font-bold gradient-text tracking-tight">Partake</h1>
        <p className="text-lg text-[#9C8E80] text-center max-w-sm">
          Split the bill in seconds.
        </p>
        <p className="text-sm text-[#9C8E80] text-center max-w-xs">
          Snap your receipt, claim what you ordered, and send payment requests — no app needed.
        </p>
        <PrimaryButton onClick={() => {
          // Clear active session for a fresh start
          try { localStorage.removeItem("partake_active_session"); } catch {}
          setBill(null);
          setReceipt(null);
          setParticipants([]);
          setStep("scan");
        }} className="max-w-xs">
          Scan the receipt
        </PrimaryButton>


        {/* Bill history */}
        {billHistory.length > 0 && (
          <div className="w-full max-w-md mt-4">
            <h2 className="text-sm font-semibold text-[#9C8E80] mb-3">Recent bills</h2>
            <div className="flex flex-col gap-2">
              {billHistory.slice(0, 5).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-2 bg-[#FFFFFF] rounded-xl hover:bg-[#F5EDE3] transition-colors"
                >
                  <button
                    onClick={() => { setBill(b); setParticipants(b.participants); setStep("split"); }}
                    className="flex items-center justify-between flex-1 p-3 text-left"
                  >
                    <div>
                      <p className="font-medium text-sm">{b.name || "Untitled bill"}</p>
                      <p className="text-xs text-[#9C8E80]">
                        {b.participants.length} people · {new Date(b.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="font-bold text-sm">${b.total.toFixed(2)}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBillFromHistory(b.id);
                      setBillHistory(prev => prev.filter(bill => bill.id !== b.id));
                    }}
                    className="p-3 text-[#9C8E80] hover:text-[#E8613C] transition-colors text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {process.env.NODE_ENV === "development" && (
          <button
            onClick={loadTestData}
            className="text-xs text-[#C4B5A6] hover:text-[#9C8E80] transition-colors mt-4"
          >
            🧪 Test mode — skip to splitting with sample data
          </button>
        )}

        <footer className="mt-8 pt-4 border-t border-[#E8DFD4] w-full max-w-md text-center">
          <div className="flex justify-center gap-4 text-xs text-[#C4B5A6]">
            <a href="/privacy" className="hover:text-[#9C8E80] transition-colors">Privacy</a>
            <span>·</span>
            <a href="/terms" className="hover:text-[#9C8E80] transition-colors">Terms</a>
          </div>
        </footer>
      </main>
    );
  }

  // Participants
  if (step === "participants") {
    if (!myProfile) {
      return (
        <main className="p-6 max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-2 text-center">First, who are you?</h1>
          <p className="text-sm text-[#9C8E80] text-center mb-6">We&apos;ll remember you for next time</p>
          <div className="flex flex-col gap-3 mb-6">
            <input
              type="text"
              placeholder="Your name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="px-4 py-3 rounded-xl border border-[#F5EDE3] bg-transparent text-center"
              autoFocus
            />
            <input
              type="text"
              placeholder="Venmo or $CashApp (optional)"
              value={newVenmo}
              onChange={(e) => setNewVenmo(e.target.value)}
              className="px-4 py-3 rounded-xl border border-[#F5EDE3] bg-transparent text-sm text-center"
            />
            <PrimaryButton
              onClick={() => {
                if (!newName.trim()) return;
                const handle = newVenmo.trim();
                const isCashApp = handle.startsWith("$");
                const profile: UserProfile = {
                  name: newName.trim(),
                  venmoUsername: !isCashApp && handle ? handle : undefined,
                  cashAppUsername: isCashApp ? handle : undefined,
                };
                saveUserProfile(profile);
                setMyProfile(profile);
                setNewName("");
                setNewVenmo("");
              }}
              disabled={!newName.trim()}
            >
              That&apos;s me
            </PrimaryButton>
          </div>
          <button onClick={() => setStep("edit")} className="text-sm text-[#9C8E80]">← Back to receipt</button>
        </main>
      );
    }

    const unusedContacts = savedContacts.filter(
      (c) => !participants.some((p) => p.name.toLowerCase() === c.name.toLowerCase())
    );

    return (
      <main className="p-6 max-w-md mx-auto">
        <button
          onClick={() => setStep("edit")}
          className="text-sm text-[#9C8E80] mb-4"
        >
          ← Back to receipt
        </button>
        <h1 className="text-2xl font-bold mb-6 text-center">Who&apos;s in?</h1>

        {/* Current participants */}
        {participants.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 justify-center">
              {participants.map((p) => (
                <span
                  key={p.id}
                  className="flex items-center gap-1 bg-[#F5EDE3] px-3 py-1 rounded-full text-sm"
                >
                  {p.name}
                  {myProfile && p.name.toLowerCase() === myProfile.name.toLowerCase() && (
                    <span className="text-xs text-[#9C8E80]">(you)</span>
                  )}
                  {p.venmoUsername && (
                    <a
                      href={`https://venmo.com/${p.venmoUsername.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#9C8E80] hover:text-[#E8613C] text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      @{p.venmoUsername.replace(/^@/, "")} ↗
                    </a>
                  )}
                  <button
                    onClick={() => removeParticipant(p.id)}
                    className="text-[#9C8E80] hover:text-[#E8613C] ml-1 p-2 -mr-2"
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
            <p className="text-sm text-[#9C8E80] mb-2 text-center">Tap to add</p>
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
          <div className="flex flex-col gap-3 mb-6 p-4 bg-[#F5EDE3] rounded-xl">
            <p className="text-sm font-semibold text-center">Add a friend</p>
            <input
              type="text"
              placeholder="Their name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="px-4 py-3 rounded-xl border border-[#E8DDD0] bg-white text-center"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim()) {
                  const paymentInput = e.currentTarget.parentElement?.querySelector('input[placeholder*="@"]') as HTMLInputElement;
                  paymentInput?.focus();
                }
              }}
            />
            <div className="relative">
              <input
                type="text"
                placeholder="@venmo or $cashtag (optional)"
                value={newVenmo}
                onChange={(e) => {
                  let val = e.target.value;
                  // Auto-prefix @ if they start typing a letter (Venmo)
                  if (val.length === 1 && /[a-zA-Z]/.test(val)) {
                    val = "@" + val;
                  }
                  setNewVenmo(val);
                }}
                className="px-4 py-3 rounded-xl border border-[#E8DDD0] bg-white text-sm text-center w-full"
                onKeyDown={(e) => e.key === "Enter" && addParticipant()}
              />
              {newVenmo && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9C8E80]">
                  {newVenmo.startsWith("$") ? "Cash App" : "Venmo"}
                </span>
              )}
            </div>
            <PrimaryButton
              onClick={() => { addParticipant(); setShowAddForm(false); }}
              disabled={!newName.trim()}
            >
              Add {newName.trim() || "friend"}
            </PrimaryButton>
            <button
              onClick={() => { setShowAddForm(false); setNewName(""); setNewVenmo(""); }}
              className="text-sm text-[#9C8E80] text-center"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-3 rounded-xl border-2 border-dashed border-[#E8DDD0] text-[#E8613C] font-semibold text-center mb-6 hover:bg-[#F5EDE3] transition-colors"
          >
            + Add another person
          </button>
        )}

        <div className="mt-8">
          <PrimaryButton
            onClick={() => {
              if (bill && receipt) {
                // Rebuild items from receipt (user may have edited them)
                const items: BillItem[] = receipt.items.map((p) => {
                  // Preserve existing claims if item ID matches
                  const existing = bill.items.find((i) => i.id === p.id);
                  return {
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    claimedBy: existing?.claimedBy ?? [],
                    quantity: p.quantity,
                  };
                });
                const rawSubtotal = receipt.subtotal ?? items.reduce((s, i) => s + i.price * i.quantity, 0);
                const discount = receipt.discount ?? 0;
                const subtotal = Math.max(0, rawSubtotal - discount);
                const tax = receipt.tax ?? 0;
                const tipAmount = receipt.tip ?? Math.round(subtotal * tipPercent) / 100;
                const updatedBill = {
                  ...bill,
                  items,
                  subtotal,
                  tax,
                  tipAmount,
                  total: Math.round((subtotal + tax + tipAmount) * 100) / 100,
                  participants,
                };
                setBill(updatedBill);
                saveBillToHistory(updatedBill);
                setStep("split");
              } else {
                createBill();
              }
            }}
            disabled={participants.length < 1 || authLoading}
          >
            Split the bill
          </PrimaryButton>
          {participants.length < 1 && (
            <p className="text-xs text-[#9C8E80] text-center mt-2">
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
      <main className="min-h-dvh p-6 max-w-md mx-auto">
        <button
          onClick={() => setStep("landing")}
          className="text-sm text-[#9C8E80] mb-4"
        >
          ← Back
        </button>
        <ErrorBoundary>
          <ReceiptScanner
            onReceipt={(r) => {
              setReceipt(r);
              setStep("edit");
            }}
          />
        </ErrorBoundary>
      </main>
    );
  }

  // Edit receipt — reconstruct from bill if receipt is null (e.g., loaded from history)
  if (step === "edit" && !receipt && bill) {
    setReceipt({
      items: bill.items.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        confidence: 1,
        quantity: i.quantity,
      })),
      tax: bill.tax,
      tip: bill.tipAmount,
      subtotal: bill.subtotal,
      total: bill.total,
      restaurantName: bill.restaurantName,
    });
  }

  if (step === "edit" && receipt) {
    return (
      <main className="min-h-dvh p-6 max-w-md mx-auto">
        <button
          onClick={() => {
            if (receipt.items.length > 0) {
              setShowRescanConfirm(true);
            } else {
              setStep("scan");
            }
          }}
          className="text-sm text-[#9C8E80] mb-4"
        >
          ← Re-scan
        </button>

        {showRescanConfirm && (
          <div className="mb-4 p-4 bg-[#F5EDE3] rounded-xl flex flex-col gap-3">
            <p className="text-sm font-medium">What went wrong? (select all that apply)</p>
            <div className="flex flex-wrap gap-2">
              {["Wrong items", "Wrong prices", "Missing items", "Couldn\u0027t read it", "Other"].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setRescanReasons(prev => 
                    prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
                  )}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    rescanReasons.includes(reason)
                      ? "gradient-bg text-white"
                      : "bg-white border border-[#E8DDD0] text-[#9C8E80]"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                if (rescanReasons.length > 0) {
                  fetch("/api/feedback", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      category: "bug",
                      summary: `Re-scan: ${rescanReasons.join(", ")}`,
                      details: `Restaurant: ${receipt.restaurantName || "unknown"}, Items: ${receipt.items.length}`,
                    }),
                  }).catch(() => {});
                }
                setShowRescanConfirm(false);
                setRescanReasons([]);
                setStep("scan");
              }}
              className="w-full py-2 rounded-full text-white font-semibold gradient-bg text-sm"
            >
              Re-scan
            </button>
            <button
              onClick={() => { setShowRescanConfirm(false); setRescanReasons([]); }}
              className="text-sm text-[#9C8E80] text-center"
            >
              Cancel
            </button>
          </div>
        )}
        <h1 className="text-2xl font-bold mb-4">Review the receipt</h1>
        <ReceiptEditor receipt={receipt} onChange={setReceipt} />
        <div className="mt-6">
          <PrimaryButton
            onClick={() => setStep("participants")}
            disabled={receipt.items.length === 0}
          >
            Next: Who&apos;s in?
          </PrimaryButton>
        </div>
      </main>
    );
  }

  // Split
  if (step === "split" && bill) {
    return (
      <main className="min-h-dvh max-w-md mx-auto">
        <ErrorBoundary>
          <BillSplitter bill={bill} onBack={() => setStep("participants")} onEditReceipt={() => setStep("edit")} />
        </ErrorBoundary>
      </main>
    );
  }

  return null;
}
