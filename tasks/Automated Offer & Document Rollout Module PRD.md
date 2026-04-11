**\*\*PRODUCT REQUIREMENTS DOCUMENT\*\***

**Automated Offer & Document Rollout Module**

**\*\*Project:\*\* Vaivamm Capital CRM**  
**\*\*Version:\*\* 1.0**  
**\*\*Date:\*\* April 11, 2026**  
**\*\*Author:\*\* Tarun (Product Owner)**  
**\*\*Status:\*\* Draft**

**\# 1\. Overview & Objective**  
**Upon a candidate successfully clearing the interview rounds and being marked as "Selected," the CRM should automatically generate and distribute personalized onboarding documentation (Offer Letter, Non-Disclosure Agreement (NDA), and standard welcome packets). The objective is to eliminate manual document drafting and reduce the time-to-offer to under 5 minutes.**

**\# 2\. Current Flow Analysis**  
**Currently, when a hiring decision is made, HR representatives must manually open Word document templates, use "Find & Replace" to update names, salaries, and Job IDs, convert the files to PDF, and manually email the candidate with instructions on how to sign. This process is highly susceptible to human error (e.g., leaving a previous candidate's name in the NDA).**

**\# 3\. Proposed Enhanced Flow**  
**When a candidate’s status within the ATS Pipeline is moved to "Selected," an automated trigger engages. A confirmation modal will appear allowing HR to input the final agreed salary and start date. The system then merges these inputs, along with the predefined \`Candidate Name\` and \`Job ID\`, into pre-approved legal templates. The finalized PDFs are instantly generated and emailed to the candidate with a secure link to electronically sign them.**

**\# 4\. Feature Specifications**  
**\- \*\*Dynamic Variable Mapping:\*\* Support for templated tags like \`{{Candidate\_Name}}\`, \`{{Job\_ID}}\`, \`{{Job\_Title}}\`, \`{{Salary}}\`, and \`{{Start\_Date}}\`.**  
**\- \*\*Status-Driven Triggers:\*\* The rollout workflow strictly triggers when the ATS stage changes to "Selected".**  
**\- \*\*Pre-Send Preview:\*\* HR can preview the dynamically populated PDFs in the browser before dispatching.**  
**\- \*\*E-Signature Integration:\*\* Documents are sent via a secure e-signature portal with progress tracking (Sent \-\> Viewed \-\> Signed).**

**\# 5\. Database Schema Changes**  
**\`document\_templates\` table**  
**\- \`id\` (PK)**  
**\- \`title\` (e.g., "Standard NDA", "Senior Dev Offer Letter")**  
**\- \`html\_content\` (Text with variables)**  
**\- \`type\` (Enum: NDA, Offer, Policy)**

**\`candidate\_documents\` table**  
**\- \`id\` (PK)**  
**\- \`candidate\_id\` (FK)**  
**\- \`document\_template\_id\` (FK)**  
**\- \`status\` (Enum: Generated, Sent, Signed)**  
**\- \`signed\_at\` (Timestamp)**

**\# 6\. API Endpoints**  
**\- \`POST /api/candidates/:candidateId/rollout-documents\` (Triggers generation and email dispatch)**  
**\- \`GET /api/documents/templates\` (Fetches available HR templates)**  
**\- \`POST /api/webhooks/esign\` (Webhook listener to track when candidates sign documents)**

**\# 7\. UI/UX Wireframe Descriptions**  
**\*\*Rollout Modal:\*\* When dragging a candidate to "Selected", a modal slides in:**  
**\- \*\*Header:\*\* "Generate Offer for \[Candidate Name\]"**  
**\- \*\*Form Inputs:\*\* Start Date, Final Salary, Manager Assignment.**  
**\- \*\*Document Checklist:\*\* Checkboxes to select which docs to include (Default checked: Offer Letter, NDA).**  
**\- \*\*Primary CTA:\*\* "Generate & Send"**  
**\*\*ATS Detail View:\*\* Inside the candidate's profile, a "Documents" tab shows the real-time status of the NDA and Offer (e.g., "Awaiting Candidate Signature").**

**\# 8\. Roles & Permissions**  
**\- \*\*HR Managers & Recruiters:\*\* Can trigger the document rollout and update templates.**  
**\- \*\*Hiring Managers / Technical Interviewers:\*\* No access to view generated offer letters or salary information.**

**\# 9\. Edge Cases & Error Handling**  
**\- \*\*Missing Required Data:\*\* If a template requires a variable (like \`{{Salary}}\`) and the HR rep leaves it blank, the system must block the generation and highlight the missing field in red.**  
**\- \*\*Template Version Control:\*\* If legal updates the NDA template while an offer is currently out for signature, the candidate signs the version they received. Drafts generated post-update will use the new version.**

**\# 10\. Technical Implementation Notes**  
**\- \*\*PDF Generation:\*\* Use \`puppeteer\` (headless browser printing) or \`pdf-lib\` in the Node.js backend to convert the HTML templates to high-fidelity PDFs.**  
**\- \*\*Signatures:\*\* Utilize an external e-signature service API (e.g., DocuSign API or an open-source equivalent like Documenso) to manage legally binding signatures.**

**\# 11\. Success Metrics**  
**\- 0% incident rate of typos in names/job IDs on finalized legal documents.**  
**\- Time spent drafting and sending offers reduced from 30+ minutes per candidate to \< 2 minutes.**

**\# 12\. Timeline & Milestones**  
**\- \*\*Phase 1: PDF Generation Engine & Variable Mapping\*\* \- 4 days**  
**\- \*\*Phase 2: UI Trigger (Selected Stage Modal)\*\* \- 3 days**  
**\- \*\*Phase 3: E-signature API integration & Webhooks\*\* \- 4 days**  
**\- \*\*Phase 4: QA and Edge Case Testing\*\* \- 2 days**  
**\*\*Total Estimated Time:\*\* \~2.5 weeks**


---

## Status: NOT STARTED

## Checklist

### Database
- [ ] `document_templates` table — `id, orgId, title, type (NDA/OFFER/POLICY/WELCOME), htmlContent, variables TEXT[], version, isActive`
- [ ] `candidate_documents` table — `id, candidateId, templateId, generatedPdfUrl, status (GENERATED/SENT/VIEWED/SIGNED/DECLINED), sentAt, viewedAt, signedAt`
- [ ] `document_templates.version` — integer version counter; old versions archived not deleted
- [ ] `organizations.esignProvider` — which e-sign service is configured (DOCUSIGN / DOCUMENSO / INTERNAL)

### API
- [ ] `GET /api/documents/templates` — list available HR document templates
- [ ] `POST /api/documents/templates` — create/update template with variable tags
- [ ] `POST /api/candidates/[candidateId]/rollout-documents` — generate PDFs from templates + email candidate
- [ ] `GET /api/candidates/[candidateId]/documents` — list generated documents for candidate
- [ ] `POST /api/webhooks/esign` — webhook listener: DocuSign/Documenso notifies on sign/decline
- [ ] `GET /api/documents/templates/preview` — server-render HTML with dummy variables → return preview HTML
- [ ] Variable validation: before generation, check all `{{variable}}` tokens are supplied; return list of missing
- [ ] PDF generation: `puppeteer` (headless Chrome) or `pdf-lib` → convert HTML to PDF
- [ ] Upload generated PDF to R2/S3; store URL in `candidate_documents.generatedPdfUrl`

### Frontend
- [ ] Template editor at `/hr/documents/editor/[documentId]` — rich text editor with variable token insertion
- [ ] Variable tokens toolbar: click to insert `{{Candidate_Name}}`, `{{Job_Title}}`, etc.
- [ ] Template list page: `/hr/email-templates` (repurpose or add document tab)
- [ ] "Generate & Send Offer" modal on candidate card (triggered on SELECTED stage):
  - Form: Final Salary, Start Date, Manager Assignment
  - Document checklist: which templates to include
  - Preview button: renders populated PDF preview in iframe before sending
  - "Generate & Send" CTA
- [ ] Candidate profile → Documents tab: list of sent documents with status badge
- [ ] E-sign status tracker: Sent → Viewed (timestamp) → Signed ✅ / Declined ❌
- [ ] Admin template management: create/edit/preview/archive templates
- [ ] Version history: view all versions of a template

### New Features (Extended)
- [ ] **Bulk offer rollout** — select multiple "Selected" candidates → generate offers for all simultaneously
- [ ] **Conditional sections** — template sections that appear only if a condition is met (e.g., probation clause only for junior roles)
- [ ] **Digital signature internal** — lightweight internal signature (draw or type name); no DocuSign needed for basic cases
- [ ] **Offer acceptance deadline** — set deadline; auto-send reminder 24h before
- [ ] **Counteroffer tracking** — candidate negotiates; log counteroffer + response
- [ ] **Document bundle** — group multiple templates into a bundle sent in one email
- [ ] **Audit trail** — every document action (generated/viewed/signed) logged in `audit_logs`
- [ ] **Template sharing** — share templates between orgs within the same enterprise group

### Verification
- [ ] Missing variable detected and blocked before generation
- [ ] PDF renders correctly (fonts, layout) for Offer + NDA
- [ ] E-sign webhook updates status in real-time
- [ ] Template version archived when updated (old version still viewable)
- [ ] `pnpm build` passes

---

## Implementation Plan

### Phase 1 — PDF Generation Engine (4 days)
1. Migration: `document_templates` + `candidate_documents` tables
2. Template storage: HTML with `{{variable}}` Handlebars-style syntax
3. `lib/pdf/generate-document.ts`:
   - Load template HTML
   - Replace `{{variables}}` with supplied values
   - Use `puppeteer` (server-side): `page.setContent(html) → page.pdf()`
   - Upload to R2/S3 via existing storage utility
4. Variable validation: extract all `{{tokens}}` from template; check all supplied

### Phase 2 — Rollout UI (3 days)
1. "Generate Offer" modal on ATS candidate card (stage = SELECTED)
2. Form: salary, start date, document checkboxes
3. Preview: `GET /api/documents/templates/preview` → display in `<iframe>` or new tab
4. Submit: `POST /api/candidates/[candidateId]/rollout-documents` → generate + email

### Phase 3 — E-Signature Integration (4 days)
1. Documenso (open-source) integration: `lib/esign/documenso.ts`
   - Create signing request → get signing URL
   - Webhook: on `document.signed` → update `candidate_documents.status = SIGNED`
2. Candidate receives email with Documenso signing link
3. Status tracker component: timeline of Sent → Viewed → Signed

### Phase 4 — Template Management UI (2 days)
1. Rich text editor with variable token toolbar (use existing Tiptap editor)
2. Template versioning: increment version on save; archive old version
3. Preview mode: render template with sample data inline
