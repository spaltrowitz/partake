"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BillSplitter } from "@/components/BillSplitter";
import type { Bill } from "@/types";
import { getBillByShareCode } from "@/services/firestore";

export default function SharedBillPage() {
  const params = useParams();
  const code = params.code as string;
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBill() {
      try {
        const found = await getBillByShareCode(code);
        if (found) {
          setBill(found);
        } else {
          setError("Couldn't find that bill. Check the link and try again.");
        }
      } catch {
        setError("Something went wrong loading the bill.");
      } finally {
        setLoading(false);
      }
    }
    loadBill();
  }, [code]);

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF6B6B]" />
        <p className="text-gray-500">Loading bill...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <span className="text-5xl">🤷</span>
        <p className="text-gray-500 text-center">{error}</p>
        <a href="/" className="text-[#FF6B6B] font-semibold">
          Start a new bill →
        </a>
      </main>
    );
  }

  if (!bill) return null;

  return (
    <main className="min-h-screen max-w-md mx-auto">
      <div className="p-4 text-center border-b dark:border-gray-800">
        <p className="text-xs text-gray-400">Shared via</p>
        <h1 className="text-lg font-bold gradient-text">Partake</h1>
      </div>
      <BillSplitter bill={bill} />
      <div className="p-4 text-center border-t dark:border-gray-800">
        <p className="text-xs text-gray-400">
          Want receipt scanning and smart suggestions?
        </p>
        <a href="/" className="text-xs text-[#FF6B6B] font-semibold">
          Try Partake →
        </a>
      </div>
    </main>
  );
}
