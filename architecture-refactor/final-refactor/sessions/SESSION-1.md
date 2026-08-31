# S1 — Organization, RBAC and Home foundation

Read `PROTOCOL.md`, the PRD and tickets 01, 02, 03, 05, 06 and 12.

## Opening decisions to include

- Confirm module-ownership transfer authority follows the PRD matrix: org owner/admin and current module owner may transfer; organization ownership remains owner-only.
- Confirm whether legacy integer authorization IDs are retained under an ADR or included in a later migration program.
- Ask the protocol's migration, commit and environment questions.

## Exclusive territory

- Backend Users, Access, RBAC, Organization, Ownership, Module Access and Dashboard/Home modules.
- Common authentication/access/ownership schema blocks and their migrations.
- Frontend Home/Dashboard access hooks and organization/module-access UI needed by owned tickets.

Do not edit HR, Build, Chat, Calendar, Finance or shared frontend route-registry implementation; request those changes from their owners.

## Order

Start 01, 02, 03 and 12 in any safe order. Then 05, followed by 06. Publish the OrganizationActor seam before S2-S4 migrate callers.
