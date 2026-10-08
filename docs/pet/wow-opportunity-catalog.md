# Companion Pet — 200 opportunity candidates

**Status:** Research-informed hypotheses, 2026-10-08. Exactly 200 distinct candidates; **zero** are claimed to be unique, implemented, customer-validated, or release-ready by this catalog. The [verification ledger](verification-and-competition.md) separates current source evidence from official competitor claims and live proof.

## How to use this catalog

Each candidate maps to a StreamlineOS surface and a concrete user payoff. This is an idea pool, not a backlog, promise, or a reason to delay the Build completion freeze. The source map at each section identifies where to verify feasibility. Prioritize only after: (1) user interviews or task observation across role clusters, (2) current-source and integration check, (3) dated direct competitor comparison for any differentiation claim, (4) security/privacy and cost assessment, and (5) a measurable pilot outcome. A generic assistant capability is parity even when wrapped in a pet.

**Candidate evidence level:** `HYPOTHESIS` for all 200. Public competitor overlap is [documented separately](verification-and-competition.md). A candidate can graduate to `DIFFERENTIATED` only with a named comparison, observed workflow, plan/tier, date, and customer value evidence. It can graduate to `HAVE` only after target-environment behavior and role/tenant proof. Do not market any row as “no other platform offers this” on this evidence.

**Selection lenses:** user time saved, error prevented, emotional appeal, cross-role reach, data readiness, implementation cost, privacy burden, and testability. Customer impact outweighs animation novelty. Starter journeys for Build, CRM, support/knowledge, HR/self-service, finance/payroll, and inventory/operations are required by the [core PRD](01-intelligence-actions-prd.md), but deep actions in all those modules are not presumed available.

## Presence and interface

**Current source map:** `frontend/components/assistant; frontend/components/layout/mobile`. The source map establishes a relevant product surface, not implementation or customer demand for every idea.

| ID | Candidate | User payoff |
| --- | --- | --- |
| CP-W001 | Original animated pet with clear task states | Make progress visible without opening the panel |
| CP-W002 | Small corner mode with safe anchors | Keep primary controls reachable |
| CP-W003 | Context-aware hello that names the current module | Make the pet useful on first sight |
| CP-W004 | Removable current-record context chip | Prevent answers about the wrong object |
| CP-W005 | One-click ask about selected content | Cut copy-and-paste between modules |
| CP-W006 | Quiet mode that retains assistant access | Let users hide character motion without losing help |
| CP-W007 | Focus-aware prompt tray | Hold suggestions until the user is ready |
| CP-W008 | Pet reaction tied to verified action receipt | Make delight reflect a real outcome |
| CP-W009 | Static high-contrast pet variant | Keep the companion legible to more users |
| CP-W010 | Reduced-motion state choreography | Preserve meaning without movement |
| CP-W011 | Keyboard-only pet navigation | Make every action operable without a pointer |
| CP-W012 | Mobile panel with compact launcher | Keep small screens clear |
| CP-W013 | Pet position presets per user | Fit different workspace layouts |
| CP-W014 | Conversation handoff across device sizes | Resume the same work on mobile |
| CP-W015 | Task-specific suggestion chips | Help users discover safe next actions |
| CP-W016 | Expandable work plan canvas | Give multi-step tasks room to breathe |
| CP-W017 | Pet state timeline for long operations | Show what is waiting and why |
| CP-W018 | Friendly but precise tone presets | Personalize words without changing authority |
| CP-W019 | Preview sandbox for pet settings | Try a look before changing daily work |
| CP-W020 | Voice persona preview after opt-in | Make later speech useful and controllable |

## Knowledge and answer truth

**Current source map:** `backend/src/modules/kb; backend/src/modules/ai/core/tools/self-digest-tools.ts`. The source map establishes a relevant product surface, not implementation or customer demand for every idea.

| ID | Candidate | User payoff |
| --- | --- | --- |
| CP-W021 | Content-grounded answer with source passages | See why the answer is trustworthy |
| CP-W022 | Source conflict comparison | Spot policy disagreement before acting |
| CP-W023 | Answer freshness timestamp | Know when guidance may be stale |
| CP-W024 | Access-checked citation links | Open only sources the user can read |
| CP-W025 | Knowledge gap handoff | Turn an unanswered question into a visible follow-up |
| CP-W026 | Ask why a source was selected | Understand relevance rather than guessing |
| CP-W027 | Answer within the current record context | Avoid broad irrelevant search |
| CP-W028 | Cross-module answer with source map | See which module supports each conclusion |
| CP-W029 | Policy effective-date comparison | Avoid applying an expired rule |
| CP-W030 | Document version difference summary | Understand what changed in guidance |
| CP-W031 | Question-to-owner routing | Reach a human when sources are insufficient |
| CP-W032 | Saved answer with source snapshot | Revisit a decision with its evidence |
| CP-W033 | Private document exclusion explanation | Distinguish no access from no content |
| CP-W034 | Answer confidence tied to evidence coverage | Avoid false certainty from thin retrieval |
| CP-W035 | Source quality warning for draft content | Keep draft guidance from posing as policy |
| CP-W036 | Multi-language answer with original citations | Help users read without losing evidence |
| CP-W037 | Onboarding path built from role-safe knowledge | Learn the organization in context |
| CP-W038 | Knowledge graph of related work objects | Trace page to ticket to decision |
| CP-W039 | Answer correction feedback to source owner | Improve the underlying knowledge |
| CP-W040 | Re-answer after source update | Refresh an answer when its basis changes |

## Build and delivery intelligence

**Current source map:** `backend/src/modules/build; docs/specs/build/module/00-product-decisions-prd.md`. The source map establishes a relevant product surface, not implementation or customer demand for every idea.

| ID | Candidate | User payoff |
| --- | --- | --- |
| CP-W041 | Exact open-BUG count across visible projects | Avoid model-estimated issue totals |
| CP-W042 | Count explanation with reproducible filters | Trust what the number includes |
| CP-W043 | My primary and co-assigned work rollup | See full workload without double counting |
| CP-W044 | Project status-group translation | Make custom status labels comparable |
| CP-W045 | Why-is-this-ticket-stuck narrative | Surface blockers from real dependencies |
| CP-W046 | Ticket change preview and confirmation | Control edits before they happen |
| CP-W047 | Recent ticket change digest | Catch meaningful movement without scanning |
| CP-W048 | Duplicate BUG candidate evidence | Reduce fragmented defect tracking |
| CP-W049 | Reproduction evidence completeness check | Improve bug quality before triage |
| CP-W050 | Test-failure-to-BUG link review | Avoid duplicate actionable defects |
| CP-W051 | Cycle commitment risk preview | See likely spillover early |
| CP-W052 | Release membership gap finder | See what is missing from a release |
| CP-W053 | Dependency chain explanation | Understand downstream impact of a delay |
| CP-W054 | Assignee workload comparison with scope | Choose owners without hidden data |
| CP-W055 | Ticket acceptance-criteria gap detector | Make implementation requests clearer |
| CP-W056 | Project decision-to-ticket trace | Connect rationale to work |
| CP-W057 | Client-visible change preview | Avoid leaking internal details to a portal |
| CP-W058 | Status update draft from actual work | Report progress with links |
| CP-W059 | Bulk ticket proposal with per-item preview | Review a batch before any write |
| CP-W060 | Cross-project blocker handoff | Find the right owner for shared dependencies |

## Meetings and communication

**Current source map:** `backend/src/modules/calendar; backend/src/modules/chat; backend/src/modules/notifications`. The source map establishes a relevant product surface, not implementation or customer demand for every idea.

| ID | Candidate | User payoff |
| --- | --- | --- |
| CP-W061 | Meeting reminder through existing notification identity | Avoid duplicate alerts |
| CP-W062 | Meeting prep brief with cited work context | Arrive ready without manual searching |
| CP-W063 | Attendee-specific action-item recap | Know what the user owns afterward |
| CP-W064 | Decision-to-ticket proposal | Turn a meeting decision into tracked work |
| CP-W065 | Agenda gap detection | Ask for missing topics before a meeting |
| CP-W066 | Meeting overlap explanation | Resolve schedule conflicts knowingly |
| CP-W067 | Time-zone-safe meeting suggestions | Avoid accidental off-hours booking |
| CP-W068 | Unanswered-message triage | Find communications needing a reply |
| CP-W069 | Conversation-to-task proposal | Preserve commitments made in chat |
| CP-W070 | Thread summary with source links | Catch up without losing context |
| CP-W071 | Draft reply with recipient preview | Send only after seeing the audience |
| CP-W072 | Meeting follow-up status tracker | Close loops on promised actions |
| CP-W073 | Quiet-hours-aware reminder pacing | Help without waking users |
| CP-W074 | Per-person meeting context boundary | Keep private notes private |
| CP-W075 | Reschedule impact summary | See which work and attendees are affected |
| CP-W076 | Prepare a handoff before leave | Share outstanding work with consent |
| CP-W077 | Missed meeting recovery brief | See decisions and next steps |
| CP-W078 | Channel mention explanation | Know why a message needs attention |
| CP-W079 | Calendar source freshness indicator | Distinguish synced from stale events |
| CP-W080 | Single digest of communications and work | Replace scattered morning checks |

## HR and personal work

**Current source map:** `backend/src/modules/hr; backend/src/modules/ai/core/tools/self-hr-tools.ts`. The source map establishes a relevant product surface, not implementation or customer demand for every idea.

| ID | Candidate | User payoff |
| --- | --- | --- |
| CP-W081 | Clock-in reminder only on eligible workdays | Avoid false attendance accusations |
| CP-W082 | Personal attendance explanation | Understand missing or disputed entries |
| CP-W083 | Leave balance answer with source policy | Plan time off with correct rules |
| CP-W084 | Leave request preview and confirmation | Avoid accidental submissions |
| CP-W085 | Holiday and shift-aware day plan | Know what actually applies today |
| CP-W086 | Break suggestion with explicit activity opt-in | Support wellbeing without surveillance |
| CP-W087 | Private onboarding guide by role | Find relevant tasks and policies |
| CP-W088 | Expense submission readiness check | Catch missing receipts before sending |
| CP-W089 | Reimbursement status timeline | Know what is pending and why |
| CP-W090 | Timesheet gap suggestion with consent | Complete records without fabricated hours |
| CP-W091 | Payslip question with privacy-safe handling | Understand personal pay details |
| CP-W092 | Benefits eligibility explainer | See rules and remaining uncertainty |
| CP-W093 | Policy change digest by role | Learn only what affects the user |
| CP-W094 | Manager approval queue explanation | Prioritize legitimate pending requests |
| CP-W095 | Performance goal progress evidence | Connect goals to recorded work |
| CP-W096 | Training requirement reminder | Avoid missing required learning |
| CP-W097 | Recognition draft with recipient check | Celebrate the right teammate |
| CP-W098 | Shift swap consequence preview | See coverage effects before request |
| CP-W099 | Private HR case status answer | Know next step without exposure |
| CP-W100 | Employee self-service option menu | Choose the correct form or action |

## CRM and client delivery

**Current source map:** `backend/src/modules/crm; backend/src/modules/ai/core/tools/crm-copilot-tools.ts`. The source map establishes a relevant product surface, not implementation or customer demand for every idea.

| ID | Candidate | User payoff |
| --- | --- | --- |
| CP-W101 | Lead change summary with ownership scope | Know what changed in a pipeline |
| CP-W102 | Next-best-follow-up with cited signals | Contact a lead for a clear reason |
| CP-W103 | Deal risk explanation from real milestones | Spot stalls without opaque scoring |
| CP-W104 | Account meeting prep across modules | Bring work and relationship context together |
| CP-W105 | Client commitment tracker | Keep promises visible to delivery teams |
| CP-W106 | Proposal draft from approved products | Reduce repeat writing with review |
| CP-W107 | Cross-sell clue with evidence | See relevant adjacent customer needs |
| CP-W108 | Contact duplicate review | Avoid split customer histories |
| CP-W109 | CRM activity logging proposal | Capture work without silent writes |
| CP-W110 | Client health change timeline | Understand why sentiment shifted |
| CP-W111 | Renewal readiness checklist | Identify missing work before a deadline |
| CP-W112 | Lead status update preview | Avoid changing the wrong record |
| CP-W113 | Client portal share preview | Know exactly what a customer will see |
| CP-W114 | Customer question routed to owner | Close the loop without guesswork |
| CP-W115 | Project-to-invoice readiness view | Connect delivery completion to billing |
| CP-W116 | Sales-to-delivery handoff brief | Preserve promises and constraints |
| CP-W117 | Meeting outcome to CRM task | Turn conversation into follow-up |
| CP-W118 | Permission-safe customer summary | Share only allowed account facts |
| CP-W119 | Deal stage definition explainer | Use the organization's real process |
| CP-W120 | Client-facing update with source links | Report facts without internal leakage |

## Support and service

**Current source map:** `backend/src/modules/support; backend/src/modules/kb; backend/src/modules/ai/core/tools/self-growth-tools.ts`. The source map establishes a relevant product surface, not implementation or customer demand for every idea.

| ID | Candidate | User payoff |
| --- | --- | --- |
| CP-W121 | Support ticket brief with evidence links | Understand the case quickly |
| CP-W122 | Likely duplicate request review | Reduce parallel support work |
| CP-W123 | Suggested KB answer with citation | Respond from approved knowledge |
| CP-W124 | Escalation reason preview | Route a case for a defensible reason |
| CP-W125 | SLA risk early warning with clock basis | Act before a breach |
| CP-W126 | Customer impact rollup across cases | See breadth of a problem |
| CP-W127 | Knowledge gap creation from unresolved case | Improve future answers |
| CP-W128 | Case-to-BUG proposal with context | Connect support pain to Build |
| CP-W129 | Sensitive-content warning before reply | Avoid leaking private information |
| CP-W130 | Response draft with tone and policy check | Improve quality before sending |
| CP-W131 | Reopen pattern explanation | Find recurring failures |
| CP-W132 | Service trend narrative from exact aggregates | Understand volume shifts |
| CP-W133 | Priority suggestion with evidence | Help triage without hidden scoring |
| CP-W134 | Owner handoff packet | Transfer a case without repeating work |
| CP-W135 | Customer-visible status consistency check | Avoid conflicting statements |
| CP-W136 | Resolved-case evidence checklist | Confirm that closure is supportable |
| CP-W137 | Support macro adaptation to context | Use a template without generic output |
| CP-W138 | Portal self-service path suggestion | Deflect only when answer is sound |
| CP-W139 | Cross-channel case timeline | Unify email chat and ticket history |
| CP-W140 | Post-resolution improvement proposal | Turn patterns into product fixes |

## Finance payroll and operations

**Current source map:** `backend/src/modules/accounting; backend/src/modules/inventory; backend/src/modules/payroll; backend/src/modules/ai/core/tools/ops-copilot-tools.ts`. The source map establishes a relevant product surface, not implementation or customer demand for every idea.

| ID | Candidate | User payoff |
| --- | --- | --- |
| CP-W141 | Inventory stock answer with location scope | Know usable quantity where needed |
| CP-W142 | Stockout warning with demand context | Act before a critical shortage |
| CP-W143 | Purchase need proposal from approved thresholds | Review replenishment before ordering |
| CP-W144 | Transfer impact preview | Avoid moving stock needed elsewhere |
| CP-W145 | Invoice exception explanation | Understand why payment is blocked |
| CP-W146 | Expense-to-project budget view | See delivery cost in context |
| CP-W147 | Budget variance narrative from exact totals | Explain change without guessed arithmetic |
| CP-W148 | Receivable follow-up queue with reasons | Prioritize collections fairly |
| CP-W149 | Payable due-date digest | Avoid preventable late payments |
| CP-W150 | Payroll exception summary for authorized staff | Find gaps before a run |
| CP-W151 | Personal payroll answer with strict privacy | Explain a payslip to its owner |
| CP-W152 | Reconciliation mismatch explainer | Trace differences to records |
| CP-W153 | Tax deadline reminder from configured jurisdiction | Avoid invented obligations |
| CP-W154 | Asset maintenance warning with history | Prevent avoidable downtime |
| CP-W155 | Warehouse exception handoff | Send the right evidence to the right team |
| CP-W156 | Cash runway scenario with assumptions | Explore choices without claiming certainty |
| CP-W157 | Quote-to-invoice lineage | See where commercial values changed |
| CP-W158 | Inventory movement anomaly review | Investigate unexpected changes |
| CP-W159 | Approval dependency map for a payment | Know who must act next |
| CP-W160 | Operational morning brief by role | Start with the few records that matter |

## Trust governance and control

**Current source map:** `backend/src/modules/access; backend/src/modules/ai/core/confirm-actions; backend/src/modules/notifications`. The source map establishes a relevant product surface, not implementation or customer demand for every idea.

| ID | Candidate | User payoff |
| --- | --- | --- |
| CP-W161 | Per-answer permission explanation | Know why some data is unavailable |
| CP-W162 | Action preview with before-and-after fields | Understand exactly what will change |
| CP-W163 | Proposal expiry and version conflict recovery | Avoid stale action execution |
| CP-W164 | One-click decline with recorded reason | Keep rejected suggestions visible |
| CP-W165 | At-most-once execution receipt | Trust that confirmation did not duplicate |
| CP-W166 | Per-user capability panel | See what the pet can currently do |
| CP-W167 | Organization policy intersection view | Understand admin and personal limits |
| CP-W168 | Credit estimate before costly research | Prevent surprise AI spend |
| CP-W169 | Source access revocation check | Keep old links from becoming new leaks |
| CP-W170 | Cross-tenant boundary test dashboard | Surface security proof to release owners |
| CP-W171 | Prompt-injection boundary display | Show when source content was ignored as instructions |
| CP-W172 | Audit trail for pet proposals and outcomes | Investigate consequential actions |
| CP-W173 | Notification why-now explanation | Make nudges accountable |
| CP-W174 | Silent failure with operational reason | Avoid false success when data is missing |
| CP-W175 | Policy simulation before admin rollout | Preview who will lose a capability |
| CP-W176 | Model and data-sharing transparency | Let admins govern external processing |
| CP-W177 | Retention and deletion controls for pet history | Respect user and organization policies |
| CP-W178 | Private conversation separation from manager metrics | Protect personal dialogue |
| CP-W179 | Scoped sandbox for new tool rollout | Test capabilities before tenant-wide exposure |
| CP-W180 | Evidence-backed release scorecard | Ship only behavior proved across boundaries |

## Cross-module orchestration and future bets

**Current source map:** `backend/src/modules/ai/core; frontend/components/layout`. The source map establishes a relevant product surface, not implementation or customer demand for every idea.

| ID | Candidate | User payoff |
| --- | --- | --- |
| CP-W181 | Daily plan assembled from permitted modules | See the day's real commitments |
| CP-W182 | One request split into reviewable action cards | Complete complex work without hidden steps |
| CP-W183 | Dependency-aware work plan preview | See what must happen first |
| CP-W184 | Meeting decision to Build and CRM handoffs | Preserve context across teams |
| CP-W185 | Client issue to support and product loop | Trace pain through resolution |
| CP-W186 | Approval chain explainer across modules | Find the true bottleneck |
| CP-W187 | Natural-language filter to saved view | Turn a question into repeatable analysis |
| CP-W188 | What changed since I last looked summary | Return to work quickly |
| CP-W189 | Work item provenance graph | Trace facts to source records |
| CP-W190 | Scenario compare before any write | Explore outcomes safely |
| CP-W191 | Team handoff package from live records | Reduce status meeting overhead |
| CP-W192 | Automated draft with human publish gate | Save effort while keeping ownership |
| CP-W193 | Role-based starter paths across the suite | Make the universal pet useful on day one |
| CP-W194 | Multi-agent specialist handoff behind one pet | Get deep help without switching identities |
| CP-W195 | Opt-in voice input with visible transcript | Talk naturally while retaining control |
| CP-W196 | Opt-in spoken replies with quiet-hour rules | Hear useful answers when appropriate |
| CP-W197 | Personal preference memory with review/delete | Improve relevance without hidden profiling |
| CP-W198 | Proactive risk brief with cited trigger | Notice a problem early and see why |
| CP-W199 | Customer-ready proof bundle from work events | Show what was delivered and approved |
| CP-W200 | Outcome feedback loop tied to actual completion | Learn which suggestions truly helped |

## Shortlist for discovery, not a shipping commitment

Start interviews and prototypes with CP-W001 (visible task state), CP-W021 (cited content answer), CP-W041 (exact BUG count), CP-W046 (confirmed ticket change), CP-W061 (meeting reminder identity), CP-W064 (decision to ticket), CP-W081 (eligible clock-in), CP-W086 (opt-in break), CP-W104 (account prep), CP-W121 (case brief), CP-W141 (stock answer), CP-W161 (permission explanation), CP-W165 (at-most-once receipt), CP-W181 (daily plan), CP-W182 (reviewable multi-action request), and CP-W200 (outcome feedback). Keep the first release small enough to prove complete journeys for every pilot role cluster.

