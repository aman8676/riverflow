import { Account, Client, Models } from "node-appwrite";
import env from "@/app/env";
import { UserPrefs } from "@/store/auth";

/**
 * Resolves the *real* caller of an API route from the Appwrite JWT sent in the
 * `Authorization: Bearer <jwt>` header.
 *
 * API routes talk to Appwrite with the admin API key, which bypasses every
 * permission rule. That makes any user id taken from the request body
 * unauthenticated input — a caller could simply post someone else's id. Always
 * derive the acting user from this function instead of trusting the body.
 *
 * Returns `null` when the header is missing, malformed, or the JWT is expired or
 * invalid.
 */
export async function getUserFromRequest(
  request: Request,
): Promise<Models.User<UserPrefs> | null> {
  const header = request.headers.get("authorization") ?? "";

  if (!header.startsWith("Bearer ")) return null;

  const jwt = header.slice("Bearer ".length).trim();
  if (!jwt) return null;

  try {
    const client = new Client()
      .setEndpoint(env.appwrite.endpoint)
      .setProject(env.appwrite.projectId)
      .setJWT(jwt);

    return await new Account(client).get<UserPrefs>();
  } catch {
    return null;
  }
}
