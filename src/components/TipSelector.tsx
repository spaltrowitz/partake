"use client";

const TIP_OPTIONS = [15, 18, 20, 25];

export function TipSelector({
  tipPercent,
  tipAmount,
  customTipMode,
  onSelectTip,
  onEnableCustom,
}: {
  tipPercent?: number;
  tipAmount: number;
  customTipMode: boolean;
  onSelectTip: (percent: number) => void;
  onEnableCustom: () => void;
}) {
  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-[#64748B] mb-2">Tip</h3>
      <div className="flex gap-2">
        {TIP_OPTIONS.map((pct) => (
          <button
            key={pct}
            onClick={() => onSelectTip(pct)}
            aria-label={`Set tip to ${pct}%`}
            className={`flex-1 py-3 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F766E] ${
              tipPercent === pct && !customTipMode
                ? "gradient-bg text-white"
                : "bg-[#CCFBF1] text-[#6B5D4F]"
            }`}
          >
            {pct}%
          </button>
        ))}
        <button
          onClick={onEnableCustom}
          aria-label="Enter a custom tip percentage"
          className={`flex-1 py-3 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F766E] ${
            customTipMode
              ? "gradient-bg text-white"
              : "bg-[#CCFBF1] text-[#6B5D4F]"
          }`}
        >
          Other
        </button>
      </div>
      {customTipMode && (
        <div className="flex items-center gap-2 mt-3 p-2 bg-[#CCFBF1] rounded-xl">
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            placeholder="Tip %"
            defaultValue={tipPercent ?? ""}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val >= 0) onSelectTip(val);
            }}
            aria-label="Custom tip percentage"
            className="min-h-11 w-24 rounded-lg bg-white px-2 py-1 text-right text-sm font-bold outline-none focus:ring-2 focus:ring-[#0F766E]"
            autoFocus
          />
          <span className="text-sm text-[#64748B]">%</span>
          <span className="text-xs text-[#64748B] ml-auto">
            = ${tipAmount.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
