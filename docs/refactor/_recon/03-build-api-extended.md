# Build API Extended Recon — Lane 03

> Covers every file in `backend/src/modules/build/` NOT in the core lane, plus all
> `build-*` sibling modules that serve `@Controller("build/...")` routes.
> All claims cite `file:line`. Every permission key is quoted from source.

---

## 1. Endpoint Table

| Method | Route | Controller:line | Guards | @RequirePermission (exact) | @RequireModule? | Paginated? | Max limit | Tenant-scoped WHERE? | Service method |
|--------|-------|-----------------|--------|-----------------------------|-----------------|------------|-----------|----------------------|----------------|
| GET | build/resource-allocation | projects-reports.controller.ts:37 | JWT+Perm | `"build:view"` | build | No | none | orgId | `resourceAllocation` |
| GET | build/:projectId/analytics | projects-reports.controller.ts:42 | JWT+Perm | `"build:view"` | build | No | none | orgId+projectId | `getProjectAnalytics` |
| GET | build/:projectId/reports/burnup | projects-reports.controller.ts:51 | JWT+Perm | `"build:view"` | build | No | sprint-bounded | orgId | `burnup` |
| GET | build/:projectId/reports/cfd | projects-reports.controller.ts:62 | JWT+Perm | `"build:view"` | build | No | days param | orgId | `cfd` |
| GET | build/:projectId/reports/critical-path | projects-reports.controller.ts:71 | JWT+Perm | `"build:view"` | build | No | none | orgId+projectId | `criticalPath` |
| GET | build/:projectId/reports/velocity | projects-reports.controller.ts:80 | JWT+Perm | `"build:view"` | build | No | sprint-bounded | orgId | `velocity` |
| GET | build/:projectId/reports/cycle-time | projects-reports.controller.ts:89 | JWT+Perm | `"build:view"` | build | No | 12wk fixed | orgId+projectId | `getCycleTimeReport` |
| GET | build/:projectId/reports/lead-time | projects-reports.controller.ts:98 | JWT+Perm | `"build:view"` | build | No | 12wk fixed | orgId+projectId | `getLeadTimeReport` |
| POST | build/:projectId/reports/snapshot | projects-reports.controller.ts:107 | JWT+Perm | `"build:manage"` | build | — | — | orgId+projectId | `snapshot` |
| GET | build/:projectId/automations | projects-automations.controller.ts:23 | JWT+Perm | `"build:view"` | build | No | 100 | orgId+projectId | `listAutomations` |
| POST | build/:projectId/automations | projects-automations.controller.ts:32 | JWT+Perm | `"build:view"` ⚠️ | build | — | — | orgId | `createAutomation` |
| PATCH | build/:projectId/automations/:id | projects-automations.controller.ts:43 | JWT+Perm | `"build:view"` ⚠️ | build | — | — | orgId | `updateAutomation` |
| DELETE | build/:projectId/automations/:id | projects-automations.controller.ts:54 | JWT+Perm | `"build:view"` ⚠️ | build | — | — | orgId | `deleteAutomation` |
| GET | build/:projectId/budget | projects-budget.controller.ts:26 | JWT+Perm | `"build:manage"` | build | — | — | orgId+projectId | `getBudget` |
| PATCH | build/:projectId/budget | projects-budget.controller.ts:35 | JWT+Perm | `"build:manage"` | build | — | — | orgId+projectId | `updateBudget` |
| GET | build/:projectId/releases | projects-releases.controller.ts:26 | JWT+Perm | `"build:view"` | build | No | 100 | orgId+projectId | `listReleases` |
| POST | build/:projectId/releases | projects-releases.controller.ts:35 | JWT+Perm | `"build:manage"` | build | — | — | orgId | `createRelease` |
| PATCH | build/:projectId/releases/:releaseId | projects-releases.controller.ts:47 | JWT+Perm | `"build:manage"` | build | — | — | orgId | `updateRelease` |
| DELETE | build/:projectId/releases/:releaseId | projects-releases.controller.ts:57 | JWT+Perm | `"build:manage"` | build | — | — | orgId | `deleteRelease` |
| POST | build/:projectId/releases/:releaseId/tickets | projects-releases.controller.ts:67 | JWT+Perm | `"build:tickets:update"` | build | — | — | orgId | `addTicketToRelease` |
| DELETE | build/:projectId/releases/:releaseId/tickets/:ticketId | projects-releases.controller.ts:78 | JWT+Perm | `"build:tickets:update"` | build | — | — | orgId | `removeTicketFromRelease` |
| GET | build/roadmap | projects-roadmap.controller.ts:50 | JWT+Perm | `"build:roadmap:view"` | build | No (see §3) | 100 | orgId | `listRoadmap` |
| POST | build/roadmap | projects-roadmap.controller.ts:58 | JWT+Perm | `"build:roadmap:manage"` | build | — | — | orgId | `createRoadmap` |
| PATCH | build/roadmap/:itemId | projects-roadmap.controller.ts:68 | JWT+Perm | `"build:roadmap:manage"` | build | — | — | orgId | `updateRoadmap` |
| DELETE | build/roadmap/:itemId | projects-roadmap.controller.ts:78 | JWT+Perm | `"build:roadmap:manage"` | build | — | — | orgId | `deleteRoadmap` |
| GET | build/feedback | projects-roadmap.controller.ts:88 | JWT+Perm | `"build:roadmap:view"` | build | No | 100 | orgId | `listFeedback` |
| POST | build/feedback | projects-roadmap.controller.ts:98 | JWT+Perm | `"build:roadmap:manage"` | build | — | — | orgId | `createFeedback` |
| PATCH | build/feedback/:postId | projects-roadmap.controller.ts:107 | JWT+Perm | `"build:roadmap:manage"` | build | — | — | orgId | `updateFeedback` |
| DELETE | build/feedback/:postId | projects-roadmap.controller.ts:117 | JWT+Perm | `"build:roadmap:manage"` | build | — | — | orgId | `deleteFeedback` |
| GET | build/changelog | projects-roadmap.controller.ts:128 | JWT+Perm | `"build:roadmap:view"` | build | No | 100 | orgId | `listChangelog` |
| POST | build/changelog | projects-roadmap.controller.ts:136 | JWT+Perm | `"build:roadmap:manage"` | build | — | — | orgId | `createChangelog` |
| PATCH | build/changelog/:entryId | projects-roadmap.controller.ts:146 | JWT+Perm | `"build:roadmap:manage"` | build | — | — | orgId | `updateChangelog` |
| DELETE | build/changelog/:entryId | projects-roadmap.controller.ts:156 | JWT+Perm | `"build:roadmap:manage"` | build | — | — | orgId | `deleteChangelog` |
| GET | build/:projectId/custom-fields | projects-custom-fields.controller.ts:25 | JWT+Perm | `"build:view"` | build | No | none | orgId+projectId | `listFields` |
| POST | build/:projectId/custom-fields | projects-custom-fields.controller.ts:34 | JWT+Perm | `"build:manage"` | build | — | — | orgId+projectId | `createField` |
| PATCH | build/:projectId/custom-fields/:fieldId | projects-custom-fields.controller.ts:45 | JWT+Perm | `"build:manage"` | build | — | — | orgId | `updateField` |
| DELETE | build/:projectId/custom-fields/:fieldId | projects-custom-fields.controller.ts:55 | JWT+Perm | `"build:manage"` | build | — | — | orgId | `deleteField` |
| GET | build/:projectId/tickets/:ticketId/custom-field-values | projects-custom-fields.controller.ts:65 | JWT+Perm | `"build:tickets:view"` | build | — | — | orgId+projectId+ticketId | `getTicketValues` |
| POST | build/:projectId/tickets/:ticketId/custom-field-values | projects-custom-fields.controller.ts:75 | JWT+Perm | `"build:tickets:update"` | build | — | — | orgId+projectId+ticketId | `upsertTicketValues` |
| GET | build/templates | projects-templates.controller.ts:35 | JWT+Perm | `"build:view"` | build | No | 50 | orgId | `listTemplates` |
| POST | build/templates | projects-templates.controller.ts:41 | JWT+Perm | `"build:manage"` | build | — | — | orgId | `createTemplate` |
| DELETE | build/templates/:templateId | projects-templates.controller.ts:51 | JWT+Perm | `"build:manage"` | build | — | — | orgId | `deleteTemplate` |
| POST | build/templates/:templateId/apply | projects-templates.controller.ts:60 | JWT+Perm | `"build:manage"` | build | — | — | orgId | `applyTemplate` |
| GET | build/customers | projects-customers.controller.ts:21 | JWT+Perm | `"build:customers:view"` | build | Yes | limit param | orgId | `list` |
| GET | build/members | projects-workspace-members.controller.ts:33 | JWT+Perm | `"build:members:view"` | build | Yes | limit param | orgId | `list` |
| POST | build/members | projects-workspace-members.controller.ts:43 | JWT+Perm | `"build:members:manage"` | build | — | — | orgId | `add` |
| DELETE | build/members/:userId | projects-workspace-members.controller.ts:54 | JWT+Perm | `"build:members:manage"` | build | — | — | orgId | `remove` |
| GET | build/:projectId/webhooks | projects-webhooks.controller.ts:23 | JWT+Perm | `"build:manage"` | build | No | none | orgId+projectId | `listWebhooks` |
| POST | build/:projectId/webhooks | projects-webhooks.controller.ts:31 | JWT+Perm | `"build:manage"` | build | — | — | orgId+projectId | `createWebhook` |
| DELETE | build/:projectId/webhooks/:webhookId | projects-webhooks.controller.ts:44 | JWT+Perm | `"build:manage"` | build | — | — | orgId | `deleteWebhook` |
| GET | build/:projectId/webhooks/:webhookId/deliveries | projects-webhooks.controller.ts:54 | JWT+Perm | `"build:manage"` | build | No | 20 | orgId+projectId+webhookId | `listDeliveries` |
| POST | build/:projectId/webhooks/:webhookId/test | projects-webhooks.controller.ts:64 | JWT+Perm | `"build:manage"` | build | — | — | orgId+projectId+webhookId | `sendTest` |
| GET | build/portfolios | portfolios.controller.ts:39 | JWT+Perm | `"build:portfolios:view"` | build | Yes | limit | orgId | `listPortfolios` |
| GET | build/portfolios/:portfolioId | portfolios.controller.ts:48 | JWT+Perm | `"build:portfolios:view"` | build | — | — | orgId | `getPortfolio` |
| POST | build/portfolios | portfolios.controller.ts:57 | JWT+Perm | `"build:portfolios:manage"` | build | — | — | orgId | `createPortfolio` |
| PATCH | build/portfolios/:portfolioId | portfolios.controller.ts:67 | JWT+Perm | `"build:portfolios:manage"` | build | — | — | orgId | `updatePortfolio` |
| DELETE | build/portfolios/:portfolioId | portfolios.controller.ts:77 | JWT+Perm | `"build:portfolios:manage"` | build | — | — | orgId | `deletePortfolio` |
| POST | build/portfolios/:portfolioId/projects | portfolios.controller.ts:87 | JWT+Perm | `"build:portfolios:manage"` | build | — | — | orgId | `linkProject` |
| DELETE | build/portfolios/:portfolioId/projects/:projectId | portfolios.controller.ts:97 | JWT+Perm | `"build:portfolios:manage"` | build | — | — | orgId | `unlinkProject` |
| GET | build/programs | programs.controller.ts:39 | JWT+Perm | `"build:programs:view"` | build | Yes | limit | orgId | `listPrograms` |
| GET | build/programs/:programId | programs.controller.ts:48 | JWT+Perm | `"build:programs:view"` | build | — | — | orgId | `getProgram` |
| POST | build/programs | programs.controller.ts:57 | JWT+Perm | `"build:programs:manage"` | build | — | — | orgId | `createProgram` |
| PATCH | build/programs/:programId | programs.controller.ts:67 | JWT+Perm | `"build:programs:manage"` | build | — | — | orgId | `updateProgram` |
| DELETE | build/programs/:programId | programs.controller.ts:77 | JWT+Perm | `"build:programs:manage"` | build | — | — | orgId | `deleteProgram` |
| POST | build/programs/:programId/projects | programs.controller.ts:87 | JWT+Perm | `"build:programs:manage"` | build | — | — | orgId | `linkProject` |
| DELETE | build/programs/:programId/projects/:projectId | programs.controller.ts:97 | JWT+Perm | `"build:programs:manage"` | build | — | — | orgId | `unlinkProject` |
| GET | build/:projectId/forms | forms.controller.ts:38 | JWT+Perm | `"build:forms:view"` | build | Yes | query | orgId+projectId | `listForms` |
| GET | build/:projectId/forms/:formId | forms.controller.ts:47 | JWT+Perm | `"build:forms:view"` | build | — | — | orgId+projectId | `getForm` |
| POST | build/:projectId/forms | forms.controller.ts:57 | JWT+Perm | `"build:forms:manage"` | build | — | — | orgId+projectId | `createForm` |
| PATCH | build/:projectId/forms/:formId | forms.controller.ts:67 | JWT+Perm | `"build:forms:manage"` | build | — | — | orgId+projectId | `updateForm` |
| DELETE | build/:projectId/forms/:formId | forms.controller.ts:79 | JWT+Perm | `"build:forms:manage"` | build | — | — | orgId+projectId | `deleteForm` |
| GET | build/:projectId/forms/:formId/submissions | submissions.controller.ts:33 | JWT+Perm | `"build:forms:manage"` | build | No | none ⚠️ | orgId+projectId+formId | `listSubmissions` |
| POST | build/:projectId/forms/:formId/submissions | submissions.controller.ts:43 | JWT+Perm | `"build:forms:view"` | build | — | — | orgId+projectId+formId | `createSubmission` |
| PATCH | build/:projectId/forms/:formId/submissions/:submissionId | submissions.controller.ts:55 | JWT+Perm | `"build:forms:manage"` | build | — | — | orgId+projectId+formId | `updateSubmission` |
| GET | build/:projectId/milestones | workspace.controller.ts:54 | JWT+Perm | `"build:view"` | build | No | none | orgId+projectId | `listMilestones` |
| POST | build/:projectId/milestones | workspace.controller.ts:63 | JWT+Perm | `"build:workspace:manage"` | build | — | — | orgId+projectId | `createMilestone` |
| PATCH | build/:projectId/milestones/:milestoneId | workspace.controller.ts:74 | JWT+Perm | `"build:workspace:manage"` | build | — | — | orgId | `updateMilestone` |
| DELETE | build/:projectId/milestones/:milestoneId | workspace.controller.ts:84 | JWT+Perm | `"build:workspace:manage"` | build | — | — | orgId | `deleteMilestone` |
| GET | build/:projectId/intake | workspace.controller.ts:101 | JWT+Perm | `"build:view"` | build | Yes | query | orgId+projectId | `listIntake` |
| POST | build/:projectId/intake | workspace.controller.ts:111 | JWT+Perm | `"build:workspace:manage"` | build | — | — | orgId+projectId | `createIntake` |
| PATCH | build/:projectId/intake/:requestId | workspace.controller.ts:122 | JWT+Perm | `"build:workspace:manage"` | build | — | — | orgId | `updateIntake` |
| GET | build/:projectId/views | workspace.controller.ts:139 | JWT+Perm | `"build:view"` | build | No | none | orgId+userId+projectId | `listViews` |
| POST | build/:projectId/views | workspace.controller.ts:148 | JWT+Perm | `"build:workspace:manage"` | build | — | — | orgId+projectId | `createView` |
| PATCH | build/:projectId/views/:viewId | workspace.controller.ts:158 | JWT+Perm | `"build:workspace:manage"` | build | — | — | orgId+userId | `updateView` |
| DELETE | build/:projectId/views/:viewId | workspace.controller.ts:168 | JWT+Perm | `"build:workspace:manage"` | build | — | — | orgId+userId | `deleteView` |
| GET | build/views | workspace.controller.ts:187 | JWT+Perm | `"build:view"` | build | No | none | orgId+userId | `listWorkspaceViews` |
| POST | build/views | workspace.controller.ts:195 | JWT+Perm | `"build:workspace:manage"` | build | — | — | orgId+userId | `createWorkspaceView` |
| PATCH | build/views/:viewId | workspace.controller.ts:204 | JWT+Perm | `"build:workspace:manage"` | build | — | — | orgId+userId | `updateWorkspaceView` |
| DELETE | build/views/:viewId | workspace.controller.ts:213 | JWT+Perm | `"build:workspace:manage"` | build | — | — | orgId+userId | `deleteWorkspaceView` |
| GET | whiteboards | workspace.controller.ts:229 | JWT+Perm | `"build:view"` | build | No | none ⚠️ | orgId | `listAllWhiteboards` |
| GET | build/:projectId/whiteboards | workspace.controller.ts:243 | JWT+Perm | `"build:view"` | build | No | none | orgId+projectId | `listWhiteboards` |
| POST | build/:projectId/whiteboards | workspace.controller.ts:252 | JWT+Perm | `"build:whiteboards:manage"` | build | — | — | orgId+projectId | `createWhiteboard` |
| GET | build/:projectId/whiteboards/:whiteboardId | workspace.controller.ts:262 | JWT+Perm | `"build:view"` | build | — | — | orgId+projectId | `getWhiteboard` |
| PATCH | build/:projectId/whiteboards/:whiteboardId | workspace.controller.ts:272 | JWT+Perm | `"build:whiteboards:manage"` | build | — | — | orgId+projectId | `updateWhiteboard` |
| DELETE | build/:projectId/whiteboards/:whiteboardId | workspace.controller.ts:282 | JWT+Perm | `"build:whiteboards:manage"` | build | — | — | orgId+projectId | `deleteWhiteboard` |
| PATCH | build/:projectId/whiteboards/:whiteboardId/sharing | whiteboard-sharing.controller.ts:49 | JWT+Perm | `"build:whiteboards:manage"` | build | — | — | orgId+projectId | `updateSharing` |
| POST | build/:projectId/whiteboards/:whiteboardId/sharing/rotate-token | whiteboard-sharing.controller.ts:61 | JWT+Perm | `"build:whiteboards:manage"` | build | — | — | orgId+projectId | `rotateShareToken` |
| PUT | build/:projectId/whiteboards/:whiteboardId/shares | whiteboard-sharing.controller.ts:71 | JWT+Perm | `"build:whiteboards:manage"` | build | — | — | orgId+projectId | `setShares` |
| DELETE | build/:projectId/whiteboards/:whiteboardId/shares/:targetUserId | whiteboard-sharing.controller.ts:82 | JWT+Perm | `"build:whiteboards:manage"` | build | — | — | orgId+projectId | `removeShare` |
| GET | public/whiteboard-links/:token | whiteboard-sharing.controller.ts:103 | @Public / rate-limited | NONE (public) | No | — | — | token-scoped | `getPublicByToken` |
| PATCH | public/whiteboard-links/:token | whiteboard-sharing.controller.ts:114 | @Public / rate-limited | NONE (public) | No | — | — | token-scoped | `updatePublicByToken` |
| GET | build/:projectId/sprints | iterations.controller.ts:50 | JWT+Perm | `"build:sprints:view"` | build | No | none | orgId+projectId | `listSprints` |
| POST | build/:projectId/sprints | iterations.controller.ts:59 | JWT+Perm | `"build:sprints:manage"` | build | — | — | orgId+projectId | `createSprint` |
| GET | build/:projectId/sprints/:sprintId | iterations.controller.ts:71 | JWT+Perm | `"build:sprints:view"` | build | — | — | orgId | `getSprint` |
| PATCH | build/:projectId/sprints/:sprintId | iterations.controller.ts:80 | JWT+Perm | `"build:sprints:manage"` | build | — | — | orgId | `updateSprint` |
| DELETE | build/:projectId/sprints/:sprintId | iterations.controller.ts:91 | JWT+Perm | `"build:sprints:manage"` | build | — | — | orgId+projectId | `deleteSprint` |
| GET | build/:projectId/cycles | iterations.controller.ts:109 | JWT+Perm | `"build:view"` | build | Yes | query | orgId+projectId | `listCycles` |
| POST | build/:projectId/cycles | iterations.controller.ts:118 | JWT+Perm | `"build:workspace:manage"` | build | — | — | orgId+projectId | `createCycle` |
| PATCH | build/:projectId/cycles/:cycleId | iterations.controller.ts:130 | JWT+Perm | `"build:workspace:manage"` | build | — | — | orgId+projectId | `updateCycle` |
| DELETE | build/:projectId/cycles/:cycleId | iterations.controller.ts:142 | JWT+Perm | `"build:workspace:manage"` | build | — | — | orgId | `deleteCycle` |
| GET | build/:projectId/modules | iterations.controller.ts:159 | JWT+Perm | `"build:view"` | build | No | none | orgId+projectId | `listModules` |
| POST | build/:projectId/modules | iterations.controller.ts:168 | JWT+Perm | `"build:workspace:manage"` | build | — | — | orgId+projectId | `createModule` |
| PATCH | build/:projectId/modules/:moduleId | iterations.controller.ts:178 | JWT+Perm | `"build:workspace:manage"` | build | — | — | orgId | `updateModule` |
| DELETE | build/:projectId/modules/:moduleId | iterations.controller.ts:189 | JWT+Perm | `"build:workspace:manage"` | build | — | — | orgId | `deleteModule` |
| GET | build/:projectId/epics | iterations.controller.ts:206 | JWT+Perm | `"build:tickets:view"` | build | No | none | orgId+projectId | `listEpics` |
| POST | build/:projectId/epics | iterations.controller.ts:215 | JWT+Perm | `"build:tickets:create"` | build | — | — | orgId+projectId | `createEpic` |
| PATCH | build/:projectId/epics/:epicId | iterations.controller.ts:225 | JWT+Perm | `"build:tickets:update"` | build | — | — | orgId+projectId | `updateEpic` |
| DELETE | build/:projectId/epics/:epicId | iterations.controller.ts:234 | JWT+Perm | `"build:tickets:delete"` | build | — | — | orgId+projectId | `deleteEpic` |
| GET | build/time-entries | timesheets.controller.ts:44 | JWT+Perm | `"build:timesheets:view"` | build | Yes | query | orgId+scope | `listTimeEntries` |
| GET | build/time-entries/team | timesheets.controller.ts:53 | JWT+Perm | `"build:timesheets:manage"` | build | Yes | query | orgId | `teamTimesheets` |
| PATCH | build/time-entries/:entryId/approve | timesheets.controller.ts:61 | JWT+Perm | `"build:timesheets:manage"` | build | — | — | orgId | `approveEntry` |
| PATCH | build/time-entries/:entryId/reject | timesheets.controller.ts:69 | JWT+Perm | `"build:timesheets:manage"` | build | — | — | orgId | `rejectEntry` |
| PATCH | build/time-entries/:entryId | timesheets.controller.ts:80 | JWT+Perm | `"build:timesheets:create"` | build | — | — | orgId | `updateEntry` |
| DELETE | build/time-entries/:entryId | timesheets.controller.ts:90 | JWT+Perm | `"build:timesheets:create"` | build | — | — | orgId | `deleteEntry` |
| GET | build/billing-summary | timesheets.controller.ts:108 | JWT+Perm | `"build:timesheets:view"` | build | No | none | orgId | `billingSummary` |
| GET | build/:projectId/tickets/:ticketId/time-entries | timesheets.controller.ts:124 | JWT+Perm | `"build:timesheets:view"` | build | No | none | orgId+ticketId | `listTicketTimeEntries` |
| POST | build/:projectId/tickets/:ticketId/time-entries | timesheets.controller.ts:133 | JWT+Perm | `"build:timesheets:create"` | build | — | — | orgId+ticketId | `logTicketTime` |
| GET | build/:projectId/meetings | meetings.controller.ts:43 | JWT+Perm | `"build:meetings:view"` | build | Yes | query | orgId+projectId | `listMeetings` |
| GET | build/:projectId/meetings/:meetingId | meetings.controller.ts:52 | JWT+Perm | `"build:meetings:view"` | build | — | — | orgId+projectId | `getMeeting` |
| POST | build/:projectId/meetings | meetings.controller.ts:63 | JWT+Perm | `"build:meetings:manage"` | build | — | — | orgId+projectId | `createMeeting` |
| PATCH | build/:projectId/meetings/:meetingId | meetings.controller.ts:74 | JWT+Perm | `"build:meetings:manage"` | build | — | — | orgId+projectId | `updateMeeting` |
| DELETE | build/:projectId/meetings/:meetingId | meetings.controller.ts:84 | JWT+Perm | `"build:meetings:manage"` | build | — | — | orgId+projectId | `deleteMeeting` |
| POST | build/:projectId/meetings/:meetingId/attendees | meetings.controller.ts:96 | JWT+Perm | `"build:meetings:manage"` | build | — | — | orgId+projectId | `addAttendee` |
| DELETE | build/:projectId/meetings/:meetingId/attendees/:attendeeUserId | meetings.controller.ts:107 | JWT+Perm | `"build:meetings:manage"` | build | — | — | orgId+projectId | `removeAttendee` |
| PUT | build/:projectId/meetings/:meetingId/standup | meetings.controller.ts:119 | JWT+Perm | `"build:meetings:manage"` | build | — | — | orgId+projectId | `upsertStandup` |
| POST | build/:projectId/meetings/:meetingId/action-items | action-items.controller.ts:31 | JWT+Perm | `"build:meetings:manage"` | build | — | — | orgId+projectId | `createItem` |
| PATCH | build/:projectId/meetings/:meetingId/action-items/:itemId | action-items.controller.ts:45 | JWT+Perm | `"build:meetings:manage"` | build | — | — | orgId+projectId | `updateItem` |
| DELETE | build/:projectId/meetings/:meetingId/action-items/:itemId | action-items.controller.ts:57 | JWT+Perm | `"build:meetings:manage"` | build | — | — | orgId+projectId | `deleteItem` |
| POST | build/:projectId/meetings/:meetingId/action-items/:itemId/convert-to-task | action-items.controller.ts:69 | JWT+Perm | `"build:meetings:manage"` | build | — | — | orgId+projectId | `convertToTask` |
| GET | build/approvals/inbox | approvals.controller.ts:41 | JWT+Perm | `"build:approvals:view"` | build | No | none | orgId+userId | `getInbox` |
| GET | build/:projectId/approvals | approvals.controller.ts:54 | JWT+Perm | `"build:approvals:view"` | build | Yes | query | orgId+projectId | `listApprovals` |
| GET | build/:projectId/approvals/:approvalId | approvals.controller.ts:64 | JWT+Perm | `"build:approvals:view"` | build | — | — | orgId+projectId | `getApproval` |
| POST | build/:projectId/approvals | approvals.controller.ts:73 | JWT+Perm | `"build:approvals:request"` | build | — | — | orgId+projectId | `createApproval` |
| PATCH | build/:projectId/approvals/:approvalId/decide | approvals.controller.ts:85 | JWT+Perm | `"build:approvals:decide"` | build | — | — | orgId+projectId | `decideApproval` |
| PATCH | build/:projectId/approvals/:approvalId | approvals.controller.ts:97 | JWT+Perm | `"build:approvals:manage"` | build | — | — | orgId+projectId | `updateApproval` |
| DELETE | build/:projectId/approvals/:approvalId | approvals.controller.ts:108 | JWT+Perm | `"build:approvals:manage"` | build | — | — | orgId+projectId | `softDeleteApproval` |
| GET | build/portal/projects | client-portal.controller.ts:28 | JWT+Perm | `"build:portal:view"` | build | No | none | orgId+userId | `listPortalProjects` |
| GET | build/portal/projects/:projectId/overview | client-portal.controller.ts:36 | JWT+Perm | `"build:portal:view"` | build | — | — | orgId+userId+projectId | `getProjectOverview` |
| GET | build/portal/projects/:projectId/change-requests | client-portal.controller.ts:44 | JWT+Perm | `"build:changerequests:view"` | build | No | none | orgId+userId+projectId | `listPortalChangeRequests` |
| POST | build/portal/projects/:projectId/change-requests | client-portal.controller.ts:52 | JWT+Perm | `"build:changerequests:create"` | build | — | — | orgId+userId+projectId | `createPortalChangeRequest` |
| GET | build/:projectId/change-requests | change-requests.controller.ts:38 | JWT+Perm | `"build:changerequests:view"` | build | Yes | query | orgId+projectId | `listChangeRequests` |
| GET | build/:projectId/change-requests/:changeRequestId | change-requests.controller.ts:47 | JWT+Perm | `"build:changerequests:view"` | build | — | — | orgId+projectId | `getChangeRequest` |
| POST | build/:projectId/change-requests | change-requests.controller.ts:57 | JWT+Perm | `"build:changerequests:create"` | build | — | — | orgId+projectId | `createChangeRequest` |
| PATCH | build/:projectId/change-requests/:changeRequestId | change-requests.controller.ts:67 | JWT+Perm | `"build:changerequests:manage"` | build | — | — | orgId+projectId | `updateChangeRequest` |
| DELETE | build/:projectId/change-requests/:changeRequestId | change-requests.controller.ts:78 | JWT+Perm | `"build:changerequests:manage"` | build | — | — | orgId+projectId | `deleteChangeRequest` |
| GET | build/comment-drafts/mine | comment-drafts.controller.ts:28 | JWT+Perm | `"build:tickets:view"` | build | No | none | orgId+userId | `listMine` |
| PUT | build/comment-drafts/tickets/:ticketId | comment-drafts.controller.ts:34 | JWT+Perm | `"build:tickets:view"` | build | — | — | orgId+userId | `upsert` |
| DELETE | build/comment-drafts/mine | comment-drafts.controller.ts:44 | JWT+Perm | `"build:tickets:view"` | build | — | — | orgId+userId | `deleteAllMine` |
| DELETE | build/comment-drafts/tickets/:ticketId | comment-drafts.controller.ts:51 | JWT+Perm | `"build:tickets:view"` | build | — | — | orgId+userId | `deleteByTicket` |
| DELETE | build/comment-drafts/:draftId | comment-drafts.controller.ts:60 | JWT+Perm | `"build:tickets:view"` | build | — | — | orgId+userId | `deleteOne` |
| GET | build/:projectId/incidents | incidents.controller.ts:39 | JWT+Perm | `"build:incidents:view"` | build | Yes | query | orgId+projectId | `listIncidents` |
| GET | build/:projectId/incidents/:incidentId | incidents.controller.ts:49 | JWT+Perm | `"build:incidents:view"` | build | — | — | orgId+projectId | `getIncident` |
| POST | build/:projectId/incidents | incidents.controller.ts:59 | JWT+Perm | `"build:incidents:manage"` | build | — | — | orgId+projectId | `createIncident` |
| PATCH | build/:projectId/incidents/:incidentId | incidents.controller.ts:70 | JWT+Perm | `"build:incidents:manage"` | build | — | — | orgId+projectId | `updateIncident` |
| DELETE | build/:projectId/incidents/:incidentId | incidents.controller.ts:81 | JWT+Perm | `"build:incidents:manage"` | build | — | — | orgId+projectId | `deleteIncident` |
| POST | build/:projectId/incidents/:incidentId/updates | incidents.controller.ts:92 | JWT+Perm | `"build:incidents:manage"` | build | — | — | orgId+projectId | `addUpdate` |
| GET | build/managed-products | managed-products.controller.ts:37 | JWT+Perm | `"build:managed-products:view"` | build | Yes | query | orgId | `listManagedProducts` |
| GET | build/managed-products/:managedProductId | managed-products.controller.ts:46 | JWT+Perm | `"build:managed-products:view"` | build | — | — | orgId | `getManagedProduct` |
| POST | build/managed-products | managed-products.controller.ts:55 | JWT+Perm | `"build:managed-products:create"` | build | — | — | orgId | `createManagedProduct` |
| PATCH | build/managed-products/:managedProductId | managed-products.controller.ts:65 | JWT+Perm | `"build:managed-products:update"` | build | — | — | orgId | `updateManagedProduct` |
| DELETE | build/managed-products/:managedProductId | managed-products.controller.ts:75 | JWT+Perm | `"build:managed-products:delete"` | build | — | — | orgId | `deleteManagedProduct` |
| GET | build/:projectId/risks | risks.controller.ts:39 | JWT+Perm | `"build:risks:view"` | build | Yes | query | orgId+projectId | `listRisks` |
| GET | build/:projectId/risks/:riskId | risks.controller.ts:48 | JWT+Perm | `"build:risks:view"` | build | — | — | orgId+projectId | `getRisk` |
| POST | build/:projectId/risks | risks.controller.ts:58 | JWT+Perm | `"build:risks:manage"` | build | — | — | orgId+projectId | `createRisk` |
| PATCH | build/:projectId/risks/:riskId | risks.controller.ts:68 | JWT+Perm | `"build:risks:manage"` | build | — | — | orgId+projectId | `updateRisk` |
| DELETE | build/:projectId/risks/:riskId | risks.controller.ts:78 | JWT+Perm | `"build:risks:manage"` | build | — | — | orgId+projectId | `softDeleteRisk` |
| GET | build/:projectId/decisions | decisions.controller.ts:39 | JWT+Perm | `"build:decisions:view"` | build | Yes | query | orgId+projectId | `listDecisions` |
| GET | build/:projectId/decisions/:decisionId | decisions.controller.ts:48 | JWT+Perm | `"build:decisions:view"` | build | — | — | orgId+projectId | `getDecision` |
| POST | build/:projectId/decisions | decisions.controller.ts:58 | JWT+Perm | `"build:decisions:manage"` | build | — | — | orgId+projectId | `createDecision` |
| PATCH | build/:projectId/decisions/:decisionId | decisions.controller.ts:68 | JWT+Perm | `"build:decisions:manage"` | build | — | — | orgId+projectId | `updateDecision` |
| DELETE | build/:projectId/decisions/:decisionId | decisions.controller.ts:78 | JWT+Perm | `"build:decisions:manage"` | build | — | — | orgId+projectId | `softDeleteDecision` |
| GET | build/:projectId/workflow/transitions | workflow.controller.ts:37 | JWT+Perm | `"build:workflow:view"` | build | No | none | orgId+projectId | `listTransitions` |
| POST | build/:projectId/workflow/transitions | workflow.controller.ts:45 | JWT+Perm | `"build:workflow:manage"` | build | — | — | orgId+projectId | `createTransition` |
| PATCH | build/:projectId/workflow/transitions/:transitionId | workflow.controller.ts:55 | JWT+Perm | `"build:workflow:manage"` | build | — | — | orgId+projectId | `updateTransition` |
| DELETE | build/:projectId/workflow/transitions/:transitionId | workflow.controller.ts:66 | JWT+Perm | `"build:workflow:manage"` | build | — | — | orgId+projectId | `deleteTransition` |
| GET | build/:projectId/workflow/allowed/:fromStatusId | workflow.controller.ts:78 | JWT+Perm | `"build:workflow:view"` | build | No | none | orgId+projectId | `getAllowedTransitions` |
| PATCH | build/:projectId/workflow/statuses/:statusId/wip | workflow.controller.ts:88 | JWT+Perm | `"build:workflow:manage"` | build | — | — | orgId+projectId | `updateWipLimit` |
| GET | build/teams | teams.controller.ts:45 | JWT+Perm | `"build:teams:view"` | build | Yes | query | orgId | `listTeams` |
| GET | build/teams/:teamId | teams.controller.ts:54 | JWT+Perm | `"build:teams:view"` | build | — | — | orgId | `getTeam` |
| POST | build/teams | teams.controller.ts:63 | JWT+Perm | `"build:teams:create"` | build | — | — | orgId | `createTeam` |
| PATCH | build/teams/:teamId | teams.controller.ts:73 | JWT+Perm | `"build:teams:update"` | build | — | — | orgId | `updateTeam` |
| DELETE | build/teams/:teamId | teams.controller.ts:83 | JWT+Perm | `"build:teams:delete"` | build | — | — | orgId | `deleteTeam` |
| GET | build/teams/:teamId/members | teams.controller.ts:93 | JWT+Perm | `"build:teams:view"` | build | Yes | query | orgId+teamId | `listTeamMembers` |
| POST | build/teams/:teamId/members | teams.controller.ts:104 | JWT+Perm | `"build:teams:manage"` | build | — | — | orgId+teamId | `addMember` |
| PATCH | build/teams/:teamId/members/:memberUserId | teams.controller.ts:115 | JWT+Perm | `"build:teams:manage"` | build | — | — | orgId+teamId | `updateMemberRole` |
| DELETE | build/teams/:teamId/members/:memberId | teams.controller.ts:132 | JWT+Perm | `"build:teams:manage"` | build | — | — | orgId+teamId | `removeMember` |
| GET | build/teams/:teamId/projects | teams.controller.ts:144 | JWT+Perm | `"build:teams:view"` | build | No | none | orgId+teamId | `listTeamProjects` |
| POST | build/teams/:teamId/projects | teams.controller.ts:153 | JWT+Perm | `"build:teams:manage"` | build | — | — | orgId+teamId | `addProject` |
| DELETE | build/teams/:teamId/projects/:projectId | teams.controller.ts:163 | JWT+Perm | `"build:teams:manage"` | build | — | — | orgId+teamId | `removeProject` |
| GET | build/:projectId/test-suites | test-suites.controller.ts:35 | JWT+Perm | `"build:qa:view"` | build | No | none | orgId+projectId | `listSuites` |
| POST | build/:projectId/test-suites | test-suites.controller.ts:44 | JWT+Perm | `"build:qa:manage"` | build | — | — | orgId+projectId | `createSuite` |
| PATCH | build/:projectId/test-suites/:suiteId | test-suites.controller.ts:54 | JWT+Perm | `"build:qa:manage"` | build | — | — | orgId+projectId | `updateSuite` |
| DELETE | build/:projectId/test-suites/:suiteId | test-suites.controller.ts:65 | JWT+Perm | `"build:qa:manage"` | build | — | — | orgId+projectId | `deleteSuite` |
| GET | build/:projectId/test-cases | test-cases.controller.ts:39 | JWT+Perm | `"build:qa:view"` | build | Yes | query | orgId+projectId | `listCases` |
| GET | build/:projectId/test-cases/:caseId | test-cases.controller.ts:48 | JWT+Perm | `"build:qa:view"` | build | — | — | orgId+projectId | `getCase` |
| POST | build/:projectId/test-cases | test-cases.controller.ts:57 | JWT+Perm | `"build:qa:manage"` | build | — | — | orgId+projectId | `createCase` |
| PATCH | build/:projectId/test-cases/:caseId | test-cases.controller.ts:67 | JWT+Perm | `"build:qa:manage"` | build | — | — | orgId+projectId | `updateCase` |
| DELETE | build/:projectId/test-cases/:caseId | test-cases.controller.ts:77 | JWT+Perm | `"build:qa:manage"` | build | — | — | orgId+projectId | `deleteCase` |
| GET | build/:projectId/test-runs | test-runs.controller.ts:42 | JWT+Perm | `"build:qa:view"` | build | Yes | query | orgId+projectId | `listRuns` |
| GET | build/:projectId/test-runs/:runId | test-runs.controller.ts:51 | JWT+Perm | `"build:qa:view"` | build | — | — | orgId+projectId | `getRun` |
| POST | build/:projectId/test-runs | test-runs.controller.ts:61 | JWT+Perm | `"build:qa:manage"` | build | — | — | orgId+projectId | `createRun` |
| PATCH | build/:projectId/test-runs/:runId | test-runs.controller.ts:71 | JWT+Perm | `"build:qa:manage"` | build | — | — | orgId+projectId | `updateRun` |
| DELETE | build/:projectId/test-runs/:runId | test-runs.controller.ts:82 | JWT+Perm | `"build:qa:manage"` | build | — | — | orgId+projectId | `deleteRun` |
| PATCH | build/:projectId/test-runs/:runId/results/:resultId | test-runs.controller.ts:94 | JWT+Perm | `"build:qa:execute"` | build | — | — | orgId+projectId | `updateResult` |
| POST | build/:projectId/test-runs/:runId/results/:resultId/bug | test-runs.controller.ts:106 | JWT+Perm | `"build:bugs:create"` | build | — | — | orgId+projectId | `createBugFromResult` |
| GET | build/:projectId/bugs | bugs.controller.ts:39 | JWT+Perm | `"build:bugs:view"` | build | Yes | query | orgId+projectId | `listBugs` |
| GET | build/:projectId/bugs/:bugId | bugs.controller.ts:48 | JWT+Perm | `"build:bugs:view"` | build | — | — | orgId+projectId | `getBug` |
| POST | build/:projectId/bugs | bugs.controller.ts:57 | JWT+Perm | `"build:bugs:create"` | build | — | — | orgId+projectId | `createBug` |
| PATCH | build/:projectId/bugs/:bugId | bugs.controller.ts:68 | JWT+Perm | `"build:bugs:update"` | build | — | — | orgId+projectId | `updateBug` |
| DELETE | build/:projectId/bugs/:bugId | bugs.controller.ts:78 | JWT+Perm | `"build:bugs:delete"` | build | — | — | orgId+projectId | `deleteBug` |
| GET | build/:projectId/client-visibility | client-visibility.controller.ts:27 | JWT+Perm | `"build:clientvisibility:manage"` | build | No | none | orgId+projectId | `getVisibilitySummary` |
| PATCH | build/:projectId/client-visibility/tickets/:ticketId | client-visibility.controller.ts:35 | JWT+Perm | `"build:clientvisibility:manage"` | build | — | — | orgId+projectId | `toggleTicketVisibility` |
| PATCH | build/:projectId/client-visibility/milestones/:milestoneId | client-visibility.controller.ts:46 | JWT+Perm | `"build:clientvisibility:manage"` | build | — | — | orgId+projectId | `toggleMilestoneVisibility` |
| PATCH | build/:projectId/client-visibility/comments/:commentId | client-visibility.controller.ts:57 | JWT+Perm | `"build:clientvisibility:manage"` | build | — | — | orgId+projectId | `toggleCommentVisibility` |
| PATCH | build/:projectId/client-visibility/attachments/:attachmentId | client-visibility.controller.ts:68 | JWT+Perm | `"build:clientvisibility:manage"` | build | — | — | orgId+projectId | `toggleAttachmentVisibility` |
| GET | product-management/workspaces | pm-workspaces.controller.ts:41 | JWT+Perm | `"build:workspaces:view"` | build | Yes | query | orgId | `listWorkspaces` |
| GET | product-management/workspaces/:pmWorkspaceId | pm-workspaces.controller.ts:49 | JWT+Perm | `"build:workspaces:view"` | build | — | — | orgId | `getWorkspace` |
| POST | product-management/workspaces | pm-workspaces.controller.ts:59 | JWT+Perm | `"build:workspaces:create"` | build | — | — | orgId | `createWorkspace` |
| PATCH | product-management/workspaces/:pmWorkspaceId | pm-workspaces.controller.ts:68 | JWT+Perm | `"build:workspaces:update"` | build | — | — | orgId | `updateWorkspace` |
| DELETE | product-management/workspaces/:pmWorkspaceId | pm-workspaces.controller.ts:77 | JWT+Perm | `"build:workspaces:delete"` | build | — | — | orgId | `deleteWorkspace` |
| GET | product-management/workspaces/:pmWorkspaceId/members | pm-workspaces.controller.ts:87 | JWT+Perm | `"build:workspaces:members:view"` | build | Yes | query | orgId+workspaceId | `listMembers` |
| POST | product-management/workspaces/:pmWorkspaceId/members | pm-workspaces.controller.ts:99 | JWT+Perm | `"build:workspaces:members:manage"` | build | — | — | orgId+workspaceId | `addMember` |
| DELETE | product-management/workspaces/:pmWorkspaceId/members/:pmWorkspaceMembershipId | pm-workspaces.controller.ts:109 | JWT+Perm | `"build:workspaces:members:manage"` | build | — | — | orgId+workspaceId | `removeMember` |

---

## 2. Endpoints Missing @RequirePermission

All mutation endpoints have `@RequirePermission`. The two public whiteboard endpoints intentionally carry `@Public`:
- `GET /public/whiteboard-links/:token` — `whiteboard-sharing.controller.ts:103`
- `PATCH /public/whiteboard-links/:token` — `whiteboard-sharing.controller.ts:114`

Both are rate-limited at the IP level (RateLimitService). No unguarded authenticated mutation found.

---

## 3. Tenant-Scoping Audit

All service `WHERE` clauses confirmed to filter by `orgId` either directly (`eq(table.orgId, orgId)`) or transitively via a parent already scoped by orgId. Key examples:

- `projects-reports.service.ts:40-44` — `requireProject` always gates with `eq(projects.orgId, orgId)` before running any report.
- `projects-roadmap.service.ts:26` — `eq(roadmapItems.orgId, orgId)` leading condition in all list/mutate.
- `projects-webhooks.service.ts:70-71` — `assertWebhookOwnership(orgId, projectId, webhookId)` called before deliveries list.
- `projects-custom-fields.service.ts:133-142` — ticket cross-check includes `eq(tickets.orgId, orgId)`.
- `projects-budget.service.ts:29-33` — `assertProjectAccess` verifies `eq(projects.orgId, u.orgId)`.

One weak point: `projects-releases.service.ts:119-128` — `removeTicketFromRelease` at line 119 confirms release ownership (`eq(projectReleases.orgId, orgId)`) but the subsequent DELETE on `releaseTickets` at line 126 does NOT include `orgId` in the WHERE clause: `eq(releaseTickets.releaseId, releaseId) AND eq(releaseTickets.ticketId, ticketId)`. The release ownership check gates it, so cross-tenant access requires a compromised releaseId — low severity but a defense-in-depth gap.

---

## 4. Unbounded / Heavy Aggregation Endpoints

### 4a. `GET build/resource-allocation`
`projects-analytics.service.ts:234-346` — `resourceAllocation(orgId)`:
1. `db.query.projects.findMany(...)` — all ACTIVE projects for the org, no limit.
2. Two parallel queries: ALL open tickets grouped by `(assigneeId, projectId)` across all those projects (`inArray(tickets.projectId, projectIds)`), plus ALL multi-assignees across same projects — no row cap.
3. A third query to resolve user names for all unique assigneeIds — `inArray(users.id, [...allAssigneeIds])`.

Cached per orgId with `CACHE_TTL.SHORT`. A cache miss with 100+ active projects and thousands of open tickets hits unbounded full-table work. Frontend: **0 hits** found (search `resource-allocation` across frontend returns 0 files) — this endpoint appears dead from the frontend.

### 4b. `GET build/:projectId/reports/critical-path`
`projects-reports.service.ts:337-388` — `criticalPath(orgId, projectId)`:
- `SELECT id, title, storyPoints FROM tickets WHERE projectId=X AND orgId=Y` — **no limit**, loads ALL tickets in the project.
- Then loads ALL `workItemRelations` between those tickets — `inArray(workItemRelations.workItemId, ticketIds)`.

A project with 10,000 tickets triggers a full table scan + full relations scan. Cached `CACHE_TTL.MEDIUM`, but cold hit is O(N²) in memory for the CPM algorithm in `projects-critical-path.util.ts`.

### 4c. `GET build/:projectId/analytics`
`projects-analytics.service.ts:21-142` — `computeProjectAnalytics(orgId, projectId)` — 7 parallel queries. The `assigneeCompletion` query at line 44 groups all tickets ever in the project. `cycleVelocity` at line 65 fetches all cycles + their tickets with no time window. No limit on total ticket or cycle count. Cached `CACHE_TTL.MEDIUM`.

### 4d. `GET build/:projectId/reports/velocity`
`projects-reports.service.ts:166-226` — fetches ALL ACTIVE/COMPLETED sprints for a project (no limit), then ALL tickets for those sprints. Cached but unbound on sprint count.

### 4e. `GET build/:projectId/forms/:formId/submissions` (list)
`submissions.controller.ts:33` — no pagination query param, service returns all submissions for a form with no limit. With form abuse this can be thousands of rows.

---

## 5. N+1 and Sequential Awaits

### 5a. Email loop in `notifyTicketAssignees`
`projects-email.service.ts:78-91`:
```ts
for (const userId of targets) {
  const assignee = assigneeMap.get(userId);
  ...
  await this.email.sendTicketAssignmentEmail(...)
}
```
Sequential `await` inside a for-loop for each assignee. Should be `Promise.all(targets.map(...))`.

### 5b. Sequential findFirst in `notifyStatusReview`
`projects-email.service.ts:107-143` — `resolveActorName` (a `findFirst`) is called first, then independently for reviewer/assignee. All three DB reads are independent and could be `Promise.all`.

### 5c. `addTicketToRelease` — two sequential lookups before insert
`projects-releases.service.ts:102-116` — sequential `findFirst` for release, then `findFirst` for ticket, then insert. The two lookups are independent and should be `Promise.all`.

---

## 6. Missing Transactions on Multi-Write Operations

### 6a. `applyTemplate`
`projects-templates.service.ts:107-148` — creates a project then inserts 3 more record sets (projectMembers, projectStatuses, tickets) in sequence **without a transaction**. A mid-sequence failure leaves orphaned project records.

```ts
const [project] = await this.db.insert(projects).values({...}).returning();
await this.db.insert(projectMembers)...;
await this.db.insert(projectStatuses)...;
await this.db.insert(tickets)...;
```

No `this.db.transaction(...)` wrapper.

### 6b. `createTemplate` with tickets
`projects-templates.service.ts:50-82` — inserts template, then conditionally inserts template tickets separately. Same risk: no transaction.

### 6c. `addTicketToRelease` — not transaction-critical but consistency note
`projects-releases.service.ts:102-116` — sequential lookups + insert are not wrapped in a transaction. The insert can fail after successful lookups leaving no trace.

---

## 7. Automations / Recurrence

### 7a. Automation execution engine is absent
`projectAutomations` table is CRUD only. No scheduler, no event listener, no runner anywhere in the `build/` or `build-*` modules calls `computeNextRunAt` (`projects-recurrence.util.ts`) or evaluates `triggerEvent`. The automations CRUD endpoints appear partially implemented — the storage layer exists but nothing triggers or evaluates automations at runtime.

### 7b. `computeNextRunAt` utility is dead code
`projects-recurrence.util.ts:1-39` — exported function, but no import of it anywhere in `backend/src/modules/`. It was presumably authored in preparation for a scheduler that was never wired up.

---

## 8. Validation — Zod Coverage

All controller body/query parameters use `ZodValidationPipe` with dedicated schema files under `dto/`. No inline non-trivial Zod schemas found in controllers.

Schema file locations verified:
- `dto/automation.schemas.ts` — `createAutomationSchema`, `updateAutomationSchema`
- `dto/projects.schemas.ts` — `burnupQuerySchema`, `cfdQuerySchema`, `updateBudgetSchema`, `applyTemplateSchema`, `roadmapListQuerySchema`, etc.
- `dto/releases.schemas.ts` — `createReleaseSchema`, `updateReleaseSchema`, `addReleaseTicketSchema`
- `dto/custom-fields.schemas.ts` — `createCustomFieldSchema`, `updateCustomFieldSchema`, `upsertCustomFieldValuesSchema`
- `dto/webhook.schemas.ts` — `createWebhookSchema`
- `dto/projects-customers.schemas.ts` — `listProjectCustomersSchema`
- `dto/projects-workspace-members.schemas.ts` — `addWorkspaceMemberSchema`, `listWorkspaceMembersSchema`
- Each `build-*` sibling module has its own `dto/` with proper schema files.

Zod coverage is complete; no rule violations found in this layer.

---

## 9. Security Issues

### 9a. CRITICAL — Wrong permission on automation write operations
`projects-automations.controller.ts:33,44,55` — POST (create), PATCH (update), DELETE all use `@RequirePermission("build:view")`. Any user with read-only project view can create, modify, and delete automations. The catalog entry `"build:view"` is a read permission (`shared.ts:36`). Write operations must use `"build:manage"` or a dedicated `build:automations:manage` key.

### 9b. HIGH — SSRF in webhook dispatch
`projects-webhooks-dispatch.service.ts:106-115`:
```ts
const response = await fetch(endpoint.url, {
  method: "POST",
  ...
  signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
});
```
`endpoint.url` is a user-supplied URL stored in `projectWebhooks.url`. There is no allowlist, no blocklist for `169.254.169.254` (AWS IMDS), `10.x`, `127.x`, `::1`, or internal hostnames. An org admin can register a webhook URL pointing at internal services and trigger dispatch on any ticket event.

### 9c. MEDIUM — Webhook test blocks request for up to 10s
`projects-webhooks.service.ts:sendTest` is `await`-ed in the controller at `projects-webhooks.controller.ts:70`. The `sendTest` method in `projects-webhooks-dispatch.service.ts:151-230` makes a live HTTP call with `AbortSignal.timeout(10_000)`. A slow external server holds the NestJS request thread for 10s. The regular `dispatch()` (line 32) is correctly `void`-ed, but the test endpoint is blocking.

### 9d. LOW — `removeTicketFromRelease` WHERE lacks orgId
`projects-releases.service.ts:126-127` — `releaseTickets` DELETE has no `orgId` guard. The upstream ownership assertion (`findFirst` for the release) provides a gate, but direct row manipulation in a DB console bypasses it.

---

## 10. Dead-Endpoint Candidates (frontend reference counts)

| Endpoint | Frontend hook files | Feature/page files |
|----------|--------------------|--------------------|
| `GET build/resource-allocation` | 0 | 0 |
| `GET build/programs` and all programs/* | 0 | 0 (only `types.ts` mentions "programs" in RBAC types) |
| `GET build/:projectId/reports/snapshot` (POST) | 0 (no hook) | 0 |

`GET build/resource-allocation` is served by `ProjectsAnalyticsService.resourceAllocation()` (`projects-analytics.service.ts:234`). Searching the frontend for `resource-allocation` returns zero files. `getOrgProjectHealthSummary()` on the same service is only called by the AI executive-brief service — also not a controller endpoint.

All programs endpoints: frontend search for `build/programs` or `usePrograms` returns 0 hook/feature files (only `lib/rbac/permissions/types.ts` and a payroll constants file mentioning "programs"). No frontend consumer.

---

## 11. File Sizes — LOC Violations

| File | LOC | Status |
|------|-----|--------|
| `build/projects.service.ts` | 682 | Over 500 cap — needs split |
| `build/projects-members.service.ts` | 619 | Over 500 cap — needs split |
| `build/projects-ticket-subresources.service.ts` | 544 | Over 500 cap — needs split |
| `build/projects-tickets.controller.ts` | 518 | Over 500 cap — needs split |
| `build-execution/iterations.service.ts` | 506 | Over 500 cap — borderline |
| `build-pm-workspaces/pm-workspaces.service.ts` | 481 | Under 500, near cap |
| `build-teams/teams.service.ts` | 455 | Under 500 |
| `build/projects-work-query.service.ts` | 403 | Under 500 |
| `build/projects-reports.service.ts` | 389 | Under 500 |
| `build/projects-tickets-query.service.ts` | 383 | Under 500 |
| `build-meetings/meetings.service.ts` | 364 | Under 500 |
| `build-execution/workspace.service.ts` | 343 | Under 500 |
| `build/projects-analytics.service.ts` | 347 | Under 500 |

---

## 12. Additional Notes

### Roadmap lists return no total count
`projects-roadmap.service.ts:22-38,88-104,152-163` — all three list methods (`listRoadmap`, `listFeedback`, `listChangelog`) apply `limit`+`offset` pagination but return only the data array, no `total` count. The frontend cannot display page indicators or know when to disable "next page".

### `WhiteboardsHubController` route mismatch
`workspace.controller.ts:223-234` — `@Controller("whiteboards")` (no `build/` prefix). All other Build controllers use `@Controller("build/...")`. This endpoint is at `/whiteboards` not `/build/whiteboards`. The module guard `@RequireModule("build")` is still applied. Frontend hook `hooks/api/build/whiteboards.ts` calls `/build/whiteboards` (with prefix), so this hub endpoint at `/whiteboards` has no frontend caller.

### Automations controller uses `build:view` for ALL operations
Summarised in §9a above. This is the single most impactful RBAC bug in this lane.
