/**
 * Shape checks for the competitive-programming usernames a user links to their
 * account. Shared by the settings form and the API route so the browser can
 * reject an obviously malformed handle without a round trip, and the server
 * never trusts that it did.
 *
 * These only cover the format. Whether the handle actually EXISTS is answered by
 * the platform itself in `/api/handles`.
 */

export type Platform = "codeforces" | "leetcode";

export const PLATFORMS: Platform[] = ["codeforces", "leetcode"];

export const PLATFORM_LABELS: Record<Platform, string> = {
  codeforces: "Codeforces",
  leetcode: "LeetCode",
};

/** Codeforces: 3-24 chars, letters/digits/underscore/hyphen/period. */
const CODEFORCES_PATTERN = /^[A-Za-z0-9_.-]{3,24}$/;

/** LeetCode: 1-39 chars, letters/digits/underscore/hyphen/period. */
const LEETCODE_PATTERN = /^[A-Za-z0-9_.-]{1,39}$/;

const PATTERNS: Record<Platform, RegExp> = {
  codeforces: CODEFORCES_PATTERN,
  leetcode: LEETCODE_PATTERN,
};

const FORMAT_HINTS: Record<Platform, string> = {
  codeforces:
    "Codeforces handles are 3-24 characters: letters, digits, _ . or -",
  leetcode: "LeetCode usernames are 1-39 characters: letters, digits, _ . or -",
};

export function isPlatform(value: unknown): value is Platform {
  return PLATFORMS.includes(value as Platform);
}

/**
 * Normalises a submitted handle.
 *
 * Returns `null` for anything that should clear the stored handle (empty, or a
 * non-string), so "" from a cleared input unlinks rather than saving a blank.
 */
export function normalizeHandle(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

/** `null` when the format is fine, otherwise the message to show the user. */
export function handleFormatError(
  platform: Platform,
  handle: string,
): string | null {
  return PATTERNS[platform].test(handle) ? null : FORMAT_HINTS[platform];
}
