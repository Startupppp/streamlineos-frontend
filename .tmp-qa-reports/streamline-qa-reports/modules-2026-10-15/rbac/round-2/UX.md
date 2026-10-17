# RBAC round 2 - UX notes (2026-10-15)

Not bugs by themselves. Split into what must change and what is good to have. Bug IDs in brackets.

## Must change

1. **No way to make a least-privilege role** [RBAC-B-007]. Owners can only pick Member or Org Admin, and Build offers Member or Admin. A read-only tier needs a custom role builder on /settings/roles, and a place to assign it on the person and in Build.
2. **Wrong reason on the Build denial page** [RBAC-B-005]. "Build is not enabled for your organisation" is shown when the person's Build toggle is off. Owners go to Modules, see Build enabled, and stop. Show the per-person message.
3. **Open sessions do not pick up access changes, and nothing says so.** After an org role change (Member -> Org Admin) or a Build workspace add, the user's open session kept the old sidebar and module switcher. Changes only showed after a reload. Show a banner ("Your access changed. Reload to apply.") or push a refresh.
4. **Lists do not refresh after a save** [RBAC-B-004, RBAC-B-006]. Role change and Build add-member both show stale rows until reload. The owner will save twice or think the save failed.
5. **Viewer sees KB Manage links that lead to a denied page** [RBAC-B-008]. Hide Templates and Import & Export unless the user holds the permission.
6. **Knowledge Base shows content to users with "No access"** [RBAC-B-001]. The Viewer sees the wiki list. The invite dialog says "No access" for Knowledge, which is not what the user gets.
7. **Member HR links land on onboarding with no explanation** [RBAC-B-003]. Show "HR is not available for your account" instead of redirecting to the onboarding form.
8. **Person drawer "Module access" toggles look like grants.** For qa1015view (no grants) HR, Build, Accounting, Payroll and Support show ON. The toggles mean "module enabled for this person" but users read them as access. Label them "Enabled for this person" and show the granted roles next to each one (none for the Viewer).

## Good to have

1. Rename the Viewer preset to "No module access" in the invite dialog. It is a preset, not an org role, and the word "Viewer" suggests a role.
2. Access Restricted pages could offer "Request access" (it is currently just text: "Contact your administrator to request access").
3. Calendar opens for every role with no module grant. If that is intended, say so in the Calendar help; if not, gate it.
4. Module switcher (Documents OS, Build OS) opens an empty panel for the Viewer. Show the modules the user can open, or nothing.
5. The "Added" time on the Build member list shows the user's join time ("about 17 hours ago") for a membership added minutes ago [RBAC-B-006].
6. Roles page header "Recent Changes 0" after a role change: confirm the audit feed is wired, or show the last change there.
7. The companion chat bubble sits over the access-denied message and the top-right actions on every page. Let it be dismissed for the session.
8. Denial reason text varies between runs for the same route (/settings/roles showed settings:view once and settings:rbac:manage another time). Pick one reason per route.
