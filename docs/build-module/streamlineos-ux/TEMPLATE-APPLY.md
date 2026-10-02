# Apply template evidence

- Status: VERIFIED
- Timestamp: 2026-09-30 (UTC+5:30)
- Organization shown in app header: PXC-Design-A-20260930
- Template: PXC-Template-1
- Apply flow: Templates page exposed `Use Template`; dialog title was `Apply “PXC-Template-1”`.
- Create form: changed the suggested name to `PXC-From-Template-1`; the dialog preview stated `1 tasks will be created` and listed `Default task`.
- Result: success notification stated `Project "PXC-From-Template-1" created with 1 tasks! Key: PXC-901`.
- Project URL: https://www.streamlineos.in/build/52
- Seeded-task verification: https://www.streamlineos.in/build/52/backlog shows `PXC-901-1`, type `Task`, title `Default task`, status `To Do`, priority `Medium`.

## UX notes

- Template card exposes a clear `Use Template` CTA and a destructive `Delete` action separately.
- Apply dialog defaults a dated template name but permits an explicit project name; no overwrite warning appeared because a new project name was used.
- Start Date and End Date are optional controls in the dialog.

No sign-out, member/role, Client Access, or deletion actions were used.
