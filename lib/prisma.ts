// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");

const globalForPrisma = globalThis as unknown as { prisma: typeof PrismaClient | undefined };

// Prisma 7 — pass connection URL directly to PrismaClient constructor
const databaseUrl =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL ||
  "";

export const prisma: InstanceType<typeof PrismaClient> =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
    datasourceUrl: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
