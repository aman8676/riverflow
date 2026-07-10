"use client";

import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import React from "react";

export default function LogoutPage() {
  const { logout } = useAuthStore();
  const router = useRouter();

  React.useEffect(() => {
    const doLogout = async () => {
      await logout(); // this must complete first
      router.replace("/login");
    };
    doLogout();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Logging out...</p>
    </div>
  );
}
