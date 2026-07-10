import { databases } from "@/models/server/config";

const MAX_RETRIES = 30;
const POLL_INTERVAL_MS = 1000;

export default async function waitForAttributes(
  dbId: string,
  collectionId: string,
  timeoutMs: number = MAX_RETRIES * POLL_INTERVAL_MS,
) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { attributes } = await databases.listAttributes(dbId, collectionId);
    const allReady = attributes.every(
      (attr: { status: string }) => attr.status === "available",
    );
    if (allReady) return;
    await new Promise((res) => setTimeout(res, POLL_INTERVAL_MS));
  }

  throw new Error(
    `Timed out waiting for attributes on collection "${collectionId}" in database "${dbId}" after ${timeoutMs}ms`,
  );
}
