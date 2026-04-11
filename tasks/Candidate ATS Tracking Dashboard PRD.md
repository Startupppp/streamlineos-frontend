**\*\*PRODUCT REQUIREMENTS DOCUMENT\*\***

**Candidate / ATS Tracking Dashboard**

**\*\*Project:\*\* Vaivamm Capital CRM**  
**\*\*Version:\*\* 1.0**  
**\*\*Date:\*\* April 11, 2026**  
**\*\*Author:\*\* Tarun (Product Owner)**  
**\*\*Status:\*\* Draft**

**\# 1\. Overview & Objective**  
**Streamline the recruitment process by giving HR recruitment teams an Application Tracking System (ATS) to manage job applicants efficiently.**

**\# 2\. Current Flow Analysis**  
**Recruiters rely on email threads to share resumes and manually track which stage a candidate is in.**

**\# 3\. Proposed Enhanced Flow**  
**A unified ATS board allowing candidates to be dragged through hiring stages (Sourced \-\> Interview \-\> Offered \-\> Hired/Rejected).**

**\# 4\. Feature Specifications**  
**\- Candidate stage tracking pipeline.**  
**\- Resume parsing (extracting basic text).**  
**\- Job Posting builder.**  
**\- Automated email templating for rejections/offers.**

**\# 5\. Database Schema Changes**  
**\`job\_postings\` table.**  
**\`candidates\` table (Linked to jobs, storing \`resume\_url\`, \`stage\`).**

**\# 6\. API Endpoints**  
**\- \`GET /api/candidates/pipeline\`**  
**\- \`POST /api/candidates/apply\`**  
**\- \`PATCH /api/candidates/:id/stage\`**

**\# 7\. UI/UX Wireframe Descriptions**  
**A kanban board similar to the Deal Pipeline. Clicking a candidate card opens a split view: Resume PDF viewer on the left, Notes/Actions on the right.**

**\# 8\. Roles & Permissions**  
**HR Recruiters manage pipelines. Hiring Managers can only view candidates assigned to their department's requisitions.**

**\# 9\. Edge Cases & Error Handling**  
**File format rejections. Ensuring uploaded resumes are sanitized to prevent malicious file uploads (only allow PDF/Docx).**

**\# 10\. Technical Implementation Notes**  
**Use AWS S3 or a similar secure bucket for storing candidate resumes. Implement basic OCR/parsing via libraries like \`pdf-parse\`.**

**\# 11\. Success Metrics**  
**\- 30% reduction in Time-to-Hire.**

**\# 12\. Timeline & Milestones**  
**ATS Pipeline backend: 1.5 weeks; Resume upload & Parsing integration: 1.5 weeks. Total: \~3 weeks.**


---

## Status: IN PROGRESS

## Checklist

### Database
- [x] `candidates` table — `id, orgId, name, email, phone, resumeUrl, stage, jobPostingId, source`
- [x] `candidate_applications` — application tracking
- [x] `job_postings` — `id, orgId, title, department, description, status, requirements`
- [x] `interviews` — interview scheduling
- [ ] `candidates.resumeText` — parsed text from PDF resume
- [ ] `candidates.aiScore` — AI-generated candidate score from `/api/ai/score-candidate`
- [ ] `candidates.source` enum: LINKEDIN / NAUKRI / INDEED / REFERRAL / CAREERS_PAGE / DIRECT
- [ ] `candidates.duplicateOfId` — FK for merged duplicate candidates
- [ ] `job_postings.closingDate` — deadline for applications
- [ ] `job_postings.salaryMin`, `salaryMax` — compensation range
- [ ] File upload sanitization: only allow PDF/DOCX; reject others at API level

### API
- [x] `GET /api/hr/recruitment` — recruitment routes exist
- [x] `app/(dashboard)/hr/recruitment/pipeline/page.tsx` — pipeline exists
- [ ] `GET /api/candidates/pipeline` — candidates grouped by stage (kanban board data)
- [ ] `POST /api/candidates/apply` — public candidate application (with resume upload)
- [ ] `PATCH /api/candidates/[candidateId]/stage` — move candidate through stages
- [ ] `GET /api/candidates/[candidateId]` — full profile with resume + activities + scorecards
- [ ] `POST /api/candidates/[candidateId]/ai-score` — trigger AI scoring
- [ ] `DELETE /api/job-postings/[jobId]` — close/archive job posting
- [ ] Resume parsing: extract name/email/phone from PDF using `pdf-parse`
- [ ] Bulk file upload validation: reject non-PDF/DOCX; scan for malware (ClamAV hook or file type check)
- [ ] Inngest: on stage change to REJECTED → send automated rejection email

### Frontend
- [x] `app/(dashboard)/hr/recruitment/pipeline/page.tsx` — pipeline kanban
- [x] `app/(dashboard)/hr/recruitment/candidates/page.tsx` — candidates list
- [x] `app/(dashboard)/hr/recruitment/candidates/[candidateId]/page.tsx` — candidate detail
- [x] `app/(dashboard)/hr/recruitment/jobs/page.tsx` — job postings list
- [x] `app/(dashboard)/hr/recruitment/interviews/page.tsx` — interviews list
- [ ] ATS Kanban board: drag candidates through stages (Sourced → Screened → Interview → Offer → Hired/Rejected)
- [ ] Candidate card: photo (if uploaded), name, applied role, source badge, AI score badge
- [ ] Split view on candidate click: left = resume PDF viewer, right = notes/actions panel
- [ ] Job posting builder form: rich text description, requirements checklist, salary range, closing date
- [ ] "Apply" public form linked from `/careers` page
- [ ] Bulk rejection: select multiple rejected candidates → send bulk rejection email
- [ ] AI Score button: trigger scoring → show radar chart (Technical, Communication, Culture Fit, etc.)
- [ ] Source breakdown pie chart: where are candidates coming from

### New Features (Extended)
- [ ] **Careers page** — public `/careers` page listing all open jobs (SSG/ISR)
- [ ] **Job sharing** — share job link to LinkedIn/WhatsApp with UTM tracking
- [ ] **Referral tracking** — employee refers candidate; track referral source + bonus eligibility
- [ ] **Video interview recording** — link Loom/Zoom recording to candidate profile
- [ ] **Candidate comparison** — side-by-side compare 2-3 finalists on scorecard attributes
- [ ] **Offer tracking** — after marked "Selected": track offer sent/viewed/accepted/rejected
- [ ] **Time-to-hire funnel** — avg days in each stage per job posting
- [ ] **Pipeline velocity** — how long candidates spend in each stage
- [ ] **Diversity reports** — track gender/location breakdown of applicant pool (anonymized)

### Verification
- [ ] Resume upload rejects non-PDF/DOCX
- [ ] Stage change to REJECTED sends rejection email (Inngest test)
- [ ] AI score generated within 5 seconds
- [ ] `pnpm build` passes

---

## Implementation Plan

### Phase 1 — Pipeline Kanban (3 days)
1. `GET /api/candidates/pipeline` — GROUP BY stage for kanban
2. `PATCH /api/candidates/[candidateId]/stage` — with Inngest trigger for REJECTED stage
3. ATS Kanban component: `@hello-pangea/dnd` (reuse lead kanban pattern)
4. Candidate card with source badge + AI score chip

### Phase 2 — Resume & AI Scoring (3 days)
1. Resume upload: `app/api/storage/upload` → R2/S3; file type validation
2. `pdf-parse` text extraction: called after upload; save to `candidates.resumeText`
3. AI scoring: `POST /api/candidates/[candidateId]/ai-score` → `lib/ai/candidate-scoring.ts`
4. Score breakdown radar chart (Recharts `RadarChart`)

### Phase 3 — Job Postings & Public Careers (3 days)
1. Job posting builder: rich text + requirements checklist + salary range
2. `app/(public)/careers/page.tsx` — public jobs listing (ISR revalidate 300s)
3. `app/(public)/careers/[jobId]/page.tsx` — public job detail + apply form
4. Application form: name, email, phone, resume upload, cover letter

### Phase 4 — Bulk Actions & Analytics (2 days)
1. Multi-select candidates → bulk stage change / bulk rejection email
2. Source pie chart + time-in-stage funnel chart
3. Candidate comparison modal: 2-3 candidates side-by-side on scorecard attributes
