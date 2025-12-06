import "dotenv/config";
import { defineConfig, env } from "@prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    // @ts-expect-error Prisma config typings omit provider, but it is required at runtime
    provider: "sqlite",
    url: env<{
      DATABASE_URL?: string;
    }>("DATABASE_URL"),
  },
  migrations: {
    seed: "node prisma/seed.js",
  },
});
