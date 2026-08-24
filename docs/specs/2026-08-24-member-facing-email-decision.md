# Decision needed — should member-facing email honour notification preferences?

Status: **needs a product decision, not engineering work**
Date: 2026-08-24
Source: measured while closing platform phase five

## What was measured

**61 services outside the email module send mail directly. 57 of them dispatch no notification at all.** Only 4 do both.

A service that calls `EmailService` without dispatching a notification skips the whole pipeline: the recipient's per-event preference, channel routing, quiet hours, the digest option, and the per-recipient visibility check.

By module: hr 22 · crm 4 · build 4 · leads 3 · cron 3 · clients 3 · automation 3 · organization 2 · users, tasks, support, public 1 each.

## Most of that bypass is correct and must stay

Recruitment, interview booking, candidate documents, termination communications and onboarding initiation mail **candidates and external parties**. They are not members, hold no preferences, and have no notification centre to receive anything. Routing their mail through a preference-gated pipeline would silently drop messages that must be sent.

That is also why two template systems exist, and why having two is not automatically wrong.

## The part that is wrong

Member-facing mail takes the same bypass.

Confirmed: `hr/time/leaves-write.service.ts:363` resolves HR staff from `users` and mails them through `EmailService` directly. An HR person who has muted leave email still receives it, and nothing about that is visible to them or to an administrator.

The same shape appears in `leave-decision-effects`, `attendance`, `work-logs`, `performance-reviews`, `onboarding-task` and `hr-holidays`.

## The decision

**Should mail addressed to an organisation member honour that member's notification preferences?**

- **Yes** — those services move onto `notificationDispatch` and the registry templates. External-recipient mail stays on `EmailService` and the flat templates, and the two systems become a deliberate split along a line anyone can state: *members go through the pipeline, non-members go direct.* Roughly seven HR services move first; the rest follow by module.
- **No** — member-facing mail is transactional and always sends. Say so, and this closes. The preference UI should then stop implying otherwise for these events.

Either answer is defensible. What is not defensible is the current state, where the answer differs per service by accident of which helper the author reached for.

## Not in scope

- The two template systems themselves. They are a symptom; the recipient question decides their fate.
- Anything about external-recipient mail, which is working as intended.
