"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";

/**
 * Adapter global de nuqs (necesario para que los hooks `useQueryState`
 * se sincronicen con el router de Next 15 App Router).
 *
 * Anidaremos otros providers aquí cuando lleguen (ThemeProvider, etc.).
 */
export default function Providers({ children }: { children: ReactNode }) {
  return <NuqsAdapter>{children}</NuqsAdapter>;
}
