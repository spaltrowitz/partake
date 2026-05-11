import { ReactNode } from "react";

export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-3 px-6 rounded-full text-white font-semibold gradient-bg 
        hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full py-3 px-6 rounded-full font-semibold border-2 border-[#0F766E] text-[#0F766E]
        hover:bg-[#0F766E] hover:text-white transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

export function TopBarButton({
  children,
  onClick,
  className = "",
  variant = "neutral",
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
  variant?: "neutral" | "accent";
  "aria-label"?: string;
}) {
  const variantClass =
    variant === "accent"
      ? "border-[#99F6E4] bg-[#F0FDFA] text-[#0F766E] hover:border-[#0F766E] hover:bg-[#CCFBF1]"
      : "border-[#99F6E4] bg-white/90 text-[#334155] hover:border-[#14B8A6] hover:bg-[#F0FDFA] hover:text-[#0F766E]";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm shadow-[#0F172A]/5 transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E] ${variantClass} ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-[#FFFFFF] rounded-xl p-4 shadow-md border border-[#CCFBF1] ${className}`}>
      {children}
    </div>
  );
}

export function SuggestionCard({
  message,
  onAccept,
  onDismiss,
}: {
  message: string;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-center gap-2 p-3 bg-[#CCFBF1] rounded-xl">
      <span className="text-lg">💡</span>
      <p className="text-sm flex-1">{message}</p>
      <button
        onClick={onAccept}
        className="min-h-11 px-4 py-2 text-xs font-semibold text-white gradient-bg rounded-full"
      >
        Sure
      </button>
      <button onClick={onDismiss} className="min-h-11 min-w-11 rounded-full text-[#64748B] hover:bg-white/60 hover:text-[#0F172A]">
        ✕
      </button>
    </div>
  );
}
