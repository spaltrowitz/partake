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
    <div className="flex gap-2 overflow-x-auto p-4 bg-[#FFFFFF]">
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
                : "text-[#9C8E80]"
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
      <p className="text-xs text-[#9C8E80] mb-3">
        Select a person above, then tap their items. Tap the same item for multiple people to split it.
      </p>
      <div className="flex flex-col gap-1">
        {items.map((item) => {
          const isClaimed = item.claimedBy.includes(selectedParticipant);
          const claimerNames = item.claimedBy.map(cid => {
            const p = participants.find(pp => pp.id === cid);
            return p?.name?.split(" ")[0] ?? "";
          }).filter(Boolean);
          return (
            <button
              key={item.id}
              onClick={() => onToggleClaim(item.id)}
              className={`flex items-center justify-between p-3 rounded-lg transition-all text-left ${
                isClaimed
                  ? "bg-[#E8F5E9]"
                  : "bg-[#F5EDE3] hover:bg-[#F5EDE3]"
              } ${isClaimed ? "pop-animation" : ""}`}
            >
              <div className="flex-1">
                <p className="font-medium">
                  {item.name}{item.quantity > 1 && <span className="text-[#9C8E80]"> ({item.quantity}×)</span>}
                </p>
                {claimerNames.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex -space-x-1">
                      {item.claimedBy.map((cid) => {
                        const idx = participants.findIndex(
                          (p) => p.id === cid
                        );
                        return (
                          <div
                            key={cid}
                            className="w-4 h-4 rounded-full border border-[#F5EDE3]"
                            style={{
                              backgroundColor: getParticipantColor(idx),
                            }}
                          />
                        );
                      })}
                    </div>
                    <span className="text-xs text-[#9C8E80]">
                      {claimerNames.length === 1 ? claimerNames[0] : `Split ${claimerNames.length} ways`}
                    </span>
                  </div>
                )}
              </div>
              <span className="font-semibold ml-4">
                ${(item.price * item.quantity).toFixed(2)}
              </span>
              <span className="ml-3 text-lg">
                {isClaimed ? "✓" : "○"}
              </span>
            </button>
          );
        })}
      </div>
      {items.some((item) => item.claimedBy.length === 0) && (
        <p className="text-sm text-[#E8613C] mt-4 text-center font-medium">
          {items.filter((item) => item.claimedBy.length === 0).length === items.length
            ? "Tap each item to assign it to someone"
            : `${items.filter((item) => item.claimedBy.length === 0).length} item${items.filter((item) => item.claimedBy.length === 0).length !== 1 ? "s" : ""} still need to be claimed`}
        </p>
      )}
    </>
  );
}
