"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/components/AuthProvider";
import { PullToRefresh } from "@/components/PullToRefresh";

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/bill") {
    return <PullToRefresh>{children}</PullToRefresh>;
  }

  return (
    <AuthProvider>
      <PullToRefresh>{children}</PullToRefresh>
    </AuthProvider>
  );
}
