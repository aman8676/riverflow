"use client";

import { BackgroundBeams } from "@/components/ui/background-beams";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import React from "react";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { session, hydrated } = useAuthStore();
  const router = useRouter();

  React.useEffect(() => {
    if (session && hydrated) {
      router.replace("/");
    }
  }, [session, router, hydrated]);

  if (!hydrated) return null;
  if (session) return null;

  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0">
        <BackgroundBeams />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default Layout;
