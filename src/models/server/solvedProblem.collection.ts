import { Permission, Role, DatabasesIndexType, OrderBy } from "node-appwrite";
import { db, solvedProblemCollection } from "../name";
import { databases } from "./config";
import waitForAttributes from "@/lib/waitForAttributes";
import ensureAttributes from "./ensureAttributes";

/**
 * The proof and the scoring inputs behind an awarded solve.
 *
 * All optional: rows written before solves were verified against the platform
 * have none of them, and even a verified row can lack runtime/memory when the
 * platform doesn't report it per submission (LeetCode, for anonymous callers).
 */
export async function ensureSolvedProblemAttributes() {
  await ensureAttributes(solvedProblemCollection, [
    {
      key: "verified",
      create: () =>
        databases.createBooleanAttribute(
          db,
          solvedProblemCollection,
          "verified",
          false,
        ),
    },
    {
      // The platform's own submission id, so an award can be traced back to the
      // exact submission that earned it.
      key: "submissionId",
      create: () =>
        databases.createStringAttribute(
          db,
          solvedProblemCollection,
          "submissionId",
          64,
          false,
        ),
    },
    {
      key: "points",
      create: () =>
        databases.createIntegerAttribute(
          db,
          solvedProblemCollection,
          "points",
          false,
        ),
    },
    {
      // The efficiency tier the award used: "optimal" | "efficient" |
      // "acceptable" | "slow" | "unknown".
      key: "efficiency",
      create: () =>
        databases.createStringAttribute(
          db,
          solvedProblemCollection,
          "efficiency",
          20,
          false,
        ),
    },
    {
      key: "runtimeMs",
      create: () =>
        databases.createIntegerAttribute(
          db,
          solvedProblemCollection,
          "runtimeMs",
          false,
        ),
    },
    {
      key: "memoryKb",
      create: () =>
        databases.createIntegerAttribute(
          db,
          solvedProblemCollection,
          "memoryKb",
          false,
        ),
    },
  ]);
}

export default async function createSolvedProblemCollection() {
  await databases.createCollection(
    db,
    solvedProblemCollection,
    solvedProblemCollection,
    // Update/delete are granted per-document to the owning user only.
    [Permission.read(Role.any()), Permission.create(Role.users())],
    true, // documentSecurity
  );

  console.log("Solved problem collection created successfully");

  await Promise.all([
    databases.createStringAttribute(
      db,
      solvedProblemCollection,
      "userId",
      50,
      true,
    ),
    databases.createStringAttribute(
      db,
      solvedProblemCollection,
      "problemId",
      100,
      true,
    ),
    databases.createEnumAttribute(
      db,
      solvedProblemCollection,
      "source",
      ["codeforces", "leetcode"],
      true,
    ),
    databases.createStringAttribute(
      db,
      solvedProblemCollection,
      "dateSolved",
      20,
      true,
    ),
  ]);

  console.log("Solved problem attributes created, waiting for availability...");

  await waitForAttributes(db, solvedProblemCollection);

  await ensureSolvedProblemAttributes();

  console.log("Attributes ready. Creating indexes...");

  await Promise.all([
    databases.createIndex(
      db,
      solvedProblemCollection,
      "userId",
      DatabasesIndexType.Key,
      ["userId"],
      [OrderBy.Asc],
    ),
    databases.createIndex(
      db,
      solvedProblemCollection,
      "problemId",
      DatabasesIndexType.Key,
      ["problemId"],
      [OrderBy.Asc],
    ),
    databases.createIndex(
      db,
      solvedProblemCollection,
      "source",
      DatabasesIndexType.Key,
      ["source"],
      [OrderBy.Asc],
    ),
    databases.createIndex(
      db,
      solvedProblemCollection,
      "dateSolved",
      DatabasesIndexType.Key,
      ["dateSolved"],
      [OrderBy.Asc],
    ),
    // Enforces "one solve per user, per problem, per day" in the database itself.
    // The API route also checks first for a friendly response, but that check is
    // racy on its own (a double-click can slip two inserts through); this index
    // is what actually guarantees no duplicates.
    databases.createIndex(
      db,
      solvedProblemCollection,
      "unique_user_problem_date",
      DatabasesIndexType.Unique,
      ["userId", "problemId", "dateSolved"],
      [OrderBy.Asc, OrderBy.Asc, OrderBy.Asc],
    ),
  ]);

  console.log("Indexes created successfully");
}
