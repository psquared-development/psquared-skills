#!/usr/bin/env node
/**
 * build.mjs — Render a psquared client offer PDF from a JSON config.
 *
 * Usage:
 *   node build.mjs <input.json> [output.pdf]
 *
 * The JSON describes the offer. See examples/sanacom-example.json for the
 * full shape. Templates live under ./templates and use a tiny mustache-style
 * token replacement: {{path.to.value}} or {{#each items}}...{{/each}}.
 *
 * We deliberately avoid bringing in a templating library — the format is
 * intentionally minimal so the templates stay easy to hand-edit.
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

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const [, , inputPath, outputPathRaw] = process.argv;
if (!inputPath) {
  console.error("Usage: node build.mjs <input.json> [output.pdf]");
  process.exit(1);
}
const outputPath = outputPathRaw || "output.pdf";

// ---------------------------------------------------------------------------
// Tiny templating: {{path.to.key}}, {{#each items}}...{{/each}}, {{#if key}}..{{/if}}
// ---------------------------------------------------------------------------
function resolvePath(ctx, dotted) {
  if (dotted === "." || dotted === "this") {
    // Return the current item if we're inside an {{#each}} iteration,
    // otherwise the whole context.
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

/**
 * Find the matching closing tag for a block, accounting for nested blocks of
 * the same kind ({{#each}}/{{#if}}). Returns the index in `template` where
 * the closing tag starts, or -1 if not found.
 */
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
  // We walk the template once, finding {{#each}} / {{#if}} blocks and their
  // matching closers with proper nesting support, then recursively render
  // the contents. After all blocks are resolved we do a final pass for
  // simple `{{ value }}` and `{{{ value }}}` substitutions.
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
    // Append text before the block opener.
    out += template.slice(i, m.index);

    const kind = m[1];
    const pathExpr = m[2];
    const innerStart = m.index + m[0].length;
    const openTag = kind === "each" ? "{{#each" : "{{#if";
    const closeTag = kind === "each" ? "{{/each}}" : "{{/if}}";
    const closeIdx = findBlockEnd(template, openTag, closeTag, innerStart);
    if (closeIdx === -1) {
      // Unbalanced — emit the opener as-is and continue past it (defensive).
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
      // if — supports an optional {{else}} at the same nesting level
      const v = resolvePath(ctx, pathExpr);
      const truthy = Array.isArray(v) ? v.length > 0 : Boolean(v);
      // Find a top-level {{else}} inside `inner` (ignore ones nested in
      // sub-blocks). We walk inner, tracking #each/#if depth.
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

  // {{{ raw }}}  — un-escaped (must run before {{ escaped }})
  out = out.replace(/\{\{\{\s*([\w.@]+)\s*\}\}\}/g, (_, pathExpr) => {
    const v = resolvePath(ctx, pathExpr);
    if (v == null) return "";
    if (Array.isArray(v) || typeof v === "object") return "";
    return String(v);
  });

  // {{ escaped }}
  out = out.replace(/\{\{\s*([\w.@]+)\s*\}\}/g, (_, pathExpr) => {
    const v = resolvePath(ctx, pathExpr);
    if (v == null) return "";
    if (Array.isArray(v) || typeof v === "object") return "";
    return escapeHtml(v);
  });

  return out;
}

// ---------------------------------------------------------------------------
// Currency formatting helper
// ---------------------------------------------------------------------------
function formatEUR(value) {
  if (value == null || value === "") return "";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

// ---------------------------------------------------------------------------
// Compute derived data (totals, formatted prices) from the raw config
// ---------------------------------------------------------------------------
function enrichConfig(cfg) {
  const angebot = cfg.angebot ?? {};
  const items = Array.isArray(angebot.items) ? angebot.items : [];

  // Per-item line total = qty * unitPrice
  const enrichedItems = items.map((item) => {
    const qty = item.qty ?? 1;
    const unitPrice = item.unitPrice ?? 0;
    const lineTotal =
      item.lineTotal != null ? item.lineTotal : qty * unitPrice;
    return {
      ...item,
      qty,
      qtyDisplay: item.qtyDisplay ?? (qty === 1 ? "1" : String(qty)),
      unitPriceDisplay: item.unitPriceDisplay ?? formatEUR(unitPrice),
      lineTotalDisplay: item.lineTotalDisplay ?? formatEUR(lineTotal),
      lineTotal,
    };
  });

  const subtotal = enrichedItems.reduce((s, it) => s + (it.lineTotal || 0), 0);
  const discount = angebot.discount ?? 0;
  const afterDiscount = subtotal - discount;
  const vatRate = angebot.vatRate ?? 0.20; // Austrian default
  const vatAmount = +(afterDiscount * vatRate).toFixed(2);
  const total = +(afterDiscount + vatAmount).toFixed(2);

  const recurring = angebot.recurring ?? null;
  const recurringDisplay = recurring
    ? {
        ...recurring,
        amountDisplay:
          recurring.amountDisplay ?? formatEUR(recurring.amount ?? 0),
      }
    : null;

  return {
    ...cfg,
    angebot: {
      ...angebot,
      items: enrichedItems,
      subtotalDisplay: formatEUR(subtotal),
      discountDisplay: discount ? formatEUR(discount) : null,
      hasDiscount: discount > 0,
      afterDiscountDisplay: formatEUR(afterDiscount),
      vatRateDisplay: `${Math.round(vatRate * 100)}%`,
      vatAmountDisplay: formatEUR(vatAmount),
      totalDisplay: formatEUR(total),
      recurring: recurringDisplay,
    },
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  // 1. Load JSON
  const absInput = path.resolve(process.cwd(), inputPath);
  if (!existsSync(absInput)) {
    console.error(`Input file not found: ${absInput}`);
    process.exit(1);
  }
  const rawCfg = JSON.parse(await readFile(absInput, "utf8"));
  const cfg = enrichConfig(rawCfg);

  // 2. Load templates
  const [titleTpl, bodyTpl, angebotTpl, termsTpl, styleCss] = await Promise.all(
    [
      readFile(path.join(TEMPLATES_DIR, "title.html"), "utf8"),
      readFile(path.join(TEMPLATES_DIR, "body.html"), "utf8"),
      readFile(path.join(TEMPLATES_DIR, "angebot.html"), "utf8"),
      readFile(path.join(TEMPLATES_DIR, "terms.html"), "utf8"),
      readFile(path.join(TEMPLATES_DIR, "style.css"), "utf8"),
    ],
  );

  // 3. Render each page
  const titleHtml = renderTemplate(titleTpl, cfg);
  const bodyHtml = renderTemplate(bodyTpl, cfg);
  const angebotHtml = renderTemplate(angebotTpl, cfg);
  const termsHtml = renderTemplate(termsTpl, cfg);

  // 4. Assemble the full document. We wrap each rendered page in a
  //    .page div with `break-after: page` so Playwright produces clean A4 pages.
  // The HTML is rendered from a tempdir, so relative asset paths like
  // `assets/foo.png` would resolve there (which is empty). The <base> tag
  // makes the skill directory the resolution root so the templates can use
  // simple paths like `assets/foo.png` or `assets/logo.svg`.
  const baseHref = pathToFileURL(__dirname + path.sep).href;
  const fullHtml = `<!doctype html>
<html lang="${cfg.language || "de"}">
<head>
  <meta charset="utf-8" />
  <base href="${baseHref}" />
  <title>${escapeHtml(cfg.offer?.title || "Angebot")}</title>
  <style>${styleCss}</style>
</head>
<body>
  <section class="page page--title">${titleHtml}</section>
  <section class="page page--body">${bodyHtml}</section>
  <section class="page page--angebot">${angebotHtml}</section>
  <section class="page page--terms">${termsHtml}</section>
</body>
</html>`;

  // Save the assembled HTML to a temp file (helps Playwright resolve relative
  // asset paths via file:// URLs and makes debugging easier).
  const tmp = await mkdtemp(path.join(tmpdir(), "psquared-offer-"));
  const htmlPath = path.join(tmp, "offer.html");
  await writeFile(htmlPath, fullHtml, "utf8");

  // 5. Render via Playwright
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    const absOutput = path.resolve(process.cwd(), outputPath);

    // Brand text shown bottom-left, page number bottom-right (not on title page).
    const brandText = `${cfg.provider?.name || "psquared"} · ${cfg.offer?.title || "Angebot"}`;
    const footerTemplate = `
      <div style="
        font-family: 'Inter', -apple-system, sans-serif;
        font-size: 8.5pt;
        color: #94a3b8;
        width: 100%;
        padding: 0 25mm;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-sizing: border-box;
      ">
        <span>${escapeHtml(brandText)}</span>
        <span>Seite <span class="pageNumber"></span> / <span class="totalPages"></span></span>
      </div>`;

    // Two passes so the title page can be edge-to-edge (no margin, no footer)
    // while the rest of the document carries margin + page numbering.
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
      // Chromium reserves ~18mm at top for the header template (even when
      // empty) and ~18mm at bottom for the footer. We bump margins so that
      // VISIBLE content padding is ~22mm top, ~25mm right/left, ~25mm bottom.
      margin: { top: "40mm", right: "25mm", bottom: "30mm", left: "25mm" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate,
    });

    // Merge: title page first, then the rest.
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
