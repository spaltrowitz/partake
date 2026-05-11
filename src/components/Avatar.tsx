const PARTICIPANT_COLORS = [
  "#0F766E", "#2E7D32", "#1976D2", "#7B1FA2", "#14B8A6",
  "#00897B", "#C62828", "#5C6BC0", "#EF6C00", "#2E86AB",
];

function getInitials(name: string, allNames?: string[]): string {
  const parts = name.trim().split(" ").filter(Boolean);

  // If the person has a first + last name, use first letter of each
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  const firstChar = (parts[0] || "?")[0].toUpperCase();

  // Check if another person shares the same first initial
  if (allNames && allNames.length > 1) {
    const sameInitial = allNames.filter(
      (n) => n.trim()[0]?.toUpperCase() === firstChar && n.trim().toLowerCase() !== name.trim().toLowerCase()
    );
    if (sameInitial.length > 0) {
      // Collision — use first 2 letters
      return (parts[0] || "?").slice(0, 2).toUpperCase();
    }
  }

  // No collision — just first letter
  return firstChar;
}

export function Avatar({
  name,
  index,
  size = 44,
  className = "",
  allNames,
}: {
  name: string;
  index: number;
  size?: number;
  className?: string;
  allNames?: string[];
}) {
  const initials = getInitials(name, allNames);

  const color = PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length];

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: size * (initials.length > 1 ? 0.34 : 0.42),
      }}
    >
      {initials}
    </div>
  );
}

export function getParticipantColor(index: number): string {
  return PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length];
}
