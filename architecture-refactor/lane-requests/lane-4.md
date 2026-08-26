# Requests for Lane 4 (HR & tenant extensibility)

## From the orchestrator (c18-02), 2026-08-26 — a vault deletion can never be audited

Found while consolidating the duplicated `DELETE /hr/recruitment/candidates/:candidateId/vault/:documentId`
route. **This is a finding, not a request to build something inert** — read the second reason before fixing.

`vault_access_logs` cannot record a deletion, for two independent reasons:

1. The only handler that wrote a `DELETE` audit row was `StorageVaultController.remove`, which was
   shadowed by `RecruitmentCandidateRecordsController.deleteVaultDocument` and never ran. That
   handler is now removed (backend `9d45d2a8`); the surviving handler
   (`recruitment-candidate-vault.service.ts:78-105`) writes no audit row at all.

2. **Even if it did, the row would be destroyed immediately.**
   `db/schema/hr/hiring.ts:367` declares
   `vaultDocumentId ... references(() => candidateDocumentsVault.id, { onDelete: "cascade" }).notNull()`.
   The shadowed handler inserted the log and deleted the document **in the same transaction**, so
   the cascade removed the log it had just written.

Meanwhile `listVaultAccessLogs` (`recruitment-candidate-vault.service.ts:107`) is live and surfaced
at `frontend/hooks/api/hr/recruitment/candidate-details.ts:235-238`. The screen therefore shows
`VIEW` entries and can never show a `DELETE` — which reads as "nobody deleted anything".

**Do not simply add an insert to the surviving service.** With the cascade in place that write is
inert, and an audit trail that silently drops its most important event is worse than none. Closing
this needs a schema change in your territory: make `vaultDocumentId` nullable with
`onDelete: "set null"`, and denormalise enough identity onto the log row (filename, documentType)
that the entry stays meaningful once its parent is gone — then add the insert.

Not raised as its own ticket. It belongs to whichever of c16/c23 touches `hr/hiring.ts`, or to a new
one if neither does. `hr:employees:manage` is the key the live route enforces; the dead one checked
`hr:documents:manage`.
