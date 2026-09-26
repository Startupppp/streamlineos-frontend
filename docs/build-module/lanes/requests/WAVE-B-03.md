# Wave-B-03 Requests

## R1 — Shared show-once dialog component

`CreateTokenDialog` and `git-created-secret-dialog.tsx` (owned by Wave-B-04) solve the same show-once reveal problem with identical structure: form phase → reveal phase, copy-to-clipboard, warning that the secret will not be shown again. If a third consumer appears, promote to a shared `SecretRevealDialog` component in `components/ui/`. Current two consumers do not yet meet the "second real consumer promotes to shared" threshold from FE-60.

No code change requested now. File this when Wave-B-04 ships so both can be reviewed together.

---

## R2 — (None required)

No migration, schema change, or reserved migration range needed for this wave.
