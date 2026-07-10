import { z } from "zod";

function cleanEnv(value: string | undefined): string {
  return value?.replace(/^["'\s]+|["'\s]+$/g, "") ?? "";
}

const endpoint = cleanEnv(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT);
const projectId = cleanEnv(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);
const apiKey = cleanEnv(process.env.APPWRITE_API_KEY);

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APPWRITE_ENDPOINT: z.string().url(),
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: z.string().min(1),
});

const publicParsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_APPWRITE_ENDPOINT: endpoint,
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: projectId,
});

if (!publicParsed.success) {
  const missing = publicParsed.error.issues.map((i) => i.path.join(".")).join(", ");
  throw new Error(
    `Missing or invalid environment variables: ${missing}. Check your .env file.`,
  );
}

const isServer = typeof window === "undefined";

if (isServer && !apiKey) {
  throw new Error(
    "Missing environment variable: APPWRITE_API_KEY. Check your .env file.",
  );
}

const env = {
  appwrite: {
    endpoint: publicParsed.data.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    projectId: publicParsed.data.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    apiKey: apiKey,
  },
};

export default env;
