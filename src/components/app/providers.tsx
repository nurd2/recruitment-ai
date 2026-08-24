"use client";

import { ProgressProvider } from "@bprogress/next/app";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ProgressProvider
      height="4px"
      color="var(--primary)"
      options={{ showSpinner: false }}
    >
      {children}
    </ProgressProvider>
  );
}
