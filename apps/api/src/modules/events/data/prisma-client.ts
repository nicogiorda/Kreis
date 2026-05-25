import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import type { EventWithRelations } from "./events-repository";

const databaseUrl = process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"];

if (!databaseUrl) {
  throw new Error("Prisma requires DIRECT_URL or DATABASE_URL to be set.");
}

type PrismaClientLike = {
  evento: {
    findMany: (args: unknown) => Promise<EventWithRelations[]>;
    findFirst: (args: unknown) => Promise<EventWithRelations | null>;
  };
};

type PrismaClientConstructor = new (options: { adapter: PrismaPg }) => PrismaClientLike;

const globalForPrisma = globalThis as typeof globalThis & {
  eventsPrisma?: PrismaClientLike;
};

async function createPrismaClient(): Promise<PrismaClientLike> {
  const prismaClientModuleUrl = new URL("../../../../../../generated/prisma/client.ts", import.meta.url).href;
  const { PrismaClient } = (await import(prismaClientModuleUrl)) as {
    PrismaClient: PrismaClientConstructor;
  };

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: databaseUrl
    })
  });
}

export async function getPrismaClient(): Promise<PrismaClientLike> {
  if (globalForPrisma.eventsPrisma) {
    return globalForPrisma.eventsPrisma;
  }

  const prisma = await createPrismaClient();

  if (process.env["NODE_ENV"] !== "production") {
    globalForPrisma.eventsPrisma = prisma;
  }

  return prisma;
}
