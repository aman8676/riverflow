import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APPWRITE_ENDPOINT: z.string().url(),
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: z.string().min(1),
});

const publicParsed = publicEnvSchema.safeParse(process.env);

if (!publicParsed.success) {
  const missing = publicParsed.error.issues.map((i) => i.path.join(".")).join(", ");
  throw new Error(
    `Missing or invalid environment variables: ${missing}. Check your .env file.`,
  );
}

const isServer = typeof window === "undefined";

const apiKey = isServer ? process.env.APPWRITE_API_KEY : undefined;

if (isServer && !apiKey) {
  throw new Error(
    "Missing environment variable: APPWRITE_API_KEY. Check your .env file.",
  );
}

const env = {
  appwrite: {
    endpoint: publicParsed.data.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    projectId: publicParsed.data.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    apiKey: apiKey ?? "",
  },
};

export default env;
