"use client";

import React from "react";
import Link from "next/link";
import { IconFlame, IconTrophy, IconStarFilled } from "@tabler/icons-react";

import { authedJsonHeaders } from "@/models/client/authHeaders";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

const Stat = ({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  accent: string;
}) => (
  <div className="flex items-center gap-3">
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
        accent,
      )}
    >
      <Icon className="h-5 w-5" />
    </div>
    <div className="leading-tight">
      <p className="text-xl font-black tracking-tight">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  </div>
);

/**
 * Dashboard stats strip.
 *
 * Must be a client component: this app keeps the session in Zustand rather than
 * a server-readable cookie, so the surrounding server component has no idea who
 * is viewing.
 *
 * The cached prefs are rendered immediately so the strip never flashes empty,
 * then `/api/streak` re-derives the streaks from the solve history and corrects
 * them. That refresh is what makes a broken streak read zero: the cached value
 * was last written when the user solved something, so on its own it would keep
 * showing the run they were on before they stopped.
 */
const UserStats = () => {
  const { user, hydrated, setPrefs } = useAuthStore();

  // Depend on the id, not the user object: `setPrefs` replaces `user` through
  // immer, so depending on the object itself would make this effect retrigger
  // its own refresh forever.
  const userId = user?.$id;

  React.useEffect(() => {
    if (!hydrated || !userId) return;

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/streak", {
          headers: await authedJsonHeaders(),
        });

        if (!response.ok) return;

        const totals = await response.json();

        if (cancelled) return;

        setPrefs({
          points: Number(totals.points) || 0,
          streak: Number(totals.streak) || 0,
          bestStreak: Number(totals.bestStreak) || 0,
        });
      } catch {
        // Non-fatal: keep showing the cached values.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, userId, setPrefs]);

  // Render nothing until the persisted store has rehydrated, otherwise the
  // signed-in and signed-out states flash on every load.
  if (!hydrated) {
    return <div className="h-[86px]" aria-hidden />;
  }

  if (!user) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-border bg-card/20 p-5">
        <p className="text-sm text-muted-foreground">
          Sign in to track your streak and earn points for solving problems.
        </p>
        <Link
          href="/login"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const points = Number(user.prefs?.points) || 0;
  const streak = Number(user.prefs?.streak) || 0;
  const bestStreak = Number(user.prefs?.bestStreak) || 0;

  return (
    <div className="grid grid-cols-1 gap-5 rounded-2xl border border-border bg-card/40 p-5 backdrop-blur-sm sm:grid-cols-3">
      <Stat
        icon={IconStarFilled}
        label="Practice points"
        value={points}
        accent="bg-purple-500/10 text-purple-500"
      />
      <Stat
        icon={IconFlame}
        label={streak === 1 ? "Day streak" : "Day streak"}
        value={streak}
        accent="bg-orange-500/10 text-orange-500"
      />
      <Stat
        icon={IconTrophy}
        label="Best streak"
        value={bestStreak}
        accent="bg-yellow-500/10 text-yellow-500"
      />
    </div>
  );
};

export default UserStats;
