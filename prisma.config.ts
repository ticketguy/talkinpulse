import path from "node:path";
import { defineConfig } from "prisma/config";

const databaseUrl =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL ||
  "";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
});
