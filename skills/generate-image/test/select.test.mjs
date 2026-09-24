import { test } from "node:test";
import assert from "node:assert/strict";
import { detectAspect, selectModel, stripNegations } from "../lib/select.mjs";
import { catalogFor } from "../lib/models.mjs";

const fits = (d) => {
  const c = catalogFor(d.model);
  assert.ok(d.width % 8 === 0 && d.height % 8 === 0, "8er-Raster");
  assert.ok(d.width >= c.min && d.width <= c.maxW && d.height >= c.min && d.height <= c.maxH, "innerhalb der Modellgrenzen");
};

test("quoted text picks Phoenix QUALITY", () => {
  const d = selectModel({ prompt: 'A poster that says "Turn Knowledge into Performance"' });
  assert.equal(d.model, "phoenix-v1.0");
  assert.equal(d.mode, "QUALITY");
  assert.equal(d.matchedRule, "text-in-image");
  fits(d);
});

test("Titelbild wide picks flux-dev in 16:9", () => {
  const d = selectModel({ prompt: "Titelbild für einen Blogpost über Wissensmanagement, wide" });
  assert.equal(d.model, "flux-dev");
  assert.equal(d.aspect, "16:9");
  assert.ok(d.width > d.height);
  fits(d);
});

test("photo of a factory hall picks lucid and a wide aspect", () => {
  const d = selectModel({ prompt: "photorealistic photo of a modern factory hall with workers", availableModelIds: ["lucid-origin", "phoenix-v1.0"] });
  assert.equal(d.model, "lucid-origin");
  assert.deepEqual(d.fallbacksApplied, ["lucid-realism"]);
  assert.equal(d.aspect, "16:9");
  fits(d);
});

test("logo intent picks Phoenix Minimalist", () => {
  const d = selectModel({ prompt: "paper plane", intent: "logo" });
  assert.equal(d.model, "phoenix-v1.0");
  assert.equal(d.styleName, "Minimalist");
});

test("draft uses the small default size", () => {
  const d = selectModel({ prompt: "quick draft of a mountain" });
  assert.equal(d.model, "flux-schnell");
  assert.equal(d.width, 768);
});

test("default rule for a neutral prompt", () => {
  const d = selectModel({ prompt: "a red bicycle leaning on a wall" });
  assert.equal(d.matchedRule, "default");
  assert.equal(d.model, "lucid-origin");
  assert.equal(d.quantity, 1);
});

test("--model override keeps user choice and clamps size", () => {
  const d = selectModel({ prompt: "anything", flags: { model: "phoenix-v1.0", width: 3000, height: 100 } });
  assert.equal(d.source, "override");
  assert.equal(d.model, "phoenix-v1.0");
  assert.equal(d.width, 2048);
  assert.equal(d.height, 104);
});

test("unknown mode falls back to the model default", () => {
  const d = selectModel({ prompt: "photo of a cat", flags: { mode: "QUALITY" }, availableModelIds: ["lucid-origin"] });
  assert.equal(d.model, "lucid-origin");
  assert.equal(d.mode, "FAST");
  assert.ok(d.reasons.some((r) => r.includes("Modus QUALITY")));
});

test("quantity is clamped to 1..8", () => {
  assert.equal(selectModel({ prompt: "x", flags: { quantity: 20 } }).quantity, 8);
  assert.equal(selectModel({ prompt: "x", flags: { quantity: 0 } }).quantity, 1);
});

test("invalid explicit style throws with valid names", () => {
  assert.throws(() => selectModel({ prompt: "x", flags: { model: "lucid-origin", style: "Sketch (B&W)" } }), /Gültig/);
});

test("aspect detection", () => {
  assert.equal(detectAspect("a tall vertical banner").aspect, "9:16");
  assert.equal(detectAspect("square icon").aspect, "1:1");
  assert.equal(detectAspect("nothing here"), null);
});

test("og aspect gives the exact open graph size", () => {
  const d = selectModel({ prompt: "hero", flags: { aspect: "og" } });
  assert.equal(d.width, 1200);
  assert.equal(d.height, 632);
});

test("negated text does not trigger the text rule", () => {
  const d = selectModel({ prompt: "Blog cover image: a calm office at dawn, navy and lime palette, no text, photorealistic, wide" });
  assert.equal(d.matchedRule, "blog-cover");
  assert.equal(d.model, "lucid-origin", "photorealistic cover prefers Lucid Origin");
  const plain = selectModel({ prompt: "Blog cover image: abstract paper documents turning into digital cards, navy and lime, no text" });
  assert.equal(plain.model, "flux-dev");
  assert.equal(stripNegations("a logo without any text and ohne schriftzug").includes("text"), false);
});

test("explicit text request still triggers the text rule", () => {
  const d = selectModel({ prompt: "poster with the text Turn Knowledge into Performance in bold type" });
  assert.equal(d.matchedRule, "text-in-image");
  const q = selectModel({ prompt: 'mug with „Kaffee zuerst“ printed on it' });
  assert.equal(q.matchedRule, "text-in-image");
});
