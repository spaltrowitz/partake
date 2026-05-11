"use client";

import { useState } from "react";
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
    <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-px-4 p-4 bg-[#FFFFFF]">
      {participants.map((p, i) => (
        <button
          key={p.id}
          onClick={() => onSelectParticipant(p.id)}
          aria-label={`Assign items to ${p.name}`}
          aria-pressed={selectedParticipant === p.id}
          className="flex min-h-[90px] min-w-[80px] snap-start flex-col items-center justify-center gap-2 rounded-xl p-2 transition-colors hover:bg-[#F5EDE3] focus:outline-none focus:ring-2 focus:ring-[#E8613C]"
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
            <Avatar name={p.name} index={i} size={48} allNames={participants.map(pp => pp.name)} />
          </div>
          <span
             className={`max-w-[72px] truncate text-xs ${
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
  onSplitItem,
  claimsLocked = false,
}: {
  items: BillItem[];
  participants: Participant[];
  selectedParticipant: string;
  onToggleClaim: (itemId: string) => void;
  onSplitItem?: (itemId: string, count: number) => void;
  claimsLocked?: boolean;
}) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [splitCount, setSplitCount] = useState(2);
  const unclaimedCount = items.filter((item) => item.claimedBy.length === 0).length;

  return (
    <>
      {unclaimedCount > 0 && (
        <p className="text-sm text-[#E8613C] mb-3 text-center font-medium">
          {unclaimedCount === items.length
            ? "Tap each item to assign it to someone"
            : `${unclaimedCount} item${unclaimedCount !== 1 ? "s" : ""} still need to be claimed`}
        </p>
      )}
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
          const isExpanded = expandedItem === item.id;
          return (
            <div key={item.id}>
              <button
                onClick={() => onToggleClaim(item.id)}
                disabled={claimsLocked}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all text-left ${
                  isClaimed
                    ? "bg-[#E8F5E9]"
                    : "bg-[#F5EDE3] hover:bg-[#F5EDE3]"
                } ${isClaimed ? "pop-animation" : ""} ${claimsLocked ? "opacity-70 cursor-not-allowed" : ""}`}
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
              {/* Split option for quantity items */}
              {item.quantity > 1 && onSplitItem && (
                <button
                  disabled={claimsLocked}
                  onClick={(e) => { e.stopPropagation(); setExpandedItem(isExpanded ? null : item.id); setSplitCount(item.quantity); }}
                  className="w-full min-h-11 text-xs font-medium text-[#9C8E80] py-2 hover:text-[#E8613C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExpanded ? "Cancel" : `Need to split these individually?`}
                </button>
              )}
              {isExpanded && !claimsLocked && item.quantity > 1 && onSplitItem && (
                <div className="p-3 mb-1 rounded-lg bg-[#F5EDE3] flex flex-col gap-2">
                  <p className="text-xs text-[#9C8E80]">How many portions? (receipt says {item.quantity}, but you can change it)</p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
                      className="w-11 h-11 rounded-full bg-white border border-[#E8DDD0] text-sm font-bold"
                    >−</button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={2}
                      value={splitCount}
                      onChange={(e) => setSplitCount(Math.max(2, parseInt(e.target.value, 10) || 2))}
                      aria-label="Number of portions"
                      className="min-h-11 w-16 rounded-lg border border-[#E8DDD0] bg-white px-2 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#E8613C]"
                    />
                    <button
                      onClick={() => setSplitCount(splitCount + 1)}
                      className="w-11 h-11 rounded-full bg-white border border-[#E8DDD0] text-sm font-bold"
                    >+</button>
                  </div>
                  <p className="text-xs text-[#9C8E80] text-center">
                    ${(item.price * item.quantity).toFixed(2)} ÷ {splitCount} = <strong>${((item.price * item.quantity) / splitCount).toFixed(2)} each</strong>
                  </p>
                  <button
                    onClick={() => { onSplitItem(item.id, splitCount); setExpandedItem(null); }}
                    className="w-full min-h-11 py-2 rounded-lg text-white text-sm font-semibold gradient-bg"
                  >
                    Split into {splitCount} × ${((item.price * item.quantity) / splitCount).toFixed(2)}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
