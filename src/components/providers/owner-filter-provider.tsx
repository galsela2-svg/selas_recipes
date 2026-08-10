"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/** "Who made it" filter for the dashboard — lives above the dashboard page
 * itself (in AppShell) so the compact picker in the top header and the
 * dashboard's own filtering logic share one value instead of drifting out
 * of sync. Resets to "הכול" on reload; not persisted, since it's a
 * transient browsing filter rather than a preference. */
type OwnerFilterContextValue = {
  ownerFilter: string | null;
  setOwnerFilter: (userId: string | null) => void;
};

const OwnerFilterContext = createContext<OwnerFilterContextValue | null>(null);

export function OwnerFilterProvider({ children }: { children: ReactNode }) {
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);
  return (
    <OwnerFilterContext.Provider value={{ ownerFilter, setOwnerFilter }}>
      {children}
    </OwnerFilterContext.Provider>
  );
}

export function useOwnerFilter(): OwnerFilterContextValue {
  const ctx = useContext(OwnerFilterContext);
  if (!ctx) throw new Error("useOwnerFilter must be used within OwnerFilterProvider");
  return ctx;
}
