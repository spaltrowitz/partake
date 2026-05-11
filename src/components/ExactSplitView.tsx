"use client";

import type { Participant } from "@/types";
import { Avatar } from "./Avatar";

export function ExactSplitView({
  participants,
  exactAmounts,
  total,
  onChangeAmount,
}: {
  participants: Participant[];
  exactAmounts: Record<string, number>;
  total: number;
  onChangeAmount: (id: string, value: number) => void;
}) {
  const assigned = Object.values(exactAmounts).reduce((s, v) => s + v, 0);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[#64748B] mb-1">
        Enter each person&apos;s exact amount
      </p>
      {participants.map((p, i) => (
        <div key={p.id} className="flex items-center gap-3 p-3 bg-[#CCFBF1] rounded-lg">
          <Avatar name={p.name} index={i} size={32} allNames={participants.map(pp => pp.name)} />
          <span className="flex-1 font-medium text-sm">{p.name}</span>
          <span className="text-sm text-[#64748B]">$</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={exactAmounts[p.id] ?? 0}
            onChange={(e) => onChangeAmount(p.id, Math.max(0, parseFloat(e.target.value) || 0))}
            aria-label={`${p.name}'s exact amount`}
            className="min-h-11 min-w-24 text-right px-2 py-2 rounded border border-[#99F6E4] bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
          />
        </div>
      ))}
      <p className={`text-xs text-center ${
        Math.abs(assigned - total) < 0.1
          ? "text-green-500" : "text-amber-500"
      }`}>
        Assigned: ${assigned.toFixed(2)} of ${total.toFixed(2)}
      </p>
    </div>
  );
}
