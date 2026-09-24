// File naming, download with content-type based extension, provenance sidecar.
import { createHash } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export function slugify(text, max = 48) {
  const slug = String(text)
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
  return slug || "image";
}

export function extFromContentType(contentType, url = "") {
  const ct = String(contentType || "").toLowerCase();
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  const fromUrl = extname(new URL(url, "https://x/").pathname).replace(".", "").toLowerCase();
  if (["jpg", "jpeg", "png", "webp"].includes(fromUrl)) return fromUrl === "jpeg" ? "jpg" : fromUrl;
  return "jpg";
}

/** --out: directory (ends with "/", or exists as dir) or exact file name. */
export function resolveOutTarget(outFlag, cwd = process.cwd()) {
  if (!outFlag) return { dir: cwd, fixedName: null };
  const abs = isAbsolute(outFlag) ? outFlag : resolve(cwd, outFlag);
  const looksLikeDir = /[\\/]$/.test(outFlag) || (existsSync(abs) && statSync(abs).isDirectory()) || !extname(abs);
  if (looksLikeDir) return { dir: abs, fixedName: null };
  return { dir: dirname(abs), fixedName: basename(abs) };
}

export function buildFilename({ dir, fixedName, slug, model, seed, index, quantity, ext }) {
  let base;
  if (fixedName) {
    const stem = fixedName.replace(/\.[^.]+$/, "");
    base = quantity > 1 ? `${stem}-${index + 1}` : stem;
  } else {
    base = `${slug}-${model}-${seed ?? String(index + 1).padStart(2, "0")}`;
  }
  let candidate = join(dir, `${base}.${ext}`);
  let n = 2;
  while (existsSync(candidate)) {
    candidate = join(dir, `${base}-${n}.${ext}`);
    n += 1;
  }
  return candidate;
}

export async function downloadImage(url, targetPath, { fetchImpl = globalThis.fetch } = {}) {
  mkdirSync(dirname(targetPath), { recursive: true });
  const res = await fetchImpl(url);
  if (!res.ok || !res.body) throw new Error(`Download fehlgeschlagen (HTTP ${res.status}) für ${url}`);
  const contentType = res.headers.get("content-type") || "";
  const part = `${targetPath}.part`;
  const hash = createHash("sha256");
  let bytes = 0;
  const counter = new (await import("node:stream")).Transform({
    transform(chunk, _enc, cb) {
      bytes += chunk.length;
      hash.update(chunk);
      cb(null, chunk);
    },
  });
  await pipeline(Readable.fromWeb(res.body), counter, createWriteStream(part));
  renameSync(part, targetPath);
  return { contentType, bytes, sha256: hash.digest("hex") };
}

export function sidecarPathFor(firstImagePath, dir, slug, model, ref) {
  if (firstImagePath) return firstImagePath.replace(/\.[^.]+$/, ".json");
  return join(dir, `${slug}-${model}-${ref}.json`);
}

export function writeSidecar(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2));
  return path;
}
