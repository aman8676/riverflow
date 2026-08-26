import { NextRequest, NextResponse } from "next/server";

import { users } from "@/models/server/config";
import { getUserFromRequest } from "@/models/server/auth";
import { mergePrefs } from "@/models/server/prefs";
import { UserPrefs } from "@/store/auth";
import {
  Platform,
  PLATFORMS,
  PLATFORM_LABELS,
  handleFormatError,
  normalizeHandle,
} from "@/lib/handles";
import { codeforcesHandleExists } from "@/lib/codeforces";
import { leetcodeHandleExists } from "@/lib/leetcode";
import { isPlatformOutage } from "@/lib/verifySolve";

/** Which pref holds each platform's handle and its link timestamp. */
const PREF_KEYS = {
  codeforces: { handle: "codeforcesHandle", linkedAt: "codeforcesLinkedAt" },
  leetcode: { handle: "leetcodeHandle", linkedAt: "leetcodeLinkedAt" },
} as const;

const EXISTS_CHECK: Record<Platform, (handle: string) => Promise<boolean>> = {
  codeforces: codeforcesHandleExists,
  leetcode: leetcodeHandleExists,
};

/** The public view of a user's linked accounts. */
function handlesFrom(prefs: UserPrefs) {
  return {
    codeforcesHandle: prefs.codeforcesHandle || "",
    leetcodeHandle: prefs.leetcodeHandle || "",
    codeforcesLinkedAt: Number(prefs.codeforcesLinkedAt) || 0,
    leetcodeLinkedAt: Number(prefs.leetcodeLinkedAt) || 0,
  };
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to view your linked accounts" },
      { status: 401 },
    );
  }

  const prefs = await users.getPrefs<UserPrefs>(user.$id);

  return NextResponse.json(handlesFrom(prefs), { status: 200 });
}

/**
 * Links (or clears) the caller's platform handles.
 *
 * Only the platforms present in the body are touched, so the form can save one
 * field without wiping the other. An empty string unlinks.
 *
 * Every handle is checked against the platform before it is stored: a typo would
 * otherwise fail silently later, at verification time, looking like "your solve
 * doesn't count" rather than "that account doesn't exist".
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to link your accounts" },
        { status: 401 },
      );
    }

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const current = await users.getPrefs<UserPrefs>(user.$id);

    // platform -> the handle to store ("" unlinks). Only holds submitted ones.
    const submitted = new Map<Platform, string | null>();
    const fieldErrors: Partial<Record<Platform, string>> = {};

    for (const platform of PLATFORMS) {
      const key = PREF_KEYS[platform].handle;

      if (!(key in body)) continue;

      const handle = normalizeHandle(body[key]);

      if (handle === null) {
        submitted.set(platform, null);
        continue;
      }

      const formatError = handleFormatError(platform, handle);

      if (formatError) {
        fieldErrors[platform] = formatError;
        continue;
      }

      submitted.set(platform, handle);
    }

    if (submitted.size === 0 && Object.keys(fieldErrors).length === 0) {
      return NextResponse.json(
        { error: "Provide codeforcesHandle and/or leetcodeHandle" },
        { status: 400 },
      );
    }

    const patch: Partial<UserPrefs> = {};
    const now = Math.floor(Date.now() / 1000);

    for (const [platform, handle] of submitted) {
      const keys = PREF_KEYS[platform];
      const previous = current[keys.handle] || "";

      if (handle === null) {
        patch[keys.handle] = "";
        patch[keys.linkedAt] = 0;
        continue;
      }

      // Handles are case-insensitive on both platforms, so only a real change
      // resets the link timestamp — re-saving the same handle with different
      // capitalisation must not invalidate today's solves.
      if (previous.toLowerCase() === handle.toLowerCase()) {
        patch[keys.handle] = handle;
        continue;
      }

      let exists: boolean;

      try {
        exists = await EXISTS_CHECK[platform](handle);
      } catch (error) {
        if (isPlatformOutage(error)) {
          return NextResponse.json(
            { error: (error as Error).message },
            { status: 502 },
          );
        }
        throw error;
      }

      if (!exists) {
        fieldErrors[platform] =
          `No ${PLATFORM_LABELS[platform]} account found with that ${platform === "codeforces" ? "handle" : "username"}`;
        continue;
      }

      patch[keys.handle] = handle;
      patch[keys.linkedAt] = now;
    }

    // Nothing survived validation — don't write, and report every field at once.
    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "Could not link those accounts", fieldErrors },
        { status: 400 },
      );
    }

    const saved = await mergePrefs(user.$id, patch);

    return NextResponse.json(
      {
        ...handlesFrom(saved),
        // A partial success: some fields saved, others didn't.
        ...(Object.keys(fieldErrors).length > 0 ? { fieldErrors } : {}),
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error saving your linked accounts" },
      { status: error?.code || error?.status || 500 },
    );
  }
}
