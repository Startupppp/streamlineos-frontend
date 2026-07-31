# Lane M — Documents, Storage & PII Audit

> READ-ONLY audit. No fixes applied. All citations are `path:line`.

---

## 1. Object-Storage Model

**Provider:** Cloudflare R2 via AWS S3-compatible SDK (`@aws-sdk/client-s3`).  
**Config source:** `backend/src/modules/storage/storage.service.ts:52-59` — env vars `R2_REGION`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `NEXT_PUBLIC_R2_PUBLIC_URL`.  
**Bucket layout:** Single shared bucket (`R2_BUCKET_NAME`) for all tenants. Optional separate KB bucket (`R2_KB_BUCKET_NAME` — referenced in `scripts/setup-r2-buckets.ts:68`). No per-tenant buckets. Keys are namespaced only by folder convention.  
**Object key derivation:** `storage.service.ts:103-104` — `{folder}/{Date.now()}-{sanitizedFilename}`. Key examples:
- HR documents: `uploads/1751234567890-id-proof.pdf`
- Onboarding: `onboarding/1751234567890-passport.pdf`
- e-sign: `signos/{orgId}/{envelopeId}/final-signed.pdf`, `signos/{orgId}/{envelopeId}/certificate.pdf`
- Payslips: `payroll/payslips/{runId}/{timestamp}-payslip-{userId}-{month}.pdf`

Keys are NOT guessable from a record id — they include a millisecond timestamp, not a sequential id. However, if a URL is leaked (e.g. from `pdfUrl`/`fileUrl` column), the key is trivially derivable.

**Bucket visibility:** Determined entirely by whether `NEXT_PUBLIC_R2_PUBLIC_URL` is configured.
- `storage.service.ts:115-116`: `uploadFile()` constructs `url = publicBase + "/" + key`. This PUBLIC URL is what gets persisted to `documents.file_url`, `onboarding_documents.file_url`, `payslip_publications.pdf_url`, `candidate_offers.offer_letter_url`.
- If the R2 bucket is publicly accessible (which the env var strongly implies), ALL uploads are at permanent, unauthenticated, publicly-accessible URLs with no TTL. There is no code that configures the bucket as private.

**Verdict:** Bucket is almost certainly public. All uploaded files are at permanent public URLs unless the operator has explicitly locked the bucket and removed `NEXT_PUBLIC_R2_PUBLIC_URL`. The signed-URL flow (`getFileUrl`) exists but is bypassed by the stored public URL.

---

## 2. Signed URLs

`StorageService.getFileUrl(key, expiresIn)` uses `@aws-sdk/s3-request-presigner` (`storage.service.ts:140-143`).

### Per-artefact type

| Artefact | TTL | Auth re-check before signing? | Controller/Service |
|---|---|---|---|
| General download (`GET /storage/download`) | default 3600s, caller-configurable 60–86400s | org membership check + `resolveFileOwnerOrgId` lookup | `storage.controller.ts:99-148` |
| Candidate vault doc | 900s | `hr:documents:manage` permission + orgId + candidateId + documentId verified | `storage-vault.controller.ts:36-72` |
| e-sign final PDF | 900s | orgId verified on envelope, audit event written | `sign-finalization.service.ts:276-290` |
| e-sign certificate | 900s | orgId verified via `getCertificate` | `sign-finalization.service.ts:293-296` |
| KB attachment (public articles) | 3600s | Only public+published article check — no user auth | `storage-kb.controller.ts:27-77` |
| Payslip download | NOT a signed URL — re-generates PDF from snapshot | orgId + self-check or `payroll:payslips:view` | `publishing.service.ts:381-498` |

### Authorization gaps

**Gap 1 — `resolveFileOwnerOrgId` misses payslip files:**  
`storage.controller.ts:182-193` — the org-ownership lookup queries five tables: `documents`, `onboardingDocuments`, `expenses`, `reimbursements`, `handbookVersions`. It does NOT query `payslip_publications.pdf_url`. Any authenticated user who knows (or guesses) the key pattern `payroll/payslips/{runId}/{timestamp}-payslip-{userId}-{month}.pdf` can call `GET /storage/download?key=...` and receive a signed URL to another employee's or another org's payslip. This is a BOLA P0 (object-level authorization bypass).

**Gap 2 — `resolveFileOwnerOrgId` returns `null` → passes through:**  
`storage.controller.ts:129` — `if (fileOwnerOrgId !== null && fileOwnerOrgId !== orgId)`. If the key is not found in ANY of the five tables (e.g. any e-sign file under `signos/`, any signature image), `fileOwnerOrgId` is `null` and the check is SKIPPED. The signed URL is returned. This means e-sign documents, signature assets, and any other file type not in those five tables are accessible to any authenticated user who supplies the key string.

---

## 3. Upload Safety

| Check | Present? | Source |
|---|---|---|
| Content-Type allowlist | Yes — `ALLOWED_UPLOAD_TYPES` | `storage.controller.ts:33-43` |
| File size cap (business) | Yes — 10MB | `storage.controller.ts:31,69` |
| Magic bytes validation | Yes — `validateMagicBytes()` | `storage.controller.ts:73-75`, `file-signatures.ts` |
| Multer pre-limit | 50MB (inconsistency with 10MB business cap) | `storage.controller.ts:55` |
| Virus scan | NOT implemented — column `av_result` is always `"PENDING"`, never updated | `recruitment-candidate-vault.service.ts:72`; no scanner invocation found anywhere |
| Extension allowlist | Partial — only in `recruitment-candidate-vault.service.ts:53` for vault uploads |
| SVG / HTML upload blocked | Yes — not in allowed list |

**Onboarding controller (`storage-onboarding.controller.ts`):**  
- 5MB cap, 4 MIME types allowed, NO magic bytes check (lacks `validateMagicBytes` call) — `storage-onboarding.controller.ts:24-57`. An attacker can upload a malicious PDF/DOCX by lying about content-type.

---

## 4. Retention & Erasure

**Retention policy:** None found. No scheduled job, cron, or service that purges documents, payslips, or identity proofs after a statutory period. No TTL on any file column.

**Right-to-erasure path:** None found. `employee-mutations.service.ts:180` explicitly blocks soft-delete of employees outside the termination workflow; no downstream purge of documents or stored files is triggered.

**Statutory-retention compliance:** Not enforced in code. Payroll records are not flagged for minimum retention before erasure.

**Candidate vault expiry:** `candidate_documents_vault.expires_at` (date column, `hiring.ts:347`) exists but no sweep job enforces it.

---

## 5. Access Audit Trail

| Surface | READ audited? | Source |
|---|---|---|
| `GET /storage/download` | Yes — `audit.log({ action: "file.download" })` | `storage.controller.ts:133` |
| `GET /storage/image` | No | `storage.controller.ts:151-172` |
| Candidate vault download | Yes — `vaultAccessLogs` INSERT (action: "VIEW") | `storage-vault.controller.ts:57-61` |
| e-sign final PDF download | Yes — `signAuditEvents` INSERT (`document_downloaded`) | `sign-finalization.service.ts:281-288` |
| HR sensitive fields READ | Yes — `audit.log({ action: "sensitive.viewed" })` | `hr-sensitive.service.ts:45-52` |
| Onboarding document list (fileUrl in response) | No | `onboarding-views.service.ts:123-171` |
| Payslip download | No (PDF re-generated, no audit written) | `publishing.service.ts:381-498` |
| `GET /storage/download` for payslip keys | Yes (file.download) — but only generic, doesn't identify payslip owner |

---

## 6. Sensitive-Field Storage

### Encryption helpers

Three independent copies of AES-256-GCM helpers exist:
- `backend/src/modules/hr/onboarding/core/crypto.helpers.ts` — has BOTH `encrypt` and `decrypt`
- `backend/src/modules/hr/lifecycle/crypto.helpers.ts` — decrypt only
- `backend/src/modules/hr/payroll/lib/encryption.ts` — decrypt only

Key derivation: `createHash("sha256").update(process.env.ENCRYPTION_KEY).digest()` — SHA-256 of a raw string. If `ENCRYPTION_KEY` is absent, `encrypt()` returns plaintext silently (`onboarding/core/crypto.helpers.ts:16-17`).

No KMS, HSM, or key rotation mechanism found.

### Per-field verdict

| Field | Table | Column | Type | Encrypted? | Path that writes it |
|---|---|---|---|---|---|
| PAN number | `hr_employee_sensitive_fields` | `pan_number` | TEXT | **PLAINTEXT** | `hr-sensitive.service.ts:103,125` |
| National ID (Aadhaar/SSN/EID/NRIC) | `hr_employee_sensitive_fields` | `national_id` | TEXT | **PLAINTEXT** | `hr-sensitive.service.ts:104,126` |
| Passport number | `hr_employee_sensitive_fields` | `passport_number` | TEXT | **PLAINTEXT** | `hr-sensitive.service.ts:105,127` |
| Bank account number | `hr_employee_sensitive_fields` | `bank_details` | JSONB | **PLAINTEXT** | `hr-sensitive.service.ts:101,123` |
| IFSC code | `hr_employee_sensitive_fields` | `bank_details` | JSONB | **PLAINTEXT** | `hr-sensitive.service.ts:101,123` |
| Salary (cents) | `hr_employee_sensitive_fields` | `salary_amount_cents` | INT | **PLAINTEXT** | `hr-sensitive.service.ts:98,120` |
| Tax ID (via HR core path) | `hr_employee_sensitive_fields` | `tax_id` | TEXT | **PLAINTEXT** | `hr-sensitive.service.ts:102,124` |
| Bank account number | `users` | `bank_details` | TEXT | AES-256-GCM encrypted | `employee-mutations.service.ts:220`, `employee-onboarding.service.ts:130,230` |
| Tax ID | `users` | `tax_id` | TEXT | AES-256-GCM encrypted | `employee-mutations.service.ts:217`, `employee-onboarding.service.ts:127,227` |
| Monthly salary (legacy) | `users` | `monthly_salary` | DECIMAL | **PLAINTEXT** | `employee-mutations.service.ts:218` |
| PAN on payslip PDF | PDF binary | N/A | PDF text | N/A — in-memory only | `payslip-pdf.ts:177` |
| Bank account (masked) | `payroll_bank_batch_items` | `account_masked` | TEXT | Masked (last 4 only) | `payroll-payout.ts:54` |
| OAuth token (job board source) | `candidate_sources` | `oauth_token` | TEXT | **PLAINTEXT** | `hiring.ts:91` |
| Salary (offer) | `candidate_offers` | `offered_salary` | DECIMAL | **PLAINTEXT** | `hiring.ts:443` |
| Biometric template | N/A | Not stored | — | N/A — see §7 |

**Summary:** The NEW HR module path (`HrSensitiveService` → `hr_employee_sensitive_fields`) writes every sensitive identity and financial field in PLAINTEXT. Encryption only exists in the LEGACY `users`-table path. Any DB-level breach exposes PAN, Aadhaar/national ID, passport, and bank details for all employees who went through the new module.

---

## 7. Biometric Handling

**Schema:** `backend/src/db/schema/hr/biometric.ts`.  
**Tables:** `biometric_devices` (device registry) and `biometric_logs` (punch records).  
**Raw template stored?** No. Only: `punch_time`, `punch_type`, `biometric_user_id` (device's own user ID string), `raw_data` (JSONB — device raw punch record, NOT a biometric template).  
**Third-party transmission:** No evidence found. Device integration appears to be direct TCP connection (ZKTeco at port 4370 — `biometric.ts:9`).  
**Consent record:** None found.

---

## 8. e-Sign Flow

1. **Document upload:** Sender uploads PDF to `signos/{orgId}/{envelopeId}/` via `sign-documents.service.ts:76`. SHA-256 hash stored in `sign_documents.sha256_hash` at upload time (`e-sign/documents.ts:19`).

2. **Signing:** Recipients receive tokenised access links. OTP/access codes are hashed (`sign_recipients.access_code_hash`, `otp_code_hash` — `e-sign/recipients.ts:23-24`). Signature assets (drawn images / typed text) stored in `sign_signature_assets` with R2 key, scoped to `orgId + envelopeId + recipientId`.

3. **Finalization:** `sign-finalization.service.ts:52-268` — idempotent finalization via DB-level claim (`UPDATE … WHERE finalized_at IS NULL`). Merges documents, stamps fields, optionally applies watermark, computes SHA-256 of final PDF, uploads to `signos/{orgId}/{envelopeId}/final-signed.pdf`. Certificate PDF generated with full audit trail embedded.

4. **Immutability:** Final PDF key stored in `sign_envelopes.final_pdf_file_key` and `sign_certificates.final_pdf_file_key`. Document hash (`finalPdfHash`) stored in both tables. However, no S3 Object Lock is configured — a storage admin with R2 credentials could delete the object. The DB certificate row would remain but would point to a missing file.

5. **Audit trail:** `sign_audit_events` table is append-only by design (comment at `e-sign/audit.ts:8`). Events: `envelope_created`, `sent_to_recipients`, `recipient_viewed`, `recipient_signed`, `final_pdf_generated`, `certificate_generated`, `document_downloaded`. IP address, actor email, actor name, geolocation all recorded. Sufficient for basic evidentiary use but no tamper-evident log chain (no event-level hash linking).

6. **Download authorization:** `getFinalPdfUrl()` verifies `orgId` on envelope before signing — correct object-level authz. Access is audited.

---

## 9. Leakage Sweep

| # | Location | What leaks | file:line |
|---|---|---|---|
| L1 | `publishing.service.ts:334` | `pdfUrl` (potentially public R2 URL) returned to any `payroll:payslips:view` holder in `listPublications` response — exposes permanent public URLs for all employees' payslips | `publishing.service.ts:334` |
| L2 | `onboarding-views.service.ts:133` | `fileUrl` (potentially public R2 URL for ID proofs, passports) returned in admin list of onboarding documents | `onboarding-views.service.ts:133` |
| L3 | `candidates` list endpoint | `resume_url` (public R2 URL) included in candidate records returned via `candidates.resumeUrl` column | `hiring.ts:111` |
| L4 | `candidate_offers.offer_letter_url` | Public URL of offer letter (which contains salary) returned in offer list endpoints | `recruitment-offers.service.ts:102` |
| L5 | `storage.service.ts:115-116` | `uploadFile()` stores and returns a PUBLIC URL as the canonical `url`; all callers persist this URL in DB columns — the URL itself IS the object with no expiry or auth | `storage.service.ts:115-116` |
| L6 | `hiring.ts:91` | `candidate_sources.oauth_token` — plaintext OAuth token for job boards (LinkedIn, etc.) stored in DB | `hiring.ts:91` |
| L7 | `payslip-pdf.ts:177` | PAN number rendered unmasked inside the payslip PDF — expected for a payslip, but PDF is stored at a public URL (see L1) | `payslip-pdf.ts:177` |
| L8 | `payslip-pdf.ts:275` | Bank masked account, IFSC, bank name in payslip PDF — same public URL risk | `payslip-pdf.ts:275` |
| L9 | `storage.controller.ts:129` | Files in `signos/`, signature image keys, etc. (not in 5-table lookup) return `null` org ownership → signed URL served to ANY authenticated user | `storage.controller.ts:129` |
| L10 | `publishing.service.ts:447-448` | `users.bankDetails` (encrypted ciphertext) fetched and decrypted in-memory for payslip PDF; bank name / masked account written to PDF — acceptable but only safe if public URL risk is resolved | `publishing.service.ts:447-448` |

---

## 10. Endpoint Table

### Storage controllers

| Method | Path | file:line | @RequirePermission | Guards | Validation | Object-level authz |
|---|---|---|---|---|---|---|
| POST | `/storage/upload` | `storage.controller.ts:54` | None | JwtAuthGuard | MIME + size + magic bytes | Org membership (implicit via JWT) |
| GET | `/storage/download` | `storage.controller.ts:99` | None | JwtAuthGuard | key/url param | Org membership + `resolveFileOwnerOrgId` (incomplete — see §2) |
| GET | `/storage/image` | `storage.controller.ts:151` | None | JwtAuthGuard | key param | Org membership only — no file-owner check |
| POST | `onboarding/documents` | `storage-onboarding.controller.ts:35` | None | JwtAuthGuard | MIME + size (no magic bytes) | Own org only |
| POST | `hr/recruitment/candidates/:candidateId/vault/:documentId/url` | `storage-vault.controller.ts:34` | `hr:documents:manage` (manual) | JwtAuthGuard | ParseIntPipe | orgId + candidateId + documentId verified |
| DELETE | `hr/recruitment/candidates/:candidateId/vault/:documentId` | `storage-vault.controller.ts:75` | `hr:documents:manage` (manual) | JwtAuthGuard | ParseIntPipe | orgId + candidateId + documentId verified |
| GET | `public/kb/:slug/attachments` | `storage-kb.controller.ts:26` | None (@Public) | None | slug + query schema | Article must be published+public |

### HR Documents controller

| Method | Path | file:line | @RequirePermission | Guards | Validation | Object-level authz |
|---|---|---|---|---|---|---|
| GET | `hr/documents` | `documents.controller.ts:62` | `hr:documents:view` | JwtAuthGuard + PermissionGuard | listDocumentsSchema | DataScope via `resolveDocumentsScope` |
| POST | `hr/documents` | `documents.controller.ts:72` | `hr:documents:view` (wrong — should be `:create`) | JwtAuthGuard + PermissionGuard | createDocumentSchema | isAdmin flag |
| PATCH | `hr/documents/:documentId` | `documents.controller.ts:90` | `hr:documents:view` (wrong — should be `:update`) | JwtAuthGuard + PermissionGuard | updateDocumentSchema | isAdmin flag |
| DELETE | `hr/documents/:documentId` | `documents.controller.ts:107` | `hr:documents:manage` | JwtAuthGuard + PermissionGuard | ParseIntPipe | isAdmin flag |

### e-sign controllers (key endpoints only)

| Method | Path | file:line | @RequirePermission | Guards | Validation | Object-level authz |
|---|---|---|---|---|---|---|
| GET | `e-sign/envelopes/:id/final-pdf` | `sign-envelopes.controller.ts` | `e-sign:envelopes:view` | JwtAuthGuard + PermissionGuard | ParseIntPipe | orgId on envelope |
| GET | `e-sign/envelopes/:id/certificate` | `sign-certificates.controller.ts` | `e-sign:envelopes:view` | JwtAuthGuard + PermissionGuard | ParseIntPipe | orgId on certificate |
| GET | `payroll/payslips/:publicationId/download` | `publishing.controller.ts:70` | `self:payslips` | JwtAuthGuard + PermissionGuard | ParseIntPipe | self-check + admin permission fallback |

---

## 11. Top Findings

| Sev | file:line | Finding |
|---|---|---|
| P0 | `storage.service.ts:115-116` | `uploadFile()` constructs and persists a PERMANENT PUBLIC URL from `NEXT_PUBLIC_R2_PUBLIC_URL`; HR docs, onboarding ID proofs, and payslips stored at unauthenticated public URLs with no TTL |
| P0 | `hr-sensitive.service.ts:98-127` | All of PAN, national ID (Aadhaar/SSN), passport, bank details, IFSC, salary written PLAINTEXT to `hr_employee_sensitive_fields` — the new HR module path has ZERO encryption |
| P0 | `storage.controller.ts:129` | `resolveFileOwnerOrgId` returns `null` for e-sign files, signature images, payslip files → signed URL returned to ANY authenticated user who supplies the key — cross-tenant BOLA |
| P0 | `onboarding/core/crypto.helpers.ts:16-17` | `encrypt()` silently returns plaintext if `ENCRYPTION_KEY` env var is absent — encrypted fields become plaintext with no error or warning |
| P1 | `storage-onboarding.controller.ts:54-57` | No magic-bytes check on onboarding document uploads — MIME type can be spoofed |
| P1 | `hiring.ts:91` | `candidate_sources.oauth_token` (job board OAuth token) stored plaintext in DB |
| P1 | `publishing.service.ts:334` | `listPublications` returns raw `pdfUrl` (potentially public R2 URL containing PAN + bank data) to any `payroll:payslips:view` holder in the org — leaks all employees' payslip URLs to any HR admin |
| P1 | N/A | No actual virus scan executed — `avResult` set to `"PENDING"` at insert and never updated; malware can be stored and served |
| P1 | `storage.controller.ts:55,69` | Multer accepts 50MB but business cap is 10MB — 50MB file lands in memory before 400 is returned; DoS vector |
| P1 | N/A | No retention/erasure policy or mechanism for any HR document, payslip, or identity proof — PDPA/GDPR statutory non-compliance |
| P2 | `documents.controller.ts:72,90` | CREATE and PATCH document endpoints use `@RequirePermission("hr:documents:view")` not `create`/`update` — permission gate is too permissive |
| P2 | `e-sign/envelopes.ts:49` | Final PDF stored with no S3 Object Lock — storage admin can delete the signed artefact making certificate point to a missing file |
| P2 | `storage.controller.ts:151-172` | `GET /storage/image` — audits org membership but no file-owner org check (`resolveFileOwnerOrgId` not called) — cross-tenant image access for any org member |
| P2 | `publishing.service.ts:381-498` | Payslip download re-generates PDF from live snapshot but does NOT write an audit event — payslip access not logged |
| P2 | `users` table `monthly_salary` | Legacy salary stored as `DECIMAL` (plaintext) alongside encrypted `bank_details` — inconsistent protection level in same row |
