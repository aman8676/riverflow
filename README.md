This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Daily practice: linked accounts, verification and points

The dashboard (`/dashboard`) serves a set of daily problems and awards points for
solving them — but only for solves it can verify on the platform itself.

### How a solve is scored

1. **Link an account.** The "Linked accounts" box on the dashboard saves a
   Codeforces handle and/or a LeetCode username. `POST /api/handles` checks each
   one against the platform before storing it in the user's Appwrite prefs, and
   stamps the moment it was linked.
2. **Solve it on the platform.** "Solve on Codeforces/LeetCode" opens the problem
   in a new tab. Nothing is submitted through this app.
3. **Claim it.** "I solved it — verify" calls `POST /api/solve`, which asks the
   platform for an accepted submission by the linked handle for that problem.
   It must be **from today** and **after the handle was linked** — otherwise
   linking a strong competitor's handle would instantly bank their solves.
4. **Points.** `basePoints x efficiencyMultiplier`, rounded:

   | Difficulty | Base | | Efficiency | Multiplier |
   | --- | --- | --- | --- | --- |
   | easy | 10 | | optimal (>= 0.85) | 1.5x |
   | medium | 30 | | efficient (>= 0.65) | 1.25x |
   | hard | 100 | | acceptable (>= 0.40) | 1.0x |
   | | | | brute force (< 0.40) | 0.75x |

   The efficiency score is `0.6 x time + 0.4 x space`, each measured from what
   the judge reported for that submission — see `src/lib/scoring.ts`.

Difficulty and the problem itself always come from our own `dailyProblems` rows,
never from the request body, and the acting user always comes from the verified
Appwrite JWT. A caller cannot claim a problem we never published, invent a
difficulty, or award points to somebody else.

### What each platform exposes

- **Codeforces** reports per-submission runtime and memory through `user.status`.
  Those are scored against the problem's own limits, which `fetch-daily` scrapes
  from the problem page (they are not in the API) and stores on the row.
- **LeetCode** verifies fully — an accepted submission for the daily problem is
  visible through `recentAcSubmissionList` — but exposes no per-submission
  runtime or memory to anonymous callers. Those solves are recorded as verified
  and score at the base rate (multiplier 1.0, tier `unknown`). If LeetCode ever
  answers `submissionDetails` for us, the percentiles it returns are picked up
  automatically; no other change is needed.

### Setup

```bash
npm run seed         # creates/migrates collections, including the new columns
npm run fetch-daily  # publishes today's problems by hand
```

`npm run seed` is idempotent and also backfills attributes added after a project
was first provisioned (`verified`, `submissionId`, `points`, `efficiency`,
`runtimeMs`, `memoryKb`, `timeLimitMs`, `memoryLimitKb`). **An existing project
must run it once before claims will save.**

## Streaks

Both streaks are **derived from the solve history**, not stored counters —
`src/lib/streak.ts` computes them from the distinct dates in `solvedProblems`,
and the copies on the user's prefs are a cache of that.

- **Day streak** is the current run of consecutive days, and drops to **0** once
  a day has been missed. A run stays alive while the last solve was today *or*
  yesterday: today is not over yet, so the streak should not break at midnight.
- **Best streak** is the longest run anywhere in the history, so it survives
  every later break. It is never lowered below the stored value, which may reach
  further back than the history can reproduce.

The dashboard calls `GET /api/streak` on load, which recomputes both and repairs
the cached prefs if they have drifted. That refresh is what makes a broken
streak read zero — the cache is only written when a solve is recorded, so on its
own it would keep showing the run the user was on before they stopped.

## Rotating the daily problems

The set rotates once a day from `GET /api/cron/daily-problems`, scheduled in
`vercel.json` for 00:10 UTC. It needs a `CRON_SECRET` environment variable and
refuses to run without one — Vercel Cron sends it as a bearer token
automatically; any other scheduler has to:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/daily-problems
```

The work itself lives in `src/lib/dailyProblems.ts` and is shared with the
`fetch-daily` script, so both publish exactly the same set for a given day:

- The random source is **seeded from the date**, so re-running a day is a no-op
  rather than a different set of problems.
- Anything published in the last 45 days is **excluded**, so the dashboard is
  genuinely new each morning.
- Publishing is **idempotent** — the cron, the script and a manual call can all
  fire on the same morning and only the first does any work.

To backfill a specific day: `npm run fetch-daily -- 2026-08-25`.

## Practice sheets

`/sheet` builds a twenty-problem sheet for one DSA topic, sized to the user's
skill. The rating comes from the signed-in user's linked Codeforces handle when
there is one, and can be overridden by hand or by picking a band directly.

| Rating | Band | Codeforces | LeetCode |
| --- | --- | --- | --- |
| under 800 | Beginner | 800 - 1000 | Easy |
| 800 - 1400 | Intermediate | 800 - 1400 | Easy + Medium |
| 1400+ | Advanced | 1400 - 2200 | Medium + Hard |

The Codeforces bands reach below each tier's floor on purpose: a sheet made
entirely of problems at your ceiling is one you bounce off.

Topics live in `src/lib/sheet.ts`, each mapping to the Codeforces tags and
LeetCode topic slugs that land on the same practice material. Selection is by
popularity — Codeforces by solve count, LeetCode by problem number (its ids are
chronological, and the canonical interview problems are the early ones, since
the real frequency signal is premium-only). Premium-only LeetCode problems are
dropped. Each half is then re-ordered easiest-first and the two are interleaved,
so the sheet ramps up and doesn't switch platforms halfway. A platform that
fails to answer is not fatal — the sheet is built from the other one and says
so.
