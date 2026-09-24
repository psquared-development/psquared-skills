// Human-readable output goes to stderr so that `--json` on stdout stays machine-readable.
// Every message passes through redact(), which replaces registered secrets with a mask.

const secrets = new Set();

export const HR = "━".repeat(45);

export function registerSecret(value) {
  if (typeof value === "string" && value.length >= 8) secrets.add(value);
}

export function redact(text) {
  let out = String(text);
  for (const s of secrets) out = out.split(s).join(`****${s.slice(-4)}`);
  return out;
}

export function hr() {
  process.stderr.write(`${HR}\n`);
}

export function info(message = "") {
  process.stderr.write(`${redact(message)}\n`);
}

export function warn(message) {
  process.stderr.write(`${redact(`Warnung: ${message}`)}\n`);
}

export function err(message) {
  process.stderr.write(`${redact(`Fehler: ${message}`)}\n`);
}

export function verbose(enabled, label, payload) {
  if (!enabled) return;
  info(`[verbose] ${label}`);
  if (payload !== undefined) info(redact(typeof payload === "string" ? payload : JSON.stringify(payload, null, 2)));
}

const deNumber = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });

export function formatNumber(n) {
  return deNumber.format(n);
}
