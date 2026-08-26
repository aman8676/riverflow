"use client";

import React from "react";
import Link from "next/link";
import {
  IconBrandLeetcode,
  IconCheck,
  IconCode,
  IconExternalLink,
  IconLoader2,
} from "@tabler/icons-react";

import { authedJsonHeaders } from "@/models/client/authHeaders";
import { useAuthStore } from "@/store/auth";
import { Platform, handleFormatError, PLATFORM_LABELS } from "@/lib/handles";
import { cn } from "@/lib/utils";

/** Everything that differs between the two platform fields. */
const FIELDS: {
  platform: Platform;
  prefKey: "codeforcesHandle" | "leetcodeHandle";
  icon: React.ElementType;
  placeholder: string;
  noun: string;
  accent: string;
  profileUrl: (handle: string) => string;
}[] = [
  {
    platform: "codeforces",
    prefKey: "codeforcesHandle",
    icon: IconCode,
    placeholder: "e.g. tourist",
    noun: "handle",
    accent: "text-blue-500",
    profileUrl: (handle) => `https://codeforces.com/profile/${handle}`,
  },
  {
    platform: "leetcode",
    prefKey: "leetcodeHandle",
    icon: IconBrandLeetcode,
    placeholder: "e.g. john_doe",
    noun: "username",
    accent: "text-amber-500",
    profileUrl: (handle) => `https://leetcode.com/u/${handle}/`,
  },
];

type Values = Record<Platform, string>;
type Errors = Partial<Record<Platform, string>>;

const EMPTY_VALUES: Values = { codeforces: "", leetcode: "" };

/**
 * Where a user links the accounts their solves are verified against.
 *
 * The handles live in Appwrite user prefs rather than a collection: they are
 * one-per-user, always read together with the session, and never queried across
 * users. `/api/handles` checks each one against the platform before saving, so
 * a typo is caught here instead of silently failing every future verification.
 */
const HandleSettings = () => {
  const { user, hydrated, setPrefs } = useAuthStore();

  const [values, setValues] = React.useState<Values>(EMPTY_VALUES);
  const [saved, setSaved] = React.useState<Values>(EMPTY_VALUES);
  const [errors, setErrors] = React.useState<Errors>({});
  const [formError, setFormError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [justSaved, setJustSaved] = React.useState(false);

  const storedCodeforces = user?.prefs?.codeforcesHandle || "";
  const storedLeetcode = user?.prefs?.leetcodeHandle || "";

  const [lastStored, setLastStored] = React.useState<Values>(EMPTY_VALUES);

  // Seed the form from the cached prefs, and re-seed when they change — on
  // rehydration, or after `verifySession` picks up a handle linked elsewhere.
  //
  // Adjusted during render rather than in an effect: this is state derived from
  // props/store, and an effect would render the stale value first and then
  // immediately render again. Only the fields the store actually changed are
  // overwritten, so a value the user is still editing (a handle the API just
  // rejected, say) survives a save that only changed the other field.
  if (
    lastStored.codeforces !== storedCodeforces ||
    lastStored.leetcode !== storedLeetcode
  ) {
    const stored: Values = {
      codeforces: storedCodeforces,
      leetcode: storedLeetcode,
    };

    setValues((current) => ({
      codeforces:
        lastStored.codeforces !== storedCodeforces
          ? storedCodeforces
          : current.codeforces,
      leetcode:
        lastStored.leetcode !== storedLeetcode
          ? storedLeetcode
          : current.leetcode,
    }));
    setSaved(stored);
    setLastStored(stored);
  }

  if (!hydrated || !user) return null;

  const dirty =
    values.codeforces.trim() !== saved.codeforces ||
    values.leetcode.trim() !== saved.leetcode;

  const update = (platform: Platform, value: string) => {
    setValues((current) => ({ ...current, [platform]: value }));
    setErrors((current) => ({ ...current, [platform]: undefined }));
    setJustSaved(false);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();

    if (saving) return;

    const trimmed: Values = {
      codeforces: values.codeforces.trim(),
      leetcode: values.leetcode.trim(),
    };

    // Cheap client-side pass so an obviously malformed handle doesn't cost a
    // round trip. The route re-checks — this is convenience, not validation.
    const localErrors: Errors = {};

    for (const { platform } of FIELDS) {
      const handle = trimmed[platform];
      if (!handle) continue;

      const error = handleFormatError(platform, handle);
      if (error) localErrors[platform] = error;
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    setFormError("");

    try {
      const response = await fetch("/api/handles", {
        method: "POST",
        headers: await authedJsonHeaders(),
        body: JSON.stringify({
          codeforcesHandle: trimmed.codeforces,
          leetcodeHandle: trimmed.leetcode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors(data?.fieldErrors ?? {});
        // A field-level message is already shown next to its input.
        if (!data?.fieldErrors) setFormError(data?.error || "Could not save");
        return;
      }

      const next: Values = {
        codeforces: data.codeforcesHandle || "",
        leetcode: data.leetcodeHandle || "",
      };

      // A partial success: one handle saved, the other was rejected. Keep what
      // was typed into a rejected field so the typo can be corrected in place.
      const fieldErrors: Errors = data.fieldErrors ?? {};

      setValues({
        codeforces: fieldErrors.codeforces ? trimmed.codeforces : next.codeforces,
        leetcode: fieldErrors.leetcode ? trimmed.leetcode : next.leetcode,
      });
      setSaved(next);
      setErrors(fieldErrors);
      setJustSaved(!data.fieldErrors);

      // Keep the cached session in step so a verification right after saving
      // sees the handle without a reload.
      setPrefs({
        codeforcesHandle: next.codeforces,
        leetcodeHandle: next.leetcode,
        codeforcesLinkedAt: data.codeforcesLinkedAt,
        leetcodeLinkedAt: data.leetcodeLinkedAt,
      });
    } catch (error) {
      setFormError((error as Error)?.message || "Could not save your accounts");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      id="linked-accounts"
      onSubmit={save}
      className="scroll-mt-24 rounded-2xl border border-border bg-card/40 p-5 backdrop-blur-sm"
    >
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold tracking-tight">Linked accounts</h2>
        {justSaved && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-500">
            <IconCheck className="h-3.5 w-3.5" />
            Saved
          </span>
        )}
      </div>

      <p className="mb-5 text-sm text-muted-foreground">
        Add your IDs so solves can be verified on the platform itself. Points are
        awarded from the accepted submission&apos;s runtime and memory — only
        solves made after linking count.
      </p>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {FIELDS.map(({ platform, prefKey, icon: Icon, placeholder, noun, accent, profileUrl }) => {
          const linked = saved[platform];
          const error = errors[platform];

          return (
            <div key={platform} className="flex flex-col gap-1.5">
              <label
                htmlFor={`${platform}-handle`}
                className="flex items-center gap-1.5 text-sm font-semibold"
              >
                <Icon className={cn("h-4 w-4", accent)} />
                {PLATFORM_LABELS[platform]} {noun}
              </label>

              <input
                id={`${platform}-handle`}
                name={prefKey}
                value={values[platform]}
                onChange={(event) => update(platform, event.target.value)}
                placeholder={placeholder}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${platform}-error` : undefined}
                className={cn(
                  "h-10 rounded-lg border bg-background px-3 text-sm outline-none transition-colors",
                  "focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20",
                  error ? "border-destructive" : "border-border",
                )}
              />

              {error ? (
                <p id={`${platform}-error`} className="text-xs text-destructive">
                  {error}
                </p>
              ) : linked ? (
                <a
                  href={profileUrl(linked)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <IconCheck className="h-3.5 w-3.5 text-emerald-500" />
                  Linked as {linked}
                  <IconExternalLink className="h-3 w-3 opacity-60" />
                </a>
              ) : (
                <p className="text-xs text-muted-foreground/70">
                  Not linked — solves on {PLATFORM_LABELS[platform]} won&apos;t
                  earn points.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {formError && <p className="mt-4 text-xs text-destructive">{formError}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving || !dirty}
          className={cn(
            "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors",
            "bg-primary text-primary-foreground hover:bg-primary/80",
            (saving || !dirty) && "cursor-not-allowed opacity-50",
          )}
        >
          {saving ? (
            <>
              <IconLoader2 className="h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            "Save accounts"
          )}
        </button>

        <Link
          href="/questions"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Don&apos;t have one yet? Ask the community for advice.
        </Link>
      </div>
    </form>
  );
};

export default HandleSettings;
