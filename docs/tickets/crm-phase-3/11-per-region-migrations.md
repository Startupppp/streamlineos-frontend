# 11 — Migrations run per region with a per-region result

**Status:** not started
**Track:** C — regions
**Blocked by:** 08

## Why

A partial rollout must be visible rather than assumed.

## Acceptance criteria

- [ ] One command migrates every configured region.
- [ ] The result is reported **per region**, including failures, rather than aggregated to a single pass or fail.
- [ ] A region that fails does not stop the others being reported.
- [ ] The command is idempotent: re-running after a partial failure completes the remainder.
