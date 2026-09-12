/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { createClient } = require("@libsql/client");

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), "mtime-startup-test-"));
  const source = path.resolve(__dirname, "..");
  mkdirSync(path.join(root, "prisma"));
  for (const file of ["schema.prisma", "seed.js", "startup.js", "migrations"]) {
    cpSync(path.join(__dirname, file), path.join(root, "prisma", file), { recursive: true });
  }
  cpSync(path.join(source, "prisma.config.ts"), path.join(root, "prisma.config.ts"));
  symlinkSync(path.join(source, "node_modules"), path.join(root, "node_modules"), "dir");
  const url = `file:${path.join(root, "data", "dev.db")}`;
  const env = { ...process.env, DATABASE_URL: url, DEFAULT_ADMIN_PASSWORD: "test-password" };
  const run = (args, expected = 0) => {
    const result = spawnSync(process.execPath, args, { cwd: root, env, encoding: "utf8" });
    if (result.error) throw result.error;
    assert.equal(result.status, expected, result.stdout + result.stderr);
    return result.stdout + result.stderr;
  };
  let client;
  t.after(() => {
    client?.close();
    rmSync(root, { recursive: true, force: true });
  });
  return {
    root, env,
    start: (expected) => run([path.join(root, "prisma/startup.js")], expected),
    push: async () => {
      mkdirSync(path.join(root, "data"), { recursive: true });
      client ??= createClient({ url });
      await client.executeMultiple(readFileSync(path.join(__dirname, "migrations/20260912000000_init/migration.sql"), "utf8"));
    },
    db: () => client ??= createClient({ url }),
  };
}

async function snapshot(db) {
  const result = {};
  for (const table of ["Settings", "Period", "Term"]) {
    result[table] = (await db.execute(`SELECT * FROM "${table}" ORDER BY id`)).rows;
  }
  return result;
}

test("missing database is created, migrated and seeded; restart preserves edits", async (t) => {
  const f = fixture(t);
  f.env.DATABASE_URL = "file:../data/dev.db";
  assert.match(f.start(), /Database seeded/);
  const db = f.db();
  const initial = await snapshot(db);
  assert.equal(initial.Settings.length, 1);
  assert.equal(initial.Period.length, 11);
  assert.equal(initial.Term.length, 2);
  await db.execute("UPDATE Settings SET schoolName = 'Custom school', adminPasswordHash = 'custom-hash'");
  await db.execute("UPDATE Period SET name = 'Custom period' WHERE id = 1");
  await db.execute("DELETE FROM Term");
  const before = await snapshot(db);
  assert.match(f.start(), /skipping seed/);
  assert.deepEqual(await snapshot(db), before);
});

test("empty legacy db push database is baselined and seeded", async (t) => {
  const f = fixture(t);
  await f.push();
  assert.match(f.start(), /Database seeded/);
  assert.equal((await snapshot(f.db())).Settings.length, 1);
});

test("populated legacy database is baselined and pending migrations preserve data", async (t) => {
  const f = fixture(t);
  await f.push();
  await f.db().execute("INSERT INTO Period (dayType, `order`, name, startTime, endTime) VALUES ('REMOTE', 1, 'Existing', '09:00', '09:35')");
  const before = await snapshot(f.db());
  // An additional migration must be applied even when there is existing data.
  const migration = path.join(f.root, "prisma/migrations/20260913000000_test");
  mkdirSync(migration);
  writeFileSync(path.join(migration, "migration.sql"), 'CREATE TABLE "StartupTest" ("id" INTEGER PRIMARY KEY);');
  assert.match(f.start(), /skipping seed/);
  assert.deepEqual(await snapshot(f.db()), before);
  assert.equal((await f.db().execute("SELECT COUNT(*) AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL")).rows[0].count, 3);
  await f.db().execute('SELECT * FROM "StartupTest"');
  assert.match(f.start(), /No pending migrations/);
});

test("schema mismatch fails without resetting existing data", async (t) => {
  const f = fixture(t);
  await f.push();
  await f.db().execute('ALTER TABLE "Period" ADD COLUMN "custom" TEXT');
  assert.match(f.start(1), /Existing database differs from the initial migration/);
  const columns = await f.db().execute('PRAGMA table_info("Period")');
  assert.ok(columns.rows.some((column) => column.name === "custom"));
});

test("migration failure exits unsuccessfully and does not seed", async (t) => {
  const f = fixture(t);
  const migration = path.join(f.root, "prisma/migrations/20260913000000_broken");
  mkdirSync(migration);
  writeFileSync(path.join(migration, "migration.sql"), "INVALID SQL;");
  f.start(1);
  assert.equal((await snapshot(f.db())).Settings.length, 0);
});
