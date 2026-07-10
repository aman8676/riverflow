import getOrCreateDB from "../src/models/server/dbSetup";
import getOrCreateStorage from "../src/models/server/storageSetup";

async function seed() {
  console.log("Seeding database and storage...");

  try {
    await Promise.all([getOrCreateDB(), getOrCreateStorage()]);
    console.log("Seed complete.");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

seed();
