"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/components/AuthProvider";
import { FeedbackWidget } from "@/components/FeedbackWidget";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <FeedbackWidget />
    </AuthProvider>
  );
}
