import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequest } from "@/models/server/auth";
import { buildSheet } from "@/lib/buildSheet";
import { getUserRating } from "@/lib/codeforces";
import { isPlatformOutage } from "@/lib/verifySolve";
import { resolveTier, tierById, topicById, SHEET_SIZE } from "@/lib/sheet";

/**
 * Generates a practice sheet for one DSA topic, sized to the caller's skill.
 *
 * Query parameters:
 * - `topic`  (required) a topic id from `DSA_TOPICS`
 * - `rating` (optional) a Codeforces rating to build for
 * - `tier`   (optional) pick the band directly, ignoring rating
 *
 * With neither `rating` nor `tier`, a signed-in caller's rating is read from
 * their linked Codeforces handle. That is the path the page normally takes:
 * the user picks a topic and the sheet already matches where they are.
 *
 * Anonymous and unrated callers fall through to the beginner band rather than
 * erroring - a sheet you can look at without an account is the point.
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const topic = topicById(params.get("topic"));

    if (!topic) {
      return NextResponse.json(
        { error: "Pick a topic to build a sheet from" },
        { status: 400 },
      );
    }

    const requestedTier = tierById(params.get("tier"));
    const ratingParam = params.get("rating");

    let rating: number | null = null;
    // Where the rating came from, so the UI can say "from your Codeforces
    // account" rather than leaving the user guessing why it chose that band.
    let ratingSource: "manual" | "codeforces" | "default" = "default";
    let handle = "";

    if (ratingParam !== null && ratingParam.trim() !== "") {
      const parsed = Number(ratingParam);

      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 4000) {
        return NextResponse.json(
          { error: "Rating must be a number between 0 and 4000" },
          { status: 400 },
        );
      }

      rating = Math.round(parsed);
      ratingSource = "manual";
    } else if (!requestedTier) {
      const user = await getUserFromRequest(request);
      handle = user?.prefs?.codeforcesHandle || "";

      if (handle) {
        try {
          rating = await getUserRating(handle);
          if (rating !== null) ratingSource = "codeforces";
        } catch {
          // Codeforces being unreachable shouldn't block the sheet; fall back
          // to the beginner band and let the user set a rating by hand.
        }
      }
    }

    const tier = requestedTier ?? resolveTier(rating);

    const { problems, sources } = await buildSheet(tier, topic, SHEET_SIZE);

    return NextResponse.json(
      {
        tier: {
          id: tier.id,
          label: tier.label,
          ratingLabel: tier.ratingLabel,
          blurb: tier.blurb,
          codeforces: tier.codeforces,
          leetcode: tier.leetcode,
        },
        topic: {
          id: topic.id,
          label: topic.label,
          summary: topic.summary,
          keyIdeas: topic.keyIdeas,
        },
        rating,
        ratingSource,
        handle,
        problems,
        sources,
      },
      { status: 200 },
    );
  } catch (error) {
    if (isPlatformOutage(error)) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: (error as Error)?.message || "Could not build your sheet" },
      { status: 500 },
    );
  }
}
