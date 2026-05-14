"use client";

import { useEffect, useState } from "react";
import type { Bill } from "@/types";
import { saveBill } from "@/services/firestore";
import { firebaseConfigured } from "@/lib/firebase";
import { useAuthContext } from "@/components/AuthProvider";

const BILL_KEYS = ["partake_bills", "partake_active_session"];

function findLocalBills(): Bill[] {
  const found: Bill[] = [];
  const seenIds = new Set<string>();
  function addCandidate(candidate: unknown) {
    if (!candidate || typeof candidate !== "object") return;
    const maybeBill = candidate as Partial<Bill>;
    if (!maybeBill.id || !Array.isArray(maybeBill.items) || !Array.isArray(maybeBill.participants)) return;
    if (seenIds.has(maybeBill.id)) return;
    seenIds.add(maybeBill.id);
    found.push(maybeBill as Bill);
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
    for (const key of BILL_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      inspectValue(JSON.parse(raw));
    }
    // Also scan all keys for anything that looks like a bill
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || BILL_KEYS.includes(key)) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        if (!raw.includes("shareCode") && !raw.includes("claimedBy")) continue;
        inspectValue(JSON.parse(raw));
      } catch {
        // not JSON, skip
      }
    }
  } catch {
    // ignore
  }
  return found;
}

export default function RestorePage() {
  const { user } = useAuthContext();
  const [bills, setBills] = useState<Bill[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState<Record<string, "success" | "error">>({});
  const [done, setDone] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setBills(findLocalBills());
  }, []);

  async function syncBills(billsToSync: Bill[]) {
    if (!firebaseConfigured || !user) return;
    setSyncing(true);
    const res: Record<string, "success" | "error"> = {};

    for (const bill of billsToSync) {
      try {
        const toSave: Bill = {
          ...bill,
          createdBy: user.uid,
          createdAt: bill.createdAt instanceof Date ? bill.createdAt : new Date(bill.createdAt),
        };
        await saveBill(toSave);
        res[bill.id] = "success";
      } catch {
        res[bill.id] = "error";
      }
    }

    setResults(res);
    setDone(true);
    setSyncing(false);
  }

  function handlePasteImport() {
    setPasteError("");
    try {
      const parsed = JSON.parse(pasteText);
      const arr: Bill[] = Array.isArray(parsed) ? parsed : [parsed];
      if (!arr.length || !arr[0]?.id) {
        setPasteError("Doesn't look like bill data. Make sure you copied the full output.");
        return;
      }
      setBills(arr);
      setShowPaste(false);
    } catch {
      setPasteError("Invalid JSON. Make sure you copied everything.");
    }
  }

  async function handleCopyExport() {
    const data = localStorage.getItem("partake_bills") || "[]";
    try {
      await navigator.clipboard.writeText(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select a textarea
      const ta = document.createElement("textarea");
      ta.value = data;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const successCount = Object.values(results).filter((r) => r === "success").length;

  return (
    <main className="min-h-screen bg-[#FFF8E1] p-6 flex flex-col items-center">
      <h1 className="text-2xl font-bold text-[#5D4037] mb-2">🔄 Restore Bills</h1>
      <p className="text-sm text-[#8D6E63] mb-6 text-center max-w-sm">
        Sync local bills to the cloud so they&apos;re available on all devices and via share links.
      </p>

      {!user && (
        <p className="text-[#D4A574] font-medium">Connecting to Firebase…</p>
      )}

      {user && bills.length === 0 && !showPaste && (
        <div className="text-center space-y-4">
          <p className="text-[#8D6E63]">No local bills found on this device.</p>

          <div className="bg-white rounded-xl p-4 shadow-sm max-w-sm text-left space-y-3">
            <p className="text-sm font-semibold text-[#5D4037]">Bills on another device?</p>
            <p className="text-xs text-[#8D6E63]">
              Open Partake on the device where you created the bill, go to{" "}
              <strong>/restore</strong>, tap <strong>Copy Bills</strong>, then come back here and paste.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleCopyExport}
                className="flex-1 px-4 py-2.5 bg-[#5D4037] text-white rounded-xl text-sm font-medium"
              >
                {copied ? "✓ Copied!" : "📋 Copy Bills"}
              </button>
              <button
                onClick={() => setShowPaste(true)}
                className="flex-1 px-4 py-2.5 bg-[#D4A574] text-white rounded-xl text-sm font-medium"
              >
                📥 Paste Bills
              </button>
            </div>
          </div>
        </div>
      )}

      {user && showPaste && (
        <div className="w-full max-w-sm space-y-3">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste bill data here…"
            className="w-full h-32 p-3 rounded-xl border border-[#D4A574] text-sm font-mono bg-white resize-none"
          />
          {pasteError && <p className="text-red-500 text-xs">{pasteError}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowPaste(false); setPasteText(""); setPasteError(""); }}
              className="flex-1 px-4 py-2.5 border border-[#D4A574] text-[#D4A574] rounded-xl text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handlePasteImport}
              disabled={!pasteText.trim()}
              className="flex-1 px-4 py-2.5 bg-[#D4A574] text-white rounded-xl text-sm font-medium disabled:opacity-50"
            >
              Import
            </button>
          </div>
        </div>
      )}

      {user && bills.length > 0 && !done && (
        <>
          <p className="text-sm text-[#5D4037] mb-4">
            Found <strong>{bills.length}</strong> bill{bills.length !== 1 ? "s" : ""}{showPaste ? " from paste" : " on this device"}:
          </p>
          <ul className="w-full max-w-sm space-y-2 mb-4">
            {bills.map((bill) => (
              <li key={bill.id} className="bg-white rounded-xl p-3 shadow-sm flex justify-between">
                <span className="font-medium text-[#5D4037]">{bill.name || bill.restaurantName || "Untitled"}</span>
                <span className="text-xs text-[#8D6E63]">
                  {bill.shareCode ? `🔗 ${bill.shareCode}` : "no link"}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 w-full max-w-sm">
            <button
              onClick={handleCopyExport}
              className="px-4 py-3 border border-[#D4A574] text-[#D4A574] rounded-2xl text-sm font-medium"
            >
              {copied ? "✓ Copied!" : "📋 Copy"}
            </button>
            <button
              onClick={() => syncBills(bills)}
              disabled={syncing}
              className="flex-1 px-6 py-3 bg-[#D4A574] text-white rounded-2xl font-semibold shadow-md disabled:opacity-50"
            >
              {syncing ? "Syncing…" : `Sync ${bills.length} Bill${bills.length !== 1 ? "s" : ""} to Cloud ☁️`}
            </button>
          </div>
        </>
      )}

      {done && (
        <div className="text-center">
          <p className="text-lg font-semibold text-[#5D4037] mb-2">
            ✅ {successCount} of {bills.length} bill{bills.length !== 1 ? "s" : ""} synced!
          </p>
          {successCount < bills.length && (
            <p className="text-sm text-red-500 mb-2">
              {bills.length - successCount} failed — try again or check your connection.
            </p>
          )}
          <a href="/" className="text-[#D4A574] underline text-sm">← Back to Partake</a>
        </div>
      )}
    </main>
  );
}
