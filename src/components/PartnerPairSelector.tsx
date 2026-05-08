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

  if (partnerPair) {
    const payerName = participants.find((p) => p.id === partnerPair.payerId)?.name ?? "";
    const partnerName = participants.find((p) => p.id === partnerPair.partnerId)?.name ?? "";

    return (
      <div className="mx-4 my-2 p-3 bg-[#F5EDE3] rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">👫 Couple mode</span>
          <button
            onClick={() => onSetPartnerPair(null)}
            className="text-xs text-[#E8613C] font-medium py-1 px-2"
          >
            Remove
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={partnerPair.payerId}
            onChange={(e) => {
              const newPayerId = e.target.value;
              const newPartnerId = partnerPair.partnerId === newPayerId
                ? participants.find((p) => p.id !== newPayerId)?.id ?? partnerPair.partnerId
                : partnerPair.partnerId;
              onSetPartnerPair({ payerId: newPayerId, partnerId: newPartnerId });
            }}
            className="flex-1 text-sm bg-white rounded-lg py-2 px-3 outline-none border border-[#E8DDD0]"
          >
            {participants.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <span className="text-sm text-[#9C8E80]">covers</span>
          <select
            value={partnerPair.partnerId}
            onChange={(e) => onSetPartnerPair({ ...partnerPair, partnerId: e.target.value })}
            className="flex-1 text-sm bg-white rounded-lg py-2 px-3 outline-none border border-[#E8DDD0]"
          >
            {participants.filter((p) => p.id !== partnerPair.payerId).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 my-2">
      <button
        onClick={() => {
          onSetPartnerPair({
            payerId: participants[0].id,
            partnerId: participants[1].id,
          });
        }}
        className="w-full py-2.5 px-4 rounded-xl border border-dashed border-[#E8DDD0] text-sm text-[#9C8E80] hover:bg-[#F5EDE3] transition-colors"
      >
        👫 Someone covering for another?
      </button>
    </div>
  );
}
