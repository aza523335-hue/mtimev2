import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import path from "node:path";

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is not set");
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const toAdapterUrl = (value: string): string => {
  if (!value.startsWith("file:")) {
    return value;
  }

  const filePath = value.slice("file:".length);
  if (path.isAbsolute(filePath)) {
    return value;
  }

  // Prisma resolves relative SQLite URLs from the schema directory.
  const schemaDir = path.resolve(process.cwd(), "prisma");
  const absolutePath = path.resolve(schemaDir, filePath);

  return `file:${absolutePath}`;
};

const adapter = new PrismaLibSQL({ url: toAdapterUrl(url) });

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
