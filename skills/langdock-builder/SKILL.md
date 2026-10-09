---
name: langdock-builder
description: "Plan, build and deploy Langdock agents and workflows via the Langdock API — for psquared's own workspace or a client's. Covers API key setup (keychain), agent create/update/publish, workflow create/update/publish with the undocumented node/edge JSON, harvesting integration action IDs, OAuth connection limits, mobile-app constraints, multi-client deployment from templates, and every API quirk we hit. Use when the user says 'Langdock agent/workflow bauen', 'add this to my Langdock', 'create an agent in Langdock', 'deploy to the client's Langdock', or pastes an app.langdock.com link. Parameters: /langdock-builder [use case] [--client <name>]"
---

# Langdock Builder

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> langdock-builder started. Checking API key...
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

Builds Langdock **agents** (chat, also on mobile) and **workflows** (deterministic multi-step automations)
through the Langdock REST API. Langdock's own MCP server can only *chat* with agents (`find_agent`,
`ask_agent`, `ask_custom_agent`) — it cannot create anything, so we use the REST API.

Reference build: `~/dev/langdock-belege` (receipt agent + "Beleg verbuchen" workflow, templates + `deploy.py`).
Copy its structure for new client deliverables.

## Files in this skill

| File | Content |
|---|---|
| `references/api.md` | Endpoints, scopes, request bodies, **all known quirks** |
| `references/workflow-schema.md` | Node/edge JSON for every node type (copied from real workflows) |
| `references/design-rules.md` | Agent vs. workflow, mobile, OAuth, files/PDF, multi-client, cost |
| `scripts/ld.sh` | `ld GET /path` / `ld POST /path @body.json` — curl wrapper, key from keychain |
| `scripts/harvest-ids.sh` | Lists every integration action/trigger ID + connection + field names used in the workspace's workflows |

## Step 0 — API key (once per workspace)

1. Workspace admin: **Workspace settings → Products → API → Create API key**. Scopes:
   **Agent API**, **Workflow API** (read), **Workflow Write API**; add **Knowledge Folder API** if you
   want to upload test attachments, **Workflow Delete API** if you want to clean up.
2. User stores it in a **separate terminal** (never paste keys into chat):
   ```bash
   security add-generic-password -a "$USER" -s langdock-api-key -U -w          # psquared
   security add-generic-password -a "$USER" -s langdock-<client> -U -w         # per client
   ```
3. Verify: `scripts/ld.sh GET /agent/v1/models` (lists models = Agent API ok) and
   `scripts/ld.sh GET /workflows/v1/list` (403 `INSUFFICIENT_SCOPES` → scope missing; scope edits can take a moment).

Dedicated deployments: base URL `https://<domain>/api/public` instead of `https://api.langdock.com`.

## Step 1 — Plan (always before building)

Ask only what changes the build: input → output, who uses it, trigger (chat / mobile / form / schedule /
webhook / email / integration event), systems read/written, client or psquared workspace. Then decide with
`references/design-rules.md`. Key rules:

- **Mobile app = agents only.** Workflows can't be started/mentioned in the mobile app.
- **Deterministic steps belong in the workflow** (folders, uploads, numbering, journal rows): action + code
  nodes, no AI. The **agent** reads, asks the user, and hands clean fields to the workflow (form trigger
  fields become the tool's input schema).
- **Before building, harvest existing work:** `scripts/harvest-ids.sh` — colleagues' workflows often
  already contain the action IDs (SharePoint, OneDrive, Excel, Outlook, Teams) and proven code patterns.
  Read similar workflows with `GET /workflows/v1/get?workflowId=…` and reuse their structure.

## Step 2 — Ownership: create shells in the UI

Anything created via API with a **workspace key is owned by the key's service account and invisible** to users.
- **Agent:** user creates an empty agent in the UI (Agents → New → Go to editor → name → save), clicks
  **Share → adds the API key** (admin only), sends the URL `app.langdock.com/agents/<id>/edit`.
  We then `PATCH /agent/v1/update` + `POST /agent/v1/publish`. No sharing field exists in the Agent API.
- **Workflow:** `POST /workflows/v1/create` with `"shareWith": {"userIds": [...], "role": "editor"}` —
  **only on create** (update rejects it). Get user IDs from `owner.id` in `GET /workflows/v1/list`.

## Step 3 — Build

- Keep the definition as **code** (templates + per-client JSON + `deploy.py`), never hand-edit in the UI
  what deploy owns — the next `update` replaces the whole graph.
- Agent: instructions in German/Du-Form for end users, `creativity` 0.1 for extraction tasks, conversation
  starters, actions only if the agent itself must call integrations.
- Workflow: build nodes per `references/workflow-schema.md`; stable node IDs (uuid5) so re-deploys are idempotent.
- Test code-node Python **locally** before deploying (wrap the code in a function, feed a fake trigger dict).
- Test agents via `POST /agent/v1/chat/completions` with an uploaded attachment (`/attachment/v1/upload`).

## Step 4 — What only the user can do in the UI (tell them exactly)

1. Create/select **OAuth connections** (Microsoft, Google) and pick them on agent actions / workflow nodes
   the first time (API can't preselect OAuth on agents). Once a connection ID exists, workflow action nodes
   accept it via API (`config.connectionId`).
2. **Attach a workflow to an agent as a tool** (agent editor → actions/workflows). No API for this.
3. Swap a test form trigger for an **integration trigger** (Outlook "new email" etc.) — needs a connection.
4. **Share** agents/workflows with users; archive leftovers (no delete endpoint for agents).
5. Integration triggers/actions must be **enabled for the workspace** (Workspace settings → Integrations).

## Step 5 — Report

State what was created (IDs, links), what was tested and how, what is untested, and the numbered UI
steps the user must do. Record IDs in the client JSON and commit the repo.

## Multi-client reuse

Langdock has no cross-workspace copy and templates can't be created via API. Product = repo:
`templates/` (agent instruction with `{{PLACEHOLDERS}}`, workflow builder), `clients/<client>.json`
(vars, keychain service, connection IDs, deployed IDs, share user IDs), `deploy.py <client> [agent|workflow|all]`
(create on first run, update + publish afterwards). Per client ~15 min manual: shells + key sharing, OAuth
connection, attach workflow to agent, share with users. Action IDs of built-in integrations seen so far
were identical within a workspace; verify per new workspace via `harvest-ids.sh` or a scaffold node.
