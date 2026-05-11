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
    <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-px-3 p-3 bg-[#FFFFFF] border-b border-[#FDE68A]">
      {SPLIT_METHODS.map((method) => (
        <button
          key={method.id}
          onClick={() => onSelect(method.id)}
          aria-label={`${method.label}: ${method.description}`}
          aria-pressed={splitMethod === method.id}
          className={`min-h-11 min-w-fit snap-start px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-[#D97706] ${
            splitMethod === method.id
              ? "gradient-bg text-white"
              : "bg-[#FDE68A] text-[#8A7353]"
          }`}
        >
          {method.label}
        </button>
      ))}
    </div>
  );
}
