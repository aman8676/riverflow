import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequest } from "@/models/server/auth";
import { syncedTotals } from "@/models/server/streak";
import { todayISODate } from "@/lib/date";

/**
 * The caller's practice totals, with the streaks recomputed from their solve
 * history and the cached copies on their prefs repaired if they had drifted.
 *
 * The dashboard asks for this on load. Without it the stats strip shows whatever
 * the streak was when the user last solved something — which is the wrong number
 * for exactly the user who needs to see it, the one who broke their streak.
 *
 * `today` is resolved on the server so a viewer in a different timezone can't
 * end up asking about a different day than the one their solves were stamped
 * with.
 */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to view your stats" },
      { status: 401 },
    );
  }

  try {
    const totals = await syncedTotals(user.$id, todayISODate());

    return NextResponse.json(totals, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message || "Could not read your stats" },
      { status: 500 },
    );
  }
}
