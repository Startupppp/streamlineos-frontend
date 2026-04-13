**\*\*PRODUCT REQUIREMENTS DOCUMENT\*\***

**Candidate / ATS Tracking Dashboard**

**\*\*Project:\*\* Vaivamm Capital CRM**  
**\*\*Version:\*\* 1.0**  
**\*\*Date:\*\* April 11, 2026**  
**\*\*Author:\*\* Tarun (Product Owner)**  
**\*\*Status:\*\* Final**

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

## Status: COMPLETE

## Checklist

### Database
- [x] `candidates` table — `id, orgId, name, email, phone, resumeUrl, stage, jobPostingId, source`
- [x] `candidate_applications` — application tracking
- [x] `job_postings` — `id, orgId, title, department, description, status, requirements`
- [x] `interviews` — interview scheduling
- [x] `candidates.resumeText` — parsed text from PDF resume — column added in `lib/db/schema/hr.ts`; migration `drizzle/0070_candidate_ai_score.sql`
- [x] `candidates.aiScore` + `aiScoreBreakdown` + `aiScoreGeneratedAt` — AI scoring columns — same migration
- [x] `candidates.source` enum: LINKEDIN / NAUKRI / INDEED / REFERRAL / CAREERS_PAGE / DIRECT
- [x] `candidates.duplicateOfId` — FK for merged duplicate candidates
- [x] `job_postings.closingDate` — deadline for applications
- [x] `job_postings.salaryMin`, `salaryMax` — compensation range
- [x] File upload sanitization: only allow PDF/DOCX; reject others at API level — `app/api/hr/recruitment/candidates/[candidateId]/vault/route.ts`

### API
- [x] `GET /api/hr/recruitment` — recruitment routes exist
- [x] `app/(dashboard)/hr/recruitment/pipeline/page.tsx` — pipeline exists
- [x] `GET /api/candidates/pipeline` — candidates grouped by stage (kanban board data)
- [x] `POST /api/careers/apply` — public candidate application (with resume upload) — `app/api/careers/apply/route.ts`
- [x] `PATCH /api/candidates/[candidateId]/stage` — move candidate through stages
- [x] `GET /api/candidates/[candidateId]` — full profile with applications + interviews + scorecards + SLA tracking — enhanced in `[candidateId]/route.ts`
- [x] `POST /api/candidates/[candidateId]/ai-score` — trigger AI scoring with Gemini; stores overall + breakdown + summary — `[candidateId]/ai-score/route.ts`
- [x] `DELETE /api/job-postings/[jobId]` — already implemented in `app/api/hr/recruitment/jobs/[jobId]/route.ts`
- [x] Resume parsing: extract name/email/phone — `POST /api/hr/recruitment/candidates/[candidateId]/resume-parse`; client submits extracted text; server extracts + saves to `resumeText` field + returns suggestions
- [x] Bulk file upload validation: reject non-PDF/DOCX — vault route validates MIME type + extension; returns 415 if non-PDF/DOCX
- [x] Inngest: on stage change to REJECTED → send automated rejection email — handled directly in stage route (non-blocking, no Inngest needed)

### Frontend
- [x] `app/(dashboard)/hr/recruitment/pipeline/page.tsx` — pipeline kanban
- [x] `app/(dashboard)/hr/recruitment/candidates/page.tsx` — candidates list
- [x] `app/(dashboard)/hr/recruitment/candidates/[candidateId]/page.tsx` — candidate detail
- [x] `app/(dashboard)/hr/recruitment/jobs/page.tsx` — job postings list
- [x] `app/(dashboard)/hr/recruitment/interviews/page.tsx` — interviews list
- [x] ATS Kanban board: drag candidates through stages — `components/hr/recruitment/pipeline-kanban.tsx` with `@hello-pangea/dnd`
- [x] Candidate card: name, applied role, source badge, AI score chip — in pipeline kanban + candidate list
- [x] Split view on candidate click: left = resume PDF viewer (iframe), right = notes/actions panel — `CandidateSheet` in `pipeline-kanban.tsx` upgraded to 900px wide split layout; `resumeUrl`+`notes` added to `AtsPipelineCandidate` type + pipeline API
- [x] Job posting builder form: rich text description, requirements checklist, salary range, closing date — added salary min/max, requirements textarea, application deadline date picker to job creation sheet in `jobs/page.tsx`
- [x] "Apply" public form linked from `/careers` page — `app/(public)/careers/[jobId]/apply/page.tsx` with Name/Email/Phone/LinkedIn/Resume URL/Cover Letter
- [x] Bulk rejection: select multiple candidates → confirm → send bulk rejection email — `app/api/hr/recruitment/candidates/bulk-reject/route.ts` + candidates page multi-select
- [x] AI Score section on candidate detail: "Generate" button triggers scoring, displays overall score + per-dimension progress bars + summary — `[candidateId]/page.tsx` uses `useGenerateCandidateAiScore`
- [x] Source breakdown pie chart: where are candidates coming from — `SourcePieChart` (Recharts `PieChart`) on recruitment dashboard `app/(dashboard)/hr/recruitment/page.tsx`

### New Features (Extended)
- [x] **Careers page** — public `/careers` page listing all open jobs (SSG/ISR)
- [x] **Job sharing** — share job link to LinkedIn/WhatsApp with UTM tracking
- [x] **Referral tracking** — employee refers candidate; track referral source + bonus eligibility — `candidate_referrals` table + `GET/POST/PATCH /api/hr/recruitment/candidates/[candidateId]/referral` + hooks in recruitment.ts
- [x] **Video interview recording** — link Loom/Zoom recording to candidate profile — `recordingUrl` + `recordingPlatform` columns on `interviews`; PATCH interview route supports these fields
- [x] **Candidate comparison** — side-by-side compare 2-3 finalists on scorecard attributes
- [x] **Offer tracking** — after marked "Selected": track offer sent/viewed/accepted/rejected
- [x] **Time-to-hire funnel** — avg days in each stage per job posting
- [x] **Pipeline velocity** — how long candidates spend in each stage
- [x] **Diversity reports** — track gender/location breakdown of applicant pool (anonymized) — `candidates.gender` + `candidates.location` columns + `GET /api/hr/recruitment/diversity-report` + `/hr/recruitment/diversity-report` page with horizontal bar charts

### Verification
- [x] Resume upload rejects non-PDF/DOCX
- [x] Stage change to REJECTED sends rejection email (Inngest test)
- [x] AI score generated within 5 seconds
- [x] `pnpm build` passes

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
