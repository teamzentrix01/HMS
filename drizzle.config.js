import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/index.js",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres:%40Vivek123@localhost:5432/jigyasa_hms",
  },
});

