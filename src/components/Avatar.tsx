const PARTICIPANT_COLORS = [
  "#FF8A80", "#4ECDC4", "#FFE66D", "#A18CD1", "#FF8E53",
  "#45B7D1", "#96E6A1", "#DDA0DD", "#F7DC6F", "#82E0AA",
];

export function Avatar({
  name,
  index,
  size = 44,
  className = "",
}: {
  name: string;
  index: number;
  size?: number;
  className?: string;
}) {
  const parts = name.trim().split(" ").filter(Boolean);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : (name.trim() || "?").slice(0, 2).toUpperCase();

  const color = PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length];

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: size * 0.38,
      }}
    >
      {initials}
    </div>
  );
}

export function getParticipantColor(index: number): string {
  return PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length];
}
