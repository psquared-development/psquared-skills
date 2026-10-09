# Langdock API reference (verified 2026-10-09)

Base: `https://api.langdock.com` (dedicated: `https://<domain>/api/public`, omitting `/api/public` → auth errors).
Auth: `Authorization: Bearer <key>` (MCP endpoint also accepts `x-api-key`). **Browser-origin requests are blocked.**
Docs: https://docs.langdock.com (append `.md` to a page URL for raw markdown).

## Keys
- **Workspace key** (admin, Workspace settings → Products → API): service account, own budget (default €100/month),
  scopes chosen at creation, editable later. Needed for Agent API.
- **Personal key** (account settings): acts as the member; completion access always; Workflow Write only if admin
  allows; no delete scope; can't be a share target.
- Scopes seen: `AGENT_API` (UI "Agent API"), `WORKFLOW_API` (read/list/get), `WORKFLOW_WRITE_API`,
  `WORKFLOW_DELETE_API`, `KNOWLEDGE_FOLDER_API` (attachment upload), `INTEGRATION_API`, `PROMPT_API`,
  `SKILL_API`, `MEETING_READ_API`. Missing scope → `403 {"error":"INSUFFICIENT_SCOPES","details":{"missing":[...]}}`.
- Assistant API (`/assistant/v1/*`) is **deprecated** since 2026-08-20 → 410; use `/agent/v1/*`.

## Agents
| Call | Notes |
|---|---|
| `GET /agent/v1/models` | `data[].id` — use these ids as `model` |
| `POST /agent/v1/create` | `name` (≤80, req), `instruction` (≤50k), `model`, `creativity` 0–1, `description`, `emoji`, `conversationStarters` (≤20), `inputType` PROMPT/STRUCTURED/INTEGRATION/SCHEDULED/WEBHOOK, `inputFields`, `attachments` (uuids), `knowledgeFolderIds`, `actions: [{actionId, requiresConfirmation}]`, `webSearch`, `imageGeneration`, `extendedThinking`. Response `agent.id`. |
| `PATCH /agent/v1/update` | `agentId` + any create fields; omitted fields unchanged |
| `POST /agent/v1/publish` | `{agentId, description?}` — do this after every update |
| `GET /agent/v1/get?agentId=` | published version, else draft |
| `PATCH /agent/v1/disable` | `{agentId, disabled: true}` — the only way to "remove" via API |
| `POST /agent/v1/chat/completions` | `{agentId, stream:false, maxSteps≤20, messages:[{id, role, parts:[{type:"text",text}], metadata:{attachments:[uuid]}}]}`. Response: `messages[].content` (string) + `result[]` with tool calls/results (shows code-execution steps). >100 s non-stream → 524. |
| `POST /attachment/v1/upload` | multipart field `file` → `{attachmentId}`; needs `KNOWLEDGE_FOLDER_API` |

**Quirks**
- **Ownership:** API-created agents are owned by the key's service account ("<workspace> agent creator") →
  invisible in the UI, no API to share. → Create the shell in the UI, share it with the key, then update.
- **`*@default` model ids** (e.g. `claude-sonnet-5-5@default`) **fail on create** with
  `404 {"message":"Agent not found"}`; they work on `update`. → Create with a plain id (`claude-haiku-5-5`), then PATCH the model.
- `create` is also **flaky**: intermittent `404 Agent not found` for valid payloads. A failed attempt may still
  leave a hidden draft. Retry sparingly; no list/delete endpoint → note leftovers for the user to archive.
- Missing `model` → `500 Workspace default model not configured` (if the workspace has no default).
- No capability flag for code execution/file creation (`dataAnalyst` deprecated/ignored). Agents had a bash/Python
  sandbox anyway (`/mnt/data` = chat files; files copied to `/mnt/data` are delivered to the user; Pillow + DejaVu fonts present).
- Actions attached via API have `connectionId: null`; OAuth connections must be selected in the UI.
- `PATCH /agent/v1/update` with `"actions": [...]` **replaces** the agent's tools, including workflows the user
  attached in the UI → omit `actions` unless the deploy owns them. Attached workflows are not visible in `GET /agent/v1/get`;
  check by asking the agent via chat completions to list its tools.
- A workflow must be **published** before it can be attached to an agent; the folder/URL fields a user edits in the UI
  are overwritten by the next deploy → keep such values in the client config.

## Workflows
| Call | Notes |
|---|---|
| `GET /workflows/v1/list` | all workflows visible to the key: `id, name, status, owner{id,name}, hasPublishedVersion` |
| `GET /workflows/v1/get?workflowId=` | full draft `nodes`/`edges`, `versions`, `activeVersion` (with its nodes), `limits` |
| `POST /workflows/v1/create` | `name` (≤60), `description` (≤500), `timezone`, either `initialTriggerKind` (manual/webhook/scheduled/form/integration/meeting_end) **or** `nodes`+`edges`, `shareWith {userIds, groupIds, role: user|editor}` (**create only**), `limits {monthlyCostUsd 1–10000, perRunCostUsd 1–100, maxExecutionsPerHour 1–5000}` (defaults 25 / 2 / 100). Result: INACTIVE draft v0. Response `workflow.id`. |
| `PATCH /workflows/v1/update` | `workflowId` + **exactly one of**: metadata (`name/description/status/timezone/limits`), full `nodes`+`edges`, or `patch` ops. Two calls if you need both. `shareWith` → 400 unrecognized key. |
| `POST /workflows/v1/publish` | `{workflowId, bumpType: major|minor|patch, description?, timezone?}` — activates schedules/webhooks; rejected if a trigger is disconnected |
| `DELETE /workflows/v1/delete?workflowId=` | needs `WORKFLOW_DELETE_API` (else 403) |

**Quirks**
- Node/edge schema is undocumented ("same as the builder") — copy from `GET` of a builder-made workflow;
  see `workflow-schema.md`. Validation errors are precise zod messages — read them.
- Form trigger: **max 20 fields**; field types `TEXT, MULTI_LINE_TEXT, NUMBER, CHECKBOX, SELECT, DATE, FILE, EMAIL`.
- No API to start a run except a **webhook trigger** (publish, then POST to its URL). Form runs are started in the UI
  or by an agent that has the workflow attached.
- user_input node (human-in-the-loop) form mode: no FILE fields; delivered to the Langdock inbox only.
- Pricing: agent nodes cost model usage; action/code/condition/loop nodes are free. Starter plan 2,500 runs/month.

## Integrations
- `GET /integrations/v1/get` lists only **custom** integrations (empty for built-ins). Built-in action/trigger IDs
  (SharePoint, OneDrive, Excel, Outlook, Teams, Google Drive…) are **not listable** → harvest from existing workflow
  nodes (`scripts/harvest-ids.sh`) or ask the user to drop the action into a scratch workflow, then GET it.
- Connections: OAuth = delegated (acts as the connected user), not shareable with API keys; can be preselected on
  agent actions only via UI ("Share OAuth connections" permission). Non-OAuth connections can be shared with keys.
- Langdock MCP server (`https://api.langdock.com/mcp`, Agent API scope): tools `find_agent`, `ask_agent`,
  `ask_custom_agent` only — no create/update.

## Full action catalogue (all built-in integrations, with input fields and YOUR connections)
Not in the public API, but the web app's tRPC endpoint works from a logged-in browser tab (chrome-devtools
`evaluate_script` on app.langdock.com):
```js
const u = '/api/trpc/workflows.getAvailableActionsGrouped?input=' + encodeURIComponent(JSON.stringify({json:null,meta:{values:['undefined'],v:1}}));
const d = (await (await fetch(u)).json()).result.data.json;   // d.allActions[]: id, version, name, integrationName, inputFields[], connections[], preselectedConnection
```
`connections[]` per action lists the user's connection ids → use them as `config.connectionId` in workflow action nodes.
Each Microsoft integration (SharePoint, Excel, OneDrive, Outlook Email, Outlook Calendar) is a **separate OAuth
connection** — a SharePoint connection id on an Excel node fails with "The selected connection for this action is
not available". Connect missing ones at app.langdock.com/integrations → Connect (SSO goes through if the browser is
logged in to M365).

## Microsoft action behaviour (verified in runs 2026-10-09)
- SharePoint **Get folder** (`ef1690ac…`, `folderPath`) only **resolves existing** folders → 403 "Could not resolve the
  folder URL" for missing ones. URL must include the library: `…/sites/<Site>/Freigegebene%20Dokumente/<Folder>`.
  Output: `{name, driveId, folderId}`.
- SharePoint **Create folder** (`8f60f15e…`: `driveId`, `parentFolderId`, `folderPath` nested like `A/2026/09`) creates
  all missing levels; output `{id, name, path, webUrl, driveId, createdFolders[...alreadyExisted]}`.
- SharePoint **Upload file** (`c12cb77e…`): `file` = `{{code.output._files[0]._metadata.name}}`; output `{id, name, size, webUrl}`.
- Excel **Get table rows** (`8a48d69e…`, **actionVersion 2**): `itemId` may be the SharePoint file URL, `tableId` the table
  name; output `{rows: [{<column>: value, _rowIndex}]}`.
- Excel **Add table row** (`5b36a75b…`): `rowValues` is ONE comma-separated string → strip commas from values.
  Works on SharePoint-hosted workbooks. The workbook needs a real Excel *table* (create with openpyxl, see
  langdock-belege `tools/make_journal.py`); a renamed sheet is not enough.
- Agent → form-workflow calls: Langdock shows a **Trigger/Deny** card; FILE fields are only filled from attachments in
  the **latest** user message (retries without re-attaching → no file). The FILE value may arrive JSON-encoded as a string.
- Runs started from an agent chat showed `workflowVersion.version: "0"` (the draft) although a version was
  published — deploy changes to the draft are live for chat calls immediately; still publish for other triggers.
- Missing connection for an integration: app.langdock.com/integrations → card → **Connect** (M365 SSO goes through
  in a logged-in browser), then read the new id from the tRPC catalogue `connections[]`.
- Run inspection: `GET /workflows/v1/runs?workflowId=` → `runs[].executions[]` with per-node `input`, `output`,
  `inputError`, `outputError` (parse with `json.loads(..., strict=False)` – raw control chars).

## Action IDs seen in the psquared workspace (verify per workspace)
| ID | Integration / action | Fields |
|---|---|---|
| `ef1690ac-2fe7-4606-8ad6-c355a7af7751` | SharePoint – Get folder (existing only) → `driveId`, `folderId` | `folderPath` |
| `8f60f15e-02dd-4cb9-b83b-4156bc9c7783` | SharePoint – Create folder (nested) | `driveId, parentFolderId, folderPath` |
| `8a48d69e-20c3-40e1-858d-b0c383ab426a` | Excel – Get table rows (**v2**) | `driveId, itemId, tableId, skip, limit` |
| `c12cb77e-0308-48e7-a8f1-0aa7465a6753` | SharePoint – upload file → `webUrl`, `id` | `driveId, folderId, file, fileName` |
| `8fd7963e-c346-4b15-8e65-5b62b5ab78fa` | SharePoint – get/download file | `itemId, parent` |
| `3f0c0485-2862-48c5-9605-f5e62e38c01e` | OneDrive – upload file | `file, fileName, folderId` |
| `397ef1fb-4eea-4128-816b-aaf2c48256e1` | OneDrive – search files (used as agent tool) | |
| `5b36a75b-c03d-4d6a-8429-a72aaa9cef7a` | Excel – Add table row | `driveId, itemId, tableId, rowValues` |
| `c2546579…` / `71fc19d1…` / `86a08d09…` | Excel – Search files / Get sheet by item id / Get tables | |
| `4d2b8b97-4b89-47a7-bbc9-901a1bd73966` | Outlook – create draft | `toRecipients, subject, body, isHtml, files, cc/bcc` |
| `f857f3b4-1ec9-4ba9-a013-bc4d3f3b4a13` | Outlook – send mail | same minus files |
| `e8d7ebc6-4904-42d6-a664-dd9487b059d5` | Calendar – add event | |
| `6f433e48…`, `00f0e1a0…` | Teams – list chats / send chat message | |
| `66c32696-ca45-411e-a7fc-9eddbf577913` | Google Drive – create folder (nested path) | `folderPath` |
| `0f25bde8-7c7a-4c9e-8cd4-f37c7f3f4ede` | Google Drive – upload file | `file, folderId` |
