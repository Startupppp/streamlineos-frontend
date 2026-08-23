# Spec — One answer to "is this module available"

Status: **ready-for-agent**
Date: 2026-08-23
Stream: R · Tickets R01, R02
Testing prerequisite: `2026-08-23-seeded-e2e-harness-prd.md`

## Problem Statement

When a person is refused a module, the product cannot reliably tell them why — because six different facts decide it and no single place puts them together.

Whether someone can use Payroll depends on: whether the module is one that plans gate at all, whether it is one of the always-available core modules, whether the organisation has turned it on, whether the organisation's plan permits it, and whether an administrator has specifically denied it to that person. Each of those lives somewhere different. The guard that actually stops the request consults four of them.

The two it does not consult produce the visible symptoms. An administrator can switch a module off for one person on the access screen, see it saved, and find that person can still use the module — the setting hides it, and the guard does not enforce it. And the plan check runs only when a module is being switched on, never when it is being used.

For someone hitting the wall, the experience is inconsistent. Sometimes a blocked module offers an upgrade; sometimes it says access denied. Which one appears depends on which guard refused first, and those two guards decide from different facts.

There is a quieter version of the same problem. The module registry — the one place a developer would expect to describe a module — marks the always-available modules as universal, and that marking does nothing. The behaviour comes from a separate hardcoded list. Add a universal module to the registry, and it comes up plan-gated, contradicting its own entry.

## Solution

One question with one answer, and the answer says why.

Something asks: is this module available to this person, in this organisation? It returns either yes, or no with a reason — not permitted by the plan, switched off by the organisation, or denied to this person specifically. Every guard, every screen and the access answer all ask that same question.

The reason becoming a value is what fixes the inconsistent wall. Offering an upgrade is the right response to a plan limit and the wrong response to a personal denial, and the product can now tell them apart instead of inferring it from which guard fired.

A per-person module denial starts being enforced rather than only shown.

The registry becomes the thing that decides which modules are always available, so its description of a module and the module's actual behaviour cannot disagree.

**One thing deliberately does not change.** When an organisation downgrades, modules it has already switched on keep working. That is a recorded product decision and it stands. Today it is true as a side effect of where the check happens; afterwards it is a named rule that could be reviewed and changed on purpose.

## User Stories

1. As an employee, I want a clear reason when a module is unavailable, so that I know whether to ask my administrator or wait for a plan change.
2. As an employee, I want to be offered an upgrade only when the plan is genuinely what is blocking me, so that the offer is not misleading.
3. As an employee, I want a module denied to me personally to say so, so that I ask the right person.
4. As an employee, I want a module I cannot use to be absent from my navigation, so that I am not led to a dead end.
5. As an employee, I want the modules everyone gets — home, chat, mail, calendar, notifications, the knowledge base — to always work, so that a plan or a setting never takes away my basic workspace.
6. As an employee, I want my own self-service surfaces to keep working whatever modules I am denied, so that I can always see my own leave, pay and documents.
7. As an administrator, I want switching a module off for one person to actually stop them using it, so that the control is real.
8. As an administrator, I want switching it back on to restore access promptly, so that I can correct a mistake.
9. As an administrator, I want a per-person denial to be impossible for a core module, so that I cannot accidentally remove someone's basic workspace.
10. As an administrator, I want the access screen to show the same availability the product enforces, so that what I see is what is happening.
11. As an organisation owner, I want to see which modules my plan permits, so that I understand what an upgrade would buy.
12. As an organisation owner, I want modules I already turned on to keep working after a downgrade, so that a billing change does not break my company's day.
13. As an organisation owner, I want to be told plainly that a module is retained from a previous plan, so that its status is not a mystery.
14. As an organisation owner, I want a module blocked by my plan to be blocked consistently, so that it is not usable through one screen and blocked in another.
15. As a module owner, I want my module's availability decided the same way as every other module's, so that mine is not a special case.
16. As a finance administrator, I want plan limits enforced where the product is used, not only where it is configured, so that entitlements mean something.
17. As a person in another organisation, I want an unknown module identifier to look like it does not exist, so that I cannot probe what other organisations have.
18. As a developer, I want one function that answers module availability, so that I do not have to know which of six facts each caller checks.
19. As a developer, I want the reason returned as a value, so that I do not infer it from which exception was thrown.
20. As a developer, I want both guards to consult that one function, so that they cannot disagree.
21. As a developer, I want the registry entry to decide whether a module is always available, so that describing it and making it so are the same act.
22. As a developer, I want the separate hardcoded list of always-available modules deleted, so that there is nothing to keep in sync.
23. As a developer, I want stored module records reconciled against the registry when the application starts, so that a mismatch is reported rather than silently merged.
24. As a developer, I want adding a module to need no edit to the availability code, so that the twenty-first module is cheap.
25. As a developer, I want the module-status decorator to keep working for routes that gate on status alone, so that nothing has to be rewritten.
26. As a developer, I want a test that covers every module in the registry automatically, so that a new module is covered the day it is added.
27. As a developer, I want the retained-after-downgrade rule pinned by a test, so that nobody removes it by accident while tidying.
28. As a reviewer, I want the six facts assembled in one readable place, so that I can see the whole rule at once.
29. As a reviewer, I want to see the downgrade rule written down as a branch, so that changing it later is a deliberate decision.
30. As a security reviewer, I want per-person denial enforced at the guard, so that hiding is not the only thing standing between a person and a module.
31. As a security reviewer, I want a cross-organisation module identifier to return not-found rather than forbidden, so that the product is not an existence oracle.
32. As a security reviewer, I want billing to remain undelegatable, so that this change does not open a path to it.
33. As a security reviewer, I want an allow case beside every deny case, so that a passing test is not a broken feature.
34. As an operator, I want this to add no database work per request, so that the busiest path in the product does not get slower.
35. As an operator, I want the existing per-request cost ceiling to keep passing, so that a regression is caught automatically.
36. As an operator, I want a registry-versus-stored mismatch logged loudly with both sides named, so that I can fix the data.
37. As an operator, I want no data migration, so that this ships without a maintenance window.

## Implementation Decisions

**One function, and it returns a reason.** Available, or unavailable with one of: not permitted by the plan, switched off by the organisation, denied to this person. Every consumer — the module guard, the permission path, the access answer, the entitlements screen — asks it. Nothing re-derives any of the six inputs.

**The recorded downgrade policy is preserved and made explicit.** Not-permitted-by-plan is returned only when the organisation has no enabled record for that module. An organisation that switched a module on before downgrading keeps it. This is existing behaviour, it is deliberate, and it gets a test so that it cannot be changed by tidying.

**Per-person denials become enforceable.** They already exist and already appear on the access screen. They join the answer, so a denial stops a request rather than only hiding a link. Core modules remain exempt from denial, as they are today.

**The registry decides which modules are always available.** Its existing three-way classification — delegable, universal, platform administration — keeps its meaning, and the universal value becomes what produces always-available behaviour. The parallel hardcoded list is deleted rather than left beside its replacement. The equality between the derived set and today's set is the first thing to assert, because that equality is what makes the change safe.

**Stored module records are reconciled, not merged.** They continue to be read at startup and compared against the registry. A mismatch is logged loudly naming both sides. Silently merging is how the two came to disagree.

**New types live with the new function**, not in the shared access types file — a neighbouring stream owns that file in the same wave.

**The module-status decorator stays.** It remains correct for routes that gate on module status without a specific permission. What changes is that both it and the permission path now consult one function instead of two different facts.

**No new per-request cost.** All six inputs are already cached — the organisation's module map on a short local expiry, the plan tier through the existing limits service, per-person denials keyed on the access version. Assembling them adds no query, and the existing per-request cost ceiling is the guard against getting that wrong.

**Billing does not join the managed module set.** Platform billing is never delegated; the rule that refuses to grant anything in the billing namespace, including to the organisation owner, is untouched.

## Testing Decisions

**A good test here states the organisation's plan, what it has switched on, what the person is denied, and asserts what the request returned** — the status and the reason. It does not assert which of the six sources was consulted or in what order; that is exactly what this work consolidates.

**The primary seam is the controller**, against seeded data, depending on the seeded harness spec. This matters more here than anywhere else in the set: the existing controller harness replaces the entitlements service with a fixture that answers from an array on the test. The six-source assembly this spec is about would never execute. A spec written against that harness would pass no matter what the code did.

**The property worth pinning, driven as a table over the registry:** for every module and every combination of the six inputs, the guard, the access answer and the entitlements screen agree about availability. Driving it from the registry means the twenty-first module is covered the day it is added.

**One seeded scenario per reason:**

- Plan does not permit it and the organisation has no record → refused, reason names the plan, and the response is the shape the upgrade prompt reads.
- Plan does not permit it but the organisation switched it on before downgrading → **allowed**. This is the recorded decision and this is where it is pinned.
- Organisation switched it off → refused, reason names the organisation.
- Denied to this person → refused, reason names the person. Another member of the same organisation is still allowed, in the same test, or the assertion proves nothing.
- A core module → allowed regardless of every other input, including an attempted denial.
- A module identifier from another organisation → not-found, never forbidden.

**Mutation checks, each named:** remove the plan branch and the plan scenario fails. Remove the denial branch and the denial scenario fails. Point the always-available set back at a hardcoded list and the registry-derivation test fails. Without these, each branch could be deleted with the suite still green.

**Prior art.** The permission-guard, entitlements and module-access controller specs are the model for shape. The registry spec and the pinned set of permission-owning namespaces that are not modules are the regression net and must pass unchanged.

**The cost assertion is part of this spec, not a follow-up.** The existing per-request transaction ceiling job must still pass. Assembling six cached facts must not become six reads.

## Out of Scope

- **Changing the downgrade policy.** It is recorded, it stands, and this spec only makes it explicit.
- Adding billing to the managed or plan-gated module sets.
- Any change to the module ladder, module ownership, or any permission key.
- Seat and creation limits, which are a different invariant with a different enforcement point.
- The credit-charging path in streaming chat, which bypasses its own shared helper — real, separate, and belonging with the AI gateway.

## Further Notes

The registry's universal marking doing nothing is the clearest evidence that this is a structural problem and not a collection of bugs. A field that describes a fact but does not produce it is a second description, and second descriptions drift — the per-person denial that is shown but not enforced is the same failure a step further along.

The two tickets are ordered deliberately: assembling the answer comes first, because it owns the file where the hardcoded list lives, and the registry change follows once that file is free.
