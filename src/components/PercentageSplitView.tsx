"use client";

import type { Participant } from "@/types";
import { Avatar } from "./Avatar";

export function PercentageSplitView({
  participants,
  percentages,
  total,
  onChangePercentage,
}: {
  participants: Participant[];
  percentages: Record<string, number>;
  total: number;
  onChangePercentage: (id: string, value: number) => void;
}) {
  const sum = Object.values(percentages).reduce((s, v) => s + v, 0);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[#8B9BB4] mb-1">
        Set each person&apos;s percentage (should add up to 100%)
      </p>
      {participants.map((p, i) => (
        <div key={p.id} className="flex items-center gap-3 p-3 bg-[#1C2A4A] rounded-lg">
          <Avatar name={p.name} index={i} size={32} />
          <span className="flex-1 font-medium text-sm">{p.name}</span>
          <input
            type="number"
            inputMode="decimal"
            value={percentages[p.id] ?? 0}
            onChange={(e) => onChangePercentage(p.id, parseFloat(e.target.value) || 0)}
            className="w-20 text-right px-2 py-1 rounded border border-[#1C2A4A] bg-transparent text-sm font-bold"
          />
          <span className="text-sm text-[#8B9BB4]">%</span>
          <span className="text-sm font-semibold w-20 text-right">
            ${(total * (percentages[p.id] ?? 0) / 100).toFixed(2)}
          </span>
        </div>
      ))}
      <p className={`text-xs text-center ${
        Math.abs(sum - 100) < 0.1
          ? "text-green-500" : "text-orange-500"
      }`}>
        Total: {sum.toFixed(1)}%
      </p>
    </div>
  );
}
