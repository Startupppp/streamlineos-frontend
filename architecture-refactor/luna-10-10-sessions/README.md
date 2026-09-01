# Independent final completion tickets

These five tickets are the only active architecture-refactor tickets. They may run in parallel and must not assume another session has completed first.

## Session protocol

At the start of every session:

1. Read the root and package-level CLAUDE/AGENTS instructions.
2. Re-read current source and run the ticket's baseline commands.
3. Ask all material product/security questions at the start. Otherwise proceed with the stated defaults.
4. Preserve CRM, Inventory, and the public landing page.
5. Do not overwrite another session's uncommitted work.
6. Make small coherent commits in the repository that owns each file.
7. Attach fresh command output and environment identity to the ticket before checking an item.

Tickets:

- [S01 — Authority and tenant integrity](S01-AUTHORITY-TENANT-INTEGRITY.md)
- [S02 — Query bounds and read cost](S02-QUERY-READ-COST.md)
- [S03 — Repository quality and release verification](S03-QUALITY-RELEASE.md)
- [S04 — Migration and production operations](S04-MIGRATION-PRODUCTION-OPS.md)
- [S05 — Compliance and approvals](S05-COMPLIANCE-APPROVALS.md)

Completion of one ticket never authorizes checking an acceptance criterion in another ticket.
