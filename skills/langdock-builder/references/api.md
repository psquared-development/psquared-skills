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

## Action IDs seen in the psquared workspace (verify per workspace)
| ID | Integration / action | Fields |
|---|---|---|
| `ef1690ac-2fe7-4606-8ad6-c355a7af7751` | SharePoint – folder by path/URL → `driveId`, `folderId` (whether it creates missing folders: **unverified**) | `folderPath` |
| `c12cb77e-0308-48e7-a8f1-0aa7465a6753` | SharePoint – upload file → `webUrl`, `id` | `driveId, folderId, file, fileName` |
| `8fd7963e-c346-4b15-8e65-5b62b5ab78fa` | SharePoint – get/download file | `itemId, parent` |
| `3f0c0485-2862-48c5-9605-f5e62e38c01e` | OneDrive – upload file | `file, fileName, folderId` |
| `397ef1fb-4eea-4128-816b-aaf2c48256e1` | OneDrive – search files (used as agent tool) | |
| `5b36a75b…`, `c2546579…`, `71fc19d1…`, `86a08d09…` | Excel tools used by an agent node (get item by name / get sheet / get tables / add table row — exact mapping unverified) | |
| `4d2b8b97-4b89-47a7-bbc9-901a1bd73966` | Outlook – create draft | `toRecipients, subject, body, isHtml, files, cc/bcc` |
| `f857f3b4-1ec9-4ba9-a013-bc4d3f3b4a13` | Outlook – send mail | same minus files |
| `e8d7ebc6-4904-42d6-a664-dd9487b059d5` | Calendar – add event | |
| `6f433e48…`, `00f0e1a0…` | Teams – list chats / send chat message | |
| `66c32696-ca45-411e-a7fc-9eddbf577913` | Google Drive – create folder (nested path) | `folderPath` |
| `0f25bde8-7c7a-4c9e-8cd4-f37c7f3f4ede` | Google Drive – upload file | `file, folderId` |
