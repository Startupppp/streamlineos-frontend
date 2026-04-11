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

## Status: NOT STARTED

## Checklist

### Database
- [x] `candidates` table — `source, sourceUrl`
- [x] `job_postings` — published job listings
- [ ] `candidate_sources` table — `id, orgId, platform (LINKEDIN/NAUKRI/INDEED/ORGANIC), oauthToken, isActive, lastSyncedAt`
- [ ] `candidates.externalId` — ID from source platform (for dedup on re-sync)
- [ ] `candidates.duplicateOfId` — merged duplicate FK
- [ ] `job_postings.externalPostingIds` — JSONB: `{ "linkedin": "123", "naukri": "456" }` after posting to job boards
- [ ] Fuzzy dedup on `email + phone` match across sources

### API
- [ ] `GET /api/hr/recruitment/portals` — list connected job board integrations
- [ ] `POST /api/webhooks/linkedin/applications` — LinkedIn webhook listener → parse payload → create candidate
- [ ] `POST /api/webhooks/naukri/applications` — Naukri webhook listener
- [ ] `POST /api/webhooks/indeed/applications` — Indeed webhook listener
- [ ] `GET /api/reports/source-effectiveness` — candidates by source + hire rate per source
- [ ] `POST /api/hr/recruitment/portals/[platform]/sync` — manual sync trigger
- [ ] Inngest: scheduled daily sync (midnight) for all connected job boards
- [ ] `POST /api/job-postings/[jobId]/publish` — push job to connected boards simultaneously
- [ ] Duplicate detection: on inbound application, check `email + phone` → merge if match
- [ ] OAuth2 flow for LinkedIn Recruiter API (`POST /api/integrations/linkedin/auth`)

### Frontend
- [ ] Careers portal: `app/(public)/careers/page.tsx` — public job listing (ISR 5 min revalidate)
- [ ] `app/(public)/careers/[jobId]/page.tsx` — job detail + "Apply Now" form
- [ ] Job application form: Name, Email, Phone, LinkedIn URL, Resume upload, Cover letter
- [ ] Sourcing integrations settings page: `/settings/integrations/recruitment`
  - Connect LinkedIn / Naukri / Indeed with OAuth
  - Show last sync timestamp + candidate count synced
  - Manual "Sync Now" button
- [ ] Source attribution: tag badge on candidate card (LinkedIn / Naukri / Organic)
- [ ] Source effectiveness pie chart: top sourcing channels by volume + hire rate
- [ ] "Post Job" button on job posting: publish to all connected boards simultaneously
- [ ] Duplicate candidate alert: "Similar candidate exists" banner with merge suggestion

### New Features (Extended)
- [ ] **Campus recruitment portal** — dedicated portal for college placements with bulk upload
- [ ] **Employee referral portal** — `/careers/refer` — employee submits candidate + their relationship
- [ ] **Recruitment marketing** — sponsored job posting budget tracking per platform
- [ ] **Candidate nurture** — email drip campaigns to silver-medalist candidates (those who reached final but not hired)
- [ ] **Job board performance report** — cost-per-hire per platform
- [ ] **Aggregator integration** — Shine, Monster, TimesJobs webhook support
- [ ] **AI job description writer** — `/api/ai/suggestions` generates JD from title + requirements input
- [ ] **Auto-screening questionnaire** — applicants answer qualifying questions before resume review

### Verification
- [ ] LinkedIn webhook payload parsed correctly → candidate created
- [ ] Duplicate candidate merged (same email from two platforms)
- [ ] Public careers page SSG/ISR loads in < 1s
- [ ] Source attribution correct on candidate record
- [ ] `pnpm build` passes

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
