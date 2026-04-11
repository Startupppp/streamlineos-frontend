**\*\*PRODUCT REQUIREMENTS DOCUMENT\*\***

**Interview Scorecards & Candidate Vault**

**\*\*Project:\*\* Vaivamm Capital CRM**  
**\*\*Version:\*\* 1.0**  
**\*\*Date:\*\* April 11, 2026**  
**\*\*Author:\*\* Tarun (Product Owner)**  
**\*\*Status:\*\* Draft**

**\# 1\. Overview & Objective**  
**Provide structured scorecard inputs for individual interviewers that update instantly, alongside a secure vault tracking candidates' background verification and sensitive documents.**

**\# 2\. Current Flow Analysis**  
**Feedback is unstructured. Documents (ID proofs) are exchanged over unencrypted email channels.**

**\# 3\. Proposed Enhanced Flow**  
**Scorecards are pushed to interviewers; feedback is immediately visible. The candidate uploads ID proofs to a secure, encrypted vault where HR tracks BgV (Background Verification) statuses.**

**\# 4\. Feature Specifications**  
**\- Single Interviewer structured scorecards (Immediate Visibility).**  
**\- Background Verification Tracker (Initiated, Pending, Cleared).**  
**\- Secure Candidate Document Vault (ID proofs, Certs).**

**\# 5\. Database Schema Changes**  
**\`bgv\_tracking\` table.**  
**\`candidate\_documents\_vault\` (S3 integration holding encrypted objects).**

**\# 6\. API Endpoints**  
**\- \`POST /api/candidates/:id/vault/upload\`**  
**\- \`PATCH /api/candidates/:id/bgv-status\`**

**\# 7\. UI/UX Wireframe Descriptions**  
**A candidate profile tab titled 'Verification & Documents'. Shows a checklist of required proofs (Aadhar, PAN, Certifications). A status dropdown for the overriding BgV check.**

**\# 8\. Roles & Permissions**  
**Vault documents are strictly confined to HR Admins. Interviewers can only see the scorecard input mask.**

**\# 9\. Edge Cases & Error Handling**  
**Preventing malware from being uploaded. All Vault files must be scanned by an AV bucket trigger before marking as safe to download.**

**\# 10\. Technical Implementation Notes**  
**AWS S3 with KMS (Key Management Service) encryption at rest for PII data.**

**\# 11\. Success Metrics**  
**\- 100% compliance with data privacy handling for candidate identities.**

**\# 12\. Timeline & Milestones**  
**S3 Vault Integration: 1 week; Scorecards UI: 3 days. Total \~1.5 weeks.**


---

## Status: IN PROGRESS

## Checklist

### Database
- [x] `background_verifications` — BgV tracking table (`candidateId, status, agency, notes`)
- [ ] `candidate_documents_vault` — `id, candidateId, orgId, filename, s3Key, fileType, encryptedAt, avScanned, avResult, uploadedBy, uploadedAt`
- [ ] `vault_access_logs` — `vaultDocumentId, accessedBy, accessedAt, action (VIEW/DOWNLOAD)` — immutable audit trail
- [ ] `candidate_documents_vault.avResult` — AV scan status: PENDING / CLEAN / INFECTED
- [ ] Encryption at rest: S3/R2 server-side encryption (SSE-S3 or SSE-KMS)

### API
- [x] `GET /api/hr/background-verification` — background verification routes
- [ ] `POST /api/candidates/[candidateId]/vault/upload` — multipart upload → S3 → AV scan trigger → save metadata
- [ ] `GET /api/candidates/[candidateId]/vault` — list vault documents (HR only)
- [ ] `GET /api/candidates/[candidateId]/vault/[documentId]/download` — generate signed S3 URL (15 min TTL); log access
- [ ] `DELETE /api/candidates/[candidateId]/vault/[documentId]` — soft delete (HR only)
- [ ] `PATCH /api/candidates/[candidateId]/bgv-status` — update BgV status + notes
- [ ] AV scan: on upload → trigger ClamAV via Lambda/webhook or use VirusTotal API; update `avResult`
- [ ] Block download if `avResult = INFECTED`
- [ ] RBAC: only HR_ADMIN can access vault endpoints; interviewers see only scorecard

### Frontend
- [x] `app/(dashboard)/hr/background-verification/page.tsx` — BgV management
- [ ] Candidate profile → "Verification & Documents" tab
- [ ] Required documents checklist: Aadhar ○ / PAN ○ / Certificates ○ / Offer Letter ○
- [ ] Upload dropzone per document type: drag PDF → shows upload progress → AV scan status
- [ ] AV scan badge: 🕐 Scanning / ✅ Clean / ⛔ Infected (blocks download)
- [ ] BgV status tracker: Initiated → Pending → Cleared → Failed (with agency name + date)
- [ ] Download button per document: generates signed URL → opens in new tab
- [ ] Access log section (HR only): who downloaded what and when
- [ ] Document expiry alert: certifications with `expiresAt` show warning when < 30 days

### New Features (Extended)
- [ ] **External BgV agency integration** — send verification request to agency via API; receive status webhook
- [ ] **Document verification status** — "Verified by HR" stamp per document
- [ ] **Candidate self-upload portal** — secure link sent to candidate to upload their own documents
- [ ] **Document retention policy** — auto-delete candidate documents after N years if not hired
- [ ] **PII data masking** — partially redact Aadhar/PAN numbers in UI; only HR can reveal full number
- [ ] **Bulk export** — HR downloads all verified documents for a candidate as ZIP
- [ ] **Compliance dashboard** — % candidates with completed BgV per job posting

### Verification
- [ ] Non-HR role cannot access vault endpoints (403)
- [ ] AV scan fires on upload; infected file download blocked
- [ ] Signed URL expires after 15 minutes
- [ ] Access log records every download
- [ ] `pnpm build` passes

---

## Implementation Plan

### Phase 1 — Vault Upload & Storage (3 days)
1. Migration: `candidate_documents_vault` + `vault_access_logs`
2. `POST /api/candidates/[candidateId]/vault/upload`:
   - Validate file type (PDF/DOCX/JPG only)
   - Upload to R2 with `orgId/candidates/{candidateId}/{filename}`
   - Trigger AV scan (async): `lib/av/scan.ts` using VirusTotal API or ClamAV webhook
   - Save metadata including `avResult = PENDING`
3. AV result webhook → update `avResult`

### Phase 2 — Secure Download (2 days)
1. `GET /api/candidates/[candidateId]/vault/[documentId]/download`:
   - Block if `avResult = INFECTED`
   - Generate R2/S3 presigned URL with 15-min expiry
   - Log to `vault_access_logs`
2. Frontend: download button → fetch signed URL → `window.open(url)`

### Phase 3 — BgV UI (2 days)
1. Verification tab on candidate profile
2. Required documents checklist with upload slot per type
3. BgV status: dropdown (Initiated/Pending/Cleared/Failed) with agency + notes fields
4. Access log table: who accessed what

### Phase 4 — Candidate Self-Upload (2 days)
1. Generate one-time secure token for candidate document upload
2. `app/(public)/candidate-docs/[token]/page.tsx` — simple upload form
3. Token expires after 48h or after all required docs uploaded
