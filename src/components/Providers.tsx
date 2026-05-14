"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/components/AuthProvider";
import { PullToRefresh } from "@/components/PullToRefresh";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <PullToRefresh>{children}</PullToRefresh>
    </AuthProvider>
  );
}
