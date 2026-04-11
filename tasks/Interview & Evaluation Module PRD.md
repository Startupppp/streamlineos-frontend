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

## Status: IN PROGRESS

## Checklist

### Database
- [x] `interviews` table — `id, candidateId, jobPostingId, scheduledAt, status, format`
- [ ] `interview_scorecards` table — `id, interviewId, interviewerId, ratings JSONB, recommendation (HIRE/NO_HIRE/MAYBE), notes, submittedAt`
- [ ] `scorecard_templates` table — `id, orgId, name, criteria TEXT[]` (e.g., ["Technical Skills", "Communication", "Culture Fit", "Problem Solving"])
- [ ] `interviews.scorecardTemplateId` — which template to use for this round
- [ ] `interview_scorecards.isBlindMode` — hide other scorecards until this one submitted
- [ ] Once `submittedAt` is set, scorecard is IMMUTABLE — DB trigger or API-level check

### API
- [x] `GET /api/hr/recruitment` — recruitment APIs
- [ ] `POST /api/interviews/schedule` — create interview + assign scorecard template + send invites
- [ ] `GET /api/interviews/[interviewId]/scorecard` — get scorecard for this interviewer (blind: hide others' until submitted)
- [ ] `POST /api/interviews/[interviewId]/scorecard` — submit scorecard (once only; immutable after)
- [ ] `GET /api/interviews/[interviewId]/scorecard/summary` — HR view: all scorecards for this interview (revealed after all submitted)
- [ ] `GET /api/scorecards/templates` — list scorecard templates
- [ ] `POST /api/scorecards/templates` — create template
- [ ] Immutability check: `if (scorecard.submittedAt) return 403 "Scorecard already submitted"`
- [ ] Blind mode: only return other scorecards after `submittedAt IS NOT NULL` for current interviewer
- [ ] iCal generation: `GET /api/interviews/[interviewId]/ics` → download `.ics` calendar invite
- [ ] Google Calendar event creation on schedule (using existing Meet integration)

### Frontend
- [x] `app/(dashboard)/hr/recruitment/interviews/page.tsx` — interviews list
- [ ] Scorecard form: sliders/star ratings (1-5) per criterion + free-text notes + "Recommend Hire?" toggle
- [ ] Blind mode indicator: "Your scorecard is hidden until submitted"
- [ ] Post-submit: reveal all other interviewers' scorecards side-by-side
- [ ] Scorecard summary (HR view): averaged scores per criterion + recommendation breakdown (X hire / Y no-hire)
- [ ] Interview schedule modal: add multiple interview rounds (Phone Screen → Technical → Cultural → Final)
- [ ] Scorecard template builder: name rounds, define criteria, set rating scale
- [ ] "Send Calendar Invite" button: creates `.ics` download + Google Meet link
- [ ] Interviewer dashboard: "My Upcoming Interviews" + "Pending Scorecards" list
- [ ] Candidate timeline: shows all interview rounds with outcome

### New Features (Extended)
- [ ] **Calibration session** — after all scorecards submitted, HR schedules calibration meeting; notes added to session
- [ ] **AI scorecard analysis** — `/api/ai/score-candidate` analyzes all scorecards + resume → gives composite recommendation
- [ ] **Reference check tracking** — add reference contact; log reference call outcome
- [ ] **Interview question bank** — curated questions per role/round that interviewers can use
- [ ] **Candidate feedback** — post-interview automated email to candidate asking for experience rating
- [ ] **Interviewer performance** — track how long interviewers take to submit scorecards; report for HR

### Verification
- [ ] Scorecard immutable after submission — 403 returned on edit attempt
- [ ] Blind mode: other scorecards hidden until current interviewer submits
- [ ] AI composite score generated after all scorecards submitted
- [ ] `pnpm build` passes

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
