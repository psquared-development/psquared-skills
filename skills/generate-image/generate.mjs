#!/usr/bin/env node
// generate-image: create images with the Leonardo AI API, choosing the model from what the image
// needs, showing cost and balance before and after, saving files plus a provenance sidecar.
// Human output → stderr, `--json` → one JSON object on stdout. See SKILL.md for the workflow.
import { parseArgs } from "node:util";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { relative } from "node:path";
import { err, formatNumber, hr, info, registerSecret, verbose as vlog, warn } from "./lib/log.mjs";
import { loadApiKey, maskKey, missingKeyMessage, REPO_ENV_FILE, SKILL_DIR } from "./lib/env.mjs";
import { createClient, LeonardoError } from "./lib/api.mjs";
import { alternativesFor, selectModel } from "./lib/select.mjs";
import { catalogFor, MODEL_CATALOG, MODEL_IDS } from "./lib/models.mjs";
import { estimateCost, formatAmount, formatBalance, formatEstimate, recordObservedCost } from "./lib/cost.mjs";
import { pollGeneration } from "./lib/poll.mjs";
import { buildFilename, downloadImage, extFromContentType, resolveOutTarget, sidecarPathFor, slugify, writeSidecar } from "./lib/download.mjs";

const VERSION = "0.1.0";

const OPTIONS = {
  model: { type: "string" },
  intent: { type: "string" },
  size: { type: "string" },
  width: { type: "string" },
  height: { type: "string" },
  aspect: { type: "string" },
  quantity: { type: "string" },
  mode: { type: "string" },
  quality: { type: "boolean" },
  style: { type: "string" },
  negative: { type: "string" },
  seed: { type: "string" },
  enhance: { type: "string" },
  contrast: { type: "string" },
  public: { type: "boolean" },
  out: { type: "string" },
  json: { type: "boolean" },
  confirm: { type: "boolean" },
  yes: { type: "boolean" },
  force: { type: "boolean" },
  "no-wait": { type: "boolean" },
  timeout: { type: "string" },
  "poll-interval": { type: "string" },
  "skip-nsfw": { type: "boolean" },
  "env-file": { type: "string" },
  verbose: { type: "boolean" },
  explain: { type: "boolean" },
  estimate: { type: "boolean" },
  "list-models": { type: "boolean" },
  refresh: { type: "boolean" },
  balance: { type: "boolean" },
  status: { type: "string" },
  "check-env": { type: "boolean" },
  help: { type: "boolean", short: "h" },
  version: { type: "boolean" },
};

const USAGE = `generate-image ${VERSION} · Leonardo AI

  node generate.mjs "<prompt>" [Optionen]        Bild erzeugen (Default 1 Bild)
  node generate.mjs --explain  "<prompt>" [...]  nur Modellwahl zeigen, kein API-Aufruf
  node generate.mjs --estimate "<prompt>" [...]  Modellwahl + Guthaben + Kostenschätzung
  node generate.mjs --list-models [--refresh]    Modelle des Kontos (GET /v2/models)
  node generate.mjs --balance                    Guthaben (GET /v1/me)
  node generate.mjs --status <generationId> [--out DIR]   Generierung abholen
  node generate.mjs --check-env                  API-Key gefunden? (maskiert)

Optionen: --model <id> · --intent photo|portrait|product|text|illustration|icon|logo|anime|3d|cover|banner|draft
  --size WxH | --width N --height N | --aspect 1:1|16:9|9:16|4:3|3:4|3:2|2:3|21:9|og
  --quantity N (1..8, Default 1) · --mode FAST|QUALITY|ULTRA · --quality · --style <name|uuid|none>
  --negative "<text>" (Phoenix) · --seed N · --enhance auto|on|off · --contrast low|medium|high (Phoenix)
  --public · --out <dir/|file> (Default cwd) · --json · --confirm · --yes · --force · --no-wait
  --timeout <s> (Default 180) · --poll-interval <s> (Default 3) · --skip-nsfw · --env-file <path> · --verbose

Exit-Codes: 0 ok · 1 unbekannt · 2 Usage/API 400 · 3 Key fehlt · 4 Auth · 5 Guthaben · 6 Rate-Limit
  7 FAILED · 8 Timeout (generationId für --status) · 9 keine Datei · 10 abgebrochen`;

class UsageError extends Error {
  constructor(message) {
    super(message);
    this.exitCode = 2;
  }
}

function parseIntOr(value, fallback, name) {
  if (value === undefined) return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) throw new UsageError(`${name} muss eine Zahl sein, bekam "${value}"`);
  return n;
}

function parseCli(argv) {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true, strict: true });
  } catch (e) {
    throw new UsageError(e.message);
  }
  const v = parsed.values;
  const flags = {
    model: v.model,
    mode: v.mode,
    quality: Boolean(v.quality),
    style: v.style,
    aspect: v.aspect,
    quantity: parseIntOr(v.quantity, 1, "--quantity"),
    seed: v.seed !== undefined ? parseIntOr(v.seed, undefined, "--seed") : undefined,
    negative: v.negative,
    enhance: v.enhance,
    contrast: v.contrast,
    public: Boolean(v.public),
  };
  if (v.size) {
    const m = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(v.size.trim());
    if (!m) throw new UsageError(`--size erwartet WxH, bekam "${v.size}"`);
    flags.width = Number(m[1]);
    flags.height = Number(m[2]);
  } else if (v.width || v.height) {
    if (!(v.width && v.height)) throw new UsageError("--width und --height gehören zusammen");
    flags.width = parseIntOr(v.width, undefined, "--width");
    flags.height = parseIntOr(v.height, undefined, "--height");
  }
  if (flags.quantity < 1 || flags.quantity > 8) throw new UsageError("--quantity muss zwischen 1 und 8 liegen");
  if (v.aspect && !["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9", "og"].includes(v.aspect)) throw new UsageError(`Unbekannter --aspect "${v.aspect}"`);
  if (v.enhance && !["auto", "on", "off"].includes(v.enhance.toLowerCase())) throw new UsageError("--enhance erwartet auto|on|off");
  if (v.contrast && !["low", "medium", "high"].includes(v.contrast.toLowerCase())) throw new UsageError("--contrast erwartet low|medium|high");
  return { values: v, flags, prompt: parsed.positionals.join(" ").trim() };
}

function printDecision(decision, { withAlternatives = false } = {}) {
  const style = decision.styleName ? ` · Style ${decision.styleName}` : "";
  const mode = decision.mode ? ` · ${decision.mode}` : "";
  info(`Modell:    ${decision.model}${mode}${style}   (${decision.source === "override" ? "--model" : `Regel "${decision.matchedRule}"`})`);
  info(`Größe:     ${decision.width}×${decision.height} (${decision.aspect}) · Anzahl ${decision.quantity}`);
  for (const r of decision.reasons) info(`           ${r}`);
  if (!decision.catalogVerified) info("           Modellgrenzen im Katalog nicht verifiziert, die API prüft sie");
  if (withAlternatives) for (const a of alternativesFor(decision)) info(`Alternative: ${a}`);
}

function buildPayload(decision, flags, prompt) {
  const cat = catalogFor(decision.model);
  if (prompt.length > cat.promptMax) throw new UsageError(`Prompt zu lang (${prompt.length} Zeichen, erlaubt ${cat.promptMax})`);
  const parameters = { prompt, width: decision.width, height: decision.height, quantity: decision.quantity };
  if (decision.mode) parameters.mode = decision.mode;
  if (decision.styleId) parameters.style_ids = [decision.styleId];
  if (flags.negative) {
    if (cat.supports.negative) parameters.negative_prompt = flags.negative;
    else warn(`${decision.model} unterstützt keinen Negativ-Prompt, --negative wird ignoriert`);
  }
  if (flags.seed !== undefined) parameters.seed = flags.seed;
  if (flags.enhance) parameters.prompt_enhance = flags.enhance.toUpperCase();
  if (flags.contrast) {
    if (cat.supports.contrast) parameters.contrast = flags.contrast.toUpperCase();
    else warn(`${decision.model} unterstützt keinen Kontrast-Parameter, --contrast wird ignoriert`);
  }
  return { model: decision.model, public: flags.public, parameters };
}

async function confirmOrExit(values) {
  if (!values.confirm) return;
  if (values.yes) return;
  if (!stdin.isTTY) throw Object.assign(new Error("--confirm braucht ein Terminal, oder --yes für nicht-interaktive Läufe"), { exitCode: 2 });
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = (await rl.question("Fortfahren? [y/N] ")).trim().toLowerCase();
  rl.close();
  if (!["y", "yes", "j", "ja"].includes(answer)) throw Object.assign(new Error("Abgebrochen"), { exitCode: 10 });
}

function requireKey(values) {
  const found = loadApiKey({ envFile: values["env-file"] });
  if (!found.key) throw Object.assign(new Error(missingKeyMessage(found.tried)), { exitCode: 3 });
  registerSecret(found.key);
  return found;
}

async function downloadAll({ gen, decision, prompt, values, seed }) {
  const { dir, fixedName } = resolveOutTarget(values.out);
  const slug = slugify(prompt);
  const files = [];
  let skipped = 0;
  for (const [index, img] of gen.images.entries()) {
    if (img.nsfw && values["skip-nsfw"]) {
      skipped += 1;
      continue;
    }
    const head = await fetch(img.url, { method: "HEAD" }).catch(() => null);
    const ext = extFromContentType(head?.headers?.get("content-type"), img.url);
    const path = buildFilename({ dir, fixedName, slug, model: decision.model, seed: gen.images.length > 1 ? null : seed, index, quantity: gen.images.length, ext });
    const meta = await downloadImage(img.url, path);
    files.push({ ...img, path, ...meta });
    if (img.nsfw) warn(`Bild ${index + 1} ist von Leonardo als nsfw markiert: ${path}`);
  }
  return { files, skipped, dir, slug };
}

async function main(argv) {
  const { values, flags, prompt } = parseCli(argv);
  const json = Boolean(values.json);
  const out = (obj) => stdout.write(`${JSON.stringify(obj)}\n`);

  if (values.help) {
    info(USAGE);
    return 0;
  }
  if (values.version) {
    info(VERSION);
    return 0;
  }

  if (values["check-env"]) {
    const found = loadApiKey({ envFile: values["env-file"] });
    if (!found.key) {
      err(missingKeyMessage(found.tried));
      return 3;
    }
    info(`LEONARDO_API_KEY: gefunden (${maskKey(found.key)}, Quelle: ${found.source === "env" ? "Umgebungsvariable" : found.source})`);
    return 0;
  }

  if (values.explain) {
    if (!prompt) throw new UsageError("--explain braucht einen Prompt");
    const decision = selectModel({ prompt, intent: values.intent ?? null, flags });
    if (json) out({ ok: true, decision, alternatives: alternativesFor(decision) });
    else {
      hr();
      info("generate-image · Modellwahl (kein API-Aufruf)");
      printDecision(decision, { withAlternatives: true });
      hr();
    }
    return 0;
  }

  const found = requireKey(values);
  const client = createClient(found.key, { verbose: Boolean(values.verbose), log: vlog });

  if (values["list-models"]) {
    const data = await client.listModels({ refresh: Boolean(values.refresh) });
    const rows = (data.models ?? []).map((m) => ({ id: m.id, name: m.name, inCatalog: Boolean(MODEL_CATALOG[m.id]), parameters: m.parameters }));
    if (json) out({ ok: true, fetchedAt: data.fetchedAt, fromCache: data.fromCache, models: rows });
    else {
      hr();
      info(`Modelle des Kontos (${rows.length}, ${data.fromCache ? "aus Cache" : "frisch"}, Stand ${data.fetchedAt})`);
      for (const r of rows) {
        info(`  ${r.id.padEnd(28)} ${String(r.name ?? "").padEnd(32)} ${r.inCatalog ? "Katalog ✓" : ""}`);
        if (values.verbose && r.parameters) info(`    ${JSON.stringify(r.parameters).slice(0, 600)}`);
      }
      info(`Im Katalog, aber nicht im Konto: ${MODEL_IDS.filter((id) => !rows.some((r) => r.id === id)).join(", ") || "keine"}`);
      hr();
    }
    return 0;
  }

  if (values.balance) {
    const balance = await client.getBalance();
    if (json) out({ ok: balance.available, balance });
    else info(`Guthaben:  ${formatBalance(balance)}`);
    if (values.verbose && balance.numeric) info(`api*-Felder: ${JSON.stringify(balance.numeric)}`);
    return balance.available ? 0 : 1;
  }

  if (values.status) {
    const gen = await client.getGeneration(values.status);
    if (gen.status !== "COMPLETE" || !gen.images.length) {
      if (json) out({ ok: false, generationId: values.status, status: gen.status, images: gen.images });
      else info(`Generation ${values.status}: ${gen.status} (${gen.images.length} Bilder, Endpoint ${gen.endpointVersion})`);
      return gen.status === "FAILED" ? 7 : 8;
    }
    const decision = { model: gen.raw?.generations_by_pk?.modelId ?? gen.raw?.model ?? "leonardo", width: gen.images[0]?.width, height: gen.images[0]?.height, quantity: gen.images.length };
    const promptText = gen.raw?.generations_by_pk?.prompt ?? gen.raw?.prompt ?? values.status;
    const { files, dir } = await downloadAll({ gen, decision, prompt: promptText, values, seed: gen.seed });
    const sidecar = writeSidecar(sidecarPathFor(files[0]?.path, dir, slugify(promptText), decision.model, values.status.slice(0, 8)), {
      tool: "generate-image", version: VERSION, createdAt: new Date().toISOString(), generationId: values.status, status: gen.status, images: files.map(({ raw, ...f }) => f), response: { final: gen.raw },
    });
    if (json) out({ ok: true, generationId: values.status, status: gen.status, images: files, sidecar });
    else {
      for (const f of files) info(`Datei:     ${f.path}`);
      info(`Sidecar:   ${sidecar}`);
    }
    return files.length ? 0 : 9;
  }

  if (!prompt) throw new UsageError("Bitte einen Prompt angeben. Hilfe: --help");

  // --- Selection, balance, estimate -----------------------------------------
  let availableModelIds = null;
  try {
    const list = await client.listModels();
    availableModelIds = (list.models ?? []).map((m) => m.id);
    if (!availableModelIds.length) availableModelIds = null;
  } catch (e) {
    warn(`Modellliste nicht abrufbar (${e.message}), Modellwahl ohne Verfügbarkeitsprüfung`);
  }
  const decision = selectModel({ prompt, intent: values.intent ?? null, flags, availableModelIds });
  const payload = buildPayload(decision, flags, prompt);
  const balanceBefore = await client.getBalance();
  const estimate = await estimateCost(client, decision);

  if (!json) {
    hr();
    info(`generate-image · ${values.estimate ? "Kostenschätzung" : "Vorschau"}`);
    printDecision(decision, { withAlternatives: Boolean(values.estimate) });
    info(`Kosten:    ${formatEstimate(estimate)}`);
    info(`Guthaben:  ${formatBalance(balanceBefore)}`);
    hr();
  }
  if (values.estimate) {
    if (json) out({ ok: true, decision, payload, estimate, balance: balanceBefore });
    return 0;
  }

  if (typeof estimate.amount === "number" && balanceBefore.available && balanceBefore.unit === estimate.unit && estimate.amount > balanceBefore.amount && !values.force) {
    throw Object.assign(new Error(`Geschätzte Kosten (${formatAmount(estimate)}) übersteigen das Guthaben (${formatAmount(balanceBefore)}). --force zum Übergehen.`), { exitCode: 5 });
  }
  await confirmOrExit(values);

  // --- Create ----------------------------------------------------------------
  const submittedAt = new Date().toISOString();
  const created = await client.createGeneration(payload);
  if (!json) info(`Gestartet: generationId ${created.generationId}${typeof created.apiCreditCost === "number" ? ` · apiCreditCost ${created.apiCreditCost}` : ""}`);

  const { dir, fixedName } = resolveOutTarget(values.out);
  const slug = slugify(prompt);
  const baseSidecar = {
    tool: "generate-image",
    version: VERSION,
    createdAt: submittedAt,
    cwd: process.cwd(),
    skillDir: SKILL_DIR,
    prompt,
    request: { url: "https://cloud.leonardo.ai/api/rest/v2/generations", body: payload },
    decision,
    cost: { estimated: estimate, actual: typeof created.apiCreditCost === "number" ? { amount: created.apiCreditCost, unit: "CREDITS", source: "apiCreditCost" } : null },
    balance: { before: balanceBefore.available ? { amount: balanceBefore.amount, unit: balanceBefore.unit, parts: balanceBefore.parts } : { available: false, reason: balanceBefore.reason } },
    generationId: created.generationId,
    response: { create: created.raw },
  };

  if (values["no-wait"]) {
    const sidecar = writeSidecar(sidecarPathFor(null, dir, slug, decision.model, created.generationId.slice(0, 8)), { ...baseSidecar, status: "PENDING" });
    if (json) out({ ok: true, generationId: created.generationId, status: "PENDING", sidecar, decision, cost: baseSidecar.cost, balance: baseSidecar.balance });
    else info(`Nicht gewartet. Abholen mit: node generate.mjs --status ${created.generationId} --out ${dir}/`);
    return 0;
  }

  // --- Poll -----------------------------------------------------------------
  const timeoutS = parseIntOr(values.timeout, decision.mode === "ULTRA" || decision.quantity > 4 ? 300 : 180, "--timeout");
  const intervalS = parseIntOr(values["poll-interval"], 3, "--poll-interval");
  const gen = await pollGeneration(client, created.generationId, {
    timeoutMs: timeoutS * 1000,
    intervalMs: intervalS * 1000,
    onTick: (g, n) => {
      if (!json) info(`  Poll ${n}: ${g.status}${g.note ? ` (${g.note})` : ""}${g.endpointVersion ? ` · ${g.endpointVersion}` : ""}`);
    },
  });

  if (gen.status === "FAILED") {
    writeSidecar(sidecarPathFor(null, dir, slug, decision.model, created.generationId.slice(0, 8)), { ...baseSidecar, status: "FAILED", response: { ...baseSidecar.response, final: gen.raw } });
    throw Object.assign(new Error(`Generation FAILED (${created.generationId})`), { exitCode: 7, generationId: created.generationId });
  }
  if (gen.status === "TIMEOUT") {
    writeSidecar(sidecarPathFor(null, dir, slug, decision.model, created.generationId.slice(0, 8)), { ...baseSidecar, status: "PENDING", note: `Timeout nach ${timeoutS} s` });
    throw Object.assign(new Error(`Timeout nach ${timeoutS} s, Generation läuft weiter. Abholen: node generate.mjs --status ${created.generationId} --out ${dir}/`), { exitCode: 8, generationId: created.generationId });
  }

  // --- Download, sidecar, post block ------------------------------------------
  const seed = flags.seed ?? gen.seed ?? null;
  const { files, skipped } = await downloadAll({ gen, decision, prompt, values, seed });
  const actual = gen.cost ?? baseSidecar.cost.actual;
  if (actual) recordObservedCost({ model: decision.model, mode: decision.mode, width: decision.width, height: decision.height, quantity: decision.quantity, amount: actual.amount, unit: actual.unit });
  const balanceAfter = await client.getBalance();
  const delta = balanceBefore.available && balanceAfter.available && balanceBefore.unit === balanceAfter.unit ? balanceAfter.amount - balanceBefore.amount : null;
  const completedAt = new Date().toISOString();
  const sidecar = writeSidecar(sidecarPathFor(files[0]?.path, dir, slug, decision.model, created.generationId.slice(0, 8)), {
    ...baseSidecar,
    status: gen.status,
    seed,
    cost: { estimated: estimate, actual },
    balance: { ...baseSidecar.balance, after: balanceAfter.available ? { amount: balanceAfter.amount, unit: balanceAfter.unit } : { available: false, reason: balanceAfter.reason }, delta },
    images: files.map(({ raw, ...f }) => f),
    skippedNsfw: skipped,
    response: { ...baseSidecar.response, final: gen.raw },
    timing: { submittedAt, completedAt, polls: gen.polls, waitMs: gen.waitMs, getEndpoint: gen.endpointVersion },
  });

  const result = {
    ok: files.length > 0,
    generationId: created.generationId,
    model: decision.model,
    mode: decision.mode,
    style: decision.styleId ? { name: decision.styleName, id: decision.styleId } : null,
    width: decision.width,
    height: decision.height,
    quantity: decision.quantity,
    seed,
    decision: { source: decision.source, matchedRule: decision.matchedRule, reasons: decision.reasons, fallbacksApplied: decision.fallbacksApplied },
    cost: { estimated: estimate, actual },
    balance: { before: balanceBefore.available ? { amount: balanceBefore.amount, unit: balanceBefore.unit } : null, after: balanceAfter.available ? { amount: balanceAfter.amount, unit: balanceAfter.unit } : null, delta },
    images: files.map(({ raw, ...f }) => f),
    sidecar,
    timing: { submittedAt, completedAt, polls: gen.polls, waitMs: gen.waitMs },
    warnings: [skipped ? `${skipped} Bild(er) wegen nsfw übersprungen` : null, gen.images.length < decision.quantity ? `${decision.quantity - gen.images.length} Bild(er) fehlen (Moderation)` : null].filter(Boolean),
  };

  if (json) out(result);
  else {
    hr();
    info("generate-image · Ergebnis");
    info(`Kosten tatsächlich: ${actual ? `${formatAmount(actual)} (${actual.source})` : `n/a, dieser Key liefert apiCreditCost=null, Schätzung bleibt ${formatEstimate(estimate)}`}`);
    if (typeof estimate.amount === "number" && actual) info(`Schätzung ${formatNumber(estimate.amount)} → tatsächlich ${formatNumber(actual.amount)} (Δ ${formatNumber(actual.amount - estimate.amount)})`);
    info(`Guthaben nachher:   ${formatBalance(balanceAfter)}${delta !== null ? ` (${delta >= 0 ? "+" : ""}${formatNumber(delta)})` : ""}`);
    for (const f of files) info(`Datei:     ${f.path}${f.nsfw ? "  [nsfw]" : ""}`);
    info(`Sidecar:   ${sidecar}`);
    for (const f of files) info(`CDN:       ${f.url}`);
    for (const w of result.warnings) warn(w);
    info(`Poll-Endpoint ${gen.endpointVersion}, ${gen.polls} Abfragen, ${Math.round(gen.waitMs / 1000)} s`);
    hr();
  }
  return files.length ? 0 : 9;
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((e) => {
    const code = e instanceof LeonardoError ? e.exitCode : e.exitCode ?? 1;
    err(e.message);
    if (e instanceof UsageError) info("Hilfe: node generate.mjs --help");
    if (process.argv.includes("--json")) stdout.write(`${JSON.stringify({ ok: false, code, error: e.message, generationId: e.generationId ?? null })}\n`);
    process.exit(code);
  });
