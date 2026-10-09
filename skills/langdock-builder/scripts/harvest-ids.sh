#!/usr/bin/env bash
# List every integration action/trigger used in the workspace's workflows (incl. agent-node tools),
# with connection id and field names. Built-in action ids are not listable via the API otherwise.
#   harvest-ids.sh            (psquared key)
#   LANGDOCK_KEYCHAIN=langdock-<client> harvest-ids.sh
set -euo pipefail
svc=${LANGDOCK_KEYCHAIN:-langdock-api-key}
base=${LANGDOCK_BASE:-https://api.langdock.com}
key=$(security find-generic-password -s "$svc" -w)
get() { curl -sS -H "Authorization: Bearer $key" "$base$1"; }
for id in $(get /workflows/v1/list | jq -r '.workflows[].id'); do
  get "/workflows/v1/get?workflowId=$id" | jq -r '
    .workflow as $w
    | $w.nodes[]?
    | if .type == "action" then
        "action\t\(.data.actionId)\tconn=\(.data.config.connectionId // "-")\t\(.data.name)\tfields=\((.data.config.fields // {}) | keys | join(","))\t[\($w.name)]"
      elif .type == "trigger" and .data.kind == "integration" then
        "trigger\t\(.data.triggerId)\tinteg=\(.data.integrationId)\tconn=\(.data.connectionId // "-")\t\(.data.slug)\t[\($w.name)]"
      elif .type == "agent" and ((.data.tools // []) | length) > 0 then
        (.data.tools[] | "agent-tool\t\(.actionId)\tconn=\(.connectionId // "-")\t[\($w.name)]")
      else empty end'
done | sort -u
