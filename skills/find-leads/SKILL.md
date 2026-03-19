---
name: find-leads
description: "Find new B2B leads in Germany for InboxMate outreach. Validates each lead against legal requirements (UWG), checks email is publicly visible, documents justification, and adds to CRM. Germany only — Austrian law (TKG) is stricter. Pass the number of leads to find as a parameter."
---

# Find New Leads for InboxMate

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Lead Finder started.
> Target: [N] new leads
> Checking environment...
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

---

## Autonomy — Run Without Asking

**This skill should run as autonomously as possible.** The user may not be available to answer questions. Do NOT ask for confirmation between leads — just process them one by one:

- Search → validate → skip or add → next. No pauses.
- If a check is ambiguous (e.g., unclear if email is personal), err on the side of **skipping** and add to skip-list. Don't ask.
- Only stop if a critical error occurs (e.g., CRM token invalid, network down).
- Report results at the end, not during.

---

## Legal Context — READ THIS FIRST

B2B cold email in Germany and Austria is a legal grey area. The strict reading of UWG §7 (Germany) and TKG §174 (Austria) says prior consent is required. However, the prevailing practical interpretation (used by thousands of companies daily) allows individual B2B outreach IF certain conditions are met.

**Our position:** We send individually crafted, genuinely valuable emails (with a working demo built for their company). This is not spam. But we MUST document why each lead qualifies for outreach.

**Every lead MUST pass ALL 8 of these checks:**

### The 7 Qualification Criteria

| # | Criterion | What to check | Why it matters |
|---|-----------|---------------|----------------|
| 1 | **German company** | Domain is .de, Impressum shows German address (DE), company is registered in Germany | Austrian law (TKG §174) is stricter — no B2B cold email exception. Germany (UWG) has more practical tolerance for relevant individual B2B outreach. |
| 2 | **B2B only** | Company, not a private person | Consumer protection is stricter |
| 3 | **Objectively relevant** | Company would genuinely benefit from a chatbot (has website traffic, customer-facing business) | UWG requires the offer to be relevant to the recipient's business |
| 4 | **Publicly available email** | Email found on their public website (contact page, imprint, team page) — NOT scraped from LinkedIn, purchased lists, or leaked databases | Data source must be GDPR-compliant (publicly made available by the company itself) |
| 5 | **Specific contact person** | Email goes to a named person with decision authority (founder, CEO, marketing lead, head of sales) — NOT info@, office@, or generic addresses | Shows individual outreach, not bulk |
| 6 | **Genuine value offer** | We built something specifically for them (a demo) — not a generic pitch | Differentiates from spam |
| 7 | **Not already in CRM** | Company doesn't already exist in our CRM | No duplicate outreach |
| 8 | **Website is active** | Website loads, has real content, is maintained (copyright not 2+ years old) | No dead businesses |

**If ANY of the 8 criteria fails → SKIP the lead. Add to skip-list.json. Do not add to CRM.**

---

## Skip List — Persistent Rejected Leads

The file `skip-list.json` in the current working directory tracks companies that were already checked and rejected. **Before researching any company, check this list first.** If the domain is in the list, skip immediately — don't waste time fetching the website again.

**On first run:** If `skip-list.json` doesn't exist, create it with `[]`.

**Format:**
```json
[
  { "domain": "example.de", "reason": "has chatbot", "date": "2026-03-19" },
  { "domain": "other.at", "reason": "no personal email", "date": "2026-03-19" }
]
```

**When a company fails any check:** Append to `skip-list.json` with the domain and a short reason (max 5 words).

**Before checking any website:** Read `skip-list.json`, check if domain is already there. If yes, skip without fetching.

**Short reason examples:**
- `"has chatbot"` — already has a chat widget
- `"no personal email"` — only info@/office@ found
- `"dead website"` — site down or parked
- `"outdated site"` — copyright 2+ years old
- `"too small"` — sole proprietor, no real web presence
- `"not B2B-facing"` — wholesale/internal only
- `"already in CRM"` — duplicate
- `"no email on site"` — no contact info found
- `"generic only"` — only kontakt@/info@ available

---

## STEP 0 — Check Environment

**Read `.env` in the current working directory** using the Read tool. Extract these tokens:

| Variable | Purpose | Used for |
|----------|---------|----------|
| `PSQUARED_CRM_TOKEN` | Twenty CRM GraphQL API | Checking duplicates, creating companies/persons/notes |

The `.env` file is at the root of the working directory (claude-overlord-folder). If it doesn't exist, stop and tell the user.

**Read `skip-list.json`** (or create it as `[]` if it doesn't exist).

> **Once verified:** `Environment OK. Skip list: [N] entries. Starting lead search...`

---

## STEP 1 — Search for Leads

Use WebSearch to find German and Austrian businesses that would benefit from an AI chatbot on their website.

**Search strategies (rotate between these — Germany only, .de domains):**
- `"[industry] Unternehmen" site:.de`
- `"[industry] GmbH" Kontakt Email site:.de`
- `"Geschäftsführer" "[industry]" site:.de`
- `"Immobilienmakler" OR "Versicherungsmakler" OR "Steuerberater" OR "Rechtsanwalt" site:.de`
- Industry-specific: real estate agencies, insurance brokers, IT consultancies, marketing agencies, SaaS companies, e-commerce shops, dental practices, law firms, accounting firms

**Good target industries for InboxMate:**
- Real estate (Immobilien) — high inquiry volume, FAQ-heavy
- Insurance/finance — customer questions, lead qualification
- IT services / MSPs — support requests, product questions
- Marketing/digital agencies — client communication, onboarding
- SaaS/software companies — customer support, feature questions
- Professional services (law, tax, consulting) — initial consultations
- E-commerce — product questions, order support
- Healthcare (dental, physio) — appointment scheduling, FAQ

**Bad targets (skip):**
- Very small sole proprietors with no website
- Government / public institutions
- Non-profits (unless large)
- Companies that clearly don't need a chatbot (e.g., heavy industry, agriculture)

---

## STEP 2 — Validate Each Lead

For each potential lead found:

### 2a — Check skip list first

Extract the domain from the company URL. Check if it's in `skip-list.json`. If found, skip immediately and move to the next lead — no need to fetch the website.

### 2b — Check the website (WebFetch)

Visit their website. Verify:
- Website loads and is active
- **Impressum shows a German address** (city in Germany, not Austria/Switzerland) — this confirms criterion #1
- Content is current (check copyright year, last blog post, news)
- Company does customer-facing business (not just B2B wholesale with no public presence)
- They DON'T already have a chatbot on their site (check for chat widgets like Intercom, Drift, Zendesk, HubSpot, Tidio, Crisp, LiveChat in the HTML source)

**Skip if:** website is down, parked, outdated, has a chatbot, or is NOT a German company. **Add to skip-list.json with reason.**

### 2c — Find a contact person with email

Look for contact information on:
1. `/kontakt` or `/contact` page
2. `/impressum` or `/imprint` page
3. `/team` or `/ueber-uns` page
4. Footer of the homepage

**What we need:**
- The best contact person who will understand our offer — someone technical or product-oriented
- Ideal roles (in order of preference): CTO, Head of IT, Head of Product, Head of Digital, Technical Lead, Marketing-Leiter with tech focus
- Fallback roles: Geschäftsführer, CEO, Head of Sales — but only if no technical contact is available
- Their email address — must be visible on the company's PUBLIC website
- Their role/title

**Email rules:**
- MUST be a personal email (vorname@firma.de or v.nachname@firma.de)
- MUST be found on the company's own website (screenshot/note the exact page)
- Must NOT be from a purchased list, LinkedIn scrape, or any third-party source
- AVOID generic addresses (info@, office@, hello@, kontakt@) — these rarely reach the right person
- Generic emails are acceptable ONLY as last resort if no personal email is available AND you also found a specific contact name on the site
- **If no usable email found → add to skip-list.json with reason and move on**

### 2d — Determine relevance

Write a 1-2 sentence justification for why InboxMate would be valuable for this specific company. Reference something concrete:
- "High-traffic real estate listing site with FAQ section that could be automated"
- "IT consultancy with complex service portfolio — chatbot could pre-qualify leads"
- "Marketing agency with multiple service pages — visitors need guidance to the right offering"

### 2e — Check CRM for duplicates

**Check by domain first** (most reliable), then fall back to company name:

**Step 1 — Search by domain:**
```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d "{\"query\":\"{ companies(filter: { domainName: { primaryLinkUrl: { like: \\\"%[domain]%\\\" } } }, first: 1) { totalCount } }\"}"
```

**Step 2 — If not found by domain, also search by name** (catches companies added without a domain):
```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d "{\"query\":\"{ companies(filter: { name: { like: \\\"%[Company Name]%\\\" } }, first: 1) { totalCount } }\"}"
```

**If either query returns totalCount > 0 → SKIP. Add to skip-list.json with reason `"already in CRM"`.**

---

## STEP 3 — Add Qualified Lead to CRM

For each lead that passes ALL 7 criteria:

### 3a — Create Company

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d "{\"query\":\"mutation { createCompany(data: { name: \\\"[Company Name]\\\", domainName: { primaryLinkUrl: \\\"https://[domain]\\\" } }) { id name } }\"}"
```

### 3b — Create Person (contact)

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d "{\"query\":\"mutation { createPerson(data: { name: { firstName: \\\"[First]\\\", lastName: \\\"[Last]\\\" }, emails: { primaryEmail: \\\"[email]\\\" }, companyId: \\\"[companyId]\\\", jobTitle: \\\"[Role/Title]\\\" }) { id } }\"}"
```

### 3c — Create Note with justification

**Two-step process:** Create the note first (with just a title), then update it with the full body. This avoids issues with long content in a single mutation.

**Step 1 — Create note:**
```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d "{\"query\":\"mutation { createNote(data: { title: \\\"Lead Qualification: [Company Name] — [date]\\\" }) { id } }\"}"
```

**Step 2 — Update note with full content:**
```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d "{\"query\":\"mutation { updateNote(id: \\\"[noteId]\\\", data: { body: \\\"Email source: [URL where email was found]\\\\nContact: [Name], [Role]\\\\nRelevance: [1-2 sentence justification]\\\\n\\\\nDemo approach: [suggest best angle for demo — e.g. 'FAQ automation for property listings' or 'lead qualification chatbot for service pages']\\\\n\\\\nChecks: German company ✓, B2B ✓, Relevant ✓, Public email ✓, Named contact ✓, Value offer ✓, Not in CRM ✓, Active website ✓\\\" }) { id } }\"}"
```

**Step 3 — Link note to company:**
```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d "{\"query\":\"mutation { createNoteTarget(data: { noteId: \\\"[noteId]\\\", companyId: \\\"[companyId]\\\" }) { id } }\"}"
```

**The "Demo approach" field** should suggest the best angle for the InboxMate demo based on what you found on their website. Examples:
- Real estate: "FAQ bot for property listings — automate viewing requests and price inquiries"
- IT services: "Lead qualification chatbot — help visitors find the right service package"
- Agency: "Portfolio navigator — guide prospects to relevant case studies and services"
- E-commerce: "Product advisor — help customers choose the right product, reduce support load"

> **Announce after each:** `Added: [Company Name] — [contact email] — [1-line reason]`

---

## STEP 4 — Report

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Lead Finder complete.
>
> Added: [N]
>   - [Company A] — [email] — [reason]
>   - [Company B] — [email] — [reason]
>
> Skipped: [M]
>   - [Company C] — already in CRM
>   - [Company D] — no personal email found
>   - [Company E] — already has chatbot
>
> Next step: Run /create-demo-for-crm-lead to build demos
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

---

## Important Reminders

- **Quality over quantity.** 5 well-qualified leads are worth more than 50 questionable ones.
- **Document everything.** The note on each company is your legal paper trail.
- **Only public emails.** If you can't find an email on their website, skip the lead.
- **Rotate industries.** Don't search for 10 real estate companies in a row — diversify.
- **Check for chatbots.** If they already have Intercom/Drift/Zendesk/HubSpot chat, skip — they're already served.
- **Germany only.** Only .de domains. Austrian law (TKG) is stricter — no B2B exception. Verify Impressum shows German address.
