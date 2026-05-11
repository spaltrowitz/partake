"use client";

import type { Participant } from "@/types";
import { Avatar } from "./Avatar";

export function SharesSplitView({
  participants,
  shares,
  total,
  onChangeShares,
}: {
  participants: Participant[];
  shares: Record<string, number>;
  total: number;
  onChangeShares: (id: string, value: number) => void;
}) {
  const totalShares = Object.values(shares).reduce((s, v) => s + v, 0);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[#9C8E80] mb-1">
        Give each person a number of shares — the bill divides proportionally
      </p>
      {participants.map((p, i) => {
        const proportion = totalShares > 0 ? (shares[p.id] ?? 0) / totalShares : 0;
        return (
          <div key={p.id} className="flex items-center gap-3 p-3 bg-[#F5EDE3] rounded-lg">
            <Avatar name={p.name} index={i} size={32} allNames={participants.map(pp => pp.name)} />
            <span className="flex-1 font-medium text-sm">{p.name}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onChangeShares(p.id, Math.max(0, (shares[p.id] ?? 1) - 1))}
                className="w-11 h-11 rounded-full bg-white border border-[#E8DDD0] text-sm font-bold"
              >−</button>
              <span className="w-8 text-center font-bold">{shares[p.id] ?? 1}</span>
              <button
                onClick={() => onChangeShares(p.id, (shares[p.id] ?? 1) + 1)}
                className="w-11 h-11 rounded-full bg-white border border-[#E8DDD0] text-sm font-bold"
              >+</button>
            </div>
            <span className="text-sm font-semibold w-20 text-right">
              ${(total * proportion).toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
