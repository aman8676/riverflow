"use client";

import { BackgroundBeams } from "@/components/ui/background-beams";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import React from "react";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { session,hydrated } = useAuthStore();
  const router = useRouter();

  React.useEffect(() => {
    if (session && hydrated) {
      console.log("Session exists, redirecting to home page...")
      router.replace("/");
    }
  }, [session, router,hydrated]);


    if (!hydrated) return null;

    if (session) return null;



  return (
    <div className="relative min-h-screen flex items-center justify-center bg-neutral-950 antialiased overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <BackgroundBeams />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default Layout;
