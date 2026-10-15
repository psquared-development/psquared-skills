---
name: jira-ticket
description: "Create or update a ticket on the psquared Jira board (PP) from the current session. The ticket itself stays very short (goal, blocker, open points); everything the agent session found or did goes into a dated comment. Use when the user says 'write a ticket', 'update the ticket', 'put this on the board', 'log this in Jira', 'mach ein Ticket', at the end of a work session that belongs to a ticket, or when a task becomes blocked or done. Finds an existing ticket first, so it does not make duplicates."
---

# Jira ticket (PP board)

A ticket is for a person who scans the board. They must understand it in 20 seconds. The agent session produces a lot of detail; that detail is useful, but it goes into a **comment**, not into the ticket body.

| Part | Content | Length |
|---|---|---|
| Summary | `<project>: <goal or problem>` | about 3-8 words |
| Description | Goal, and only when true: Blocked by, Open | at most about 6 lines |
| Comment (one per session) | What was done, decisions, findings, next steps, sources | as long as necessary, but bullets |

## Board facts

- Site `beardedviber.atlassian.net`, cloudId `a0faf4fa-e61e-410e-a7f7-d40148b38198`, project **PP**.
- Types: `Task`, `Bug` (broken behavior). No epics are used.
- Statuses: To Do, In Progress, Blocked, To Review, Done, Won't Do.
- People: Martin Pammesberger, Manuel Pils. Get the current user with `atlassianUserInfo`.
- Summary style on the board: lowercase is fine, a short project prefix before a colon (`dop-os:`, `treitinger portal:`, `resilienz:`, `inboxmate:`).
- Language: write English in ASD-STE100 style, or German if the user writes German or the ticket is already German. Keep one language per ticket.

## Workflow

### 1. Find the ticket

- If the user names a key (`PP-829`) or a link, read it with `getJiraIssue` (view `evidence`) and read its comments.
- Else search before you create: `searchJiraIssuesUsingJql` with `project = PP AND statusCategory != Done AND (summary ~ "<word>" OR text ~ "<word>")`, two or three distinctive words from the topic. Show close matches and ask if one of them is the ticket.

### 2. Write the parts

**Summary.** The goal (task) or the symptom (bug). Not the fix and not the mechanism. Good: `dop-os: move to exoscale`. Bad: `set up dokploy and supabase on exoscale medium vm`.

**Description.** Only these blocks, each one to three lines:

```
**Goal:** <what is true when this is done, in one sentence>
**Blocked by:** <who or what, since when>        (only if status is or becomes Blocked)
**Open:** <decision or input still missing>       (only if there is one)
```

No history, no plan steps, no measurements, no commands, no file paths, no long link lists. If the existing description has such detail, move it into the comment and make the description short again.

**Comment.** One comment per session, in this shape. Leave out a block that is empty.

```
**<YYYY-MM-DD> · <topic of the session>**

**Done**
- <what changed, with the result>

**Decisions**
- <decision> (why, in a few words)

**Findings**
- <fact found, with the number or source>

**Next**
- <next step, owner if not the assignee>

**Sources**
- <mail thread subject / Slack link / repo + commit / file:line / PR>
```

Rules for the comment:
- Facts only, from this session. Do not invent scope or results. If something was not tested, write that.
- Technical detail is welcome here: commit hashes, `file:line`, commands, measured values, config names.
- **Never a secret value.** Write where a secret is (keychain service name, psq-keys collection), never the value. No customer personal data beyond names and roles.
- If a previous comment of the same session exists, edit it (`addOrEditJiraIssueComment` with `commentId`) instead of adding a second one.

### 3. Confirm

Ask in **one** `AskUserQuestion` before you:
- create a ticket,
- replace a description,
- change the status (for example to Blocked or Done),
- change the assignee.

Show the draft as the preview of the first option:

```
PP-<n or new> · <Type> · <status after the change> · <assignee>
Summary: <summary>

<description>

Comment:
<first lines of the comment>
```

Options: **Save** (Recommended) / **Edit** / **Skip**. A comment alone on a ticket the user named needs no confirmation; post it and report.

### 4. Write to Jira

- New ticket: `createJiraIssue` (projectKey `PP`, issueTypeName, summary, description, `contentFormat: markdown`). Assignee = the current user when the work starts now; no assignee for an idea for later.
- Existing ticket: `editJiraIssue` for summary and description.
- Status: `getTransitionsForJiraIssue`, take the transition whose target status has the wanted name, then `transitionJiraIssue`.
- Comment: `addOrEditJiraIssueComment` (`contentFormat: markdown`).
- Read the ticket again with `getJiraIssue` and report what Jira shows. If a write did not land, say so.

### 5. Report

```
PP-<n>: https://beardedviber.atlassian.net/browse/PP-<n>
<status> · <assignee> · description <new | updated | unchanged> · comment <added | updated | none>
```
