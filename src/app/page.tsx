"use client";

import { useEffect, useState } from "react";
import type { ParsedReceipt, Bill, BillItem, Participant, SavedContact, AppUser } from "@/types";
import { ReceiptScanner } from "@/components/ReceiptScanner";
import { ReceiptEditor } from "@/components/ReceiptEditor";
import { BillSplitter } from "@/components/BillSplitter";
import { PrimaryButton, TopBarButton } from "@/components/UI";
import { Avatar } from "@/components/Avatar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { getSavedContacts, saveAllParticipantsAsContacts } from "@/services/localContacts";
import { getBillHistory, saveBillToHistory, deleteBillFromHistory } from "@/services/billHistory";
import { getUserProfile, saveUserProfile } from "@/services/userProfile";
import type { UserProfile } from "@/services/userProfile";
import { useAuthContext } from "@/components/AuthProvider";
import { getContacts, getUserBills, saveBill, saveContact, saveUser } from "@/services/firestore";
import { FeedbackWidget } from "@/components/FeedbackWidget";

type Step = "landing" | "participants" | "scan" | "edit" | "split";

function reconstructReceiptFromBill(bill: Bill): ParsedReceipt {
  return {
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
  };
}

function participantFromProfile(profile: UserProfile): Participant {
  const paymentHandle = (profile.venmoUsername || profile.cashAppUsername || "").replace(/^@/, "");
  const isCashApp = paymentHandle.startsWith("$");
  return {
    id: crypto.randomUUID(),
    name: profile.name,
    venmoUsername: !isCashApp && paymentHandle ? paymentHandle : undefined,
    cashAppUsername: isCashApp ? paymentHandle : undefined,
    isAppUser: true,
  };
}

function getInitialHomeState(): {
  step: Step;
  bill: Bill | null;
  participants: Participant[];
  savedContacts: SavedContact[];
  billHistory: Bill[];
  myProfile: UserProfile | null;
} {
  let bill: Bill | null = null;
  let participants: Participant[] = [];
  let step: Step = "landing";

  try {
    const saved = typeof window !== "undefined"
      ? localStorage.getItem("partake_active_session")
      : null;
    if (saved) {
      const session = JSON.parse(saved) as { bill?: Bill };
      if (session.bill) {
        bill = { ...session.bill, createdAt: new Date(session.bill.createdAt) };
        participants = session.bill.participants;
        step = "split";
      }
    }
  } catch {}

  return {
    step,
    bill,
    participants,
    savedContacts: getSavedContacts(),
    billHistory: getBillHistory(),
    myProfile: getUserProfile(),
  };
}

function mergeContacts(existing: SavedContact[], incoming: SavedContact[]): SavedContact[] {
  const seen = new Set(existing.map((c) => c.name.trim().toLowerCase()));
  const merged = [...existing];
  for (const contact of incoming) {
    const key = contact.name.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(contact);
    }
  }
  return merged;
}

function mergeBills(existing: Bill[], incoming: Bill[]): Bill[] {
  const billsById = new Map<string, Bill>();
  for (const bill of [...existing, ...incoming]) {
    billsById.set(bill.id, {
      ...bill,
      createdAt: new Date(bill.createdAt),
    });
  }
  return Array.from(billsById.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);
}

function contactsFromParticipants(participants: Participant[], createdBy: string): SavedContact[] {
  return participants.map((participant) => ({
    id: `contact-${participant.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || participant.id}`,
    name: participant.name,
    venmoUsername: participant.venmoUsername,
    cashAppUsername: participant.cashAppUsername,
    createdBy,
  }));
}

function getAuthErrorMessage(error: unknown): string {
  const code = (error as { code?: string }).code;
  switch (code) {
    case "auth/unauthorized-domain":
      return "Google sign-in is blocked because this domain is not authorized in Firebase. Add partake-app.vercel.app in Firebase Authentication > Settings > Authorized domains.";
    case "auth/operation-not-allowed":
      return "Google sign-in is not enabled in Firebase Authentication.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was closed before it finished.";
    case "auth/cancelled-popup-request":
      return "Google sign-in was cancelled because another sign-in window is already open.";
    case "auth/network-request-failed":
      return "Google sign-in could not connect. Check your connection and try again.";
    default:
      return "Couldn't sign in with Google. Confirm Firebase has Google enabled and partake-app.vercel.app is an authorized domain.";
  }
}

export default function Home() {
  const [initialState] = useState(getInitialHomeState);
  const [step, setStep] = useState<Step>(initialState.step);
  const [participants, setParticipants] = useState<Participant[]>(initialState.participants);
  const [newName, setNewName] = useState("");
  const [newVenmo, setNewVenmo] = useState("");
  const [receipt, setReceipt] = useState<ParsedReceipt | null>(null);
  const [bill, setBill] = useState<Bill | null>(initialState.bill);
  const [tipPercent] = useState(20);
  const [savedContacts, setSavedContacts] = useState<SavedContact[]>(initialState.savedContacts);
  const [showAddForm, setShowAddForm] = useState(false);
  const [billHistory, setBillHistory] = useState<Bill[]>(initialState.billHistory);
  const [showRescanConfirm, setShowRescanConfirm] = useState(false);
  const [rescanReasons, setRescanReasons] = useState<string[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(initialState.myProfile);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuthContext();
  const googleProfileName = user && !user.isAnonymous ? user.displayName : null;
  const effectiveProfile = myProfile ?? (
    googleProfileName ? { name: googleProfileName } : null
  );

  useEffect(() => {
    if (!user) return;
    if (!user.isAnonymous) {
      const appUser: AppUser = {
        id: user.uid,
        displayName: user.displayName ?? myProfile?.name ?? "Partake user",
        email: user.email ?? "",
        avatarURL: user.photoURL ?? undefined,
        partnerGroupIds: [],
        createdAt: new Date(),
      };
      saveUser(appUser).catch(() => {});
      if (!myProfile && user.displayName) {
        saveUserProfile({ name: user.displayName });
      }
    }
    getContacts(user.uid)
      .then((cloudContacts) => {
        setSavedContacts((prev) => mergeContacts(prev, cloudContacts));
      })
      .catch(() => {});
    getUserBills(user.uid)
      .then((cloudBills) => {
        setBillHistory((prev) => mergeBills(prev, cloudBills));
      })
      .catch(() => {});
  }, [user, myProfile]);

  async function handleGoogleSignIn() {
    setSigningIn(true);
    setAuthError(null);
    try {
      const signedInUser = await signInWithGoogle();
      if (signedInUser.displayName && !effectiveProfile) {
        const profile = { name: signedInUser.displayName };
        saveUserProfile(profile);
        setMyProfile(profile);
      }
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    setAuthError(null);
    await signOut().catch(() => {
      setAuthError("Couldn't sign out. Please try again.");
    });
  }

  function ensureMyProfileParticipant(profile = effectiveProfile) {
    if (!profile) return;
    setParticipants(prev => {
      if (prev.some(p => p.name.toLowerCase() === profile.name.toLowerCase())) return prev;
      return [participantFromProfile(profile), ...prev];
    });
  }

  function goToParticipants() {
    ensureMyProfileParticipant();
    setStep("participants");
  }

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
      sharedWithUserIds: user ? [user.uid] : [],
    };

    setBill(newBill);
    saveBillToHistory(newBill);
    // Save to Firestore — retry once if auth not ready
    saveBill(newBill).catch(() => {
      setTimeout(() => saveBill(newBill).catch((err) => console.warn("Cloud sync failed:", err)), 2000);
    });
    saveAllParticipantsAsContacts(participants);
    if (user) {
      const contacts = contactsFromParticipants(participants, user.uid);
      for (const contact of contacts) saveContact(user.uid, contact).catch(() => {});
      setSavedContacts((prev) => mergeContacts(prev, contacts));
    }
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
      <main className="relative min-h-dvh overflow-hidden px-5 pb-10 pt-10">
        <div className="pointer-events-none absolute -left-24 top-10 h-56 w-56 rounded-full bg-[#FFD6A5]/45 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-32 h-64 w-64 rounded-full bg-[#E8613C]/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-white/70 blur-3xl" />

        <section className="relative mx-auto flex w-full max-w-md flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative h-28 w-28" aria-hidden="true">
              <div className="absolute inset-0 rounded-[2rem] bg-white shadow-2xl shadow-[#2D2319]/10" />
              <div className="absolute inset-2 rounded-[1.6rem] border border-[#F5EDE3] bg-[#FFF9F1]" />
              <div className="absolute left-1/2 top-6 h-11 w-11 -translate-x-1/2 rounded-full border-4 border-white bg-[#F4A261] shadow-lg shadow-[#F4A261]/25" />
              <div className="absolute left-6 top-9 h-10 w-10 rounded-full border-4 border-white bg-[#E8613C] shadow-lg shadow-[#E8613C]/25" />
              <div className="absolute right-6 top-9 h-10 w-10 rounded-full border-4 border-white bg-[#FFD6A5] shadow-lg shadow-[#FFD6A5]/25" />
              <div className="absolute bottom-7 left-1/2 h-11 w-[4.75rem] -translate-x-1/2 rounded-t-[2rem] bg-[#F4A261]" />
              <div className="absolute bottom-6 left-5 h-10 w-14 rounded-t-[1.75rem] bg-[#E8613C]" />
              <div className="absolute bottom-6 right-5 h-10 w-14 rounded-t-[1.75rem] bg-[#FFD6A5]" />
              <div className="absolute bottom-4 left-1/2 h-6 w-20 -translate-x-1/2 rounded-full bg-white/80" />
            </div>
            <div>
              <p className="mx-auto mb-2 inline-flex rounded-full border border-[#FFD6A5] bg-white/80 px-3 py-1 text-xs font-bold text-[#E8613C] shadow-sm">
                From receipt to request
              </p>
              <h1 className="text-6xl font-black gradient-text tracking-[-0.06em]">Partake</h1>
            </div>
            <div className="max-w-sm">
              <h2 className="text-3xl font-black leading-[0.95] tracking-[-0.04em] text-[#2D2319]">
                Split dinner without the group-chat math.
              </h2>
              <p className="mt-3 text-base leading-6 text-[#6F5F51]">
                Snap a receipt, tap who ordered what, and send clean payment requests in seconds.
              </p>
            </div>
          </div>

          <div className="w-full rounded-[2rem] border border-white/80 bg-white/75 p-3 shadow-xl shadow-[#2D2319]/10 backdrop-blur">
            <div className="rounded-[1.5rem] border border-[#F5EDE3] bg-[#FFF9F1] p-4 text-[#2D2319] shadow-inner shadow-white/60">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A87957]">Tonight&apos;s receipt</p>
                  <p className="mt-1 text-base font-black tracking-[-0.02em]">Luca&apos;s Trattoria</p>
                </div>
                <div className="rounded-full border border-[#F0DFC9] bg-white px-3 py-1 text-xs font-bold text-[#6F5F51]">3 people</div>
              </div>
              <div className="space-y-2.5 text-sm">
                {["Burrata", "Rigatoni", "Tiramisu"].map((item, index) => (
                  <div key={item} className="flex items-center justify-between rounded-2xl border border-[#F5EDE3] bg-white px-3 py-2.5 shadow-sm shadow-[#2D2319]/5">
                    <span className="font-semibold text-[#3B2D20]">{item}</span>
                    <div className="flex -space-x-2">
                      {[0, 1, 2].slice(0, index + 1).map((avatar) => (
                        <span
                          key={avatar}
                          className="h-6 w-6 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: ["#E8613C", "#F4A261", "#FFD6A5"][avatar] }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-[#F0DFC9] pt-4">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#A87957]">Ready to request</span>
                <span className="text-xl font-black tracking-[-0.03em]">$86.42</span>
              </div>
            </div>
          </div>

          <div className="w-full">
            <PrimaryButton onClick={() => {
              try { localStorage.removeItem("partake_active_session"); } catch {}
              setBill(null);
              setReceipt(null);
              setParticipants([]);
              setStep("scan");
            }} className="min-h-14 text-base shadow-xl shadow-[#E8613C]/20">
              Scan the receipt
            </PrimaryButton>
            {user && !user.isAnonymous && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-full border border-[#F5EDE3] bg-white/80 px-3 py-2 shadow-sm shadow-[#2D2319]/5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2E7D32] text-xs font-black text-white">✓</span>
                  <span className="truncate text-xs font-semibold text-[#6F5F51]">
                    Synced as {user.displayName ?? user.email ?? "Google"}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-[#9C8E80] transition-colors hover:bg-[#F5EDE3] hover:text-[#E8613C]"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>

          {(!user || user.isAnonymous || authError) && (
            <div className="w-full overflow-hidden rounded-[1.75rem] border border-[#F5EDE3] bg-white shadow-lg shadow-[#2D2319]/5">
              {(!user || user.isAnonymous) && (
              <div className="relative flex flex-col gap-4 bg-gradient-to-br from-white via-[#FFF7EF] to-[#F5EDE3] p-5 text-left">
                <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#FFD6A5]/50" />
                <div className="pointer-events-none absolute -bottom-12 -left-10 h-24 w-24 rounded-full bg-[#E8613C]/10" />
                <div className="relative flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm shadow-[#2D2319]/10">
                    ☁️
                  </div>
                  <div>
                    <p className="text-base font-bold text-[#2D2319]">Save bills across devices</p>
                    <p className="mt-1 text-sm leading-5 text-[#6F5F51]">
                      Keep splitting instantly as a guest, or connect Google to bring your history and friends with you.
                    </p>
                  </div>
                </div>
                <div className="relative grid grid-cols-2 gap-2 text-xs font-medium text-[#6F5F51]">
                  <div className="rounded-2xl border border-white/80 bg-white/70 px-3 py-2">✓ Guest mode stays on</div>
                  <div className="rounded-2xl border border-white/80 bg-white/70 px-3 py-2">✓ Sync when you sign in</div>
                </div>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={authLoading || signingIn}
                  className="relative flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-bold text-[#2D2319] shadow-md shadow-[#2D2319]/10 ring-1 ring-[#E8DDD0] transition-all hover:-translate-y-0.5 hover:ring-[#E8613C] disabled:translate-y-0 disabled:opacity-50"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#E8DDD0] bg-white text-sm">G</span>
                  {signingIn ? "Signing in..." : "Continue with Google"}
                </button>
              </div>
              )}
              {authError && (
                <p className="border-t border-[#F5EDE3] bg-white px-4 py-3 text-center text-xs text-[#E8613C]">{authError}</p>
              )}
            </div>
          )}

          {billHistory.length > 0 && (
            <div className="w-full">
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-[#2D2319]">Recent bills</h2>
                <span className="text-xs font-medium text-[#9C8E80]">Tap to reopen</span>
              </div>
              <div className="flex flex-col gap-2.5">
                {billHistory.slice(0, 5).map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-2 rounded-2xl border border-[#F5EDE3] bg-white/85 shadow-sm shadow-[#2D2319]/5 transition-colors hover:bg-[#FFF7EF]"
                  >
                    <button
                      onClick={() => {
                        setBill(b);
                        setReceipt(reconstructReceiptFromBill(b));
                        setParticipants(b.participants);
                        setStep("split");
                      }}
                      className="flex min-h-16 flex-1 items-center justify-between p-3 text-left"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#2D2319]">{b.name || "Untitled bill"}</p>
                        <p className="text-xs text-[#9C8E80]">
                          {b.participants.length} people · {new Date(b.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="ml-3 rounded-full bg-[#F5EDE3] px-3 py-1 text-sm font-black text-[#2D2319]">${b.total.toFixed(2)}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteBillFromHistory(b.id);
                        setBillHistory(prev => prev.filter(bill => bill.id !== b.id));
                      }}
                      className="mr-2 flex min-h-11 min-w-11 items-center justify-center rounded-full text-sm text-[#9C8E80] transition-colors hover:bg-[#F5EDE3] hover:text-[#E8613C]"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              const text = "Split bills instantly — just scan the receipt 🧾";
              const url = "https://partake-app.vercel.app";
              if (navigator.share) {
                navigator.share({ title: "Partake", text, url }).catch(() => {});
              } else {
                navigator.clipboard?.writeText(`${text}\n${url}`).then(() => {
                  alert("Link copied!");
                }).catch(() => {});
              }
            }}
            className="rounded-full border border-[#FFD6A5] bg-white/70 px-4 py-2 text-sm font-semibold text-[#E8613C] shadow-sm transition-colors hover:bg-[#FFF7EF]"
          >
            📤 Share Partake with a friend
          </button>

          {process.env.NODE_ENV === "development" && (
            <button
              onClick={loadTestData}
              className="text-xs text-[#C4B5A6] transition-colors hover:text-[#9C8E80]"
            >
              🧪 Test mode — skip to splitting with sample data
            </button>
          )}

          <footer className="w-full border-t border-[#E8DFD4] pt-4 text-center">
            <div className="flex items-center justify-center gap-4 text-xs text-[#C4B5A6]">
              <FeedbackWidget />
              <span>·</span>
              <a href="/privacy" className="transition-colors hover:text-[#9C8E80]">Privacy</a>
              <span>·</span>
              <a href="/terms" className="transition-colors hover:text-[#9C8E80]">Terms</a>
            </div>
          </footer>
        </section>
      </main>
    );
  }

  // Participants
  if (step === "participants") {
    if (!effectiveProfile) {
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
                ensureMyProfileParticipant(profile);
                setNewName("");
                setNewVenmo("");
              }}
              disabled={!newName.trim()}
            >
              That&apos;s me
            </PrimaryButton>
          </div>
          <TopBarButton onClick={() => setStep("edit")}>← Back to receipt</TopBarButton>
        </main>
      );
    }

    const unusedContacts = savedContacts.filter(
      (c) => !participants.some((p) => p.name.toLowerCase() === c.name.toLowerCase())
    );

    return (
      <main className="p-6 max-w-md mx-auto">
        <TopBarButton
          onClick={() => setStep("edit")}
          className="mb-4"
        >
          ← Back to receipt
        </TopBarButton>
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
                  {effectiveProfile && p.name.toLowerCase() === effectiveProfile.name.toLowerCase() && (
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
                saveBill(updatedBill).catch((err) => console.warn("Cloud sync failed:", err));
                saveAllParticipantsAsContacts(participants);
                if (user) {
                  const contacts = contactsFromParticipants(participants, user.uid);
                  for (const contact of contacts) saveContact(user.uid, contact).catch(() => {});
                  setSavedContacts((prev) => mergeContacts(prev, contacts));
                }
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
        <TopBarButton
          onClick={() => setStep("landing")}
          className="mb-4"
        >
          ← Back
        </TopBarButton>
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

  if (step === "edit" && receipt) {
    return (
      <main className="min-h-dvh p-6 max-w-md mx-auto">
        <TopBarButton
          onClick={() => {
            if (receipt.items.length > 0) {
              setShowRescanConfirm(true);
            } else {
              setStep("scan");
            }
          }}
          className="mb-4"
        >
          ← Re-scan
        </TopBarButton>

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
            onClick={goToParticipants}
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
          <BillSplitter bill={bill} onBack={goToParticipants} onEditReceipt={() => {
            setReceipt(reconstructReceiptFromBill(bill));
            setStep("edit");
          }} onBillChange={setBill} onHome={() => {
            try { localStorage.removeItem("partake_active_session"); } catch {}
            setBill(null);
            setReceipt(null);
            setParticipants([]);
            setBillHistory(getBillHistory());
            setStep("landing");
          }} />
        </ErrorBoundary>
      </main>
    );
  }

  return null;
}
