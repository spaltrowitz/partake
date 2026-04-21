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
      className={`w-full py-3 px-6 rounded-full font-semibold border-2 border-[#FF8A80] text-[#FF8A80]
        hover:bg-[#FF8A80] hover:text-white transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-[#152038] rounded-xl p-4 shadow-md border border-[#1C2A4A] ${className}`}>
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
    <div className="flex items-center gap-2 p-3 bg-[#1C2A4A] rounded-xl">
      <span className="text-lg">💡</span>
      <p className="text-sm flex-1">{message}</p>
      <button
        onClick={onAccept}
        className="px-3 py-1 text-xs font-semibold text-white gradient-bg rounded-full"
      >
        Sure
      </button>
      <button onClick={onDismiss} className="text-[#8B9BB4] hover:text-white">
        ✕
      </button>
    </div>
  );
}
