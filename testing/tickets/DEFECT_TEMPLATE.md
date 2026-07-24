# Defect ticket template

Copy into a new file `testing/tickets/defects/DEF-YYYYMMDD-NNN.md` or paste into StreamlineOS when MCP is available.

---

## DEF-YYYYMMDD-NNN — short title

| Field | Value |
|-------|-------|
| Severity | P0 / P1 / P2 / P3 |
| Module | Projects / Organization / People / Access / Subscription / Platform / Security / Developer / Chat / Inbox / Calendar |
| Route | e.g. `/projects/[projectId]/approvals` |
| Component | e.g. `ApprovalList`, `ClientPortalBanner` |
| Related QA ticket | e.g. `QA-M1-J-006` |
| Role tested as | owner / PM / contributor / approver / client / denied / … |
| Org | Alpha / Beta |
| Status | open / in-progress / fixed / verified / wontfix |

### Preconditions

-

### Steps to reproduce

1.
2.
3.

### Expected

-

### Actual

-

### Evidence

- Screenshot / recording:
- Network: method, path, status, key response fields (no secrets)
- Console errors:
- Permission key / module gate (if RBAC):

### Backend notes (if known)

- Controller / service:
- Tenant scope confirmed? yes / no / unknown

### Acceptance criteria for fix

- [ ]
- [ ] Re-test as denied user and Org Beta id
- [ ] Regression note added to related `QA-*-X-*` or e2e spec

### Severity guide

- **P0** — tenant leak, authZ bypass, data loss, duplicate money/approval mutation, release blocker
- **P1** — core workflow blocked, missing recovery, sensitive overexposure, key role cannot finish job
- **P2** — material UX / consistency / performance / completeness
- **P3** — polish or validated enhancement
