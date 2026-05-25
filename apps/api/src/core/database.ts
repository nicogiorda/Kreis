import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const rawUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!rawUrl) {
  throw new Error("DATABASE_URL or DIRECT_URL must be set");
}

// pg v9 parsea 'sslmode=require' del connection string y lo trata como 'verify-full',
// lo que sobrescribe el objeto ssl que pasamos al pool y termina verificando el cert.
// Eliminamos sslmode del URL para que nuestra config ssl tenga efecto.
// La conexión sigue siendo encriptada — solo se deshabilita la verificación del certificado,
// que falla en Supabase porque la cadena de CA no está en el trust store de Node.
const url = new URL(rawUrl);
url.searchParams.delete("sslmode");

export const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false }
  })
});
