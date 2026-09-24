// Cost estimate chain: pricing calculator → static table → observed costs from earlier runs → unknown.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CACHE_DIR } from "./env.mjs";
import { megapixels, STATIC_COST } from "./models.mjs";
import { formatNumber } from "./log.mjs";

const OBSERVED_FILE = () => join(CACHE_DIR, "observed-costs.json");

export function readObserved() {
  try {
    const file = OBSERVED_FILE();
    return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { entries: [] };
  } catch {
    return { entries: [] };
  }
}

export function recordObservedCost({ model, mode, width, height, quantity, amount, unit }) {
  if (typeof amount !== "number") return;
  const data = readObserved();
  data.entries.push({ at: new Date().toISOString(), model, mode, width, height, quantity, amount, unit });
  if (data.entries.length > 500) data.entries = data.entries.slice(-500);
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(OBSERVED_FILE(), JSON.stringify(data, null, 2));
  } catch {
    /* best effort */
  }
}

function fromObserved(decision) {
  const { entries } = readObserved();
  const mp = megapixels(decision.width, decision.height);
  const same = entries.filter((e) => e.model === decision.model && (e.mode ?? null) === (decision.mode ?? null));
  if (!same.length) return null;
  const perImagePerMp = same.map((e) => e.amount / Math.max(1, e.quantity) / Math.max(0.05, megapixels(e.width, e.height)));
  const avg = perImagePerMp.reduce((a, b) => a + b, 0) / perImagePerMp.length;
  return { amount: Math.round(avg * mp * decision.quantity), unit: same.at(-1).unit ?? "CREDITS", source: `observed (${same.length} frühere Läufe)` };
}

function fromStatic(decision) {
  const row = STATIC_COST.perImageAt1Mp?.[decision.model];
  const perImage = row ? row[decision.mode ?? "default"] ?? row.default ?? null : null;
  if (typeof perImage !== "number") return null;
  const amount = Math.round(perImage * megapixels(decision.width, decision.height) * decision.quantity);
  return { amount, unit: STATIC_COST.unit, source: `static-table (geschätzt, Stand ${STATIC_COST.verifiedAt ?? "unbekannt"})` };
}

export async function estimateCost(client, decision) {
  const calc = await client.estimateViaCalculator(decision);
  if (calc && !calc.unavailable) return calc;
  const stat = fromStatic(decision);
  if (stat) return { ...stat, calculatorReason: calc?.reason };
  const obs = fromObserved(decision);
  if (obs) return { ...obs, calculatorReason: calc?.reason };
  return { amount: null, unit: null, source: "unknown", calculatorReason: calc?.reason ?? "Preisrechner ohne Antwort" };
}

export function formatAmount(cost) {
  if (!cost || typeof cost.amount !== "number") return "unbekannt";
  return cost.unit === "DOLLARS" ? `$${formatNumber(cost.amount)}` : `${formatNumber(cost.amount)} Credits`;
}

export function formatEstimate(cost) {
  if (!cost || typeof cost.amount !== "number") return `unbekannt bis zum ersten Lauf (apiCreditCost liefert den Istwert${cost?.calculatorReason ? `; Preisrechner: ${cost.calculatorReason}` : ""})`;
  return `~${formatAmount(cost)}   (Quelle: ${cost.source})`;
}

export function formatBalance(balance) {
  if (!balance?.available) return `nicht abrufbar (${balance?.reason ?? "unbekannt"}), Dashboard: https://app.leonardo.ai/api-access`;
  const parts = [];
  if (balance.parts?.paid != null) parts.push(`paid ${formatNumber(balance.parts.paid)}`);
  if (balance.parts?.subscription != null) parts.push(`subscription ${formatNumber(balance.parts.subscription)}`);
  const extra = [parts.length ? `(${parts.join(" + ")})` : null, balance.concurrency != null ? `Concurrency ${balance.concurrency}` : null].filter(Boolean).join(" · ");
  return `${formatAmount(balance)}${extra ? ` ${extra}` : ""}`;
}
