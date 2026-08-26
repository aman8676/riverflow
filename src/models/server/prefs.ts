import { users } from "./config";
import { UserPrefs } from "@/store/auth";

/**
 * Appwrite's `updatePrefs` REPLACES the entire prefs object rather than merging
 * into it — writing `{ reputation }` alone silently drops `streak` and
 * `bestStreak`. Every prefs write must therefore read-modify-write, which is
 * what this helper does.
 *
 * Returns the merged prefs that were saved.
 */
export async function mergePrefs(
  userId: string,
  patch: Partial<UserPrefs>,
): Promise<UserPrefs> {
  const current = await users.getPrefs<UserPrefs>(userId);

  const merged: UserPrefs = {
    ...current,
    reputation: Number(current.reputation) || 0,
    ...patch,
  };

  await users.updatePrefs<UserPrefs>(userId, merged);

  return merged;
}

/**
 * Adds `delta` to a user's reputation without disturbing their other prefs.
 */
export async function adjustReputation(
  userId: string,
  delta: number,
): Promise<UserPrefs> {
  const current = await users.getPrefs<UserPrefs>(userId);

  return mergePrefs(userId, {
    reputation: (Number(current.reputation) || 0) + delta,
  });
}
