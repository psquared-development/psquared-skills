// Catalogue of Leonardo v2 image models. Constraints follow docs.leonardo.ai (September 2026);
// entries marked verified:false are best knowledge and are corrected by the API's own validation
// messages and by `--list-models`, which prints each model's parameter schema from /v2/models.

/** Preset style UUIDs (Leonardo "styles"). Dynamic and None are documented; the rest come from the
 *  Phoenix style list and must be confirmed once via `--list-models` (schema enums) or a test run. */
export const STYLE_UUIDS = {
  Dynamic: "111dc692-d470-4eec-b791-3475abac4c46",
  None: "556c1ee5-ec38-42e8-955a-1e82dad0ffa1",
  "3D Render": "debdf72a-91a4-467b-bf61-cc02bdeb69c6",
  Bokeh: "9fdc5e8c-4d13-49b4-9ce6-5a74cbb19177",
  Cinematic: "a5632c7c-ddbb-4e2f-ba34-8456ab3ac436",
  "Cinematic Concept": "33abbb99-03b9-4dd7-9761-ee98650b2c88",
  Creative: "6fedbf1f-4a17-45ec-84fb-92fe524a29ef",
  Fashion: "594c4a08-a522-4e0e-b7ff-e4dac4b6b622",
  "Graphic Design Pop Art": "2e74ec31-f3a4-4825-b08b-2894f6d13941",
  "Graphic Design Vector": "1fbb6a68-9319-44d2-8d56-f7cba5e1b1e3",
  HDR: "97c20e5c-1af6-4d42-b227-54d03d8f0727",
  Illustration: "645e4195-f63d-4715-a3f2-3fb1e6eb8c70",
  Macro: "30c1d34f-e3a9-479a-b56f-c018bbc9c02a",
  Minimalist: "cadc8cd6-7838-4c99-b645-df76be8ba8d8",
  Moody: "621e1c9a-6319-4bee-a12d-ae40659162fa",
  Portrait: "8e2bc543-6ee2-45f9-bcd9-594b6ce84dcd",
  "Portrait Fashion": "0d34f8e1-46d4-428f-8ddd-4b11811fa7c9",
  "Pro B&W photography": "22a9a7d2-2166-4d86-80ff-22e2643adbcf",
  "Pro color photography": "7c3f932b-a572-47cb-9b9b-f20211e63b5b",
  "Pro film photography": "581ba6d6-5aac-4492-bebe-54c424a0d46e",
  "Ray Traced": "b504f83c-3326-4947-82e1-7fe9e839ec0f",
  "Sketch (B&W)": "be8c6b58-739c-4d44-b9c1-b032ed308b61",
  "Sketch (Color)": "093accc3-7633-4ffd-82da-d34000dfc0d6",
  "Stock Photo": "5bdc3f2a-1be6-4d1c-8e77-992a30824a2c",
  Vibrant: "dee282d3-891f-4f73-ba02-7f8131e5d0aa",
};

const PHOENIX_STYLES = Object.keys(STYLE_UUIDS);
const LUCID_STYLES = ["Dynamic", "Cinematic", "Creative", "Fashion", "Portrait", "Stock Photo", "Vibrant", "None"];
const FLUX_STYLES = ["Dynamic", "None"];

const phoenix = (label, verified) => ({
  label,
  family: "phoenix",
  min: 32,
  maxW: 2048,
  maxH: 2048,
  step: 8,
  defaultSize: [1024, 1024],
  budgetMp: 1.05,
  modes: ["FAST", "QUALITY", "ULTRA"],
  defaultMode: "FAST",
  styles: PHOENIX_STYLES,
  defaultStyle: "Dynamic",
  supports: { negative: true, contrast: true, enhance: true, seed: true, tiling: true, styles: true },
  promptMax: 2000,
  verified,
});

const lucid = (label, verified) => ({
  label,
  family: "lucid",
  min: 16,
  maxW: 3840,
  maxH: 3616,
  step: 8,
  defaultSize: [1200, 1200],
  budgetMp: 1.44,
  modes: ["FAST", "ULTRA"],
  defaultMode: "FAST",
  styles: LUCID_STYLES,
  defaultStyle: "Dynamic",
  supports: { negative: false, contrast: false, enhance: true, seed: true, tiling: false, styles: true },
  promptMax: 2000,
  verified,
});

const flux = (label, defaultEdge, verified) => ({
  label,
  family: "flux",
  min: 480,
  maxW: 2048,
  maxH: 2048,
  step: 8,
  defaultSize: [defaultEdge, defaultEdge],
  budgetMp: 1.05,
  modes: [],
  defaultMode: null,
  styles: FLUX_STYLES,
  defaultStyle: "Dynamic",
  supports: { negative: false, contrast: false, enhance: true, seed: true, tiling: false, styles: true },
  promptMax: 2000,
  verified,
});

const legacyXl = (label) => ({
  label,
  family: "xl",
  min: 512,
  maxW: 1536,
  maxH: 1536,
  step: 8,
  defaultSize: [1024, 1024],
  budgetMp: 1.0,
  modes: [],
  defaultMode: null,
  styles: [],
  defaultStyle: null,
  supports: { negative: true, contrast: false, enhance: false, seed: true, tiling: false, styles: false },
  promptMax: 1500,
  verified: false,
});

export const MODEL_CATALOG = {
  "phoenix-v1.0": phoenix("Leonardo Phoenix 1.0", true),
  "phoenix-v0.9": phoenix("Leonardo Phoenix 0.9", true),
  "lucid-origin": lucid("Lucid Origin", true),
  "lucid-realism": lucid("Lucid Realism", false),
  "flux-dev": flux("FLUX.1 Dev", 1024, true),
  "flux-schnell": flux("FLUX.1 Schnell", 768, false),
  "flux-pro-2.0": flux("FLUX.2 Pro", 1024, false),
  "anime-xl": legacyXl("Leonardo Anime XL"),
  "kino-xl": legacyXl("Leonardo Kino XL"),
  "portrait-perfect": legacyXl("Portrait Perfect"),
  "stock-photography": legacyXl("Stock Photography"),
};

export const MODEL_IDS = Object.keys(MODEL_CATALOG);

/** Generic fallback for model ids the catalogue does not know (the API validates the real constraints). */
export const GENERIC_MODEL = {
  label: "unknown model",
  family: "unknown",
  min: 512,
  maxW: 2048,
  maxH: 2048,
  step: 8,
  defaultSize: [1024, 1024],
  budgetMp: 1.0,
  modes: [],
  defaultMode: null,
  styles: [],
  defaultStyle: null,
  supports: { negative: false, contrast: false, enhance: false, seed: true, tiling: false, styles: false },
  promptMax: 2000,
  verified: false,
};

export function catalogFor(modelId) {
  return MODEL_CATALOG[modelId] ?? GENERIC_MODEL;
}

/** Aspect presets. "og" is an exact Open-Graph size. */
export const ASPECTS = {
  "1:1": { ratio: 1 },
  "16:9": { ratio: 16 / 9 },
  "9:16": { ratio: 9 / 16 },
  "4:3": { ratio: 4 / 3 },
  "3:4": { ratio: 3 / 4 },
  "3:2": { ratio: 3 / 2 },
  "2:3": { ratio: 2 / 3 },
  "21:9": { ratio: 21 / 9 },
  og: { exact: [1200, 632] },
};

const roundTo = (value, step) => Math.max(step, Math.round(value / step) * step);

/** Clamp a size into the model's limits on the 8 px grid. Returns [w, h, adjusted]. */
export function clampSize(modelId, width, height) {
  const c = catalogFor(modelId);
  const w = Math.min(c.maxW, Math.max(c.min, roundTo(width, c.step)));
  const h = Math.min(c.maxH, Math.max(c.min, roundTo(height, c.step)));
  return [w, h, w !== width || h !== height];
}

/** Size for an aspect within the model's pixel budget. */
export function sizeFor(modelId, aspect, budgetMp) {
  const c = catalogFor(modelId);
  const preset = ASPECTS[aspect] ?? ASPECTS["1:1"];
  if (preset.exact) return clampSize(modelId, preset.exact[0], preset.exact[1]).slice(0, 2);
  const budget = (budgetMp ?? c.budgetMp) * 1_000_000;
  const w = Math.sqrt(budget * preset.ratio);
  const h = w / preset.ratio;
  return clampSize(modelId, w, h).slice(0, 2);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resolve a style by name (case-insensitive), "none", or UUID for a model. Throws with the valid names. */
export function resolveStyle(modelId, nameOrUuid) {
  const c = catalogFor(modelId);
  if (!nameOrUuid) return null;
  if (UUID_RE.test(nameOrUuid)) {
    const known = Object.entries(STYLE_UUIDS).find(([, id]) => id.toLowerCase() === nameOrUuid.toLowerCase());
    return { name: known ? known[0] : "custom", id: nameOrUuid };
  }
  const wanted = String(nameOrUuid).trim().toLowerCase();
  const match = c.styles.find((s) => s.toLowerCase() === wanted) ?? Object.keys(STYLE_UUIDS).find((s) => s.toLowerCase() === wanted);
  if (!match) {
    throw new Error(`Unbekannter Style "${nameOrUuid}" für ${modelId}. Gültig: ${c.styles.length ? c.styles.join(", ") : "keine Styles für dieses Modell"}`);
  }
  if (c.styles.length && !c.styles.includes(match)) {
    throw new Error(`Style "${match}" gibt es für ${modelId} nicht. Gültig: ${c.styles.join(", ")}`);
  }
  return { name: match, id: STYLE_UUIDS[match] };
}

/**
 * Static cost table in API credits per image at ~1 megapixel, keyed by model and mode.
 * Leonardo publishes API prices only in the logged-in pricing calculator
 * (https://app.leonardo.ai/api-access/pricing-calculator). Fill in verified numbers there; until
 * then the estimate falls back to observed costs from previous runs (.cache/observed-costs.json).
 */
export const STATIC_COST = {
  verifiedAt: null,
  unit: "CREDITS",
  perImageAt1Mp: {
    // "phoenix-v1.0": { FAST: null, QUALITY: null, ULTRA: null },
  },
};

export function megapixels(width, height) {
  return (width * height) / 1_000_000;
}
