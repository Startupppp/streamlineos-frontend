# Risks + Decisions More-tools Census — Account A

- **Run status:** VERIFIED
- **UI-only:** Yes; observed through rendered StreamlineOS UI only.
- **Organization shown:** PXC-Design-A-20260930
- **Project URL:** https://www.streamlineos.in/build/47
- **Project label shown in sidebar:** PXC-Project-Alpha
- **Run timestamp:** 2026-09-30 22:48 UTC+5:30
- **Restricted actions:** none; did not sign out, change members/roles, use Client Access, delete, or modify settings.
- **OTP:** not encountered.

## Exact URLs

- Risks: https://www.streamlineos.in/build/47/risks
- Decisions: https://www.streamlineos.in/build/47/decisions

## Risks — VERIFIED

### Empty state observed before creation
- Page heading: `Risk Register`
- Supporting copy: `Identify, assess, and mitigate project risks`
- Empty copy: `No risks logged` / `Log risks to track probability, impact, and mitigation plans.`
- CTAs: `New Risk` in page header and a second `New Risk` in the empty state.
- Search: `Search risks`.
- Filters: `Status`, `Probability`, `Impact`.

### Filled state after minimal create
- Created `PXC-Risk-1`; rendered row ID `RISK-1`.
- Defaults visible in row: Probability `Medium`, Impact `Medium`, Severity `Medium`, Owner `—`, Status `Open`.
- Summary cards visible: `Open 1`, `High / Critical 0`, `Closed 0`.
- Risk Matrix (open risks) visible with one count in medium probability / medium impact.
- Table columns: ID, Title, Probability, Impact, Severity, Owner, Status, Actions.
- New Risk dialog CTA: `Add Risk`; optional fields shown for Description, Owner, Mitigation Plan, Linked Ticket.
- Status options observed: All statuses, Open, Mitigating, Monitoring, Accepted, Closed.
- Probability options observed: All probabilities, Low, Medium, High.
- Impact options observed: All impacts, Low, Medium, High.

## Decisions — VERIFIED

### Empty state observed before creation
- Page heading: `Decisions Log`
- Supporting copy: `Log and track key project decisions for accountability and audit`
- Empty copy: `No decisions recorded` / `Record key project decisions to maintain a clear audit trail.`
- CTAs: `New Decision` in page header and `Log Decision` in the empty state.
- Search: `Search decisions`.
- Filters: `Status`, `Owner`.

### Filled state after minimal create
- Created `PXC-Decision-1`; rendered row ID `DEC-1`.
- Default status visible in row: `Proposed`; Owner, Decided, Revisit render `—`.
- Table columns: ID, Title, Status, Owner, Decided, Revisit, Actions.
- Log Decision dialog CTA: `Log Decision`; optional fields shown for Context, Decision, Options Considered, Owner, Decided At, Revisit At, Linked Ticket.
- Status options observed: All statuses, Proposed, Accepted, Superseded, Revisit.
- Owner options observed: All owners, PXC Designer A, PXC Test Member.

## Evidence files

- `risks-ui.txt` and `decisions-ui.txt` contain the rendered UI census captured from the two exact URLs.
- Full-page visual captures were taken after each filled state in the browser session.
