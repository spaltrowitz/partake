export function ReceiptSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 max-w-md mx-auto" role="status" aria-label="Loading receipt">
      {/* Restaurant name */}
      <div className="skeleton h-6 w-48 mx-auto" />
      
      {/* Items */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#F5EDE3]">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-4 w-16" />
        </div>
      ))}
      
      {/* Totals */}
      <div className="border-t border-[#F5EDE3] pt-3 flex flex-col gap-2">
        <div className="flex justify-between">
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-4 w-16" />
        </div>
        <div className="flex justify-between">
          <div className="skeleton h-4 w-12" />
          <div className="skeleton h-4 w-16" />
        </div>
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function BillHistorySkeleton() {
  return (
    <div className="flex flex-col gap-2" role="status" aria-label="Loading bills">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-[#FFFFFF] rounded-xl">
          <div className="flex flex-col gap-1">
            <div className="skeleton h-4 w-28" />
            <div className="skeleton h-3 w-20" />
          </div>
          <div className="skeleton h-4 w-14" />
        </div>
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}
