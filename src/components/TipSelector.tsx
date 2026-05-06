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
      <h3 className="text-sm font-semibold text-[#8B9BB4] mb-2">Tip</h3>
      <div className="flex gap-2">
        {TIP_OPTIONS.map((pct) => (
          <button
            key={pct}
            onClick={() => onSelectTip(pct)}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
              tipPercent === pct && !customTipMode
                ? "gradient-bg text-white"
                : "bg-[#1C2A4A] text-[#C4CFDE]"
            }`}
          >
            {pct}%
          </button>
        ))}
        <button
          onClick={onEnableCustom}
          className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
            customTipMode
              ? "gradient-bg text-white"
              : "bg-[#1C2A4A] text-[#C4CFDE]"
          }`}
        >
          Other
        </button>
      </div>
      {customTipMode && (
        <div className="flex items-center gap-2 mt-3 p-2 bg-[#1C2A4A] rounded-xl">
          <input
            type="number"
            step="0.5"
            min="0"
            placeholder="Tip %"
            defaultValue={tipPercent ?? ""}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val >= 0) onSelectTip(val);
            }}
            className="w-20 bg-transparent text-sm text-right outline-none font-bold"
            autoFocus
          />
          <span className="text-sm text-[#8B9BB4]">%</span>
          <span className="text-xs text-[#8B9BB4] ml-auto">
            = ${tipAmount.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
