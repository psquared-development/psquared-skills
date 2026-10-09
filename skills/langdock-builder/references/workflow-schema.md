# Workflow node/edge JSON (from real builder-made workflows)

Every node: `{ "id": <uuid>, "type": <type>, "position": {"x","y"}, "data": {...} }`.
Common `data`: `slug` (variable name, camelCase, unique), `name` (label), `disabled: false`,
`errorHandling: {"strategy": "stop" | "continue"}`, optional `comment`.
Variables: `{{slug.output.field}}`; agent structured output: `{{slug.output.structured.field}}`;
code node files: `{{slug.output._files[0]._metadata.name}}`. Template expressions are JS: `{{a === "x"}}`.

## Edges
```json
{"id": "<uuid>", "source": "<node id>", "target": "<node id>", "animated": false,
 "sourceHandle": "output-success", "targetHandle": "input-default", "conditionId": null}
```
Condition branches: `"sourceHandle": "output-condition", "conditionId": "<condition id>"`.
A node may have several incoming edges (branches merging).

## trigger — form
```json
{"type": "trigger", "data": {"slug": "beleg", "kind": "form", "name": "…", "description": "…",
  "fields": [{"id": "<uuid>", "slug": "datei", "label": "Beleg", "type": "FILE", "required": true, "allowMultiple": false},
             {"id": "<uuid>", "slug": "richtung", "label": "Richtung", "type": "SELECT", "required": true, "options": ["Ausgabe","Einnahme"]}],
  "accessControl": "WORKSPACE", "submitButtonLabel": "…", "confirmationMessage": "…"}}
```
Max 20 fields. Types: TEXT, MULTI_LINE_TEXT, NUMBER, CHECKBOX, SELECT, DATE, FILE, EMAIL.
A FILE field's value is a list of file objects `{path, _metadata:{name,…}}` (also with allowMultiple=false — handle both).
When an agent calls the workflow, the form fields are the tool schema; FILE fields are filled from chat attachments.

## trigger — integration (e.g. Outlook new email / calendar)
```json
{"type": "trigger", "data": {"slug": "newEvent", "kind": "integration",
  "integrationId": "<uuid>", "triggerId": "<uuid>", "connectionId": "<uuid>", "params": []}}
```
Other kinds: `manual`, `webhook` (files as base64 JSON, ≤25 MB, `{{trigger.output.body…}}`), `scheduled`, `meeting_end`.

## agent
```json
{"type": "agent", "data": {"slug": "belegAnalyse", "mode": "create", "name": "…",
  "prompt": {"mode": "manual", "value": "Lies {{belegLoop.output.currentItem}} aus …"},
  "attachmentIds": [], "output": "structured", "connectionOverrides": {},
  "outputSchema": [{"id": "<uuid>", "name": "success", "description": "…", "type": "boolean", "required": true, "options": []},
                   {"id": "<uuid>", "name": "richtung", "type": "select", "options": ["Eingang","Ausgang","Unklar"], "required": true, "description": "…"}],
  "modelId": "<workspace model uuid or null>", "extendedThinkingEnabled": false,
  "tools": [{"id": "<uuid>", "type": "action", "actionId": "<uuid>", "requiresConfirmation": false, "connectionId": "<uuid or null>"}],
  "maxSteps": 5}}
```
Output schema types: string, number, boolean, select (with options), array. Vision on images works
(file reference in the prompt). `modelId` in workflows is a **workspace model UUID** (not the `/agent/v1/models`
string id); `null` = default — the UI fills it when the user opens the node.

## action
```json
{"type": "action", "data": {"slug": "upload", "name": "…", "actionId": "<uuid>", "actionVersion": 1,
  "config": {"connectionId": "<uuid>", "requiresConfirmation": false, "modelId": null,
    "fields": {"fileName": {"mode": "manual", "value": "{{vorbereiten.output.dateiname}}"},
               "folderId": {"mode": "none", "value": null},
               "title":    {"mode": "auto", "value": null}}}}}
```
Field modes: `manual` (value/template), `auto` (AI fills it — avoid for deterministic steps), `none` (unset).

## code
```json
{"type": "code", "data": {"slug": "vorbereiten", "name": "…", "language": "python", "code": "…"}}
```
- Python: upstream nodes are dicts by slug: `beleg["output"]["datei"]`. `return {...}` at top level.
  Files written to the working dir are exposed as `output._files`. Read input files via `file["path"]`.
  Available: PIL (Pillow), pypdf, openpyxl, pandas, numpy; no internet; LibreOffice not installed.
  Fonts: DejaVu may or may not resolve — use a fallback (see langdock-belege `templates/workflow.py`).
- JavaScript: upstream nodes as objects (`invoiceReview.output.x`), `return {...}`; files via
  `return {files: [{fileName, mimeType, base64|text}]}`.
- A node not executed on this path → `NameError` in Python; guard with try/except when branches merge.
- Limits: 5 MiB combined input, 25 MB output.

## condition
```json
{"type": "condition", "data": {"slug": "check", "name": "…", "mode": "manual", "outputMode": "single",
  "modelId": null, "forceSelectBranch": true,
  "conditions": [{"id": "<uuid>", "name": "Konsumation", "value": "{{a.output.structured.kategorie === \"Konsumation\"}}", "prompt": null},
                 {"id": "<uuid>", "name": "Ware", "value": "{{a.output.structured.kategorie !== \"Konsumation\"}}", "prompt": null}]}}
```
`mode: "prompt"` uses an AI judge (`prompt` per condition, `modelId` set) — prefer `manual` expressions.

## user_input (human in the loop)
```json
{"type": "user_input", "data": {"slug": "pruefung", "name": "…", "description": "Text with {{vars}}",
  "responseType": "form",
  "fields": [{"id": "<uuid>", "slug": "invoice_type", "label": "…", "type": "SELECT", "required": true, "options": ["…"]}]}}
```
Output: `{{pruefung.output.invoice_type}}`. No FILE fields. Shows up in the Langdock inbox (Workflows → Monitor → Review).

## loop / loop_end
```json
{"type": "loop", "data": {"slug": "belegLoop", "name": "…", "loopArrayValue": "{{trigger.output.dateien}}",
  "maxIterations": 200, "concurrency": false, "collectOutputs": true}}
{"type": "loop_end", "data": {"slug": "belegLoopEnd", "name": "…", "loopEndSlug": "belegLoop"}}
```
Current item: `{{belegLoop.output.currentItem}}`. Edge loop → first inner node uses `output-success`.

## workflow_output
```json
{"type": "workflow_output", "data": {"slug": "ergebnis", "name": "…", "modelId": null,
  "value": {"mode": "manual", "value": "Link: {{upload.output.webUrl}}"}}}
```

## Stable IDs
Generate node/edge/field ids with `uuid5(namespace, "<logical name>")` so that re-deploying via
`PATCH /workflows/v1/update` (full nodes+edges replacement) keeps ids stable.
