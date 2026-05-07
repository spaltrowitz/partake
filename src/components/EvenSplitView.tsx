export function EvenSplitView({
  total,
  participantCount,
}: {
  total: number;
  participantCount: number;
}) {
  return (
    <div className="text-center py-8">
      <p className="text-[#9C8E80] mb-4">Everyone pays the same</p>
      <p className="text-4xl font-bold gradient-text">
        ${(total / participantCount).toFixed(2)}
      </p>
      <p className="text-sm text-[#9C8E80] mt-2">each</p>
    </div>
  );
}
