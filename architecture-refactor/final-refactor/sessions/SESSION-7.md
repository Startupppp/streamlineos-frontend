# S7 — Contract, migrations, cells and scale evidence

Read `PROTOCOL.md`, the PRD, tickets 11 and 42-45, and existing c28 issue 34.

## Opening decisions to include

- Confirm which environment may be used for migration-chain repair and cold bootstrap.
- Confirm independent database/cache/storage/search/realtime resource budget and provisioning authority.
- Confirm required RPO, RTO, load objectives, target concurrency and cost-approval owner.
- Ask the protocol's commit and operator-credential questions.

## Exclusive territory

- Legacy OrganizationActor contraction, migration-chain tooling/journal integration, cell resource configuration, recovery/replica drills, load/headroom/cost evidence and c28 issue 34.
- Do not begin contraction or migration repair until all declared producer/migration blockers are closed.

Ground and ask questions in parallel with S1-S6. Implement ticket 11 after 07-10; ticket 42 after 11 and 13-16. Execute existing c28 issue 34 rather than creating a duplicate. Ticket 43 follows migration readiness, 44 follows 43 and 45 is the final evidence gate.
