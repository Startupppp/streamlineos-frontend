# Binding protocol for every final-refactor session

Read root, backend and frontend `CLAUDE.md` files as applicable, then `../../PRD-IN-SCOPE.md`, this protocol, the session brief and every owned ticket before editing.

## 1. Opening questions happen once, before edits

Inspect the codebase first and answer everything discoverable from source. Then ask every remaining question in one opening batch. Every session must include:

1. Whether database migrations may be applied to the configured development database or must be generated only.
2. Whether path-scoped commits are desired or changes should remain uncommitted.
3. Which live/sandbox credentials or operator environments are available for that session's acceptance evidence.
4. Every unresolved product/architecture choice named in the session brief or discovered during grounding, with a recommendation and trade-off.

Do not edit before the opening answer. After it, do not interrupt implementation with additional questions. Finish all independent work, take the safest reversible assumption for a newly discovered non-destructive ambiguity, and record it. Stop only for destructive/unsafe actions or a decision that invalidates the remaining design.

## 2. Parallel safety

- Edit only the territory in the session brief.
- Never reformat or mechanically rewrite another session's territory.
- A needed cross-territory change goes to `CROSS-SESSION.md`; the owning session makes it.
- Re-read shared migration journals and shared catalogs immediately before editing.
- Migration names/numbers are selected only after checking the current highest journal entry.
- Keep additive compatibility until every dependent migration ticket is green.
- Do not remove old forms while another session may still use them.
- Do not run checkout, reset, clean, stash, rebase, merge, pull, fetch or push.
- Do not stage or commit unless the opening answer explicitly authorizes it. If authorized, use explicit pathspecs only.

## 3. Blockers and execution

Work the dependency frontier. Start any owned ticket whose blockers are closed. When blocked by another session, continue with another unblocked ticket and record the edge. Never implement a guessed substitute for a blocker.

One completed ticket is not the end of a session. Continue until every owned ticket is done or explicitly blocked with evidence, the unblock condition and the exact failing command/result.

## 4. Evidence and verification

Tests, targeted lint, typechecks, builds, structural checks and migration verification are explicitly authorized for this program. Verification must be proportional to risk and follow repository commands.

A checkbox is complete only when:

1. The behavior is implemented.
2. The named verification ran in this session.
3. Actual output is recorded in the ticket.
4. The output proves the criterion.

Typecheck alone does not prove runtime authorization, DI wiring, migrations, concurrency, cache isolation or deletion safety. Use negative cross-tenant tests, real transaction callbacks, cold migration checks, query-plan evidence and runtime flows where relevant.

## 5. Ticket and report bookkeeping

Update only owned issue files and owned README rows. Set status to `done` only when every acceptance criterion is checked with evidence. Final report order:

1. Questions and decisions fixed at start.
2. Findings and root causes.
3. Solutions and files changed.
4. Verification with actual output.
5. Still open and exact blockers.
6. Cross-session requests.
