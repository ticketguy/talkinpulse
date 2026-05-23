// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");

const globalForPrisma = globalThis as unknown as { prisma: typeof PrismaClient | undefined };

// Vercel-Supabase integration uses POSTGRES_PRISMA_URL and POSTGRES_URL_NON_POOLING
// Fall back to DATABASE_URL / DIRECT_URL for local dev
const databaseUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
const directUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.DIRECT_URL;

if (!databaseUrl) throw new Error("No database URL found in environment variables");

export const prisma: InstanceType<typeof PrismaClient> =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
    datasources: {
      db: { url: databaseUrl },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
