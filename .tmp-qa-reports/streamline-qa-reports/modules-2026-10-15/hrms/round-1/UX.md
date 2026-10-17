# HRMS QA Round 1 — UX findings (2026-10-15)

Bugs are in BUGS.md; this file covers usability, copy, and interaction notes. Org "ADitay CAhala", actor owner adityachalla01. Items that overlap a bug cite HRM-B-xxx / HR-B-xxx.

## Must change

1. **Owner's own expense shows no action and no explanation.** On the expenses Approvals / queue view, the owner's own pending expense (e.g. EXP-2026-006) has **no Approve/Reject (or other) action** and **no helper text** explaining why. Leave already says "Needs another approver" in a similar SoD case — expenses should do the same (or offer a clear "You cannot approve your own claim" state) so the owner is not left with a dead card.

2. **"Retire asset" sits right next to "Edit asset".** On the asset detail / row actions, **Retire** is adjacent to **Edit**, which makes a destructive/lifecycle action easy to hit by mistake while intending a routine edit. Separate destructive actions (Retire / Archive) from Edit — e.g. overflow menu, confirm step, or visual danger styling with spacing — so Edit cannot be fat-fingered into Retire.

## Good to have

1. **Assign-asset and resignation pickers omit employees with pending invites (product question).** When assigning an asset or recording/picking someone for resignation-related flows, employees whose invite is still **pending** (e.g. QA Emp, invite pending) do not appear in the picker. Confirm product intent: if pending invitees should be assignable/selectable, include them (with a "Invite pending" badge); if not, say in the empty/search state that only active (accepted-invite) employees can be chosen.

2. **Names reject digits (e.g. "QA1015") — clarify the rule in the hint.** Person/department-style name fields reject digits (test name patterns like QA1015). The rule may be intentional, but the field should show a **hint at rest or on reject** ("Letters, spaces, apostrophes and hyphens only — numbers are not allowed") instead of silent strip or a generic required error. Align with holiday-name copy where the allowed set is already spelled out.

3. **Linking an employee to an existing member email is blocked without a how-to.** Creating/linking an employee with an email that already belongs to an org member fails with **"This email belongs to a member of your organization"**. The message is correct as a block, but it should briefly explain **how to link an existing member** (e.g. choose from members, or use "Link existing member" on the profile) so HR is not stuck recreating people who already have accounts.
