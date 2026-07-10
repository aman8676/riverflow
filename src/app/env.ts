import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APPWRITE_ENDPOINT: z.string().url(),
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: z.string().min(1),
  APPWRITE_API_KEY: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
  throw new Error(
    `Missing or invalid environment variables: ${missing}. Check your .env file.`,
  );
}

const env = {
  appwrite: {
    endpoint: parsed.data.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    projectId: parsed.data.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    apiKey: parsed.data.APPWRITE_API_KEY,
  },
};

export default env;
