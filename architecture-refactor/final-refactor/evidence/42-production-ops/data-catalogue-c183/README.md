# PRD-C183 data-catalogue evidence

Produced 2026-09-03 by the agent working ticket 35 items **PRD-C183 / C184 / C185**, against
backend `45f8a2e99` / frontend `7469d2789` on `release/code-10-10-v2`.

Kept in its own directory rather than in `RB-10-privacy-compliance/` because that runbook's
numbered run sequence and `artifact-hashes.json` are another agent's artifact. Nothing in
RB-10 was modified; this catalogue **cites** RB-10's compliance-drill and retention-coverage
outputs, it does not reproduce or alter them.

| File | What it is | Result |
|---|---|---|
| `pd-column-scan.sql` | The personal-data column sweep over `information_schema` on `scratch_head_1010`. Classifies every column in `public`, `build` and `build_events` into 15 identifier classes. | 1,027 base tables / 13,536 columns scanned; **296 personal-data columns across 136 tables** |
| `pd-columns.csv` | The full classified output — one row per personal-data column (class, schema, table, column, type). The input to the coverage diff. | 296 rows |
| `ai-redaction-probe.mjs` | Probe of the AI redaction layer. Loads `backend/src/modules/ai/core/redaction.util.ts` **itself** and strips only its TypeScript annotations, so the shipped regexes execute rather than a transcription of them. | exit 0 |
| `ai-redaction-probe.txt` | That probe's output. | **14 of 20 probe strings unredacted**; 6 of 6 controls caught; **every Indian identifier passes through** |

## What these do and do not evidence

They evidence the **contents of the schema** and the **behaviour of the redaction function**.

They do **not** evidence anything about a deployed environment. There is no deployed
environment on this machine. PRD-C186 (deployed export / correction / portability / erasure
drills) and PRD-C187 (deployed object, search, vector, cache and backup deletion) were **not
run** and are not claimed. Provider region attestations were **not obtained** — they require
each provider's contract or console.

They also evidence **no approval**. `decisions/privacy-C184-pii-policy.md` and
`decisions/privacy-C185-provider-approvals.md` are unsigned drafts with every signature field
blank.

## Reproduce

```sh
psql "postgresql://tarunchintakunta@localhost:5432/scratch_head_1010" -f pd-column-scan.sql
node ai-redaction-probe.mjs
```
