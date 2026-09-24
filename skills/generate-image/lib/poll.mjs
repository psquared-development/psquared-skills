// Poll a generation until COMPLETE, FAILED or timeout.
const sleepDefault = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function pollGeneration(client, id, { timeoutMs = 180_000, initialDelayMs = 6_000, intervalMs = 3_000, growth = 1.5, maxIntervalMs = 10_000, onTick = () => {}, sleep = sleepDefault } = {}) {
  const started = Date.now();
  let interval = intervalMs;
  let polls = 0;
  let warnedUnknown = false;
  await sleep(initialDelayMs);
  for (;;) {
    const gen = await client.getGeneration(id);
    polls += 1;
    onTick(gen, polls);
    const waitMs = Date.now() - started;
    if (gen.status === "COMPLETE") return { ...gen, polls, waitMs };
    if (gen.status === "FAILED") return { ...gen, polls, waitMs };
    if (gen.status === "UNKNOWN" && !warnedUnknown) {
      warnedUnknown = true;
      onTick({ ...gen, note: "Status unbekannt, behandle wie PENDING" }, polls);
    }
    if (waitMs >= timeoutMs) return { ...gen, status: "TIMEOUT", polls, waitMs };
    await sleep(interval);
    interval = Math.min(maxIntervalMs, Math.round(interval * growth));
  }
}
