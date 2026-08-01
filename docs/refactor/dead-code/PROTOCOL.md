# Dead-code removal protocol (all agents)

Repo root: `D:\projects\personal\Streamlineos`
Two separate repos: `frontend/` and `backend/`. Candidate paths are relative to YOUR repo.

Your candidate list came from **knip**. knip is a **CANDIDATE GENERATOR, NOT AN ORACLE.**
It has already produced provable false positives in this very repo (it flagged ~100 live
`*.e2e-spec.ts` test files, and it flags `tailwindcss` as an unused devDependency).
**You must PROVE each candidate dead before deleting it.**

## Absolute rules

- Run **NO git commands**. Ever.
- Run **NO build, tsc, typecheck, lint, or knip**. The orchestrator runs those.
- Touch **ONLY** files matching your zone prefix. Never edit a file outside your zone.
- **NEVER touch:** `backend/migrations/**`, `meta/_journal.json`, `backend/src/app.module.ts`,
  any `package.json`, any `*.module.ts`, `next.config.ts`, `proxy.ts`, `knip.json`,
  `components/ui/**` (shadcn primitives).
- **Never delete** a Next.js route file (`app/**/{page,layout,route,loading,error,not-found,template,default}.tsx`)
  or a NestJS controller/service registered in a `*.module.ts` `providers`/`controllers` array.
- **Deletions only.** Do not reformat, refactor, rename, or "improve" anything.
- Do not create new files except your report.

## Proof protocol — delete ONLY if ALL of these show no live reference

Search **both repos** (`frontend/` and `backend/`), not just your own.

1. **Symbol grep** — `\bSymbolName\b`
2. **Path grep** — the module path without extension (catches `import()` and `lazy()`)
3. **Bare side-effect import grep** — `import ['"]...<basename>` with **no `from`**.
   A bare `import "./x";` is INVISIBLE to from-based scanners. A prior cleanup in this
   repo **deleted a live file** by missing exactly this. This check is mandatory.
4. **String reference grep** — route strings, registry keys, config maps, dynamic lookups.
5. **Re-export chain** — check every `index.ts` barrel for `export * from` / `export { X } from`.

## Zod rule (explicit user decision)

A Zod schema is **LIVE and UNTOUCHABLE** if reachable from `@Validate`, `ZodValidationPipe`,
`zodResolver`, or any `.parse()` / `.safeParse()` on request or form data.
Delete **only** orphan schemas nothing references, and true duplicates.
**Never remove validation that runs on a boundary.**

## Framework-reserved exports — always KEEP

`default`, `metadata`, `generateMetadata`, `generateStaticParams`, `revalidate`, `dynamic`,
`viewport`, `runtime`, `fetchCache`, `preferredRegion`, `maxDuration`, `config`, `proxy`.

## When in doubt → KEEP and mark REPORT

A false keep costs nothing. A false delete breaks production.

## Output

Write `docs/refactor/dead-code/reports/<YOUR-ZONE>.md`:

| candidate | verdict | evidence |
|---|---|---|
| `path: Symbol` | DELETED / KEPT / REPORT | `file:line` of the live ref, or `0 refs across both repos` |

Then return a short summary: counts (deleted / kept / report), plus anything genuinely risky.
