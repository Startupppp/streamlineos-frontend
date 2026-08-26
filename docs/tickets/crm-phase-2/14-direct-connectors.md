# 14 — Direct connectors for the big four

**Status:** done — direct connectors for the big four (`crm-import/connectors/`).
**Track:** C — importer
**Blocked by:** 13

## Acceptance criteria

- [ ] Zoho, HubSpot, Salesforce and Pipedrive read the source API directly and
      produce **the same intermediate** the universal path produces — a set of
      source records plus an inferred mapping onto Party, Subject, Pipeline stage
      and Activity.
- [ ] One destination, so a connector cannot acquire its own write path and its
      own bugs.
- [ ] Through Composio, server-side only; no provider tokens in our database.
- [ ] Paging, rate limits and partial failure are handled by resuming, never by
      restarting — the watermark lesson from Phase 1's mailbox sweep applies:
      never advance past what was actually read.
- [ ] Each connector is driven from a fixture. No provider SDK is mocked.
