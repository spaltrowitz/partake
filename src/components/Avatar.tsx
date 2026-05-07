const PARTICIPANT_COLORS = [
  "#E8613C", "#2E7D32", "#1976D2", "#7B1FA2", "#F4A261",
  "#00897B", "#C62828", "#5C6BC0", "#EF6C00", "#2E86AB",
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
