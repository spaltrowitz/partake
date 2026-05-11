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
      className={`w-full py-3 px-6 rounded-full font-semibold border-2 border-[#E8613C] text-[#E8613C]
        hover:bg-[#E8613C] hover:text-white transition-colors ${className}`}
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
      ? "border-[#FFD6A5] bg-[#FFF7EF] text-[#E8613C] hover:border-[#E8613C] hover:bg-[#FFE8D4]"
      : "border-[#E8DDD0] bg-white/90 text-[#6F5F51] hover:border-[#F4A261] hover:bg-[#FFF7EF] hover:text-[#E8613C]";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm shadow-[#2D2319]/5 transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8613C] ${variantClass} ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-[#FFFFFF] rounded-xl p-4 shadow-md border border-[#F5EDE3] ${className}`}>
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
    <div className="flex items-center gap-2 p-3 bg-[#F5EDE3] rounded-xl">
      <span className="text-lg">💡</span>
      <p className="text-sm flex-1">{message}</p>
      <button
        onClick={onAccept}
        className="min-h-10 px-4 py-2 text-xs font-semibold text-white gradient-bg rounded-full"
      >
        Sure
      </button>
      <button onClick={onDismiss} className="min-h-10 min-w-10 rounded-full text-[#9C8E80] hover:bg-white/60 hover:text-[#2D2319]">
        ✕
      </button>
    </div>
  );
}
