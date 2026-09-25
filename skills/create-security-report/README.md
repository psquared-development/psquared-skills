# create-security-report

Builds a psquared-branded Security Audit PDF from a `security-audit` run.

```bash
bash setup.sh
python3 scripts/prepare.py --run <run-dir> --report <run-dir>/report.json --out /tmp/security-report-config.json
node build.mjs /tmp/security-report-config.json "<run-dir>/psquared-Security-Audit-<Customer>.pdf"
```

- `<run-dir>/findings.json` comes from the security-audit skill (confirmed and needs_validation records).
- `report.json` holds customer data, expected severities for unverified records, fix texts, fix order and limits. Start from `examples/report-example.json`.

The render engine and branding are the same as `create-avv` (two Chromium passes, pdf-lib merge, Inter, psquared purple).
See `SKILL.md` for the full workflow and the rules that `prepare.py` applies.
