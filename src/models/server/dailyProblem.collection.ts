import { Permission, Role, DatabasesIndexType, OrderBy } from "node-appwrite";
import { db, dailyProblemCollection } from "../name";
import { databases } from "./config";
import waitForAttributes from "@/lib/waitForAttributes";
import ensureAttributes from "./ensureAttributes";

/**
 * The judge limits a submission's measured runtime and memory are scored
 * against. Optional because they are scraped best-effort from the problem page
 * (Codeforces doesn't expose them through its API) and LeetCode has no
 * equivalent — a row without them falls back to defaults at scoring time.
 */
export async function ensureDailyProblemAttributes() {
  await ensureAttributes(dailyProblemCollection, [
    {
      key: "timeLimitMs",
      create: () =>
        databases.createIntegerAttribute(
          db,
          dailyProblemCollection,
          "timeLimitMs",
          false,
        ),
    },
    {
      key: "memoryLimitKb",
      create: () =>
        databases.createIntegerAttribute(
          db,
          dailyProblemCollection,
          "memoryLimitKb",
          false,
        ),
    },
  ]);
}

export default async function createDailyProblemCollection() {
  await databases.createCollection(
    db,
    dailyProblemCollection,
    dailyProblemCollection,
    // Read-only for everyone: these rows are written exclusively by the
    // `fetch-daily` script using the admin API key, which bypasses permissions.
    [Permission.read(Role.any())],
    true, // documentSecurity
  );

  console.log("Daily problem collection created successfully");

  await Promise.all([
    databases.createEnumAttribute(
      db,
      dailyProblemCollection,
      "source",
      ["codeforces", "leetcode"],
      true,
    ),
    databases.createStringAttribute(
      db,
      dailyProblemCollection,
      "problemId",
      100,
      true,
    ),
    databases.createStringAttribute(
      db,
      dailyProblemCollection,
      "title",
      200,
      true,
    ),
    databases.createStringAttribute(
      db,
      dailyProblemCollection,
      "url",
      500,
      true,
    ),
    databases.createStringAttribute(
      db,
      dailyProblemCollection,
      "difficulty",
      50,
      true,
    ),
    databases.createStringAttribute(
      db,
      dailyProblemCollection,
      "tags",
      50,
      true,
      undefined,
      true,
    ),
    databases.createStringAttribute(
      db,
      dailyProblemCollection,
      "date",
      20,
      true,
    ),
  ]);

  console.log("Daily problem attributes created, waiting for availability...");

  await waitForAttributes(db, dailyProblemCollection);

  await ensureDailyProblemAttributes();

  console.log("Attributes ready. Creating indexes...");

  await Promise.all([
    databases.createIndex(
      db,
      dailyProblemCollection,
      "title",
      DatabasesIndexType.Fulltext,
      ["title"],
      [OrderBy.Asc],
    ),
    databases.createIndex(
      db,
      dailyProblemCollection,
      "date",
      DatabasesIndexType.Key,
      ["date"],
      [OrderBy.Asc],
    ),
    databases.createIndex(
      db,
      dailyProblemCollection,
      "source",
      DatabasesIndexType.Key,
      ["source"],
      [OrderBy.Asc],
    ),
  ]);

  console.log("Indexes created successfully");
}
