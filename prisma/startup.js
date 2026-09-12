/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv/config");
const { createClient } = require("@libsql/client");
const { spawnSync } = require("node:child_process");
const { mkdirSync, mkdtempSync, readFileSync, rmSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const baseline = "20260912000000_init";

function prisma(args, allowedStatuses = [0]) {
  const result = spawnSync(process.execPath, [
    require.resolve("prisma/build/index.js"),
    ...args,
    "--config=prisma.config.ts",
  ], { cwd: root, env: process.env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (!allowedStatuses.includes(result.status)) {
    throw new Error(`Prisma ${args.slice(0, 2).join(" ")} failed (${result.status}).`);
  }
  return result.status;
}

async function initialize() {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith("file:") || url === "file::memory:") {
    throw new Error("DATABASE_URL must point to a persistent SQLite file.");
  }
  // Match Prisma's schema-relative SQLite path resolution.
  const databasePath = path.resolve(__dirname, url.slice(5));
  process.env.DATABASE_URL = `file:${databasePath}`;
  mkdirSync(path.dirname(databasePath), { recursive: true });

  const db = createClient({ url: process.env.DATABASE_URL });
  let needsBaseline;
  try {
    const { rows } = await db.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    );
    const tables = rows.map((row) => row.name);
    const history = tables.includes("_prisma_migrations")
      ? await db.execute('SELECT id FROM "_prisma_migrations" LIMIT 1')
      : { rows: [] };
    needsBaseline = tables.some((name) => name !== "_prisma_migrations") && history.rows.length === 0;
  } finally {
    db.close();
  }

  if (needsBaseline) {
    // Old releases used db push. Verify their schema before adopting migration history.
    const temp = mkdtempSync(path.join(os.tmpdir(), "mtime-baseline-"));
    const baselineUrl = `file:${path.join(temp, "baseline.db")}`;
    try {
      const reference = createClient({ url: baselineUrl });
      try {
        await reference.executeMultiple(readFileSync(
          path.join(__dirname, "migrations", baseline, "migration.sql"), "utf8",
        ));
      } finally {
        reference.close();
      }
      const status = prisma([
        "migrate", "diff", "--from-url", process.env.DATABASE_URL,
        "--to-url", baselineUrl, "--exit-code",
      ], [0, 2]);
      if (status !== 0) {
        throw new Error("Existing database differs from the initial migration. Reconcile its schema before baselining; no data was reset.");
      }
      prisma(["migrate", "resolve", "--applied", baseline]);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  }

  prisma(["migrate", "deploy"]);
  // Load after normalizing DATABASE_URL so the seed uses the same database.
  await require("./seed").seedDatabase();
}

initialize().catch((error) => {
  console.error("Database initialization failed:", error);
  process.exitCode = 1;
});
