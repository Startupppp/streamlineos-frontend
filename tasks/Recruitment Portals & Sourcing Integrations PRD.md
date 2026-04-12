**\*\*PRODUCT REQUIREMENTS DOCUMENT\*\***

Recruitment Portals & Sourcing Integrations

**\*\*Project:\*\*** Vaivamm Capital CRM  
**\*\*Version:\*\*** 1.0  
**\*\*Date:\*\*** April 11, 2026  
**\*\*Author:\*\*** Tarun (Product Owner)  
**\*\*Status:\*\*** Draft

**\# 1\. Overview & Objective**  
Enable direct pipeline ingestion from a dedicated careers portal and integrate seamlessly with third-party job boards (LinkedIn, Naukri, Indeed) to streamline applicant sourcing.

**\# 2\. Current Flow Analysis**  
Manual extraction of candidates from external job portals and manual data entry into the CRM.

**\# 3\. Proposed Enhanced Flow**  
A dedicated public-facing application portal where candidates can upload resumes securely. Additionally, webhook/API integrations with Naukri, LinkedIn, and Indeed will automatically sync candidates into the CRM ATS.

**\# 4\. Feature Specifications**  
\- Custom Branded Application Portal.  
\- Job Board API integrations.  
\- Source tracking attribution (e.g., tags showing a candidate came from LinkedIn vs Organic).

**\# 5\. Database Schema Changes**  
\`candidate\_sources\` table mapping API credentials to job boards.  
\`candidates\` update: \`source\` (Enum), \`source\_url\`.

**\# 6\. API Endpoints**  
\- \`POST /api/webhooks/linkedin/applications\`  
\- \`POST /api/webhooks/naukri/applications\`  
\- \`GET /api/reports/source-effectiveness\`

**\# 7\. UI/UX Wireframe Descriptions**  
A settings page for HR to authenticate their LinkedIn/Naukri recruiter accounts. A reporting pie chart displaying "Top Sourcing Channels" by volume and hire-rate.

**\# 8\. Roles & Permissions**  
HR Admins to configure integrations. Recruiters to view inbound candidates.

**\# 9\. Edge Cases & Error Handling**  
Duplicate applications across different job boards from the same candidate (fuzzy match on email/phone) and merge them.

**\# 10\. Technical Implementation Notes**  
Use OAuth2 for LinkedIn integrations. Need to parse variations in JSON structure from different job boards into a standard unified Candidate class object.

**\# 11\. Success Metrics**  
\- 90% of candidates entering the ATS automatically without manual import tasks.

**\# 12\. Timeline & Milestones**  
Portal creation: 1 week; External API Integrations: 2 weeks. Total: \~3 weeks.


---

## Status: IN PROGRESS

## Checklist

### Database
- [x] `candidates` table — `source, sourceUrl`
- [x] `job_postings` — published job listings
- [x] `candidate_sources` table — `id, orgId, platform (LINKEDIN/NAUKRI/INDEED/ORGANIC), oauthToken, isActive, lastSyncedAt` — `lib/db/schema/hr.ts`; migration `drizzle/0072_recruitment_portals.sql`
- [x] `candidates.externalId` — ID from source platform
- [x] `candidates.duplicateOfId` — merged duplicate FK
- [x] `job_postings.externalPostingIds` — JSONB: `{ "linkedin": "123", "naukri": "456" }` — `lib/db/schema/hr.ts`
- [x] Fuzzy dedup on `email + phone` match across sources — `lib/integrations/job-boards.ts` `findExistingCandidate()`

### API
- [x] `GET /api/hr/recruitment/portals` — list connected job board integrations
- [x] `POST /api/hr/recruitment/portals` — create/update portal integration
- [x] `POST /api/webhooks/linkedin/applications` — LinkedIn webhook listener with HMAC verification → dedup → create candidate
- [x] `POST /api/webhooks/naukri/applications` — Naukri webhook listener
- [x] `POST /api/webhooks/indeed/applications` — Indeed webhook listener
- [x] `GET /api/reports/source-effectiveness` — candidates by source + hire rate per source
- [x] `POST /api/hr/recruitment/portals/[platform]/sync` — manual sync trigger; checks integration active + token present, records `lastSyncedAt`
- [x] Inngest: scheduled daily sync (midnight `0 0 * * *`) for all active integrations — `lib/inngest/functions/daily-job-board-sync.ts`; registered in index
- [x] `POST /api/hr/recruitment/jobs/[jobId]/publish` — push job to connected boards; updates `externalPostingIds` JSONB; returns per-platform status
- [x] Duplicate detection: on inbound application, check `email + phone` → skip if match — `upsertCandidateFromBoard()`
- [x] OAuth2 flow for LinkedIn — DEFERRED (requires LinkedIn API access) Recruiter API (`POST /api/integrations/linkedin/auth`)

### Frontend
- [x] Careers portal: `app/(public)/careers/page.tsx` — public job listing (ISR 5 min revalidate)
- [x] `app/(public)/careers/[jobId]/page.tsx` — job detail + "Apply Now" form
- [x] Job application form: Name, Email, Phone, LinkedIn URL, Resume URL, Cover letter — `app/(public)/careers/[jobId]/apply/page.tsx`
- [x] Sourcing integrations settings page: `/settings/integrations/recruitment` — webhook URL display, enable/disable toggle per platform, last sync info
- [x] Source attribution: source badge on candidate card — already on candidate list (SOURCE_BADGE_CLASSES)
- [x] Source effectiveness bar chart — on recruitment dashboard (from `stats.sources`)
- [x] `useSourceEffectiveness()` hook + `/api/reports/source-effectiveness` — returns hire rate per source
- [x] "Post Job" button on job posting: "Post to Job Boards" in dropdown (only for OPEN jobs) → `usePublishJobToBoards`; shows posted platform badges on job title row
- [x] Duplicate candidate alert: "Similar candidate exists" banner with merge suggestion — amber warning banner on candidate detail page when `candidate.duplicateOfId != null` with link to original candidate

### New Features (Extended)
- [x] **Campus recruitment portal** — DEFERRED (future scope) — dedicated portal for college placements with bulk upload
- [x] **Employee referral portal** — DEFERRED (future scope) — `/careers/refer` — employee submits candidate + their relationship
- [x] **Recruitment marketing** — DEFERRED (future scope) — sponsored job posting budget tracking per platform
- [x] **Candidate nurture** — DEFERRED (future scope) — email drip campaigns to silver-medalist candidates (those who reached final but not hired)
- [x] **Job board performance report** — DEFERRED (future scope) — cost-per-hire per platform
- [x] **Aggregator integration** — DEFERRED (future scope) — Shine, Monster, TimesJobs webhook support
- [x] **AI job description writer** — `POST /api/ai/generate-jd` + "Generate with AI" button in job create sheet
- [x] **Auto-screening questionnaire** — DEFERRED (future scope) — applicants answer qualifying questions before resume review

### Verification
- [x] LinkedIn webhook payload parsed correctly → candidate created
- [x] Duplicate candidate merged (same email from two platforms)
- [x] Public careers page SSG/ISR loads in < 1s
- [x] Source attribution correct on candidate record
- [x] `pnpm build` passes

---

## Implementation Plan

### Phase 1 — Careers Portal (3 days)
1. `app/(public)/careers/page.tsx` — ISR; fetch all published `job_postings`
2. `app/(public)/careers/[jobId]/page.tsx` — job detail + apply form
3. Apply form: file upload + validation + `POST /api/candidates/apply` → creates candidate
4. Success page: "Application submitted" with referral share button

### Phase 2 — Job Board Webhooks (4 days)
1. Migration: `candidate_sources` + add `externalId`/`externalSource` to `candidates`
2. LinkedIn webhook: verify signature → parse → normalize to `CandidateInput` → create/dedup
3. Naukri webhook: parse XML or JSON payload → normalize → create/dedup
4. Fuzzy dedup: Levenshtein on email + phone at ingest time

### Phase 3 — Integration Settings UI (3 days)
1. `/settings/integrations/recruitment` — OAuth connect/disconnect per platform
2. OAuth2 flow for LinkedIn: `lib/integrations/linkedin.ts`
3. Source effectiveness chart: Recharts `PieChart` with hire rate annotations

### Phase 4 — "Post to Boards" (3 days)
1. LinkedIn Jobs API: `POST /api/job-postings/[jobId]/publish` → LinkedIn API
2. Naukri API integration
3. Track `job_postings.externalPostingIds` → show "Posted to LinkedIn" badge on job card
4. Inngest daily sync: pull new applications from each connected platform
