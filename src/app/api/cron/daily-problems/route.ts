import { NextRequest, NextResponse } from "next/server";

import { ensureDailyProblems } from "@/lib/dailyProblems";
import { todayISODate } from "@/lib/date";

// Scraping Codeforces' problem pages is paced at one request every two seconds,
// so this route needs well past the default serverless budget.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Rotates the daily problems.
 *
 * Meant to be called once a day by a scheduler (see `vercel.json`), but safe to
 * call at any time: `ensureDailyProblems` is a no-op once the day is published.
 *
 * Authorised with `CRON_SECRET` as a bearer token. Vercel Cron sends that header
 * automatically when the variable is set; anything else has to send it by hand:
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://.../api/cron/daily-problems
 *
 * Without `CRON_SECRET` configured the route refuses to run rather than leaving
 * an unauthenticated endpoint that hammers both platforms' APIs on demand.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured on this deployment" },
      { status: 503 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date = todayISODate();

  try {
    const result = await ensureDailyProblems(date);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        date,
        error:
          (error as Error)?.message || "Could not publish today's problems",
      },
      { status: 502 },
    );
  }
}
