// API key discovery. Order: process.env → --env-file → <repo>/.env two levels above the skill.
// The skill is symlinked from ~/.claude/skills; realpath resolves to the psquared-skills checkout.
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SKILL_DIR = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
export const REPO_ENV_FILE = resolve(SKILL_DIR, "..", "..", ".env");
export const CACHE_DIR = resolve(SKILL_DIR, ".cache");

/** Parse a dotenv text. Splits at the first "=", keeps ";" and "#" inside values, strips one pair of outer quotes. */
export function parseDotEnv(text) {
  const vars = {};
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    const quoted = value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")));
    if (quoted) value = value.slice(1, -1);
    vars[match[1]] = value;
  }
  return vars;
}

export function maskKey(key) {
  if (!key) return "(leer)";
  return `****${key.slice(-4)}`;
}

/** @returns {{ key: string|null, source: string|null, tried: string[] }} */
export function loadApiKey({ envFile } = {}) {
  const fromEnv = (process.env.LEONARDO_API_KEY || "").trim();
  if (fromEnv) return { key: fromEnv, source: "env", tried: [] };
  const tried = envFile ? [envFile] : [REPO_ENV_FILE];
  for (const file of tried) {
    if (!existsSync(file)) continue;
    const vars = parseDotEnv(readFileSync(file, "utf8"));
    const value = (vars.LEONARDO_API_KEY || "").trim();
    if (value) return { key: value, source: file, tried };
  }
  return { key: null, source: null, tried };
}

export function missingKeyMessage(tried = []) {
  const file = tried[0] ?? REPO_ENV_FILE;
  return `LEONARDO_API_KEY fehlt. Entweder als Umgebungsvariable exportieren oder in ${file} eintragen (LEONARDO_API_KEY=…). Production API key anlegen unter https://app.leonardo.ai/api-access (User API keys werden von Leonardo nicht mehr akzeptiert).`;
}
