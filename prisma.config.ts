import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ override: true });

const databaseUrl = process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"];

if (!databaseUrl) {
  throw new Error("Prisma requires DIRECT_URL or DATABASE_URL to be set.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
