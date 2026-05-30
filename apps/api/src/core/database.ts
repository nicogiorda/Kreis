// Cliente Prisma centralizado para toda la API.
// Un único punto de importación evita que cada módulo instancie su propio
// PrismaClient y agote el pool de conexiones de la base de datos.

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../generated/prisma/client";

const rawUrl = process.env.DATABASE_URL;

if (!rawUrl) {
  throw new Error("DATABASE_URL must be set");
}

const databaseUrl = new URL(rawUrl);
// sslmode=require viene en la DATABASE_URL de Supabase, pero PrismaPg
// maneja SSL por su cuenta vía la opción ssl de abajo. Si dejamos el param
// en la URL, Prisma lanza un error de conexión duplicado, así que lo removemos.
databaseUrl.searchParams.delete("sslmode");

// En desarrollo, nodemon reinicia el proceso con cada cambio de archivo.
// Sin este patrón, cada hot-reload crea una nueva instancia de PrismaClient
// y agota el pool de conexiones. En producción no hay hot-reload, así que
// no necesitamos cachear la instancia en globalThis.
const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: databaseUrl.toString(),
      // rejectUnauthorized: false acepta el certificado de Supabase sin validarlo
      // contra una CA local. Necesario porque el cert de Supabase no está en el
      // bundle de CAs del entorno de desarrollo.
      ssl: { rejectUnauthorized: false }
    })
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
