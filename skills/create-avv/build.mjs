#!/usr/bin/env node
/**
 * build.mjs — Render a psquared AVV (Auftragsverarbeitungsvertrag, Art. 28
 * DSGVO) PDF from a JSON config.
 *
 * Usage:
 *   node build.mjs <input.json> [output.pdf]
 *
 * Mirrors the create-offer skill: same tiny mustache-style templating engine
 * and the same two-pass Chromium render (edge-to-edge title page in pass 1,
 * body pages with margins + footer/pagination in pass 2) merged with pdf-lib.
 * See examples/avv-example.json for the config shape.
 */
import { readFile, writeFile, mkdtemp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { PDFDocument } from "pdf-lib";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.join(__dirname, "templates");

const [, , inputPath, outputPathRaw] = process.argv;
if (!inputPath) {
  console.error("Usage: node build.mjs <input.json> [output.pdf]");
  process.exit(1);
}
const outputPath = outputPathRaw || "output.pdf";

// ---------------------------------------------------------------------------
// Tiny templating: {{path}}, {{{raw}}}, {{#each items}}…{{/each}}, {{#if k}}…{{/if}}
// (identical engine to skills/create-offer/build.mjs)
// ---------------------------------------------------------------------------
function resolvePath(ctx, dotted) {
  if (dotted === "." || dotted === "this") {
    return ctx && Object.prototype.hasOwnProperty.call(ctx, "this")
      ? ctx.this
      : ctx;
  }
  return dotted.split(".").reduce((acc, key) => {
    if (acc == null) return undefined;
    return acc[key];
  }, ctx);
}

function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function findBlockEnd(template, openTag, closeTag, startIdx) {
  let depth = 1;
  let i = startIdx;
  while (i < template.length) {
    const nextOpen = template.indexOf(openTag, i);
    const nextClose = template.indexOf(closeTag, i);
    if (nextClose === -1) return -1;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + openTag.length;
    } else {
      depth--;
      if (depth === 0) return nextClose;
      i = nextClose + closeTag.length;
    }
  }
  return -1;
}

function renderTemplate(template, ctx) {
  let out = "";
  let i = 0;
  const blockOpenRe = /\{\{#(each|if)\s+([\w.]+)\s*\}\}/g;

  while (i < template.length) {
    blockOpenRe.lastIndex = i;
    const m = blockOpenRe.exec(template);
    if (!m) {
      out += template.slice(i);
      break;
    }
    out += template.slice(i, m.index);

    const kind = m[1];
    const pathExpr = m[2];
    const innerStart = m.index + m[0].length;
    const openTag = kind === "each" ? "{{#each" : "{{#if";
    const closeTag = kind === "each" ? "{{/each}}" : "{{/if}}";
    const closeIdx = findBlockEnd(template, openTag, closeTag, innerStart);
    if (closeIdx === -1) {
      out += m[0];
      i = innerStart;
      continue;
    }
    const inner = template.slice(innerStart, closeIdx);

    if (kind === "each") {
      const list = resolvePath(ctx, pathExpr);
      if (Array.isArray(list) && list.length > 0) {
        for (let idx = 0; idx < list.length; idx++) {
          const item = list[idx];
          const isObj = typeof item === "object" && item !== null;
          const itemCtx = {
            ...ctx,
            ...(isObj ? item : {}),
            this: item,
            "@index": idx,
            "@first": idx === 0,
            "@last": idx === list.length - 1,
          };
          out += renderTemplate(inner, itemCtx);
        }
      }
    } else {
      const v = resolvePath(ctx, pathExpr);
      const truthy = Array.isArray(v) ? v.length > 0 : Boolean(v);
      let elseIdx = -1;
      {
        const re = /\{\{(#each|#if|\/each|\/if|else)\b[^}]*\}\}/g;
        let depth = 0;
        let mm;
        while ((mm = re.exec(inner)) !== null) {
          const tag = mm[1];
          if (tag === "#each" || tag === "#if") depth++;
          else if (tag === "/each" || tag === "/if") depth--;
          else if (tag === "else" && depth === 0) {
            elseIdx = mm.index;
            break;
          }
        }
      }
      if (elseIdx === -1) {
        if (truthy) out += renderTemplate(inner, ctx);
      } else {
        const thenPart = inner.slice(0, elseIdx);
        const elsePart = inner.slice(
          elseIdx + inner.slice(elseIdx).indexOf("}}") + 2,
        );
        out += renderTemplate(truthy ? thenPart : elsePart, ctx);
      }
    }

    i = closeIdx + closeTag.length;
  }

  out = out.replace(/\{\{\{\s*([\w.@]+)\s*\}\}\}/g, (_, pathExpr) => {
    const v = resolvePath(ctx, pathExpr);
    if (v == null) return "";
    if (Array.isArray(v) || typeof v === "object") return "";
    return String(v);
  });

  out = out.replace(/\{\{\s*([\w.@]+)\s*\}\}/g, (_, pathExpr) => {
    const v = resolvePath(ctx, pathExpr);
    if (v == null) return "";
    if (Array.isArray(v) || typeof v === "object") return "";
    return escapeHtml(v);
  });

  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const absInput = path.resolve(process.cwd(), inputPath);
  if (!existsSync(absInput)) {
    console.error(`Input file not found: ${absInput}`);
    process.exit(1);
  }
  const cfg = JSON.parse(await readFile(absInput, "utf8"));

  const [titleTpl, documentTpl, styleCss] = await Promise.all([
    readFile(path.join(TEMPLATES_DIR, "title.html"), "utf8"),
    readFile(path.join(TEMPLATES_DIR, "document.html"), "utf8"),
    readFile(path.join(TEMPLATES_DIR, "style.css"), "utf8"),
  ]);

  const titleHtml = renderTemplate(titleTpl, cfg);
  const documentHtml = renderTemplate(documentTpl, cfg);

  const baseHref = pathToFileURL(__dirname + path.sep).href;
  const fullHtml = `<!doctype html>
<html lang="${cfg.language || "de"}">
<head>
  <meta charset="utf-8" />
  <base href="${baseHref}" />
  <title>${escapeHtml(cfg.doc?.title || "Auftragsverarbeitungsvertrag")}</title>
  <style>${styleCss}</style>
</head>
<body>
  <section class="page page--title">${titleHtml}</section>
  <section class="page page--doc">${documentHtml}</section>
</body>
</html>`;

  const tmp = await mkdtemp(path.join(tmpdir(), "psquared-avv-"));
  const htmlPath = path.join(tmp, "avv.html");
  await writeFile(htmlPath, fullHtml, "utf8");

  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    const absOutput = path.resolve(process.cwd(), outputPath);

    const brandText = `${cfg.provider?.name || "psquared GmbH"} · AVV`;
    const footerTemplate = `
      <div style="
        font-family: 'Inter', -apple-system, sans-serif;
        font-size: 8.5pt; color: #94a3b8; width: 100%;
        padding: 0 25mm; display: flex; justify-content: space-between;
        align-items: center; box-sizing: border-box;">
        <span>${escapeHtml(brandText)}</span>
        <span>Seite <span class="pageNumber"></span> / <span class="totalPages"></span></span>
      </div>`;

    const titlePdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      pageRanges: "1",
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    const bodyPdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      pageRanges: "2-",
      margin: { top: "40mm", right: "25mm", bottom: "30mm", left: "25mm" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate,
    });

    const mergedPdf = await PDFDocument.create();
    const titleDoc = await PDFDocument.load(titlePdfBuffer);
    const bodyDoc = await PDFDocument.load(bodyPdfBuffer);
    const titlePages = await mergedPdf.copyPages(titleDoc, titleDoc.getPageIndices());
    for (const p of titlePages) mergedPdf.addPage(p);
    const bodyPages = await mergedPdf.copyPages(bodyDoc, bodyDoc.getPageIndices());
    for (const p of bodyPages) mergedPdf.addPage(p);
    const mergedBuffer = await mergedPdf.save();
    await writeFile(absOutput, mergedBuffer);
    console.log(`PDF written: ${absOutput}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
