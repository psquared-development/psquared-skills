# Design rules for Langdock builds

## Agent or workflow?
| Need | Use |
|---|---|
| User on the phone (Langdock mobile app), photo/voice input, follow-up questions | **Agent** (mobile supports agents, photo capture, actions; **no workflows** — can't mention/start them) |
| Fixed steps that must always happen the same way (folders, uploads, numbering, Excel rows, mails) | **Workflow** with action + code nodes, no AI |
| Event-driven (new email, file, schedule, webhook) | **Workflow** with integration/scheduled/webhook trigger |
| Both | Agent collects + validates → calls the workflow as a tool (form-trigger fields = tool inputs). The workflow is the generic core; other triggers (mail intake workflow) feed the same core logic. |

Known risk: an agent calling a workflow from the **mobile app** may stay pending (docs: no Trigger/Deny buttons on
mobile). Test on a phone early; fallback = the agent performs the actions itself.

## Workflow guidelines
- Put the **AI only where reading/judging is needed** (extraction, classification); everything after is code + actions.
- Validate in the code node and `raise ValueError("<German message>")` — the agent relays it to the user.
  Typical checks: net + VAT = gross, required fields for special cases, ISO dates.
- Derive paths/names deterministically in code (`Ausgaben/YYYY/MM`, `YYYY-MM-DD_<nr>_<partner>_<amount>.pdf`),
  ASCII-only file names (NFKD-normalize umlauts/accents).
- Configuration (company name, UID, base URLs, categories) as template variables rendered by `deploy.py`,
  never typed into nodes by hand (overwritten on next deploy).
- Base folder URLs are config; subfolders are created by the workflow.
- Set limits on create (`perRunCostUsd`, `monthlyCostUsd`).

## Agent guidelines
- Instructions: role, hard rules ("nichts erfinden", confirm before writing, never call twice), numbered flow,
  exact output format for mobile (short, emoji header line), the field contract for the workflow call.
- `creativity` 0.1 for extraction. Conversation starters for mobile ("📸 Beleg erfassen").
- The agent can't know the user's name over API tests — ask for names, never print "ich" into documents.
- Test via chat completions with an uploaded attachment; check `result[]` for tool calls.

## Files & PDFs
- Agent sandbox: bash/Python, Pillow + DejaVu fonts; chat files in `/mnt/data`; copy outputs to `/mnt/data` to deliver.
- Workflow code node: PIL can render text pages and image→PDF (`save_all`, `append_images`); pypdf merges PDFs.
  No LibreOffice (DOCX→PDF impossible in code nodes).

## Connections & permissions
- OAuth (Microsoft/Google) = delegated; for client deliverables use a **dedicated service user** (e.g.
  `belege@client`) whose connection is selected on all nodes, so nothing depends on an employee account.
- Isolated storage for clients: dedicated SharePoint **Team site without M365 group**, private, members = service
  user + accountant.

## Multi-client delivery
Repo per product (see `~/dev/langdock-belege`): templates + `clients/<client>.json` + `deploy.py`.
Per client: API key in keychain `langdock-<client>`, UI shells shared with the key, connection IDs recorded,
`deploy.py <client>`; improvements roll out by re-running deploy for every client.

## Domain notes (Austria, receipts)
- EAR (Einnahmen-Ausgaben-Rechnung): Ist-Prinzip (book on payment), every entry references a Beleg, chronological,
  net method with VAT per rate (20/13/10/0) and own Vorsteuer columns.
- Bewirtung: deductible 50 % only with proven Werbezweck; per event document date, place, host, attendees (name+company),
  concrete occasion, amount, tip, signature. We only *flag* — tax advisor decides VAT treatment.
