import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source = readFileSync(new URL("./auth.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { adminCookieOptions, createAdminCookie, isAdminAuthenticated } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("HTTP production addresses receive usable cookies; HTTPS stays secure", () => {
  for (const url of ["http://0.0.0.0:3001", "http://192.168.1.10:3001", "https://school.example"]) {
    const options = adminCookieOptions(new Request(url));
    assert.equal(options.secure, url.startsWith("https:"));
    assert.equal(options.httpOnly, true);
    assert.equal(options.sameSite, "lax");
    assert.equal(options.path, "/");
    assert.equal(options.maxAge, 21600);
  }
});
test("TLS termination at proxy preserves secure cookies", () => {
  assert.equal(adminCookieOptions(new Request("http://internal:3001", { headers: { "x-forwarded-proto": "https, http" } })).secure, true);
  assert.equal(adminCookieOptions(new Request("http://internal:3001", { headers: { "x-forwarded-proto": "http" } })).secure, false);
});
test("session validation still rejects missing or invalid cookies and old passwords", () => {
  const settings = { adminPasswordHash: "first-hash" };
  const token = createAdminCookie(settings);
  assert.equal(isAdminAuthenticated(token, settings), true);
  assert.equal(isAdminAuthenticated(undefined, settings), false);
  assert.equal(isAdminAuthenticated("invalid", settings), false);
  assert.equal(isAdminAuthenticated(token, { adminPasswordHash: "new-hash" }), false);
});
