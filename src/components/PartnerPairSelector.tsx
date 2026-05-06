"use client";

import type { Participant } from "@/types";

export function PartnerPairSelector({
  participants,
  partnerPair,
  onSetPartnerPair,
}: {
  participants: Participant[];
  partnerPair: { payerId: string; partnerId: string } | null;
  onSetPartnerPair: (pair: { payerId: string; partnerId: string } | null) => void;
}) {
  if (participants.length < 2) return null;

  return (
    <div className="px-4 py-2 border-b border-[#1C2A4A]">
      {partnerPair ? (
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#8B9BB4]">
            👫 {participants.find((p) => p.id === partnerPair.partnerId)?.name}&apos;s items → {participants.find((p) => p.id === partnerPair.payerId)?.name}&apos;s tab
          </span>
          <button
            onClick={() => onSetPartnerPair(null)}
            className="text-xs text-[#FF8A80]"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            if (participants.length >= 2) {
              onSetPartnerPair({
                payerId: participants[0].id,
                partnerId: participants[1].id,
              });
            }
          }}
          className="text-xs text-[#8B9BB4] hover:text-[#FF8A80] transition-colors"
        >
          👫 Pair as couple/partners
        </button>
      )}
      {partnerPair && (
        <div className="flex gap-2 mt-2">
          <select
            value={partnerPair.payerId}
            onChange={(e) => onSetPartnerPair({ ...partnerPair, payerId: e.target.value })}
            className="flex-1 text-xs bg-[#1C2A4A] rounded-lg p-2 outline-none"
          >
            {participants.map((p) => (
              <option key={p.id} value={p.id}>{p.name} pays</option>
            ))}
          </select>
          <span className="text-xs text-[#8B9BB4] self-center">for</span>
          <select
            value={partnerPair.partnerId}
            onChange={(e) => onSetPartnerPair({ ...partnerPair, partnerId: e.target.value })}
            className="flex-1 text-xs bg-[#1C2A4A] rounded-lg p-2 outline-none"
          >
            {participants.filter((p) => p.id !== partnerPair.payerId).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
