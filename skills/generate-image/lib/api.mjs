// Leonardo REST client: v2 for creating generations and listing models, probes for the result
// endpoint (v2 first, v1 fallback), legacy v1 for balance and the pricing calculator.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CACHE_DIR } from "./env.mjs";

export const BASE_V1 = "https://cloud.leonardo.ai/api/rest/v1";
export const BASE_V2 = "https://cloud.leonardo.ai/api/rest/v2";

export class LeonardoError extends Error {
  constructor(message, { status = 0, url = "", body = null, exitCode = 1 } = {}) {
    super(message);
    this.name = "LeonardoError";
    this.status = status;
    this.url = url;
    this.body = body;
    this.exitCode = exitCode;
  }
}

const sleepDefault = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function readCache(name) {
  try {
    const file = join(CACHE_DIR, name);
    if (!existsSync(file)) return null;
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

export function writeCache(name, data) {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(join(CACHE_DIR, name), JSON.stringify(data, null, 2));
  } catch {
    /* cache is best effort */
  }
}

function apiMessage(body) {
  if (!body) return "";
  if (typeof body === "string") return body.slice(0, 300);
  return String(body.error ?? body.message ?? body.detail ?? JSON.stringify(body)).slice(0, 300);
}

/**
 * Leonardo v2 liefert Validierungsfehler mit HTTP 200 und einem GraphQL-Envelope:
 * [{ message, extensions: { statusCode, details: { errors: [{ message }] } } }]
 * Gibt { status, message } zurück, wenn der Body so ein Fehler ist, sonst null.
 */
export function graphqlEnvelopeError(body) {
  const entry = Array.isArray(body) ? body[0] : body;
  if (!entry || typeof entry !== "object") return null;
  const ext = entry.extensions;
  const errors = ext?.details?.errors;
  const detail = Array.isArray(errors) ? errors.map((e) => e?.message).filter(Boolean).join("; ") : "";
  const message = detail || ext?.details?.message || (ext ? entry.message : "");
  if (!ext || !message) return null;
  const status = Number(ext.statusCode) || 400;
  return { status, message: String(message).slice(0, 300) };
}

function exitCodeFor(status, body) {
  const text = apiMessage(body).toLowerCase();
  if (status === 401 || status === 403) return 4;
  if (status === 402 || /insufficient|not enough|credit|balance|token/.test(text) && status !== 400) return 5;
  if (status === 429 || /concurren|queue|rate limit/.test(text)) return 6;
  if (status === 400 || status === 422 || status === 404) return 2;
  return 1;
}

/** Normalise a "get generation" response (v1 or v2 shape) into one form. */
export function normalizeGeneration(raw) {
  const gen = raw?.generations_by_pk ?? raw?.generation ?? raw?.data ?? raw;
  if (!gen || typeof gen !== "object") return { status: "UNKNOWN", images: [], raw };
  const list = gen.generated_images ?? gen.images ?? gen.results ?? [];
  const images = (Array.isArray(list) ? list : []).map((img) => ({
    id: img.id ?? null,
    url: img.url ?? img.imageUrl ?? null,
    nsfw: Boolean(img.nsfw),
    width: img.width ?? gen.imageWidth ?? null,
    height: img.height ?? gen.imageHeight ?? null,
  })).filter((img) => img.url);
  const status = String(gen.status ?? (images.length ? "COMPLETE" : "PENDING")).toUpperCase();
  const cost = gen.cost && typeof gen.cost === "object" ? { amount: gen.cost.amount, unit: gen.cost.unit ?? "CREDITS", source: "generation.cost" }
    : typeof gen.apiCreditCost === "number" ? { amount: gen.apiCreditCost, unit: "CREDITS", source: "apiCreditCost" } : null;
  return { status, images, cost, seed: gen.seed ?? null, raw };
}

/** Normalise GET /v1/me. */
export function normalizeBalance(raw) {
  const details = raw?.user_details?.[0] ?? raw?.user ?? raw;
  if (!details || typeof details !== "object") return { available: false, reason: "unerwartete Antwortform", raw };
  const paid = Number(details.apiPaidTokens ?? details.paidTokens ?? NaN);
  const sub = Number(details.apiSubscriptionTokens ?? details.subscriptionTokens ?? NaN);
  const dollars = Number(details.apiCreditBalance ?? details.balanceUsd ?? details.apiPaygBalance ?? NaN);
  const numeric = Object.fromEntries(Object.entries(details).filter(([k, v]) => /^api/i.test(k) && typeof v === "number"));
  if (!Number.isNaN(paid) || !Number.isNaN(sub)) {
    return {
      available: true,
      amount: (Number.isNaN(paid) ? 0 : paid) + (Number.isNaN(sub) ? 0 : sub),
      unit: "CREDITS",
      parts: { paid: Number.isNaN(paid) ? null : paid, subscription: Number.isNaN(sub) ? null : sub },
      concurrency: details.apiConcurrencySlots ?? null,
      renewal: details.apiPlanTokenRenewalDate ?? null,
      source: "/v1/me",
      numeric,
      raw,
    };
  }
  if (!Number.isNaN(dollars)) return { available: true, amount: dollars, unit: "DOLLARS", parts: {}, concurrency: details.apiConcurrencySlots ?? null, source: "/v1/me", numeric, raw };
  return { available: false, reason: "keine Guthabenfelder in /v1/me", numeric, raw };
}

export function createClient(apiKey, { verbose = false, sleep = sleepDefault, fetchImpl = globalThis.fetch, log = () => {} } = {}) {
  if (typeof fetchImpl !== "function") throw new Error("Node >= 18 mit globalem fetch wird benötigt");
  const headers = { authorization: `Bearer ${apiKey}`, accept: "application/json", "content-type": "application/json" };

  async function request(method, url, { body, retries429 = 5, retries5xx = 3, allowStatuses = [] } = {}) {
    let attempt = 0;
    for (;;) {
      attempt += 1;
      let res;
      try {
        res = await fetchImpl(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      } catch (e) {
        if (attempt <= retries5xx) {
          await sleep(1000 * 2 ** (attempt - 1));
          continue;
        }
        throw new LeonardoError(`Netzwerkfehler: ${e.message}`, { url, exitCode: 1 });
      }
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = text;
      }
      log(verbose, `${method} ${url} → ${res.status}`, json);
      if (res.ok) return { status: res.status, body: json };
      if (allowStatuses.includes(res.status)) return { status: res.status, body: json };
      if (res.status === 429 && attempt <= retries429) {
        const retryAfter = Number(res.headers.get("retry-after"));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * 2 ** (attempt - 1));
        continue;
      }
      if (res.status >= 500 && attempt <= retries5xx) {
        await sleep(1000 * 2 ** (attempt - 1));
        continue;
      }
      const message = `HTTP ${res.status} bei ${method} ${url.replace(BASE_V1, "/v1").replace(BASE_V2, "/v2")}${apiMessage(json) ? `: ${apiMessage(json)}` : ""}`;
      throw new LeonardoError(message, { status: res.status, url, body: json, exitCode: exitCodeFor(res.status, json) });
    }
  }

  async function createGeneration(payload) {
    const { body } = await request("POST", `${BASE_V2}/generations`, { body: payload });
    // v2 antwortet auch bei Validierungsfehlern mit HTTP 200 und einem GraphQL-Fehler-Envelope.
    const envelopeError = graphqlEnvelopeError(body);
    if (envelopeError) {
      const status = envelopeError.status ?? 400;
      throw new LeonardoError(`HTTP ${status} bei POST /v2/generations: ${envelopeError.message}`, {
        status, body, exitCode: exitCodeFor(status, envelopeError.message),
      });
    }
    // Erfolgsfall: v2 verschachtelt das Ergebnis unter "generate".
    const job = body?.generate ?? body?.sdGenerationJob ?? body;
    const generationId = job?.generationId ?? body?.generationId ?? job?.id ?? body?.id ?? null;
    if (!generationId) throw new LeonardoError("Antwort ohne generationId", { body, exitCode: 1 });
    const rawCost = job?.apiCreditCost ?? body?.apiCreditCost ?? job?.cost?.amount;
    const apiCreditCost = Number.isFinite(Number(rawCost)) && rawCost !== null && rawCost !== "" ? Number(rawCost) : null;
    return { generationId, apiCreditCost, raw: body };
  }

  async function listModels({ refresh = false } = {}) {
    const cached = refresh ? null : readCache("models.json");
    if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < 24 * 3600 * 1000) return { ...cached, fromCache: true };
    const { body } = await request("GET", `${BASE_V2}/models`);
    const models = body?.productionApiAvailableModels ?? body?.models ?? (Array.isArray(body) ? body : []);
    const data = { fetchedAt: new Date().toISOString(), models };
    writeCache("models.json", data);
    return { ...data, fromCache: false };
  }

  async function getGeneration(id) {
    const probe = readCache("api-probe.json");
    const fresh = probe && Date.now() - new Date(probe.checkedAt).getTime() < 7 * 24 * 3600 * 1000;
    const order = fresh && probe.getGeneration === "v1" ? ["v1", "v2"] : ["v2", "v1"];
    let lastError = null;
    for (const version of order) {
      const url = `${version === "v2" ? BASE_V2 : BASE_V1}/generations/${encodeURIComponent(id)}`;
      try {
        const { status, body } = await request("GET", url, { allowStatuses: [404, 405] });
        if (status === 404 || status === 405 || (version === "v1" && body && body.generations_by_pk === null && !fresh)) {
          lastError = new LeonardoError(`HTTP ${status} bei GET ${version}/generations/{id}`, { status, url, body, exitCode: 2 });
          continue;
        }
        if (!fresh || probe.getGeneration !== version) writeCache("api-probe.json", { getGeneration: version, checkedAt: new Date().toISOString() });
        return { ...normalizeGeneration(body), endpointVersion: version };
      } catch (e) {
        lastError = e;
        if (e.status && e.status !== 404 && e.status !== 405) throw e;
      }
    }
    throw lastError ?? new LeonardoError("Generation nicht abrufbar", { exitCode: 1 });
  }

  async function getBalance() {
    try {
      const { body } = await request("GET", `${BASE_V1}/me`, { retries5xx: 1 });
      return normalizeBalance(body);
    } catch (e) {
      return { available: false, reason: e.message, status: e.status ?? null };
    }
  }

  /** Legacy pricing calculator. Returns { amount, unit, source } or null when unavailable. */
  async function estimateViaCalculator({ width, height, quantity, family, mode }) {
    const params = {
      imageHeight: height,
      imageWidth: width,
      numImages: quantity,
      inferenceSteps: 15,
      promptMagic: false,
      alchemyMode: family === "phoenix" ? mode !== "FAST" : true,
      highResolution: false,
      isModelCustom: false,
      isSDXL: false,
      isSDXLLightning: false,
      isPhoenix: family === "phoenix",
      ultra: mode === "ULTRA",
    };
    try {
      const { body } = await request("POST", `${BASE_V1}/pricing-calculator`, {
        body: { service: "IMAGE_GENERATION", serviceParams: { IMAGE_GENERATION: params } },
        retries5xx: 0,
      });
      const cost = body?.calculateProductionApiServiceCost?.cost ?? body?.cost ?? null;
      if (typeof cost === "number") return { amount: cost, unit: "CREDITS", source: "calculator", raw: body };
      return null;
    } catch (e) {
      return { unavailable: true, reason: e.message, status: e.status ?? null };
    }
  }

  return { request, createGeneration, listModels, getGeneration, getBalance, estimateViaCalculator };
}
