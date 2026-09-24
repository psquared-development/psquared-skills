// Pure model selection: the skill decides which model, mode, style and size an image needs.
// Rules are evaluated top-down, the first match wins; `--model` short-circuits to an override.
import { catalogFor, clampSize, MODEL_CATALOG, resolveStyle, sizeFor } from "./models.mjs";

const QUOTED = /["„“”«»]([^"„“”«»]{2,})["„“”«»]/;

/** @type {Array<{id:string, intents:string[], keywords:string[], models:string[], mode?:string|null, style?:Record<string,string|null>|string|null, aspect?:string, size?:[number,number]}>} */
export const RULES = [
  {
    id: "text-in-image",
    intents: ["text", "typography"],
    keywords: ["with text", "with the text", "text reading", "typography", "typografie", "lettering", "slogan", "headline", "says", "saying", "with the words", "wording", "schriftzug", "aufschrift", "beschriftung", "titel im bild", "mit dem text", "mit der aufschrift"],
    quoted: true,
    models: ["phoenix-v1.0", "phoenix-v0.9"],
    mode: "QUALITY",
    style: { phoenix: "Dynamic" },
    aspect: "1:1",
  },
  {
    id: "logo-icon",
    intents: ["logo", "icon"],
    keywords: ["logo", "icon", "pictogram", "piktogramm", "symbol", "flat design", "vector", "vektor", "minimal", "app icon", "favicon"],
    models: ["phoenix-v1.0", "lucid-origin"],
    mode: "QUALITY",
    style: { phoenix: "Minimalist", lucid: "None" },
    aspect: "1:1",
  },
  {
    id: "anime",
    intents: ["anime"],
    keywords: ["anime", "manga", "chibi"],
    models: ["anime-xl", "lucid-origin"],
    mode: null,
    style: { lucid: "Dynamic" },
    aspect: "1:1",
  },
  {
    id: "3d-render",
    intents: ["3d"],
    keywords: ["3d render", "3d-render", "blender", "octane", "isometric", "isometrisch", "low poly", "clay"],
    models: ["phoenix-v1.0"],
    mode: "QUALITY",
    style: { phoenix: "3D Render" },
    aspect: "1:1",
  },
  {
    id: "blog-cover",
    intents: ["cover", "banner", "hero"],
    keywords: ["blog cover", "cover image", "hero image", "hero", "header image", "banner", "og image", "og-image", "titelbild", "beitragsbild", "social preview", "headerbild"],
    models: ["flux-dev", "lucid-origin"],
    mode: null,
    style: { flux: "Dynamic", lucid: "Cinematic" },
    aspect: "16:9",
  },
  {
    id: "portrait",
    intents: ["portrait"],
    keywords: ["portrait", "porträt", "portraet", "headshot", "profilbild", "close-up of a person", "gesicht"],
    models: ["lucid-realism", "portrait-perfect", "lucid-origin"],
    mode: null,
    style: { lucid: "Portrait" },
    aspect: "2:3",
  },
  {
    id: "product-shot",
    intents: ["product"],
    keywords: ["product shot", "packshot", "produktfoto", "product photo", "on white background", "auf weißem hintergrund", "studio lighting", "e-commerce", "freisteller"],
    models: ["lucid-realism", "stock-photography", "lucid-origin"],
    mode: null,
    style: { lucid: "Stock Photo" },
    aspect: "1:1",
  },
  {
    id: "photoreal",
    intents: ["photo"],
    keywords: ["photo", "photograph", "photorealistic", "realistic", "dslr", "35mm", "foto", "fotorealistisch", "werkhalle", "shop floor", "factory floor"],
    models: ["lucid-realism", "lucid-origin"],
    mode: null,
    style: { lucid: "Stock Photo", phoenix: "Pro color photography" },
    aspect: null, // scene words decide, else 1:1
  },
  {
    id: "illustration",
    intents: ["illustration"],
    keywords: ["illustration", "cartoon", "comic", "drawing", "sketch", "watercolor", "watercolour", "storybook", "zeichnung", "gemalt", "aquarell", "skizze"],
    models: ["lucid-origin", "phoenix-v1.0"],
    mode: "FAST",
    style: { lucid: "Creative", phoenix: "Illustration" },
    aspect: "1:1",
  },
  {
    id: "draft",
    intents: ["draft"],
    keywords: ["draft", "quick", "thumbnail", "entwurf", "vorschau", "rough"],
    models: ["flux-schnell", "lucid-origin"],
    mode: "FAST",
    style: { flux: "Dynamic", lucid: "Dynamic" },
    aspect: "1:1",
    size: [768, 768],
  },
  {
    id: "default",
    intents: [],
    keywords: [],
    models: ["lucid-origin", "phoenix-v1.0"],
    mode: "FAST",
    style: { lucid: "Dynamic", phoenix: "Dynamic" },
    aspect: "1:1",
  },
];

const SCENE_WORDS = ["landscape", "landschaft", "city", "stadt", "street", "straße", "skyline", "panorama", "wide shot", "factory hall", "werkhalle", "office", "büro", "interior", "innenraum"];

export function detectAspect(promptLower) {
  if (/\b(21:9|ultrawide|ultra-wide)\b/.test(promptLower)) return { aspect: "21:9", term: "21:9" };
  if (/\b(16:9|wide|widescreen|landscape format|querformat|breitbild)\b/.test(promptLower)) return { aspect: "16:9", term: "wide" };
  if (/\b(9:16|vertical|portrait format|hochformat|story format|tall)\b/.test(promptLower)) return { aspect: "9:16", term: "vertical" };
  if (/\b(4:3)\b/.test(promptLower)) return { aspect: "4:3", term: "4:3" };
  if (/\b(3:2)\b/.test(promptLower)) return { aspect: "3:2", term: "3:2" };
  if (/\b(square|quadratisch|1:1)\b/.test(promptLower)) return { aspect: "1:1", term: "square" };
  return null;
}

function matchRule(rule, promptLower, intent) {
  const hits = [];
  if (intent && rule.intents.includes(intent)) hits.push(`--intent ${intent}`);
  if (rule.quoted && QUOTED.test(promptLower)) hits.push("Text in Anführungszeichen");
  for (const k of rule.keywords) {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}\\p{N}]|$)`, "iu");
    if (re.test(promptLower)) hits.push(k);
  }
  return hits;
}

function pickModel(candidates, availableModelIds) {
  if (!availableModelIds || !availableModelIds.length) return { model: candidates[0], fallbacks: [] };
  const fallbacks = [];
  for (const id of candidates) {
    if (availableModelIds.includes(id)) return { model: id, fallbacks };
    fallbacks.push(id);
  }
  return { model: candidates[0], fallbacks, unavailable: true };
}

function styleNameFor(rule, modelId, family) {
  if (!rule.style) return null;
  if (typeof rule.style === "string") return rule.style;
  return rule.style[family] ?? null;
}

/**
 * @param {{prompt:string, intent?:string|null, flags?:{model?:string, mode?:string, style?:string, aspect?:string, width?:number, height?:number, quantity?:number, quality?:boolean}, availableModelIds?:string[]|null}} input
 */
/** Remove negated mentions ("no text", "ohne Schriftzug") so they cannot trigger a rule. */
export function stripNegations(promptLower) {
  return promptLower
    .replace(/\b(no|without|not any|free of|kein|keine|keinen|ohne|nicht)\s+(\w+\s+){0,2}(text|texts|words|lettering|typography|letters|captions?|labels?|watermarks?|logos?|schriftzug|schrift|beschriftung|aufschrift|wörter|buchstaben|logo)\b/g, " ")
    .replace(/\b(text-free|textless|textfrei|schriftlos)\b/g, " ");
}

export function selectModel({ prompt, intent = null, flags = {}, availableModelIds = null }) {
  const promptLower = stripNegations(String(prompt || "").toLowerCase());
  const reasons = [];
  const fallbacksApplied = [];
  let rule = null;
  let hits = [];
  let model;
  let source;

  if (flags.model) {
    source = "override";
    model = flags.model;
    reasons.push(`Modell "${model}" per --model vorgegeben`);
    if (!MODEL_CATALOG[model]) reasons.push("Modell ist nicht im Katalog, Grenzen werden von der API geprüft");
    if (availableModelIds?.length && !availableModelIds.includes(model)) reasons.push(`Achtung: "${model}" ist in der Modellliste des Kontos nicht enthalten`);
    rule = RULES.find((r) => matchRule(r, promptLower, intent).length) ?? RULES.at(-1);
  } else {
    source = "heuristic";
    for (const r of RULES) {
      const h = matchRule(r, promptLower, intent);
      if (h.length || r.id === "default") {
        rule = r;
        hits = h;
        break;
      }
    }
    let candidates = rule.models;
    if (rule.id === "blog-cover" && /\b(photo|photograph|photorealistic|realistic|foto|fotorealistisch)\b/.test(promptLower)) {
      candidates = ["lucid-origin", "flux-dev"];
      reasons.push("Fotorealistisches Cover, daher Lucid Origin statt FLUX");
    }
    const picked = pickModel(candidates, availableModelIds);
    model = picked.model;
    if (picked.fallbacks.length) {
      fallbacksApplied.push(...picked.fallbacks);
      reasons.push(`Nicht verfügbar im Konto: ${picked.fallbacks.join(", ")}, daher ${model}`);
    }
    reasons.push(hits.length ? `Regel "${rule.id}" (Treffer: ${hits.map((h) => `"${h}"`).join(", ")})` : `Keine Regel getroffen, Standard "${rule.id}"`);
  }

  const catalog = catalogFor(model);

  // Mode
  let mode = flags.mode ? String(flags.mode).toUpperCase() : (rule.mode ?? catalog.defaultMode);
  if (flags.quality && !flags.mode && catalog.modes.includes("QUALITY")) mode = "QUALITY";
  if (catalog.modes.length && mode && !catalog.modes.includes(mode)) {
    reasons.push(`Modus ${mode} gibt es für ${model} nicht, verwende ${catalog.defaultMode}`);
    mode = catalog.defaultMode;
  }
  if (!catalog.modes.length) mode = null;

  // Style
  let style = null;
  if (catalog.supports.styles) {
    const wanted = flags.style ?? styleNameFor(rule, model, catalog.family) ?? catalog.defaultStyle;
    if (wanted && String(wanted).toLowerCase() !== "none" || wanted === "None") {
      try {
        style = resolveStyle(model, wanted);
      } catch (e) {
        if (flags.style) throw e;
        reasons.push(`Style "${wanted}" nicht verfügbar für ${model}, verwende ${catalog.defaultStyle}`);
        style = catalog.defaultStyle ? resolveStyle(model, catalog.defaultStyle) : null;
      }
    } else if (wanted && String(wanted).toLowerCase() === "none") {
      style = resolveStyle(model, "None");
    }
  } else if (flags.style) {
    reasons.push(`${model} unterstützt keine Styles, --style wird ignoriert`);
  }

  // Aspect and size
  let aspect = flags.aspect ?? null;
  let aspectReason = aspect ? `Aspekt ${aspect} per --aspect` : null;
  if (!aspect) {
    const detected = detectAspect(promptLower);
    if (detected) {
      aspect = detected.aspect;
      aspectReason = `Aspekt ${aspect} aus "${detected.term}"`;
    }
  }
  if (!aspect && rule.aspect) aspect = rule.aspect;
  if (!aspect && rule.id === "photoreal") {
    const scene = SCENE_WORDS.find((w) => promptLower.includes(w));
    aspect = scene ? "16:9" : "1:1";
    if (scene) aspectReason = `Aspekt 16:9 wegen Szene "${scene}"`;
  }
  if (!aspect) aspect = "1:1";
  if (aspectReason) reasons.push(aspectReason);

  let width;
  let height;
  if (flags.width && flags.height) {
    const [w, h, adjusted] = clampSize(model, Number(flags.width), Number(flags.height));
    width = w;
    height = h;
    if (adjusted) reasons.push(`Größe auf ${w}×${h} angepasst (8er-Raster, Modellgrenzen ${catalog.min}–${catalog.maxW}×${catalog.maxH})`);
  } else if (rule.size && !flags.aspect) {
    [width, height] = clampSize(model, rule.size[0], rule.size[1]);
  } else {
    [width, height] = sizeFor(model, aspect);
  }

  const quantity = Math.min(8, Math.max(1, Number(flags.quantity ?? 1) || 1));

  return {
    source,
    model,
    modelLabel: catalog.label,
    family: catalog.family,
    matchedRule: rule.id,
    hits,
    mode,
    styleId: style?.id ?? null,
    styleName: style?.name ?? null,
    aspect,
    width,
    height,
    quantity,
    reasons,
    fallbacksApplied,
    catalogVerified: catalog.verified,
  };
}

/** Human hints for --explain: what else could be chosen and why. */
export function alternativesFor(decision) {
  const alts = [];
  if (decision.matchedRule === "text-in-image") alts.push("Ideogram- oder GPT-Image-Modelle (per --model, aus --list-models) rendern Text meist präziser, kosten aber mehr");
  if (decision.family === "lucid" && decision.mode === "FAST") alts.push("--mode ULTRA für mehr Detail, etwa doppelte Kosten");
  if (decision.family === "phoenix" && decision.mode !== "ULTRA") alts.push("--mode ULTRA für höchste Qualität, --contrast high für kräftigere Bilder");
  if (decision.matchedRule === "blog-cover") alts.push("--model lucid-origin für fotorealistische Cover, --aspect og für 1200×632 Open-Graph");
  if (decision.quantity === 1) alts.push("--quantity 2 bis 4 für Varianten, Kosten steigen linear");
  return alts;
}
