import {create} from "zustand";
import {immer} from "zustand/middleware/immer";
import {persist} from "zustand/middleware";
import {OAuthProvider} from "appwrite";

import { AppwriteException,ID,Models } from "appwrite"; 

import {account} from "@/models/client/config";

export interface UserPrefs {
    reputation : number
}

interface IAuthStore {
  session: Models.Session | null;
  jwt: string | null;
  user: Models.User<UserPrefs> | null;
  hydrated: boolean;

  setHydrated(): void;
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