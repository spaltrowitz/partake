"use client";

import { useEffect, useRef, useState } from "react";
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
import { associateBillWithUser, getBillByShareCode, getContacts, listenToUserBills, saveBill, saveContact, saveUser } from "@/services/firestore";
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

function countClaims(bill: Bill): number {
  return bill.items.reduce((sum, item) => sum + item.claimedBy.length, 0);
}

function countPayerGroupMembers(bill: Bill): number {
  return (bill.payingGroups ?? []).reduce((sum, group) => sum + group.memberIds.length, 0);
}

function billWithBestPayerGroups(candidate: Bill, cloudBill: Bill | null): Bill {
  if (!cloudBill) return candidate;
  return countPayerGroupMembers(cloudBill) >= countPayerGroupMembers(candidate)
    ? { ...candidate, payingGroups: cloudBill.payingGroups }
    : candidate;
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
    case "auth/popup-blocked":
    case "auth/operation-not-supported-in-this-environment":
      return "Google sign-in was blocked in this PWA. Your bills still sync without Google; open Partake in Safari if you need account sign-in.";
    case "auth/cancelled-popup-request":
      return "Google sign-in was cancelled because another sign-in window is already open.";
    case "auth/network-request-failed":
      return "Google sign-in could not connect. Check your connection and try again.";
    default:
      return "Couldn't sign in with Google. Confirm Firebase has Google enabled and partake-app.vercel.app is an authorized domain.";
  }
}

export default function Home() {
  const addPersonButtonRef = useRef<HTMLButtonElement>(null);
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
  const [cloudSynced, setCloudSynced] = useState(false);
  const activeBillSyncKey = useRef<string | null>(null);

  async function syncBillToCloud(billToSync: Bill) {
    setCloudSynced(false);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const cloudBill = billToSync.shareCode
          ? await getBillByShareCode(billToSync.shareCode).catch(() => null)
          : null;
        await saveBill(billWithBestPayerGroups(billToSync, cloudBill));
        setCloudSynced(true);
        return;
      } catch {
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }
    console.warn("Cloud sync failed after 3 attempts");
  }
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
      // Resync all local bills to Firestore, claiming them for the signed-in user
      const localBills = getBillHistory();
      for (const localBill of localBills) {
        if (localBill.createdBy === "local" || localBill.createdBy === user.uid) {
          const billToSync = { ...localBill, createdBy: user.uid, sharedWithUserIds: [user.uid, ...(localBill.sharedWithUserIds ?? []).filter((id: string) => id !== user.uid)] };
          syncBillToCloud(billToSync).catch(() => {});
        } else {
          // Bill created by someone else — just associate without overwriting
          associateBillWithUser(localBill.id, user.uid).catch(() => {});
        }
      }
    }
    getContacts(user.uid)
      .then((cloudContacts) => {
        setSavedContacts((prev) => mergeContacts(prev, cloudContacts));
      })
      .catch(() => {});
    let unsubBills: (() => void) | undefined;
    try {
      unsubBills = listenToUserBills(user.uid, (cloudBills) => {
        setBillHistory((prev) => mergeBills(prev, cloudBills));
      });
    } catch {
      // Firestore listener setup failed — fall back silently
    }
    return () => unsubBills?.();
  }, [user, myProfile]);

  useEffect(() => {
    if (!user || !bill) return;
    const syncKey = `${bill.id}:${user.uid}`;
    if (activeBillSyncKey.current === syncKey) return;
    activeBillSyncKey.current = syncKey;

    const sharedWithUserIds = Array.from(new Set([...(bill.sharedWithUserIds ?? []), user.uid]));
    const billToSync: Bill = {
      ...bill,
      createdBy: bill.createdBy === "local" ? user.uid : bill.createdBy,
      createdAt: bill.createdAt instanceof Date ? bill.createdAt : new Date(bill.createdAt),
      sharedWithUserIds,
    };
    if (billToSync.createdBy !== bill.createdBy || sharedWithUserIds.length !== (bill.sharedWithUserIds ?? []).length) {
      setBill(billToSync);
      saveBillToHistory(billToSync);
    }
    syncBillToCloud(billToSync);
  }, [user, bill]);

  useEffect(() => {
    if (!bill?.shareCode) return;
    let cancelled = false;

    getBillByShareCode(bill.shareCode)
      .then((cloudBill) => {
        if (cancelled || !cloudBill) return;
        const cloudClaims = countClaims(cloudBill);
        const localClaims = countClaims(bill);
        const cloudPayerMembers = countPayerGroupMembers(cloudBill);
        const localPayerMembers = countPayerGroupMembers(bill);
        if (cloudClaims <= localClaims && cloudPayerMembers <= localPayerMembers) return;

        const restoredBill = {
          ...cloudBill,
          createdAt: cloudBill.createdAt instanceof Date
            ? cloudBill.createdAt
            : new Date(cloudBill.createdAt),
        };
        setBill(restoredBill);
        setReceipt(reconstructReceiptFromBill(restoredBill));
        setParticipants(restoredBill.participants);
        saveBillToHistory(restoredBill);
        try { localStorage.setItem("partake_active_session", JSON.stringify({ bill: restoredBill })); } catch {}
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [bill?.id, bill?.shareCode]);

  async function handleGoogleSignIn() {
    setSigningIn(true);
    setAuthError(null);
    // Safety timeout — reset UI if sign-in hangs (e.g., redirect didn't navigate)
    const timeout = setTimeout(() => setSigningIn(false), 15000);
    try {
      const signedInUser = await signInWithGoogle();
      if (signedInUser.displayName && !effectiveProfile) {
        const profile = { name: signedInUser.displayName };
        saveUserProfile(profile);
        setMyProfile(profile);
      }
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "auth/redirect-in-progress") {
        setAuthError(getAuthErrorMessage(error));
      }
    } finally {
      clearTimeout(timeout);
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

  function goBackToReceipt() {
    if (receipt) {
      setStep("edit");
      return;
    }
    if (bill) {
      setReceipt(reconstructReceiptFromBill(bill));
      setStep("edit");
      return;
    }
    setStep("scan");
  }

  function requestRescan() {
    if (receipt?.items.length) {
      setShowRescanConfirm(true);
    } else {
      setStep("scan");
    }
  }

  function goHome() {
    try { localStorage.removeItem("partake_active_session"); } catch {}
    setBill(null);
    setReceipt(null);
    setParticipants([]);
    setShowRescanConfirm(false);
    setRescanReasons([]);
    setBillHistory(getBillHistory());
    setStep("landing");
  }

  function goBackFromPeople() {
    if (bill) {
      setStep("split");
      return;
    }
    goBackToReceipt();
  }

  function startNewBill() {
    try { localStorage.removeItem("partake_active_session"); } catch {}
    setBill(null);
    setReceipt(null);
    setParticipants([]);
    setShowRescanConfirm(false);
    setRescanReasons([]);
    setStep("scan");
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
    // Allow reusing a share code via ?shareCode= query param
    const urlShareCode = new URLSearchParams(window.location.search).get("shareCode");
    const shareCode = urlShareCode || Array.from({ length: 6 }, () =>
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
    syncBillToCloud(newBill);
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
        <div className="pointer-events-none absolute -left-24 top-10 h-56 w-56 rounded-full bg-[#FBBF24]/45 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-32 h-64 w-64 rounded-full bg-[#D97706]/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-white/70 blur-3xl" />

        <section className="relative mx-auto flex w-full max-w-md flex-col items-center gap-6 md:max-w-2xl md:gap-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-28 w-28 rounded-[2rem] bg-white p-2 shadow-2xl shadow-[#2D2416]/10" aria-hidden="true">
              <svg viewBox="0 0 192 192" className="h-full w-full" role="img">
                <defs>
                  <linearGradient id="hero-logo-bg" x1="24" y1="24" x2="168" y2="168" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#FEF3C7" />
                    <stop offset="0.55" stopColor="#FDE047" />
                    <stop offset="1" stopColor="#EAB308" />
                  </linearGradient>
                  <linearGradient id="hero-logo-receipt" x1="54" y1="42" x2="138" y2="150" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#ffffff" />
                    <stop offset="1" stopColor="#fff8e1" />
                  </linearGradient>
                </defs>
                <rect width="192" height="192" rx="42" fill="#fff8e1" />
                <rect x="18" y="18" width="156" height="156" rx="36" fill="url(#hero-logo-bg)" />
                <path d="M58 42h76a8 8 0 0 1 8 8v96l-15-9-15 9-16-9-16 9-15-9-15 9V50a8 8 0 0 1 8-8Z" fill="url(#hero-logo-receipt)" />
                <path d="M74 72h44M74 95h44M74 118h24" fill="none" stroke="#A16207" strokeWidth="8" strokeLinecap="round" />
                <circle cx="122" cy="119" r="24" fill="#A16207" />
                <path d="m110 119 9 9 17-21" fill="none" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-6xl font-black gradient-text tracking-[-0.06em]">Partake</h1>
            <div className="max-w-sm">
              <h2 className="text-3xl font-black leading-[0.95] tracking-[-0.04em] text-[#2D2416]">
                Split dinner without the group-chat math.
              </h2>
              <p className="mt-3 text-base leading-6 text-[#6B4F2A]">
                Scan a receipt, claim items, and send Venmo requests.
              </p>
            </div>
          </div>

          <div className="w-full rounded-[2rem] border border-white/80 bg-white/75 p-3 shadow-xl shadow-[#2D2416]/10 backdrop-blur">
            <div className="rounded-[1.5rem] border border-[#FDE68A] bg-[#FFFBEB] p-4 text-[#2D2416] shadow-inner shadow-white/60">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#D97706]">Example split</p>
                  <p className="mt-1 text-base font-black tracking-[-0.02em]">Luca&apos;s Trattoria</p>
                </div>
                <div className="rounded-full border border-[#FBBF24] bg-white px-3 py-1 text-xs font-bold text-[#6B4F2A]">3 people</div>
              </div>
              <div className="space-y-2.5 text-sm">
                {["Burrata", "Rigatoni", "Tiramisu"].map((item, index) => (
                  <div key={item} className="flex items-center justify-between rounded-2xl border border-[#FDE68A] bg-white px-3 py-2.5 shadow-sm shadow-[#2D2416]/5">
                    <span className="font-semibold text-[#3B2D20]">{item}</span>
                    <div className="flex -space-x-2">
                      {[0, 1, 2].slice(0, index + 1).map((avatar) => (
                        <span
                          key={avatar}
                          className="h-6 w-6 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: ["#D97706", "#F59E0B", "#FBBF24"][avatar] }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-[#FBBF24] pt-4">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#D97706]">Venmo requests ready</span>
                <span className="text-xl font-black tracking-[-0.03em]">$86.42</span>
              </div>
            </div>
          </div>

          <div className="w-full rounded-[1.75rem] border border-[#FDE68A] bg-white/80 p-4 text-left shadow-lg shadow-[#2D2416]/5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#FFFBEB] shadow-inner shadow-white" aria-hidden="true">
                <svg viewBox="0 0 112 112" className="h-14 w-14" role="img">
                  <rect x="6" y="6" width="100" height="100" rx="26" fill="#FFFBEB" stroke="#FDE68A" strokeWidth="2" />
                  <path d="M27 82H85" stroke="#FBBF24" strokeWidth="8" strokeLinecap="round" />
                  <path d="M27 88H85" stroke="white" strokeWidth="10" strokeLinecap="round" opacity="0.85" />
                  <circle cx="56" cy="35" r="16" fill="#F59E0B" stroke="white" strokeWidth="5" />
                  <circle cx="34" cy="45" r="14" fill="#D97706" stroke="white" strokeWidth="5" />
                  <circle cx="78" cy="45" r="14" fill="#FBBF24" stroke="white" strokeWidth="5" />
                  <path d="M33 82C35 65 43 55 56 55C69 55 77 65 79 82Z" fill="#F59E0B" />
                  <path d="M16 82C19 68 26 60 36 60C47 60 54 68 57 82Z" fill="#D97706" />
                  <path d="M55 82C58 68 65 60 76 60C86 60 93 68 96 82Z" fill="#FBBF24" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-black text-[#2D2416]">Built for group dinners</p>
                <p className="mt-1 whitespace-nowrap text-xs leading-5 text-[#6B4F2A] sm:text-sm">
                  Add everyone, claim items, and send Venmo requests.
                </p>
              </div>
            </div>
          </div>

          {(!user || user.isAnonymous) && (
            <div className="w-full overflow-hidden rounded-[1.75rem] border border-[#FDE68A] bg-white shadow-lg shadow-[#2D2416]/5">
              <div className="relative flex flex-col gap-4 bg-gradient-to-br from-white via-[#FFF8E1] to-[#FDE68A] p-5 text-left">
                <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#FBBF24]/50" />
                <div className="pointer-events-none absolute -bottom-12 -left-10 h-24 w-24 rounded-full bg-[#D97706]/10" />
                <div className="relative flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm shadow-[#2D2416]/10">
                    ☁️
                  </div>
                  <div>
                    <p className="text-base font-bold text-[#2D2416]">Save bills across devices</p>
                    <p className="mt-1 text-sm leading-5 text-[#6B4F2A]">
                      Keep splitting instantly as a guest, or connect Google to bring your history and friends with you.
                    </p>
                  </div>
                </div>
                <div className="relative grid grid-cols-2 gap-2 text-xs font-medium text-[#6B4F2A]">
                  <div className="rounded-2xl border border-white/80 bg-white/70 px-3 py-2">✓ Guest mode stays on</div>
                  <div className="rounded-2xl border border-white/80 bg-white/70 px-3 py-2">✓ Sync when you sign in</div>
                </div>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={authLoading || signingIn}
                  className="relative flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-bold text-[#2D2416] shadow-md shadow-[#2D2416]/10 ring-1 ring-[#FBBF24] transition-all hover:-translate-y-0.5 hover:ring-[#D97706] disabled:translate-y-0 disabled:opacity-50"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#FBBF24] bg-white text-sm">G</span>
                  {signingIn ? "Signing in..." : "Continue with Google"}
                </button>
              </div>
              {authError && (
                <p className="border-t border-[#FDE68A] bg-white px-4 py-3 text-center text-xs text-[#D97706]">{authError}</p>
              )}
            </div>
          )}

          <div className="w-full rounded-[1.75rem] border border-[#FDE68A] bg-white/85 p-4 shadow-lg shadow-[#2D2416]/5">
            <div className="mb-3 flex items-end justify-between gap-3 px-1">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#D97706]">Use Partake</p>
                <h2 className="mt-1 text-lg font-black tracking-[-0.03em] text-[#2D2416]">Start a real bill</h2>
              </div>
              {billHistory.length > 0 && (
                <span className="text-xs font-medium text-[#8A7353]">or reopen one below</span>
              )}
            </div>
            <PrimaryButton onClick={startNewBill} className="min-h-14 text-base shadow-xl shadow-[#D97706]/20">
              Scan a receipt
            </PrimaryButton>
          </div>

          {billHistory.length > 0 && (
            <div className="w-full">
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-[#2D2416]">Recent bills</h2>
                <span className="text-xs font-medium text-[#8A7353]">Tap to reopen</span>
              </div>
              <div className="flex flex-col gap-2.5">
                {billHistory.slice(0, 5).map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-2 rounded-2xl border border-[#FDE68A] bg-white/85 shadow-sm shadow-[#2D2416]/5 transition-colors hover:bg-[#FFF8E1]"
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
                        <p className="truncate text-sm font-bold text-[#2D2416]">{b.name || "Untitled bill"}</p>
                        <p className="text-xs text-[#8A7353]">
                          {b.participants.length} people · {new Date(b.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="ml-3 rounded-full bg-[#FDE68A] px-3 py-1 text-sm font-black text-[#2D2416]">${b.total.toFixed(2)}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteBillFromHistory(b.id);
                        setBillHistory(prev => prev.filter(bill => bill.id !== b.id));
                      }}
                      className="mr-2 flex min-h-11 min-w-11 items-center justify-center rounded-full text-sm text-[#8A7353] transition-colors hover:bg-[#FDE68A] hover:text-[#D97706]"
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
            className="min-h-11 rounded-full border border-[#FBBF24] bg-white/70 px-4 py-2 text-sm font-semibold text-[#D97706] shadow-sm transition-colors hover:bg-[#FFF8E1]"
          >
            📤 Share Partake with a friend
          </button>

          {user && !user.isAnonymous && (
            <div className="w-full rounded-2xl border border-[#FDE68A] bg-white/70 px-4 py-3 text-left shadow-sm shadow-[#2D2416]/5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#D97706]">Synced</p>
                  <p className="mt-1 truncate text-sm font-semibold text-[#6B4F2A]">
                    {user.email ?? user.displayName ?? "Connected with Google"}
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="shrink-0 rounded-full border border-[#FBBF24] bg-white px-3 py-2 text-xs font-semibold text-[#8A7353] transition-colors hover:border-[#F59E0B] hover:text-[#D97706]"
                >
                  Sign out
                </button>
              </div>
              {authError && (
                <p className="mt-3 rounded-xl border border-[#FBBF24] bg-white/80 px-3 py-2 text-center text-xs text-[#D97706]">
                  {authError}
                </p>
              )}
            </div>
          )}

          {process.env.NODE_ENV === "development" && (
            <button
              onClick={loadTestData}
              className="text-xs text-[#B8A078] transition-colors hover:text-[#8A7353]"
            >
              🧪 Test mode — skip to splitting with sample data
            </button>
          )}

          <footer className="w-full border-t border-[#FDE68A] pt-4 pb-safe text-center">
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[#B8A078]">
              <FeedbackWidget />
              <span>·</span>
              <a href="/about" className="transition-colors hover:text-[#8A7353]">About</a>
              <span>·</span>
              <a href="/privacy" className="transition-colors hover:text-[#8A7353]">Privacy</a>
              <span>·</span>
              <a href="/terms" className="transition-colors hover:text-[#8A7353]">Terms</a>
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
        <main className="p-6 max-w-md md:max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-2 text-center">First, who are you?</h1>
          <p className="text-sm text-[#8A7353] text-center mb-6">We&apos;ll remember you for next time</p>
          <div className="flex flex-col gap-3 mb-6">
            <input
              type="text"
              placeholder="Your name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
               className="px-4 py-3 rounded-xl border border-[#FDE68A] bg-transparent text-center focus:outline-none focus:ring-2 focus:ring-[#D97706]"
              autoFocus
            />
            <input
              type="text"
              placeholder="Venmo or $CashApp (optional)"
              value={newVenmo}
              onChange={(e) => setNewVenmo(e.target.value)}
               className="px-4 py-3 rounded-xl border border-[#FDE68A] bg-transparent text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#D97706]"
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
          <TopBarButton onClick={goBackFromPeople}>
            {bill ? "← Back to bill" : "← Back to receipt"}
          </TopBarButton>
        </main>
      );
    }

    const unusedContacts = savedContacts.filter(
      (c) => !participants.some((p) => p.name.toLowerCase() === c.name.toLowerCase())
    );

    return (
      <main className="p-6 max-w-md md:max-w-2xl mx-auto">
        <TopBarButton
          onClick={goBackFromPeople}
          className="mb-4"
        >
          {bill ? "← Back to bill" : "← Back to receipt"}
        </TopBarButton>
        <h1 className="text-2xl font-bold mb-6 text-center">Who&apos;s in?</h1>

        {/* Current participants */}
        {participants.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 justify-center">
              {participants.map((p) => (
                <span
                  key={p.id}
                  className="flex items-center gap-1 bg-[#FDE68A] px-3 py-1 rounded-full text-sm"
                >
                  {p.name}
                  {effectiveProfile && p.name.toLowerCase() === effectiveProfile.name.toLowerCase() && (
                    <span className="text-xs text-[#8A7353]">(you)</span>
                  )}
                  {p.venmoUsername && (
                    <a
                      href={`https://venmo.com/${p.venmoUsername.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#8A7353] hover:text-[#D97706] text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      @{p.venmoUsername.replace(/^@/, "")} ↗
                    </a>
                  )}
                  <button
                    onClick={() => removeParticipant(p.id)}
                    className="-mr-2 ml-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[#8A7353] hover:bg-white/60 hover:text-[#D97706]"
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
            <p className="text-sm text-[#8A7353] mb-2 text-center">Tap to add</p>
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
                  className="flex min-h-[90px] min-w-[80px] flex-col items-center justify-center gap-2 rounded-xl p-2 transition-colors hover:bg-[#FDE68A]"
                >
                  <Avatar name={contact.name} index={i} size={48} />
                  <span className="max-w-[72px] truncate text-xs">{contact.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add new person — collapsed by default */}
        {showAddForm ? (
          <div className="flex flex-col gap-3 mb-6 p-4 bg-[#FDE68A] rounded-xl">
            <p className="text-sm font-semibold text-center">Add a friend</p>
            <input
              type="text"
              placeholder="Their name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="px-4 py-3 rounded-xl border border-[#FBBF24] bg-white text-center focus:outline-none focus:ring-2 focus:ring-[#D97706]"
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
                className="px-4 py-3 rounded-xl border border-[#FBBF24] bg-white text-sm text-center w-full focus:outline-none focus:ring-2 focus:ring-[#D97706]"
                onKeyDown={(e) => e.key === "Enter" && addParticipant()}
              />
              {newVenmo && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8A7353]">
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
              onClick={() => {
                setShowAddForm(false);
                setNewName("");
                setNewVenmo("");
                setTimeout(() => addPersonButtonRef.current?.focus(), 0);
              }}
              className="min-h-11 rounded-full text-center text-sm text-[#8A7353] hover:bg-white/60"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            ref={addPersonButtonRef}
            onClick={() => setShowAddForm(true)}
            className="mb-6 min-h-12 w-full rounded-xl border-2 border-dashed border-[#FBBF24] py-3 text-center font-semibold text-[#D97706] transition-colors hover:bg-[#FDE68A]"
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
                syncBillToCloud(updatedBill);
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
            <p className="text-xs text-[#8A7353] text-center mt-2">
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
      <main className="min-h-dvh p-6 max-w-md md:max-w-2xl mx-auto">
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
      <main className="min-h-dvh p-6 max-w-md md:max-w-2xl mx-auto">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <TopBarButton onClick={bill ? () => setStep("split") : goHome}>
            {bill ? "← Back to bill" : "← Home"}
          </TopBarButton>
          <TopBarButton onClick={requestRescan} variant="accent">
            Re-scan receipt
          </TopBarButton>
        </div>

        {showRescanConfirm && (
          <div className="mb-4 p-4 bg-[#FDE68A] rounded-xl flex flex-col gap-3">
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
                      : "bg-white border border-[#FBBF24] text-[#8A7353]"
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
              className="text-sm text-[#8A7353] text-center"
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
      <main className="min-h-dvh max-w-md md:max-w-3xl lg:max-w-4xl mx-auto">
        <ErrorBoundary>
          <BillSplitter bill={bill} onBack={goToParticipants} onEditReceipt={() => {
            setReceipt(reconstructReceiptFromBill(bill));
            setStep("edit");
          }} onBillChange={setBill} onHome={goHome} cloudSynced={cloudSynced} />
        </ErrorBoundary>
      </main>
    );
  }

  return null;
}
