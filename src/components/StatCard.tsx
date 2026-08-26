import React from "react";
import { MagicCard } from "@/components/magicui/magic-card";
import { NumberTicker } from "@/components/magicui/number-ticker";

export interface StatCardProps {
  label: string;
  value: number;
  /** Gradient endpoints for the orb glow and the number itself. */
  from: string;
  to: string;
  /** Tailwind gradient classes for the value text, e.g. "from-orange-500 to-pink-500". */
  gradient: string;
  /** Optional short line under the value, e.g. "days in a row". */
  caption?: string;
}

/**
 * One tile in a stats grid. Extracted because the profile page renders six of
 * these and the MagicCard + NumberTicker markup is otherwise repeated verbatim.
 */
const StatCard = ({
  label,
  value,
  from,
  to,
  gradient,
  caption,
}: StatCardProps) => {
  return (
    <MagicCard
      mode="orb"
      glowFrom={from}
      glowTo={to}
      glowSize={300}
      glowBlur={50}
      className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-border bg-card/40 p-8 shadow-sm backdrop-blur-md"
    >
      <span className="mb-2 text-xs font-bold tracking-wider uppercase text-muted-foreground">
        {label}
      </span>
      <span
        className={`bg-gradient-to-r bg-clip-text text-5xl font-black tracking-tight text-transparent ${gradient}`}
      >
        <NumberTicker value={value} />
      </span>
      {caption && (
        <span className="mt-1 text-xs text-muted-foreground">{caption}</span>
      )}
    </MagicCard>
  );
};

export default StatCard;
