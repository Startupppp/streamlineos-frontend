# File Size Exceptions — Frontend §7 Registry

Files exceeding 500 lines that are **exempt** from the 500-line hard-review limit per §7 of the shared CLAUDE.md. Every exception is justified by one of the recognised categories: generated file, unmodified shadcn primitive, `*.d.ts`, or cohesive catalog.

The gate script (`scripts/check-file-sizes.mjs`, run as `pnpm check:file-sizes`) reads the `## Exceptions` table below and validates every registered entry: the path must exist, the recorded line count must match the file's actual line count exactly, and the file must still exceed 500 lines. A missing path, stale line count, or a file that has fallen within the limit will fail the gate.

Wildcard and directory-wide exceptions are rejected by the parser.

---

## Exceptions

| Path | Lines | Category | Interface | Reason | Owner |
|---|---|---|---|---|---|

---

## Audit trail

- **2026-09-02** — Initial registry. Full scan of the frontend workspace found zero authored files exceeding 500 lines. No exceptions registered.
