---
name: refine-email-drafts
description: "Process change requests on InboxMate email drafts. Reads drafts with pending change requests from the notification service, applies the requested changes to the email HTML, and updates the drafts. Run after adding change requests via the admin UI."
---

# Refine Email Drafts

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Email Draft Refinement started.
> Checking environment...
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

---

## Context — What This Skill Does

The notification service at `notifications.psquared.dev` stores email drafts that are reviewed before sending. Admins can attach "change requests" to drafts (e.g., "make this per du", "shorten the intro", "add a line about their pricing page"). This skill picks up those change requests, reads each draft's current HTML, applies the changes, and saves the updated version.

**The drafts are InboxMate outreach emails** — personalized cold emails sent to Austrian/German businesses to show them an AI chatbot demo we built for their company. Each email has:
- InboxMate branding (green header, p² footer)
- Personalized body text (greeting, intro, hook, CTA, highlight box, closing)
- A "Demo ansehen" button linking to their personalized demo page
- All text is controlled via Handlebars variables rendered into HTML

**Important:** The email HTML is the final rendered output. When you edit it, you're editing raw HTML — preserve all styling, tags, and structure. Only change the text content as requested.

---

## STEP 0 — Check Environment

**Read `.env` using the Read tool** (do NOT `source` it). Extract:
- **Notification Service Admin Token** — the main BEARER_TOKEN for the notification service (variable name should contain "BEARER" but NOT "DRAFT"). This is needed to read and update drafts via the admin API.

If the main bearer token is not available, you can use the Supabase MCP to query drafts directly:
```
Use mcp__plugin_supabase_supabase__execute_sql with:
  project_id: "fyqbhpwqlamjhoohkldu"
  query: SELECT id, subject, html_body, change_request, recipient_email, crm_company_name FROM email_drafts WHERE status = 'DRAFT' AND change_request IS NOT NULL ORDER BY created_at DESC
```

> **Once verified:** `Environment OK. Finding drafts with change requests...`

---

## STEP 1 — Find Drafts with Change Requests

Query for all DRAFT-status emails that have a non-null `change_request`:

```
Use mcp__plugin_supabase_supabase__execute_sql with:
  project_id: "fyqbhpwqlamjhoohkldu"
  query: SELECT id, subject, html_body, text_body, change_request, recipient_email, crm_company_name, locale FROM email_drafts WHERE status = 'DRAFT' AND change_request IS NOT NULL AND change_request != '' ORDER BY created_at DESC
```

If none found, announce "No drafts with change requests" and stop.

> **Announce:**
> ```
> Found [N] drafts with change requests:
> 1. [Company] — "[change request]"
> 2. [Company] — "[change request]"
> ```

---

## STEP 2 — Apply Changes to Each Draft

For each draft with a change request:

### 2a — Read the current HTML

The `html_body` contains the full rendered email. Parse it to understand the current text content. The structure is:
- `{{greeting}}` → first `<p>` after the header divider
- `{{bodyParagraph1}}` → second `<p>`
- `{{bodyParagraph2}}` → third `<p>` (optional)
- `{{bodyParagraph3}}` → fourth `<p>` (optional)
- Button text → inside the `<a>` with `background-color:#10b981`
- Highlight title → bold `<p>` inside the green `#ecfdf5` div (optional)
- Highlight text → second `<p>` in the green div
- Closing text → `<p>` after the green div
- Signoff → `<p>` with `color:#10b981` and `font-style:italic`

### 2b — Apply the change request

Read the `change_request` text and apply it. Common requests:
- **"per du" / "use du-Form"** → Change all Sie/Ihr/Ihnen/Ihren to du/dein/dir/deinen. Change formal greetings ("Guten Tag Herr...") to informal ("Hallo [Vorname],"). Make sure EVERY sentence is consistent.
- **"per Sie" / "use Sie-Form"** → Opposite of above.
- **"shorten"** → Reduce paragraph count or length while keeping the core message.
- **"more personal"** → Add more company-specific references, make it less template-y.
- **"change subject to X"** → Update the subject field.
- **Custom instructions** → Follow them literally.

### 2c — Verify consistency

After making changes:
- If the change was about du/Sie: re-read every sentence and verify tone is consistent
- If the change was about content: verify the demo URL, company name, and button still work
- Never break the HTML structure or remove styling

### 2d — Save the updated draft

Update the draft via Supabase:

```
Use mcp__plugin_supabase_supabase__execute_sql with:
  project_id: "fyqbhpwqlamjhoohkldu"
  query: UPDATE email_drafts SET html_body = '[updated HTML]', change_request = NULL, updated_at = now() WHERE id = '[draftId]'
```

**Important:** Set `change_request = NULL` after applying — this marks it as processed.

If the change request also affects the subject:
```
  query: UPDATE email_drafts SET html_body = '[updated HTML]', subject = '[new subject]', change_request = NULL, updated_at = now() WHERE id = '[draftId]'
```

**SQL escaping:** Single quotes in the HTML must be doubled (`'` → `''`).

> **Announce after each:** `Refined: [Company] — applied "[change request]"`

---

## STEP 3 — Report

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Email Draft Refinement complete.
>
> Refined: [N]
>   - [Company A] — "per du" applied
>   - [Company B] — "shorten intro" applied
>
> Next step: Review refined drafts at
> → notifications.psquared.dev/drafts
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```
