/**
 * One-off migration that brings an ALREADY PROVISIONED Appwrite project in line
 * with the permission model in `src/models/server/*.collection.ts`.
 *
 * The collection definitions only apply at creation time, so an existing project
 * keeps whatever permissions it was first created with. This script:
 *
 *   1. Rewrites collection permissions to `read(any)` + `create(users)` and turns
 *      ON documentSecurity, so update/delete is decided per document.
 *   2. Does the same for the attachments bucket (fileSecurity).
 *   3. Backfills per-document owner permissions on rows that have none — rows
 *      created server-side with the admin key were stored with empty permissions.
 *
 * Safe to run repeatedly.
 */
import { Permission, Role, Query } from "node-appwrite";
import { databases, storage } from "../src/models/server/config";
import {
  db,
  questionCollection,
  answerCollection,
  commentCollection,
  voteCollection,
  dailyProblemCollection,
  solvedProblemCollection,
  questionAttachmentBucket,
} from "../src/models/name";
import { ownerPermissions } from "../src/models/permissions";

const PAGE_SIZE = 100;

/** Which attribute names the owner of a row in each collection. */
const OWNER_FIELD: Record<string, string> = {
  [questionCollection]: "authorId",
  [answerCollection]: "authorId",
  [commentCollection]: "authorId",
  [voteCollection]: "votedById",
  [solvedProblemCollection]: "userId",
};

const USER_WRITABLE = [
  questionCollection,
  answerCollection,
  commentCollection,
  voteCollection,
  solvedProblemCollection,
];

async function hardenCollections() {
  console.log("\n== Collection permissions ==");

  for (const collectionId of USER_WRITABLE) {
    await databases.updateCollection(
      db,
      collectionId,
      collectionId,
      [Permission.read(Role.any()), Permission.create(Role.users())],
      true, // documentSecurity
    );
    console.log(`  ${collectionId}: read(any) + create(users), documentSecurity=ON`);
  }

  // Written only by the fetch-daily script via the admin key.
  await databases.updateCollection(
    db,
    dailyProblemCollection,
    dailyProblemCollection,
    [Permission.read(Role.any())],
    true,
  );
  console.log(`  ${dailyProblemCollection}: read(any) only, documentSecurity=ON`);
}

async function hardenBucket() {
  console.log("\n== Bucket permissions ==");

  const bucket: any = await storage.getBucket(questionAttachmentBucket);

  await storage.updateBucket(
    questionAttachmentBucket,
    questionAttachmentBucket,
    [Permission.create(Role.users()), Permission.read(Role.any())],
    true, // fileSecurity
    bucket.enabled,
    bucket.maximumFileSize,
    bucket.allowedFileExtensions,
    bucket.compression,
    bucket.encryption,
    bucket.antivirus,
  );
  console.log(
    `  ${questionAttachmentBucket}: create(users) + read(any), fileSecurity=ON`,
  );
}

async function backfillDocumentPermissions() {
  console.log("\n== Backfilling document owner permissions ==");

  for (const [collectionId, ownerField] of Object.entries(OWNER_FIELD)) {
    let offset = 0;
    let patched = 0;
    let skipped = 0;
    let ownerless = 0;

    for (;;) {
      const page = await databases.listDocuments(db, collectionId, [
        Query.limit(PAGE_SIZE),
        Query.offset(offset),
      ]);

      for (const document of page.documents as any[]) {
        const hasWritePermission = (document.$permissions as string[]).some(
          (permission) =>
            permission.startsWith("update(") || permission.startsWith("delete("),
        );

        if (hasWritePermission) {
          skipped++;
          continue;
        }

        const ownerId = document[ownerField];

        if (!ownerId) {
          ownerless++;
          continue;
        }

        await databases.updateDocument(
          db,
          collectionId,
          document.$id,
          undefined,
          ownerPermissions(ownerId),
        );
        patched++;
      }

      offset += page.documents.length;
      if (offset >= page.total || page.documents.length === 0) break;
    }

    console.log(
      `  ${collectionId}: ${patched} patched, ${skipped} already owned` +
        (ownerless ? `, ${ownerless} SKIPPED (no ${ownerField})` : ""),
    );
  }
}

async function backfillFilePermissions() {
  console.log("\n== Backfilling attachment owner permissions ==");

  let offset = 0;
  let patched = 0;
  let missing = 0;

  for (;;) {
    const page = await databases.listDocuments(db, questionCollection, [
      Query.limit(PAGE_SIZE),
      Query.offset(offset),
    ]);

    for (const question of page.documents as any[]) {
      if (!question.attachmentId || !question.authorId) continue;

      try {
        await storage.updateFile(
          questionAttachmentBucket,
          question.attachmentId,
          undefined,
          ownerPermissions(question.authorId),
        );
        patched++;
      } catch {
        // File referenced by the question no longer exists in the bucket.
        missing++;
      }
    }

    offset += page.documents.length;
    if (offset >= page.total || page.documents.length === 0) break;
  }

  console.log(
    `  ${questionAttachmentBucket}: ${patched} files patched` +
      (missing ? `, ${missing} referenced file(s) not found` : ""),
  );
}

async function main() {
  console.log("Hardening Appwrite permissions...");

  await hardenCollections();
  await hardenBucket();
  await backfillDocumentPermissions();
  await backfillFilePermissions();

  console.log("\nDone.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
