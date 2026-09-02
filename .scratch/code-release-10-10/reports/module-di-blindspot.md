# `check:module-di` blindspot — providers no module registers

**Repo:** `streamlineos-backend` · **Gate:** `pnpm check:module-di` · **Status:** closed, ratcheted at 0

## What the old gate could not see

`check-module-di.mjs` walked `*.module.ts` files and answered three questions, all of which
**presuppose the class is already in the injector**:

- the export rule — every `exports:` entry is a provider of this module or a module it imports
  (the `StorageModule`/`AvScanner` boot failure);
- Check A — a constructor parameter whose type is not visible in the module;
- Check B/C — a parameter with no runtime DI token (`unknown`, a union, an `import type`).

The population it checked was **classes already listed in some module's `providers`/`controllers`**.
An `@Injectable()` that appears in **no** module's providers was never in that population, so the
gate could not see it and reported a clean 217 modules / 1,707 classes while two complete services
sat outside the injector. Nest never constructs such a class: its `onModuleInit` never fires, its
dependencies are never resolved, and the feature it implements silently does not exist — with a
green `tsc` and a green unit spec throughout, because a spec constructs the class directly and never
consults the module graph.

This release was already bitten by the identical shape from the other direction:
`BuildTicketStatusChangedConsumerService` was absent from `projects.module.ts`, so
`OutboxPublisherService.deliver()` threw `no dispatch handler` and every ticket status change
dead-lettered after 8 retries.

`check:module-registration` is the adjacent gate and does **not** cover this: it asks whether every
`*Module` is reachable from `AppModule`, not whether every provider class is inside one.

## Check D — what was added

A fourth check walks the real module graph from `AppModule` and reports every `@Injectable()` /
`@Controller()` class the walk never reaches. The walker is the one written for
`check-outbox-consumers.mjs` (`analyseSources` / `isRuntimeSource`), duplicated rather than imported
because that script runs its whole scan at module scope and calls `process.exit`, so importing it
would execute a second gate inside this one. Three resolution rules are load-bearing:

1. **Hoisted module lists.** `build.module.ts`, `kb.module.ts` and the `finance`, `hr` and
   `inventory` modules write `const BUILD_MODULES = [...]` / `@Module({ imports: BUILD_MODULES })`.
   A matcher keyed on `imports: [` misses every one — that cost the outbox agent a false report of
   seven orphans.
2. **Per-file import resolution.** Module imports resolve through the importing file's own `import`
   statements, so two modules sharing a class name stay distinct (`OrganizationModule` exists twice).
3. **Barrel re-exports — new here.** Those import statements frequently point at a barrel
   (`from "./kb-gap"`) that re-exports the module from a third file. Without following
   `export { X } from "./y"` and `export * from "./y"`, `SupportKbGapModule`'s four classes read as
   orphans while the module is wired correctly through `src/modules/support/kb-gap/index.ts`.
   This was found by hand-checking, exactly as the brief warned: my first pass reported **12** hits
   and the true answer was **2**.

`forwardRef(() => X)`, `Foo.forRoot()`, `{ provide: TOKEN, useClass: X }`, `providers:` inside a
`static forRoot()` DynamicModule body, and `@Global()` modules all resolve and need no exemption.

## Every hit, hand-verified

Twelve candidates from the first pass; each was checked against its module file and its call sites.

| Class | File | Classification | Evidence |
|---|---|---|---|
| `TelephonyCallLogService` | `src/modules/ingress/adapters/telephony-call-log.service.ts` | **TRUE ORPHAN** | in no `providers`; referenced by nothing but its own specs |
| `WhatsAppIngressService` | `src/modules/ingress/adapters/whatsapp-ingress.service.ts` | **TRUE ORPHAN** | in no `providers`; referenced by nothing but its own specs |
| `SupportKbGapService` | `src/modules/support/kb-gap/support-kb-gap.service.ts` | false positive — barrel | `SupportKbGapModule` reached via `./kb-gap/index.ts` |
| `SupportKbGapDetectionService` | `…/support-kb-gap-detection.service.ts` | false positive — barrel | same |
| `SupportKbGapJobHandler` | `…/support-kb-gap-job.handler.ts` | false positive — barrel | same |
| `SupportKbGapController` | `…/support-kb-gap.controller.ts` | false positive — barrel | same |
| `ApiKeyGuard` | `src/common/auth/api-key.guard.ts` | **enhancer** | `@UseGuards(ApiKeyGuard)` in `leads.ingest.controller.ts:11` — Nest instantiates it |
| `ParseResourceIdPipe` | `src/common/pipes/parse-resource-id.pipe.ts` | **enhancer** | `@Param("projectId", ParseResourceIdPipe)` ×4 in `projects-by-id.controller.ts` |
| `ResponseTransformInterceptor` | `src/common/interceptors/response-transform.interceptor.ts` | **factory** | `new ResponseTransformInterceptor()` at `main.ts:118` |
| `ChatChannelMembersImplementation` | `src/modules/chat/chat-channel-members-implementation.ts` | **factory** | `new ChatChannelMembersImplementation(...)` in `chat-channel-members.service.ts:21` |
| `GdprExportWorkerImplementation` | `src/modules/gdpr/gdpr-export-worker-implementation.ts` | **aliased** | provided by `GdprModule` under the re-exported name `GdprExportWorkerService` |
| `HrProjectionSource` | `src/modules/hr/hr-calendar-sources.ts` | **base-class** | `abstract`; its three subclasses are registered in `hr-calendar.module.ts` |

**True orphan count: 2** — exactly ticket 38's routed item 6. Nothing was deleted; brief rule 8
requires `knip` plus a real build before any deletion and this scan is not that.

The gate classifies the six legitimate registrations automatically (`enhancer` · `factory` ·
`base-class` · `aliased`) and prints the tally, rather than carrying an allowlist that rots.

## What was registered

`src/modules/ingress/ingress.module.ts`:

- `TelephonyCallLogService` and `WhatsAppIngressService` added to `providers`.
- `IntegrationsModule` added to `imports`, because `TelephonyCallLogService` injects
  `ComposioGateway` and `MailModule` imports that module **without re-exporting it**, so it was not
  visible in `IngressModule` by inheritance.

Both classes were written complete by earlier ticket agents and left deliberately unwired, each with
a docblock saying so. Those docblocks are now stale — see cross-territory findings.

**The DI wiring is proved by the gate's own Check A.** With `IntegrationsModule` removed, Check A
reports `TelephonyCallLogService.composio at index [1] — ComposioGateway is not available in
IngressModule`; with it present, 0 findings. The registration is therefore resolvable, not merely
syntactically present.

## Bite proof

| Step | Command | Exit | Output |
|---|---|---|---|
| Add `@Injectable() BiteProbeOrphanService` in `src/common/__bite_probe.service.ts`, registered nowhere | `node src/scripts/check-module-di.mjs` | **1** | `Check D — … (1 finding(s), ratchet 0)`, names the class and its file |
| Delete that file | `node src/scripts/check-module-di.mjs` | **0** | `0 unregistered` |
| Revert the two `providers` entries in `ingress.module.ts` (the real defect) | `node src/scripts/check-module-di.mjs` | **1** | `Check D — … (2 finding(s))`, names `TelephonyCallLogService` and `WhatsAppIngressService` |
| Restore | `node src/scripts/check-module-di.mjs` | **0** | clean |

## Ratchet

`MAX_UNREGISTERED = 0`, a constant in the script, not a baseline file — the honest number reached
after registering both orphans is 0, so any new orphan fails. Vacuity floors reject a scan that
resolved nothing (`exit 2`): 500 runtime sources, 100 modules reachable from `AppModule`, 500
registered class names, 500 decorated classes. Today's measurement: 3,554 sources · 216 reachable
modules · 1,773 registered · 1,742 decorated.

## Self-test

`pnpm check:module-di:self-test` — **54 assertions** (was 23), exit 0. The 31 new ones feed fixtures
through the real `analyseRegistration`, not a re-declared copy of its rules, and cover: the core
orphan bite; a provider of an unreachable module (classified separately); `imports: SOME_CONST` and
`providers: SOME_CONST` hoisting; `export { X } from` and `export * from` barrels; an aliased
re-export; `forwardRef`; `Foo.forRoot()`; `{ provide: T, useClass: X }`; unregistered and registered
`@Controller`s; each of the four exemptions; same-named modules in different folders; the
runtime-source filter; and every vacuity floor.

## CI

Already in the `gates` job of `.github/workflows/ci.yml` (line 98, **no `needs:`**), as
`pnpm check:module-di:self-test && pnpm check:module-di`. The step name and comment were updated to
say the gate now covers unregistered providers; no other change to that file. `package.json` needed
no change — both scripts already existed.

## Cross-territory findings

1. **Two stale docblocks.** `whatsapp-ingress.service.ts` says *"Deliberately not registered in
   `IngressModule`: … the wiring … is one decision that should be made once rather than three
   times"*, and `telephony-call-log.service.ts` carries a comparable note. That decision has now
   been made and both are registered, so both paragraphs are wrong. The class files are under
   `src/modules/**`, which is not my territory — the owning agent should delete or update them.
2. **Neither adapter has a caller.** Registering them makes them constructible and boot-verified;
   `TelephonyCallLogService.sync` and `WhatsAppIngressService.accept` are still invoked from
   nowhere. Its own docblock names the three blockers (`IntegrationToolkit` has no carrier member,
   `ComposioGateway.authConfigIdFor` falls through to Outlook, `getAccountEmail` has no carrier
   branch), all in `src/modules/integrations/**`, and routes them to ticket 12. Check D asserts the
   class is in the injector, not that anything calls it — a distinct defect class needing a
   distinct gate.
3. **The `check-outbox-consumers.mjs` walker should be extracted.** Two gates now carry a copy of
   the same parser. It cannot be shared today because that script executes its whole scan at module
   scope and calls `process.exit`, so any importer runs it. Guarding its main body behind an
   `import.meta.url === process.argv[1]` check and exporting the walker would let both gates share
   one parser and one set of corrections. That file is explicitly not mine to edit.

## Commands run

| Command | Exit | Result |
|---|---|---|
| `pnpm check:module-di:self-test` | 0 | 54 assertions passed |
| `pnpm check:module-di` | 0 | 217 modules · 1,712 classes · 0 violations; Check-D 1,742 decorated · 216 reachable · 1,773 registered · **0 unregistered** · exempt 2 enhancer / 2 factory / 1 aliased / 1 base-class |
| `pnpm check:module-registration:self-test` | 0 | 13 passed |
| `pnpm check:module-registration` | 0 | 217 declared · 216 reachable · 0 unreachable |
| `pnpm check:outbox-consumers` | 0 | 29 registered event types, no orphans |
| `pnpm check:import-direction` | 0 | 221 files, 0 new violations |
| `pnpm check:cycles` (madge) | 0 | 5,515 files, **no circular dependency** — the new `IngressModule → IntegrationsModule` edge adds none |
| `jest --runInBand --testPathPattern="modules/ingress\|modules/integrations"` | 0 | **28 suites, 328 tests, all passed** |

**Not run:** repo-wide `pnpm typecheck` (red repo-wide from another agent's in-flight
`src/db/schema/payroll/policies.ts` edit, ~195 errors — not mine to debug); `pnpm lint`;
`pnpm test:e2e`; a real API boot. No `db-bootstrap` or app-init spec exercises `IngressModule`.

## Files changed

- `src/scripts/check-module-di.mjs` (+718/−7)
- `src/modules/ingress/ingress.module.ts` (+18/−4)
- `.github/workflows/ci.yml` (step name + comment only)
