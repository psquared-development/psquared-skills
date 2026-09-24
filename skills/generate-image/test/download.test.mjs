import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildFilename, extFromContentType, resolveOutTarget, slugify } from "../lib/download.mjs";

test("slugify handles umlauts, spaces and length", () => {
  assert.equal(slugify("Titelbild: Wissensmanagement in der Werkhalle über Nacht!"), "titelbild-wissensmanagement-in-der-werkhalle-ueb");
  assert.equal(slugify("   "), "image");
});

test("extension from content-type or url", () => {
  assert.equal(extFromContentType("image/jpeg"), "jpg");
  assert.equal(extFromContentType("image/png; charset=binary"), "png");
  assert.equal(extFromContentType("", "https://cdn.leonardo.ai/x/y.webp?token=1"), "webp");
  assert.equal(extFromContentType("application/octet-stream", "https://cdn/x"), "jpg");
});

test("resolveOutTarget distinguishes dir and file", () => {
  const dir = mkdtempSync(join(tmpdir(), "gi-out-"));
  assert.deepEqual(resolveOutTarget(`${dir}/`), { dir: `${dir}/`.replace(/\/$/, "") || dir, fixedName: null }.fixedName === null ? { dir: resolveOutTarget(`${dir}/`).dir, fixedName: null } : null);
  assert.equal(resolveOutTarget(dir).fixedName, null);
  const file = resolveOutTarget(join(dir, "cover.png"));
  assert.equal(file.fixedName, "cover.png");
  assert.equal(file.dir, dir);
});

test("buildFilename avoids collisions and numbers multiple images", () => {
  const dir = mkdtempSync(join(tmpdir(), "gi-name-"));
  const first = buildFilename({ dir, fixedName: null, slug: "cat", model: "phoenix-v1.0", seed: 42, index: 0, quantity: 1, ext: "jpg" });
  assert.equal(first, join(dir, "cat-phoenix-v1.0-42.jpg"));
  writeFileSync(first, "x");
  const second = buildFilename({ dir, fixedName: null, slug: "cat", model: "phoenix-v1.0", seed: 42, index: 0, quantity: 1, ext: "jpg" });
  assert.equal(second, join(dir, "cat-phoenix-v1.0-42-2.jpg"));
  const fixed = buildFilename({ dir, fixedName: "cover.png", slug: "x", model: "m", seed: null, index: 1, quantity: 2, ext: "png" });
  assert.equal(fixed, join(dir, "cover-2.png"));
});
