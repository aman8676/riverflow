/**
 * Appwrite permission strings are plain strings and are byte-identical between the
 * `appwrite` (browser) and `node-appwrite` (server) SDKs. Building them here keeps a
 * single definition of "who owns a document" that both client components and API
 * routes can import, without dragging the server SDK into the browser bundle.
 *
 * Collections are configured with documentSecurity enabled and only
 * `read("any")` + `create("users")` at the collection level, so update/delete is
 * granted exclusively by the per-document permissions below.
 */

/**
 * Publicly readable, but only the owner may edit or delete it.
 * Used for questions, answers, comments, votes and solved-problem records.
 */
export function ownerPermissions(userId: string): string[] {
  return [
    'read("any")',
    `update("user:${userId}")`,
    `delete("user:${userId}")`,
  ];
}
