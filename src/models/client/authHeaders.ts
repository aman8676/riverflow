import { account } from "./config";

/**
 * Builds the headers for a call to one of this app's API routes.
 *
 * A fresh Appwrite JWT is minted per request because JWTs are short-lived
 * (~15 minutes); reusing the one cached in the auth store would start failing
 * silently once it expires. The server verifies this token and derives the
 * acting user from it — see `src/models/server/auth.ts`.
 */
export async function authedJsonHeaders(): Promise<Record<string, string>> {
  const { jwt } = await account.createJWT();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${jwt}`,
  };
}
