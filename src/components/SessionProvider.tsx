"use client";

import { useAuthStore } from "@/store/auth";
import { useEffect } from "react";

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  const { hydrated, verifySession } = useAuthStore();

  useEffect(() => {
    if (hydrated) {
      verifySession();
    }
  }, [hydrated, verifySession]);

  return <>{children}</>;
}
