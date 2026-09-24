import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadApiKey, maskKey, parseDotEnv, REPO_ENV_FILE, SKILL_DIR } from "../lib/env.mjs";

test("parseDotEnv keeps semicolons, strips quotes, accepts export and CRLF", () => {
  const vars = parseDotEnv('# comment\r\nexport A="x;y;z"\r\nB=\'q#u\'\r\nC = plain=value \r\nBAD LINE\r\n');
  assert.deepEqual(vars, { A: "x;y;z", B: "q#u", C: "plain=value" });
});

test("loadApiKey prefers the environment variable", () => {
  process.env.LEONARDO_API_KEY = "abcdefgh1234";
  try {
    assert.deepEqual(loadApiKey({ envFile: "/nonexistent" }), { key: "abcdefgh1234", source: "env", tried: [] });
  } finally {
    delete process.env.LEONARDO_API_KEY;
  }
});

test("loadApiKey reads a dotenv file and reports a missing key", () => {
  delete process.env.LEONARDO_API_KEY;
  const dir = mkdtempSync(join(tmpdir(), "gi-env-"));
  const file = join(dir, ".env");
  writeFileSync(file, "OTHER=1\nLEONARDO_API_KEY=key_with;semicolon\n");
  assert.equal(loadApiKey({ envFile: file }).key, "key_with;semicolon");
  const missing = loadApiKey({ envFile: join(dir, "none.env") });
  assert.equal(missing.key, null);
  assert.deepEqual(missing.tried, [join(dir, "none.env")]);
});

test("repo env path is two levels above the real skill dir", () => {
  assert.ok(REPO_ENV_FILE.endsWith("/.env"));
  assert.ok(!SKILL_DIR.includes("/.claude/skills/"), "realpath resolves the symlink");
});

test("maskKey shows only the last four characters", () => {
  assert.equal(maskKey("secret-1234"), "****1234");
});
