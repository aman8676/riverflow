import { db } from "../name";
import { databases } from "./config";
import waitForAttributes from "@/lib/waitForAttributes";

export interface AttributeSpec {
  key: string;
  create: () => Promise<unknown>;
}

/**
 * Adds attributes that a collection is missing, and leaves the rest alone.
 *
 * `createCollection` only ever runs against a project that doesn't have the
 * collection yet, so a schema change made after a project was provisioned would
 * otherwise never reach it — the collection exists, `getOrCreateDB` says
 * "connected", and every write of the new field then fails with "unknown
 * attribute". Running this on every setup keeps an existing project in step.
 *
 * Safe to run repeatedly: existing attributes are skipped by key.
 */
export default async function ensureAttributes(
  collectionId: string,
  specs: AttributeSpec[],
): Promise<void> {
  const { attributes } = await databases.listAttributes(db, collectionId);
  const existing = new Set(
    (attributes as { key: string }[]).map((attribute) => attribute.key),
  );

  const missing = specs.filter((spec) => !existing.has(spec.key));

  if (missing.length === 0) return;

  for (const spec of missing) {
    await spec.create();
    console.log(`  + ${collectionId}.${spec.key}`);
  }

  // New attributes are created asynchronously by Appwrite; indexes and writes
  // against them fail until they report "available".
  await waitForAttributes(db, collectionId);
}
