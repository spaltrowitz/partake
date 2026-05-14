"use client";

import { useEffect, useState } from "react";
import type { Bill } from "@/types";
import { saveBill } from "@/services/firestore";
import { firebaseConfigured } from "@/lib/firebase";
import { useAuthContext } from "@/components/AuthProvider";

const STORAGE_KEY = "partake_bills";

export default function RestorePage() {
  const { user } = useAuthContext();
  const [bills, setBills] = useState<Bill[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState<Record<string, "success" | "error">>({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        setBills(JSON.parse(data) as Bill[]);
      }
    } catch {
      // ignore
    }
  }, []);

  async function syncAll() {
    if (!firebaseConfigured || !user) return;
    setSyncing(true);
    const res: Record<string, "success" | "error"> = {};

    for (const bill of bills) {
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

  const successCount = Object.values(results).filter((r) => r === "success").length;

  return (
    <main className="min-h-screen bg-[#FFF8E1] p-6 flex flex-col items-center">
      <h1 className="text-2xl font-bold text-[#5D4037] mb-2">🔄 Restore Bills</h1>
      <p className="text-sm text-[#8D6E63] mb-6 text-center max-w-sm">
        This syncs your local bills to the cloud so they&apos;re available on all devices and via share links.
      </p>

      {!user && (
        <p className="text-[#D4A574] font-medium">Connecting to Firebase…</p>
      )}

      {user && bills.length === 0 && (
        <p className="text-[#8D6E63]">No local bills found on this device.</p>
      )}

      {user && bills.length > 0 && !done && (
        <>
          <p className="text-sm text-[#5D4037] mb-4">
            Found <strong>{bills.length}</strong> bill{bills.length !== 1 ? "s" : ""} on this device:
          </p>
          <ul className="w-full max-w-sm space-y-2 mb-6">
            {bills.map((bill) => (
              <li key={bill.id} className="bg-white rounded-xl p-3 shadow-sm flex justify-between">
                <span className="font-medium text-[#5D4037]">{bill.name || bill.restaurantName || "Untitled"}</span>
                <span className="text-xs text-[#8D6E63]">
                  {bill.shareCode ? `🔗 ${bill.shareCode}` : "no link"}
                </span>
              </li>
            ))}
          </ul>
          <button
            onClick={syncAll}
            disabled={syncing}
            className="px-6 py-3 bg-[#D4A574] text-white rounded-2xl font-semibold shadow-md disabled:opacity-50"
          >
            {syncing ? "Syncing…" : `Sync ${bills.length} Bill${bills.length !== 1 ? "s" : ""} to Cloud`}
          </button>
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
