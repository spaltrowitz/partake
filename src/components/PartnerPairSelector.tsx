"use client";

import { useState } from "react";
import type { Participant } from "@/types";

interface PayingGroup {
  payerId: string;
  memberIds: string[];
}

export function PartnerGroupSelector({
  participants,
  payingGroups,
  onSetPayingGroups,
}: {
  participants: Participant[];
  payingGroups: PayingGroup[];
  onSetPayingGroups: (groups: PayingGroup[]) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newPayerId, setNewPayerId] = useState("");
  const [newMemberIds, setNewMemberIds] = useState<string[]>([]);

  if (participants.length < 2) return null;

  const assignedIds = new Set<string>();
  for (const g of payingGroups) {
    assignedIds.add(g.payerId);
    g.memberIds.forEach(id => assignedIds.add(id));
  }

  const availablePeople = participants.filter(p => !assignedIds.has(p.id));

  function addGroup() {
    if (!newPayerId || newMemberIds.length === 0) return;
    onSetPayingGroups([...payingGroups, { payerId: newPayerId, memberIds: newMemberIds }]);
    setNewPayerId("");
    setNewMemberIds([]);
    setIsAdding(false);
  }

  function removeGroup(index: number) {
    onSetPayingGroups(payingGroups.filter((_, i) => i !== index));
  }

  return (
    <div className="mx-4 my-2">
      {payingGroups.map((group, i) => {
        const payer = participants.find(p => p.id === group.payerId);
        const members = group.memberIds.map(id => participants.find(p => p.id === id)?.name).filter(Boolean);
        return (
          <div key={i} className="p-3 bg-[#CCFBF1] rounded-xl mb-2 flex items-center justify-between">
            <span className="text-sm">
              👫 <strong>{payer?.name}</strong> covers {members.join(" & ")}
            </span>
            <button onClick={() => removeGroup(i)} className="min-h-11 rounded-full px-3 py-2 text-xs text-[#0F766E] font-semibold">
              Remove
            </button>
          </div>
        );
      })}

      {isAdding ? (
        <div className="p-3 bg-[#CCFBF1] rounded-xl mb-2 flex flex-col gap-3">
          <p className="text-sm font-medium">Who&apos;s paying?</p>
          <select
            value={newPayerId}
            onChange={(e) => { setNewPayerId(e.target.value); setNewMemberIds([]); }}
            aria-label="Select who is paying for the group"
            className="min-h-11 text-sm bg-white rounded-lg py-2 px-3 outline-none border border-[#99F6E4] focus:ring-2 focus:ring-[#0F766E]"
          >
            <option value="">Select person</option>
            {availablePeople.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {newPayerId && (
            <>
              <p className="text-sm font-medium">Covering who?</p>
              <div className="flex flex-wrap gap-2">
                {availablePeople.filter(p => p.id !== newPayerId).map(p => {
                  const selected = newMemberIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      aria-pressed={selected}
                      aria-label={`${selected ? "Remove" : "Add"} ${p.name} from covered group`}
                      onClick={() => setNewMemberIds(prev =>
                        selected ? prev.filter(id => id !== p.id) : [...prev, p.id]
                      )}
                      className={`min-h-11 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                        selected ? "gradient-bg text-white" : "bg-white border border-[#99F6E4] text-[#64748B]"
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex gap-2">
            <button
              onClick={addGroup}
              disabled={!newPayerId || newMemberIds.length === 0}
              className="flex-1 min-h-11 py-2 rounded-full text-white text-sm font-semibold gradient-bg disabled:opacity-30"
            >
              Combine
            </button>
            <button
              onClick={() => { setIsAdding(false); setNewPayerId(""); setNewMemberIds([]); }}
              className="min-h-11 px-4 py-2 text-sm text-[#64748B]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        availablePeople.length >= 2 && (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full min-h-11 py-2.5 px-4 rounded-xl border border-dashed border-[#99F6E4] text-sm text-[#64748B] hover:bg-[#CCFBF1] transition-colors"
          >
            {payingGroups.length > 0 ? "+ Add another group" : "👫 Paying together? Combine tabs"}
          </button>
        )
      )}
    </div>
  );
}
