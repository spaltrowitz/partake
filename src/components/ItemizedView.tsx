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
            <Avatar name={p.name} index={i} size={48} allNames={participants.map(pp => pp.name)} />
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
  onSplitItem,
}: {
  items: BillItem[];
  participants: Participant[];
  selectedParticipant: string;
  onToggleClaim: (itemId: string) => void;
  onSplitItem?: (itemId: string) => void;
}) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
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
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all text-left ${
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
              {/* Split option for quantity items */}
              {item.quantity > 1 && onSplitItem && (
                <button
                  onClick={(e) => { e.stopPropagation(); setExpandedItem(isExpanded ? null : item.id); }}
                  className="w-full text-xs text-[#9C8E80] py-1 hover:text-[#E8613C] transition-colors"
                >
                  {isExpanded ? "Cancel" : `Need to split these ${item.quantity} individually?`}
                </button>
              )}
              {isExpanded && item.quantity > 1 && onSplitItem && (
                <button
                  onClick={() => { onSplitItem(item.id); setExpandedItem(null); }}
                  className="w-full py-2 mb-1 rounded-lg border border-[#E8613C] text-[#E8613C] text-sm font-medium hover:bg-[#FFF3E0] transition-colors"
                >
                  Split into {item.quantity} separate items
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
