import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../generated/prisma/client";

const rawUrl = process.env.DATABASE_URL;

if (!rawUrl) {
  throw new Error("DATABASE_URL must be set");
}

const databaseUrl = new URL(rawUrl);
databaseUrl.searchParams.delete("sslmode");

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: databaseUrl.toString(),
      ssl: { rejectUnauthorized: false }
    })
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
