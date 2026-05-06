"use client";

import type { SplitMethod } from "@/types";

const SPLIT_METHODS: { id: SplitMethod; label: string; description: string }[] = [
  { id: "itemized", label: "By item", description: "Everyone pays for what they got" },
  { id: "even", label: "Equally", description: "Same amount each" },
  { id: "percentage", label: "By %", description: "Custom percentage per person" },
  { id: "shares", label: "By shares", description: "Weighted portions" },
  { id: "exact", label: "Exact amounts", description: "Enter each person's amount" },
];

export function SplitMethodSelector({
  splitMethod,
  onSelect,
}: {
  splitMethod: SplitMethod;
  onSelect: (method: SplitMethod) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto p-3 bg-[#152038] border-b border-[#1C2A4A]">
      {SPLIT_METHODS.map((method) => (
        <button
          key={method.id}
          onClick={() => onSelect(method.id)}
          className={`px-4 py-2.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            splitMethod === method.id
              ? "gradient-bg text-white"
              : "bg-[#1C2A4A] text-[#8B9BB4]"
          }`}
        >
          {method.label}
        </button>
      ))}
    </div>
  );
}
