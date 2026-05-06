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
      <p className="text-xs text-[#8B9BB4] mb-1">
        Enter each person&apos;s exact amount
      </p>
      {participants.map((p, i) => (
        <div key={p.id} className="flex items-center gap-3 p-3 bg-[#1C2A4A] rounded-lg">
          <Avatar name={p.name} index={i} size={32} />
          <span className="flex-1 font-medium text-sm">{p.name}</span>
          <span className="text-sm text-[#8B9BB4]">$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={exactAmounts[p.id] ?? 0}
            onChange={(e) => onChangeAmount(p.id, Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-24 text-right px-2 py-1 rounded border border-[#1C2A4A] bg-transparent text-sm font-bold"
          />
        </div>
      ))}
      <p className={`text-xs text-center ${
        Math.abs(assigned - total) < 0.1
          ? "text-green-500" : "text-orange-500"
      }`}>
        Assigned: ${assigned.toFixed(2)} of ${total.toFixed(2)}
      </p>
    </div>
  );
}
