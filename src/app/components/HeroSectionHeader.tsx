"use client";

import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { DottedSurface } from "@/components/ui/dotted-surface";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";
import React from "react";

const HeroSectionHeader = () => {
  const { session } = useAuthStore();

  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      <DottedSurface className="z-0" size={8} opacity={0.8} />
      {/* Fade the surface out toward the page content below */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-background/60 via-background/20 to-background" />

      <div className="container relative z-10 mx-auto flex min-h-screen items-center justify-center px-4">
        <div className="space-y-4 text-center">
          <h1 className="pointer-events-none py-10 whitespace-pre-wrap bg-gradient-to-b from-[#ffd319] via-[#ff2975] to-[#8c1eff] bg-clip-text text-center text-8xl font-bold leading-none tracking-tighter text-transparent font-manrope">
            RiverFlow
          </h1>
          <p className="text-center text-3xl max-w-3xl font-light py-4 leading-none tracking-tight font-manrope">
            Ask questions, share knowledge, and collaborate with developers
            worldwide. Join our community and enhance your coding skills!
          </p>
          <div className="flex items-center justify-center gap-4">
            {session ? (
              <Link href="/questions/ask">
                <ShimmerButton>
                  <span className=" text-center text-sm leading-none tracking-tight text-white lg:text-lg">
                    Ask a question
                  </span>
                </ShimmerButton>
              </Link>
            ) : (
              <>
                <Link href="/register">
                  <ShimmerButton className="shadow-2xl">
                    <span className="whitespace-pre-wrap text-center text-sm leading-none tracking-tight text-white dark:from-white dark:to-slate-900/10 lg:text-lg">
                      Sign up
                    </span>
                  </ShimmerButton>
                </Link>
                <Link
                  href="/login"
                  className="relative rounded-full border border-border px-8 py-3 text-foreground transition-colors hover:bg-muted"
                >
                  <span>Login</span>
                  <span className="absolute inset-x-0 -bottom-px mx-auto h-px w-1/2 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSectionHeader;
