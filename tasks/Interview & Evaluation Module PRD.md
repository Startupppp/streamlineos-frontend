**\*\*PRODUCT REQUIREMENTS DOCUMENT\*\***

**Interview & Evaluation Module**

**\*\*Project:\*\* Vaivamm Capital CRM**  
**\*\*Version:\*\* 1.0**  
**\*\*Date:\*\* April 11, 2026**  
**\*\*Author:\*\* Tarun (Product Owner)**  
**\*\*Status:\*\* Draft**

**\# 1\. Overview & Objective**  
**Standardize the interview methodology by having scorecards and interview schedules compiled directly within the CRM.**

**\# 2\. Current Flow Analysis**  
**Interviewers take notes in personal docs and send vague thumbs up/down emails to HR.**

**\# 3\. Proposed Enhanced Flow**  
**HR pushes an interview invite through the system; interviewers fill out standardized, immutable scorecards to ensure unbiased evaluations.**

**\# 4\. Feature Specifications**  
**\- Interview scheduling syncing with Calendars.**  
**\- Custom evaluation scorecards (e.g., 1-5 scales for Cultural Fit, Technical Skills).**  
**\- Blind review mode (cannot see others' feedback until submitted).**

**\# 5\. Database Schema Changes**  
**\`interviews\` table.**  
**\`interview\_scorecards\` table.**

**\# 6\. API Endpoints**  
**\- \`POST /api/interviews/schedule\`**  
**\- \`POST /api/interviews/:id/scorecard\`**

**\# 7\. UI/UX Wireframe Descriptions**  
**A form UI showcasing evaluation criteria sliders. A final "Recommend Hire?" toggle. Dashboard for HR summarizing the average scores per candidate.**

**\# 8\. Roles & Permissions**  
**Interviewers can only see their scheduled evaluations. General staff cannot view interview data.**

**\# 9\. Edge Cases & Error Handling**  
**Preventing changes to a scorecard once submitted to maintain integrity in the hiring decision process.**

**\# 10\. Technical Implementation Notes**  
**Sync scheduling with Google/Outlook calendar events using standard iCal generation or API integrations.**

**\# 11\. Success Metrics**  
**\- 100% of interviews backed by a completed scorecard.**

**\# 12\. Timeline & Milestones**  
**Scorecard builder: 1 week; Calendar scheduling integration: 1 week. Total \~2 weeks.**


---

## Status: COMPLETE

## Checklist

### Database
- [x] `interviews` table — `id, candidateId, jobPostingId, scheduledAt, status, format`
- [x] `interview_scorecards` table — `interviewId, interviewerId, ratings JSONB, recommendation, notes, submittedAt`
- [x] `scorecard_templates` table — `id, orgId, name, criteria JSONB, isBlindMode`
- [x] Once `submittedAt` is set, scorecard is IMMUTABLE — API-level check in route handler

### API
- [x] `GET /api/hr/recruitment/interviews` — list interviews
- [x] `POST /api/hr/recruitment/interviews/schedule` — create interview with format + interviewers + optional Meet
- [x] `GET /api/hr/recruitment/interviews/[interviewId]/scorecard` — get scorecard (blind mode supported)
- [x] `POST /api/hr/recruitment/interviews/[interviewId]/scorecard` — submit scorecard (immutable after)
- [x] `GET /api/hr/recruitment/interviews/[interviewId]/scorecard/summary` — HR aggregate view
- [x] `GET /api/hr/recruitment/scorecard-templates` — list templates
- [x] `POST /api/hr/recruitment/scorecard-templates` — create template
- [x] `GET /api/hr/recruitment/interviews/[interviewId]/ics` — download `.ics` calendar invite

### Frontend
- [x] `app/(dashboard)/hr/recruitment/interviews/page.tsx` — interviews list + schedule dialog
- [x] `components/hr/recruitment/scorecard-form.tsx` — star ratings + blind mode indicator + recommendation
- [x] `app/(dashboard)/hr/recruitment/scorecard-templates/page.tsx` — template builder with criteria + blind mode toggle
- [x] `components/hr/recruitment/schedule-interview-dialog.tsx` — schedule with interviewers + Meet link
- [x] Candidate profile: Interviews tab shows all rounds with outcomes + scorecard links

### New Features (Extended)
- [x] **Calibration session** — after all scorecards submitted, HR schedules calibration meeting; notes added to session — `calibration_sessions` table + API `GET/POST/PATCH /api/hr/recruitment/candidates/[candidateId]/calibration` + CalibrationTab in candidate detail
- [x] **AI scorecard analysis** — `POST /api/hr/recruitment/candidates/[candidateId]/composite-score` analyzes all submitted scorecards + resume → composite verdict (STRONG_HIRE/HIRE/ON_FENCE/NO_HIRE) with strengths, concerns, per-round summaries
- [x] **Reference check tracking** — add reference contact; log reference call outcome
- [x] **Interview question bank** — curated questions per role/round that interviewers can use
- [x] **Candidate feedback** — post-interview automated email to candidate asking for experience rating
- [x] **Interviewer performance** — track how long interviewers take to submit scorecards; report for HR

### Verification
- [x] Scorecard immutable after submission — 403 returned on edit attempt — `interviewScorecards.submittedAt` check in scorecard POST route; returns `err("Scorecard already submitted.", 403)`
- [x] Blind mode: other scorecards hidden until current interviewer submits — GET scorecard route filters by `interviewerId = currentUser` when blind mode enabled
- [x] AI composite score generated after all scorecards submitted — "Analyze" button on candidate detail sidebar; shows verdict badge + overall/100 + strengths/concerns
- [x] `pnpm build` passes

---

## Implementation Plan

### Phase 1 — Scorecard Schema & API (3 days)
1. Migration: `interview_scorecards` + `scorecard_templates` tables
2. `POST /api/interviews/[interviewId]/scorecard` — validate not already submitted → insert
3. Immutability: check `submittedAt IS NOT NULL`; return 403
4. Blind mode: `SELECT * FROM interview_scorecards WHERE interviewId = ? AND (interviewerId = ? OR EXISTS(SELECT 1 WHERE submittedAt IS NOT NULL AND interviewerId = ?))`

### Phase 2 — Scorecard UI (3 days)
1. Scorecard form component: star/slider rating per criterion + notes + recommendation toggle
2. Submit confirmation: "Scorecard cannot be edited after submission" warning modal
3. Post-submit: reveal other scorecards comparison table
4. Scorecard summary: averaged radar chart + recommendation histogram

### Phase 3 — Template Builder (2 days)
1. Template builder page at `/hr/recruitment/settings/scorecard-templates`
2. Criteria list: add/remove/reorder + rating scale selector (1-5 stars / 1-10 numeric)
3. Assign template to job posting: select template when creating job

### Phase 4 — AI & Calibration (2 days)
1. AI analysis: after all scorecards submitted → auto-trigger `POST /api/ai/score-candidate`
2. Calibration session: HR creates meeting event; attaches to candidate; adds session notes
3. Reference check form: contact name + phone + outcome + notes
