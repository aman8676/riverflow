import {create} from "zustand";
import {immer} from "zustand/middleware/immer";
import {persist} from "zustand/middleware";
import {OAuthProvider} from "appwrite";

import { AppwriteException,ID,Models } from "appwrite"; 

import {account} from "@/models/client/config";

export interface UserPrefs {
    reputation: number
    /**
     * Practice points from solving problems (easy +10, medium +30, hard +100).
     * Deliberately separate from `reputation`, which stays a pure Q&A metric
     * moved by +/-1 per answer and vote — merging them would let one hard
     * problem outweigh 100 upvotes and would silently turn the homepage
     * "Top Contributors" board into a problem-solving ranking.
     */
    points?: number
    /** Consecutive days with at least one solved problem, including today. */
    streak?: number
    /** Highest streak the user has ever reached. */
    bestStreak?: number
    /** Codeforces handle, verified to exist when it was linked. */
    codeforcesHandle?: string
    /** LeetCode username, verified to exist when it was linked. */
    leetcodeHandle?: string
    /**
     * When each handle was linked, as unix SECONDS.
     *
     * A solve only earns points if the platform timestamped it after this, which
     * is what stops someone from typing a strong competitor's handle in and
     * harvesting points for solves that already exist. Stored per platform
     * because the two handles are linked independently.
     */
    codeforcesLinkedAt?: number
    leetcodeLinkedAt?: number
}

interface IAuthStore {
  session: Models.Session | null;
  jwt: string | null;
  user: Models.User<UserPrefs> | null;
  hydrated: boolean;

  setHydrated(): void;
  /** Merge freshly-known pref values (points, streak, ...) into the cached user. */
  setPrefs(prefs: Partial<UserPrefs>): void;
  verifySession(): Promise<void>;
  login(
    email: string,
    password: string,
  ): Promise<{
    success: boolean;
    error?:AppwriteException | null;
  }>;
  createAccount(
    name: string,
    email: string,
    password: string,
  ): Promise<{
    success: boolean;
    error?: AppwriteException | null;
  }>;
  logout(): Promise<void>;
  loginWithOAuth(provider: OAuthProvider): void;

}

export const useAuthStore = create<IAuthStore>()(
  persist(
    immer((set) => ({
      session: null,
      jwt: null,
      user: null,
      hydrated: false,

      setHydrated() {
        set({ hydrated: true });
      },

      setPrefs(prefs: Partial<UserPrefs>) {
        // The API routes return the authoritative values after a write, so the
        // UI can reflect them without waiting for a full verifySession().
        set((state) => {
          if (state.user) {
            state.user.prefs = { ...state.user.prefs, ...prefs };
          }
        });
      },

      async verifySession() {
        try {
          const session = await account.getSession("current");
          const [user, { jwt }] = await Promise.all([
            account.get<UserPrefs>(),
            account.createJWT(),
          ]);
          set({ session, user, jwt });
        } catch (error) {
          console.log(error);
        }
      },

      async login(email: string, password: string) {
        try {
          const session = await account.createEmailPasswordSession(
            email,
            password,
          );

          const [user, { jwt }] = await Promise.all([
            account.get<UserPrefs>(),
            account.createJWT(),
          ]);
          set({ session, jwt, user });

          return {
            success: true,
          };
        } catch (error) {
          console.log(error);
          return {
            success: false,
            error: error instanceof AppwriteException ? error : null,
          };
        }
      },

      async createAccount(name, email, password) {
        try {
          const user = await account.create(ID.unique(), email, password, name);
          return {
            success: true,
          };
        } catch (error) {
          console.log(error);
          return {
            success: false,
            error: error instanceof AppwriteException ? error : null,
          };
        }
      },

      async logout() {
        try {
          await account.deleteSession("current");
          set({ session: null, jwt: null, user: null });
          console.log("logout success, session cleared"); // add this
        } catch (error) {
          console.log("logout failed:", error); // check this
        }
      },

      loginWithOAuth(provider: OAuthProvider) {
        try {
          account.createOAuth2Session(
            provider,
            `${window.location.origin}/`,
            `${window.location.origin}/login`,
          );
        } catch (error) {
          console.log("OAuth error:", error);
        }
      },
    })),

    {
      name: "auth",
      onRehydrateStorage() {
        return (state, error) => {
          if (!error) state?.setHydrated();
        };
      },
    },
  ),
);