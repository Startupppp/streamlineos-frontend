# Build Open Questions

Only unresolved questions belong here. Defaults are not implementation authorization.

1. Should the requested audit branch use the current local `main` (11 commits ahead) or `origin/main`? **Current action:** branch created from local `main` because the user said to start; no unrelated changes were modified.
2. Which production project is the long-term audit fixture? Project `6` identifies itself as “Build QA Sandbox,” while project `1` contains representative work.
3. Should organization members automatically gain Build membership, or must Build access always be explicitly granted?
4. Can one Managed Product span multiple PM Workspaces? Current route hierarchy suggests no; cross-workspace product strategy may require a different model.
5. Are Portfolios and Programs intentionally distinct? If both only group projects, one should be removed; retain both only if Program owns delivery governance while Portfolio owns investment governance.
6. Is project Wiki a projection of organization Knowledge pages or a project-owned page type synchronized into Knowledge? Evidence points to Knowledge ownership, but migration semantics need confirmation.
7. Which external client actions are allowed beyond read, comment, and change request?
8. Which data classifications prohibit AI processing, export, offline storage, or external portal publication?
9. What retention and legal-hold requirements apply to comments, files, incidents, approvals, and client evidence?
10. Are freelancer organizations billed/permissioned differently, or are they normal organizations with a simpler default setup?
11. Which currencies and rate sources are required for project budget actuals?
12. Which Git providers are production-supported today? A provider must not appear until signature, receipt, replay, and negative tests exist.

## Acceptance criteria

- [ ] Each answered question is removed and captured in the appropriate canonical document.
- [ ] Hard-to-reverse, surprising trade-offs become ADRs only when a real alternative was rejected.
- [ ] No implementation proceeds by silently choosing an answer that changes permissions, tenancy, billing, retention, or external visibility.
