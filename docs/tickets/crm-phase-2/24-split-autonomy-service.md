# 24 — `autonomy.service.ts` is 721 lines and the split is already drawn

**Status:** done — `autonomy.service.ts` 721 → 356 lines; the half that decides split from the half that writes.
**Track:** B — discovered by ticket 23
**Blocked by:** — (but see "when", below)

## Why

It was 579 lines before ticket 23 — already past CLAUDE.md §7's 500-line
hard-review threshold — and the thread window, the eligibility branch and the
duplicate-task suppression took it to 721.

Ticket 23 declined to split it, and the reasoning was right: the split changes DI
and module registration in a file that three other agents' evals import through,
and it was mid-flight. Doing structural surgery on a shared file while four
sessions are reading it is how a rebase becomes a rewrite. **Deferring was the
correct call; leaving it undone is not.**

## The split, which the file has already drawn for itself

The file's own two headings name it. `applyNextStep` and `applyStageAdvance` —
"the two things it may do" — move into their own service, roughly 250 lines,
leaving `processActivity` as the decision path and the four `load*` helpers as
reads.

That is a genuine seam rather than a line-count exercise: one half decides, the
other half writes. They are already separated by comment; this makes the compiler
agree.

## Acceptance criteria

- [ ] `applyNextStep` and `applyStageAdvance` live in their own service, wired
      through DI rather than imported as functions — the ambient tenant
      transaction has to reach them the same way it reaches everything else.
- [ ] `autonomy.service.ts` is under 500 lines. If it is not, the split chosen
      was the wrong one.
- [ ] **Every existing autonomy test passes unchanged.** This is a move, not a
      redesign; a test needing an edit means behaviour changed, and that is the
      finding.
- [ ] `madge --circular` stays at zero. A service extracted from the middle of a
      call graph is exactly where a cycle appears.
- [ ] The eval suites that import through this file still run — `evals/` reaches
      `hasEligibleContext`, `redactForModel` and `buildExtractionPrompt`, and
      three suites depend on that path resolving.

## When

**Not while other agents hold `src/modules/autonomy/` or `evals/`.** This is a
single-owner change and it wants a quiet tree. It is also the cheapest ticket in
the phase to do correctly and the most expensive to do concurrently.

## Note

Do not take this as licence to split by line count elsewhere.
`leads-ops.service.ts` and `crm-import.service.ts` were both over the threshold
before this phase and were split by ticket 04 only where a real seam existed.
A file over 500 lines is a prompt to look for the seam, not proof there is one.
