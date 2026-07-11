"use client";

import { IconCloud } from "@/components/magicui/icon-cloud";
import { Particles } from "@/components/magicui/particles";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";
import React from "react";

const slugs = [
  "typescript",
  "javascript",
  "dart",
  "java",
  "react",
  "flutter",
  "android",
  "html5",
  "css3",
  "nodedotjs",
  "express",
  "nextdotjs",
  "prisma",
  "amazonaws",
  "postgresql",
  "firebase",
  "nginx",
  "vercel",
  "testinglibrary",
  "jest",
  "cypress",
  "docker",
  "git",
  "jira",
  "github",
  "gitlab",
  "visualstudiocode",
  "androidstudio",
  "sonarqube",
  "figma",
];

const HeroSectionHeader = () => {
  const { session } = useAuthStore();

  return (
    <div className="container min-h-screen mx-auto px-4">
      {/* <Particles
        className="fixed inset-0 h-full w-full"
        quantity={500}
        ease={100}
        color="#ffffff"
        refresh
      /> */}
      <div className="relative z-10">
        <div className="flex items-center justify-center">
          <div className="space-y-4 text-center">
            <h1 className="pointer-events-none z-10 py-10 whitespace-pre-wrap bg-gradient-to-b from-[#ffd319] via-[#ff2975] to-[#8c1eff] bg-clip-text text-center text-8xl font-bold leading-none tracking-tighter text-transparent font-manrope">
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
        {/* <div className="flex items-center justify-center">
          <div className="relative max-w-[45rem] overflow-hidden">
            <IconCloud
              images={slugs.map(
                (slug) => `https://cdn.simpleicons.org/${slug}`,
              )}
            />
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default HeroSectionHeader;
