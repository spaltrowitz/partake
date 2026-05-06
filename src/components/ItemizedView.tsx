"use client";

import type { BillItem, Participant } from "@/types";
import { Avatar, getParticipantColor } from "./Avatar";

export function ItemizedParticipantBar({
  participants,
  selectedParticipant,
  onSelectParticipant,
}: {
  participants: Participant[];
  selectedParticipant: string;
  onSelectParticipant: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto p-4 bg-[#152038]">
      {participants.map((p, i) => (
        <button
          key={p.id}
          onClick={() => onSelectParticipant(p.id)}
          className="flex flex-col items-center gap-1 min-w-[64px]"
        >
          <div
            className={`rounded-full transition-all ${
              selectedParticipant === p.id
                ? `ring-2 ring-offset-2`
                : ""
            }`}
            style={
              selectedParticipant === p.id
                ? { outlineColor: getParticipantColor(i) }
                : undefined
            }
          >
            <Avatar name={p.name} index={i} size={48} />
          </div>
          <span
            className={`text-xs truncate max-w-[64px] ${
              selectedParticipant === p.id
                ? "font-semibold"
                : "text-[#8B9BB4]"
            }`}
          >
            {p.name}
          </span>
        </button>
      ))}
    </div>
  );
}

export function ItemizedView({
  items,
  participants,
  selectedParticipant,
  onToggleClaim,
}: {
  items: BillItem[];
  participants: Participant[];
  selectedParticipant: string;
  onToggleClaim: (itemId: string) => void;
}) {
  return (
    <>
      <p className="text-xs text-[#8B9BB4] mb-3">
        Tap items to claim them for the selected person
      </p>
      <div className="flex flex-col gap-1">
        {items.map((item) => {
          const isClaimed = item.claimedBy.includes(selectedParticipant);
          return (
            <button
              key={item.id}
              onClick={() => onToggleClaim(item.id)}
              className={`flex items-center justify-between p-3 rounded-lg transition-all text-left ${
                isClaimed
                  ? "bg-[#0B2A2A]"
                  : "bg-[#1C2A4A] hover:bg-[#1C2A4A]"
              } ${isClaimed ? "pop-animation" : ""}`}
            >
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                {item.claimedBy.length > 0 && (
                  <div className="flex -space-x-1 mt-1">
                    {item.claimedBy.map((cid) => {
                      const idx = participants.findIndex(
                        (p) => p.id === cid
                      );
                      return (
                        <div
                          key={cid}
                          className="w-4 h-4 rounded-full border border-white"
                          style={{
                            backgroundColor: getParticipantColor(idx),
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
              <span className="font-semibold ml-4">
                {item.quantity > 1 && <span className="text-xs text-[#8B9BB4] mr-1">{item.quantity}×</span>}
                ${(item.price * item.quantity).toFixed(2)}
              </span>
              <span className="ml-3 text-xl">
                {isClaimed ? "✅" : "⭕"}
              </span>
            </button>
          );
        })}
      </div>
      {items.some((item) => item.claimedBy.length === 0) && (
        <p className="text-xs text-orange-400 mt-3 text-center">
          ⚠ {items.filter((item) => item.claimedBy.length === 0).length} unclaimed item{items.filter((item) => item.claimedBy.length === 0).length !== 1 ? "s" : ""} won&apos;t be included in the split
        </p>
      )}
    </>
  );
}
