---
name: plan-campaign
description: "Plan an outreach campaign. Groups OK_TO_SEND demos (no campaign yet) into a named campaign with an offer text and deadline, creates the campaign in CRM, and links the selected opportunities to it. Run after /review-demos and before /setup-email-drafts. Optional parameter: track ('inbox' plans only Demo-Postfach/INBOX opportunities, 'chatbot' only chatbot ones)."
---

## Parameters

`/plan-campaign [track]` — optional. `inbox` → only opportunities with `demoType: INBOX`; `chatbot` → only `demoType: CHATBOT` or `null` (legacy). Omitted → both groups, planned as separate campaigns (see STEP 1).

# Plan Outreach Campaign

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Campaign Planner started.
> Checking environment...
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```

---

## STEP 0 — Check Environment

**Read `.env` using the Read tool** (do NOT `source` it — values may contain semicolons or special characters that break shell parsing). Extract token values by reading the file content directly.

Required:
- **`PSQUARED_CRM_TOKEN`** — for querying and updating CRM opportunities and creating campaigns

If the `.env` file is missing or the token is absent, **stop immediately** and ask the user to provide it.

> **Once verified, announce:** `Environment OK. Finding unassigned demos...`

---

## STEP 1 — Find Unassigned OK_TO_SEND Opportunities

Query CRM for **InboxMate** opportunities at SCREENING stage with `demoStatus = OK_TO_SEND` and no `campaignId` yet. Rules:

- **`outreachType: { eq: INBOXMATE }`** — campaigns here are InboxMate-only. Services opportunities use their own flow (`/find-services-leads` handles the drafts directly). Museum opportunities (`INBOX_MATE_MUSEUM`) are excluded automatically by this filter and have their own future flow.
- **`noOutreach: { eq: false }`** — never touch opportunities flagged do-not-contact (e.g. Austrian companies, unsubscribed).
- **Post-fetch:** also pull `company { outreachFor }` and drop any opportunity whose company contains `PERSONAL_ONLY`. PERSONAL_ONLY companies are Martin's private contacts and must never be put into a campaign, even if someone manually created an opportunity on them.

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d "{\"query\":\"{ opportunities(first: 200, filter: { stage: { eq: SCREENING }, demoStatus: { eq: OK_TO_SEND }, campaignId: { is: NULL }, noOutreach: { eq: false }, outreachType: { eq: INBOXMATE } }) { edges { node { id outreachType demoType company { id name outreachFor } } } totalCount } }\"}"
```

After the response lands, filter out any edge where `node.company.outreachFor` contains `PERSONAL_ONLY`. Announce how many were dropped for that reason.

**INBOX campaigns are offer-free** (Martin, 2026-06-11): for the inbox group, skip offer text and deadline entirely — create the campaign with the name only and do NOT ask the user for offer details. STEP 2 questions 3-4 apply to CHATBOT campaigns only.

**Campaigns are single-type.** Group the remaining opportunities by `demoType` (`null` counts as `CHATBOT`). If both CHATBOT and INBOX demos are waiting, plan SEPARATE campaigns — never mix types in one campaign, because `/setup-email-drafts` routes the email template per campaign batch and the offer copy differs (chatbot deal vs "Inbox-Test starten"). Present both groups to the user and run STEP 2–4 once per group.

> **Announce:**
> ```
> Found [totalCount] demos ready for campaign assignment:
>   1. [Company A]
>   2. [Company B]
>   ...
> ```

If none found, announce "No demos ready — run /review-demos first." and stop.

---

## STEP 2 — Confirm Campaign Details with User

Present the list and ask the user to confirm:

1. **Which opportunities to include** — default is all of them. The user may exclude specific companies by name.

2. **Campaign name** — suggest the format `Week [N] — [Month YYYY]` based on today's date (e.g. "Week 14 — April 2026").

3. **Offer text** (`offerText`) — the value proposition shown on demo pages. Must be in German and time-limited in nature. Examples:
   - "Jetzt starten und bis zu 50% Rabatt im ersten Jahr sichern"
   - "Ihren KI-Assistenten jetzt aktivieren — Sonderkonditionen sichern"
   - Never use generic text like "Kostenlose Erstberatung"

4. **Offer deadline** (`offerExpiresAt`) — suggest 14 days from today as ISO date (e.g. `2026-04-09T23:59:59.000Z`).

**Wait for the user's response before proceeding.**

---

## STEP 3 — Create Campaign in CRM

Once the user has confirmed all details, create the campaign:

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d "{\"query\":\"mutation { createCampaign(data: { name: \\\"[name]\\\", offerText: \\\"[offerText]\\\", offerExpiresAt: \\\"[ISO date]\\\" }) { id name } }\"}"
```

Save the returned `campaignId` — you need it for the next step and the final report.

> **Announce:** `Campaign "[name]" created (ID: [campaignId])`

---

## STEP 4 — Link Opportunities to Campaign

For each selected opportunity, update its `campaignId`. Do this **sequentially** — Twenty CRM does not support batch mutations reliably.

```bash
curl -s -X POST https://crm.psquared.dev/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PSQUARED_CRM_TOKEN" \
  -d "{\"query\":\"mutation { updateOpportunity(id: \\\"[oppId]\\\", data: { campaignId: \\\"[campaignId]\\\" }) { id } }\"}"
```

> **Announce after each:** `Linked: [Company Name]`

---

## STEP 5 — Report

> **Announce:**
> ```
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Campaign planned.
>
> Campaign: [name]
> Deadline: [offerExpiresAt, human-readable]
> Offer:    [offerText]
>
> Linked opportunities ([N]):
>   - [Company A]
>   - [Company B]
>   ...
>
> Next step: /setup-email-drafts
> → Campaign ID: [campaignId]
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ```
