import { relations } from "drizzle-orm/relations";
import { users, assets, organizations, leadAssignmentRules, assignmentRuleState, crmOrganizations, crmSlaPolicies, crmSupportTeamMembers, crmTeamPerformance, crmPeople, accounts, attendance, chatMessages, chatAttachments, chatChannels, chatChannelMembers, auditLogs, deals, crmCampaigns, crmActivities, clients, leads, contacts, chatUserPresence, crmDeals, crmEmailTemplates, crmEvents, crmLeads, crmCompanies, crmContent, crmViews, crmSupportTickets, dealActivities, departments, customStates, projects, documents, goals, cycles, employeeDevices, expenseCategories, leaveTypes, leaveBalances, tickets, intakeItems, invitations, invoiceAiExtractions, invoices, holidays, leadActivities, leadEmails, helpdeskTickets, leadTasks, leaveRequests, modules, notifications, onboardingSteps, organizationMembers, leadNotes, leadScoringRules, reviewCycles, performanceReviews, projectMembers, projectStatuses, projectViews, pages, qrCodes, reports, rolePermissions, permissions, roles, salaryStructures, sessions, sprints, ticketAttachments, timesheets, supportTickets, supportTicketMessages, ticketAssignees, targets, ticketLabels, wfhRequests, workItemRelations, ticketComments, crmMonthlyMetrics, departmentMembers, moduleLinks, ticketLabelMappings, userPermissions, targetHistory, dmLeads, branches, incentiveConfig, incentives, clientAccounts, payrolls, clientAccountActivities, socialMediaStats, webhookEndpoints, webhookLogs, payments, expenses, calendarEvents, passwordHistory, candidates, notificationPreferences, pushSubscriptions, ticketWatchers, userSessions, candidateApplications, jobPostings, alumniProfiles, richDocuments, skillAssessments, assessmentAttempts, assetReturns, backgroundVerifications, careerLadders, certifications, hrEmailTemplates, employeeSkills, enpsScores, exitChecklists, resignations, feedbackRequests, bonuses, keyResults, learningPaths, oneOnOneMeetings, performanceImprovementPlans, policyAcknowledgments, pulseSurveys, recognitions, fnfSettlements, handbookVersions, reimbursements, surveyResponses, teamEvents, trainingEnrollments, trainingPrograms, salaryLoans, teamEventParticipants, emailCampaigns, salesQuotas, commissionRules, commissions, dealApprovalRules, dealApprovals, emailCampaignRecipients, projectMilestones, projectTemplates, calibrationSessions, candidateDocuments, documentTemplates, candidateDocumentsVault, candidateOffers, candidateReferenceChecks, mfaBackupCodes, candidateSlaTracking, candidateSources, onboardingDocuments, documentAuditLogs, documentTemplateVersions, documentTypes, candidateReferrals, interviewBookingLinks, scorecardTemplates, leaveBlackoutDates, onboardingTasks, onboardingTemplateSteps, interviewQuestions, onboardingTemplates, interviewSlas, interviews, interviewScorecards, clientOnboardingItems, clientOnboardingTemplates, clientOpportunities, csatSurveys, customFieldDefinitions, dealMeetings, terminations, vaultAccessLogs, taskSequences, tasks, territories, webLeadForms, aiUsageLogs, announcements, leadImportBatches, apiKeys, taskSequenceSteps, eventAttendees, abTests, projectTemplateTickets, csatResponses, contentCalendarItems, landingPages, pageViews, socialMetrics } from "./schema";

export const assetsRelations = relations(assets, ({one, many}) => ({
	user: one(users, {
		fields: [assets.assignedTo],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [assets.orgId],
		references: [organizations.id]
	}),
	assetReturns: many(assetReturns),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	assets: many(assets),
	accounts: many(accounts),
	attendances: many(attendance),
	chatChannelMembers: many(chatChannelMembers),
	auditLogs: many(auditLogs),
	chatChannels: many(chatChannels),
	crmCampaigns: many(crmCampaigns),
	clients: many(clients),
	chatUserPresences: many(chatUserPresence),
	crmEmailTemplates: many(crmEmailTemplates),
	crmViews: many(crmViews),
	dealActivities: many(dealActivities),
	documents_uploadedBy: many(documents, {
		relationName: "documents_uploadedBy_users_id"
	}),
	documents_userId: many(documents, {
		relationName: "documents_userId_users_id"
	}),
	goals: many(goals),
	cycles: many(cycles),
	employeeDevices: many(employeeDevices),
	leaveBalances: many(leaveBalances),
	leads_assignedById: many(leads, {
		relationName: "leads_assignedById_users_id"
	}),
	leads_assignedToId: many(leads, {
		relationName: "leads_assignedToId_users_id"
	}),
	leads_verifiedById: many(leads, {
		relationName: "leads_verifiedById_users_id"
	}),
	invitations: many(invitations),
	invoiceAiExtractions: many(invoiceAiExtractions),
	leadActivities: many(leadActivities),
	helpdeskTickets_assigneeId: many(helpdeskTickets, {
		relationName: "helpdeskTickets_assigneeId_users_id"
	}),
	helpdeskTickets_userId: many(helpdeskTickets, {
		relationName: "helpdeskTickets_userId_users_id"
	}),
	leadAssignmentRules: many(leadAssignmentRules),
	leadTasks: many(leadTasks),
	leaveRequests_approverId: many(leaveRequests, {
		relationName: "leaveRequests_approverId_users_id"
	}),
	leaveRequests_coveringEmployeeId: many(leaveRequests, {
		relationName: "leaveRequests_coveringEmployeeId_users_id"
	}),
	leaveRequests_userId: many(leaveRequests, {
		relationName: "leaveRequests_userId_users_id"
	}),
	modules_createdBy: many(modules, {
		relationName: "modules_createdBy_users_id"
	}),
	modules_leadId: many(modules, {
		relationName: "modules_leadId_users_id"
	}),
	notifications: many(notifications),
	onboardingSteps: many(onboardingSteps),
	organizationMembers: many(organizationMembers),
	leadNotes: many(leadNotes),
	performanceReviews_reviewerId: many(performanceReviews, {
		relationName: "performanceReviews_reviewerId_users_id"
	}),
	performanceReviews_userId: many(performanceReviews, {
		relationName: "performanceReviews_userId_users_id"
	}),
	projectMembers: many(projectMembers),
	projectViews: many(projectViews),
	pages: many(pages),
	reports: many(reports),
	salaryStructures: many(salaryStructures),
	sessions: many(sessions),
	projects_clientId: many(projects, {
		relationName: "projects_clientId_users_id"
	}),
	projects_managerId: many(projects, {
		relationName: "projects_managerId_users_id"
	}),
	ticketAttachments: many(ticketAttachments),
	timesheets_approvedBy: many(timesheets, {
		relationName: "timesheets_approvedBy_users_id"
	}),
	timesheets_userId: many(timesheets, {
		relationName: "timesheets_userId_users_id"
	}),
	tickets_assigneeId: many(tickets, {
		relationName: "tickets_assigneeId_users_id"
	}),
	tickets_reporterId: many(tickets, {
		relationName: "tickets_reporterId_users_id"
	}),
	supportTickets_assigneeId: many(supportTickets, {
		relationName: "supportTickets_assigneeId_users_id"
	}),
	supportTickets_createdBy: many(supportTickets, {
		relationName: "supportTickets_createdBy_users_id"
	}),
	supportTicketMessages: many(supportTicketMessages),
	ticketAssignees_assignedBy: many(ticketAssignees, {
		relationName: "ticketAssignees_assignedBy_users_id"
	}),
	ticketAssignees_userId: many(ticketAssignees, {
		relationName: "ticketAssignees_userId_users_id"
	}),
	targets_setById: many(targets, {
		relationName: "targets_setById_users_id"
	}),
	targets_userId: many(targets, {
		relationName: "targets_userId_users_id"
	}),
	wfhRequests_approverId: many(wfhRequests, {
		relationName: "wfhRequests_approverId_users_id"
	}),
	wfhRequests_userId: many(wfhRequests, {
		relationName: "wfhRequests_userId_users_id"
	}),
	ticketComments: many(ticketComments),
	departmentMembers: many(departmentMembers),
	userPermissions: many(userPermissions),
	targetHistories: many(targetHistory),
	dmLeads_createdBy: many(dmLeads, {
		relationName: "dmLeads_createdBy_users_id"
	}),
	dmLeads_verifiedBy: many(dmLeads, {
		relationName: "dmLeads_verifiedBy_users_id"
	}),
	incentiveConfigs: many(incentiveConfig),
	incentives_approvedBy: many(incentives, {
		relationName: "incentives_approvedBy_users_id"
	}),
	incentives_salesRepId: many(incentives, {
		relationName: "incentives_salesRepId_users_id"
	}),
	branches_branchHrId: many(branches, {
		relationName: "branches_branchHrId_users_id"
	}),
	branches_branchManagerId: many(branches, {
		relationName: "branches_branchManagerId_users_id"
	}),
	clientAccounts_assignedCrmId: many(clientAccounts, {
		relationName: "clientAccounts_assignedCrmId_users_id"
	}),
	clientAccounts_salesRepId: many(clientAccounts, {
		relationName: "clientAccounts_salesRepId_users_id"
	}),
	clientAccountActivities: many(clientAccountActivities),
	socialMediaStats: many(socialMediaStats),
	user: one(users, {
		fields: [users.reportingTo],
		references: [users.id],
		relationName: "users_reportingTo_users_id"
	}),
	users: many(users, {
		relationName: "users_reportingTo_users_id"
	}),
	chatMessages: many(chatMessages),
	webhookEndpoints: many(webhookEndpoints),
	payments: many(payments),
	expenses_approverId: many(expenses, {
		relationName: "expenses_approverId_users_id"
	}),
	expenses_userId: many(expenses, {
		relationName: "expenses_userId_users_id"
	}),
	payrolls_approvedBy: many(payrolls, {
		relationName: "payrolls_approvedBy_users_id"
	}),
	payrolls_generatedBy: many(payrolls, {
		relationName: "payrolls_generatedBy_users_id"
	}),
	payrolls_userId: many(payrolls, {
		relationName: "payrolls_userId_users_id"
	}),
	calendarEvents: many(calendarEvents),
	invoices: many(invoices),
	deals: many(deals),
	passwordHistories: many(passwordHistory),
	candidates: many(candidates),
	notificationPreferences: many(notificationPreferences),
	pushSubscriptions: many(pushSubscriptions),
	ticketWatchers: many(ticketWatchers),
	userSessions: many(userSessions),
	jobPostings: many(jobPostings),
	alumniProfiles: many(alumniProfiles),
	richDocuments_createdBy: many(richDocuments, {
		relationName: "richDocuments_createdBy_users_id"
	}),
	richDocuments_updatedBy: many(richDocuments, {
		relationName: "richDocuments_updatedBy_users_id"
	}),
	assessmentAttempts: many(assessmentAttempts),
	assetReturns: many(assetReturns),
	backgroundVerifications: many(backgroundVerifications),
	certifications: many(certifications),
	hrEmailTemplates: many(hrEmailTemplates),
	employeeSkills_userId: many(employeeSkills, {
		relationName: "employeeSkills_userId_users_id"
	}),
	employeeSkills_verifiedBy: many(employeeSkills, {
		relationName: "employeeSkills_verifiedBy_users_id"
	}),
	enpsScores: many(enpsScores),
	exitChecklists: many(exitChecklists),
	feedbackRequests_reviewerUserId: many(feedbackRequests, {
		relationName: "feedbackRequests_reviewerUserId_users_id"
	}),
	feedbackRequests_subjectUserId: many(feedbackRequests, {
		relationName: "feedbackRequests_subjectUserId_users_id"
	}),
	bonuses_approvedBy: many(bonuses, {
		relationName: "bonuses_approvedBy_users_id"
	}),
	bonuses_userId: many(bonuses, {
		relationName: "bonuses_userId_users_id"
	}),
	learningPaths: many(learningPaths),
	oneOnOneMeetings_employeeId: many(oneOnOneMeetings, {
		relationName: "oneOnOneMeetings_employeeId_users_id"
	}),
	oneOnOneMeetings_managerId: many(oneOnOneMeetings, {
		relationName: "oneOnOneMeetings_managerId_users_id"
	}),
	performanceImprovementPlans_managerId: many(performanceImprovementPlans, {
		relationName: "performanceImprovementPlans_managerId_users_id"
	}),
	performanceImprovementPlans_userId: many(performanceImprovementPlans, {
		relationName: "performanceImprovementPlans_userId_users_id"
	}),
	policyAcknowledgments: many(policyAcknowledgments),
	pulseSurveys: many(pulseSurveys),
	recognitions_fromUserId: many(recognitions, {
		relationName: "recognitions_fromUserId_users_id"
	}),
	recognitions_toUserId: many(recognitions, {
		relationName: "recognitions_toUserId_users_id"
	}),
	fnfSettlements_approvedBy: many(fnfSettlements, {
		relationName: "fnfSettlements_approvedBy_users_id"
	}),
	fnfSettlements_userId: many(fnfSettlements, {
		relationName: "fnfSettlements_userId_users_id"
	}),
	handbookVersions: many(handbookVersions),
	reviewCycles: many(reviewCycles),
	reimbursements_approvedBy: many(reimbursements, {
		relationName: "reimbursements_approvedBy_users_id"
	}),
	reimbursements_userId: many(reimbursements, {
		relationName: "reimbursements_userId_users_id"
	}),
	surveyResponses: many(surveyResponses),
	resignations_approvedBy: many(resignations, {
		relationName: "resignations_approvedBy_users_id"
	}),
	resignations_ceoReviewedBy: many(resignations, {
		relationName: "resignations_ceoReviewedBy_users_id"
	}),
	resignations_exitInterviewConductedBy: many(resignations, {
		relationName: "resignations_exitInterviewConductedBy_users_id"
	}),
	resignations_hrReviewedBy: many(resignations, {
		relationName: "resignations_hrReviewedBy_users_id"
	}),
	resignations_userId: many(resignations, {
		relationName: "resignations_userId_users_id"
	}),
	teamEvents: many(teamEvents),
	trainingEnrollments: many(trainingEnrollments),
	skillAssessments: many(skillAssessments),
	salaryLoans_approvedBy: many(salaryLoans, {
		relationName: "salaryLoans_approvedBy_users_id"
	}),
	salaryLoans_userId: many(salaryLoans, {
		relationName: "salaryLoans_userId_users_id"
	}),
	teamEventParticipants: many(teamEventParticipants),
	trainingPrograms: many(trainingPrograms),
	emailCampaigns: many(emailCampaigns),
	salesQuotas_setById: many(salesQuotas, {
		relationName: "salesQuotas_setById_users_id"
	}),
	salesQuotas_userId: many(salesQuotas, {
		relationName: "salesQuotas_userId_users_id"
	}),
	commissions: many(commissions),
	dealApprovals_approvedBy: many(dealApprovals, {
		relationName: "dealApprovals_approvedBy_users_id"
	}),
	dealApprovals_requestedBy: many(dealApprovals, {
		relationName: "dealApprovals_requestedBy_users_id"
	}),
	projectMilestones: many(projectMilestones),
	projectTemplates: many(projectTemplates),
	calibrationSessions: many(calibrationSessions),
	candidateDocuments: many(candidateDocuments),
	candidateDocumentsVaults: many(candidateDocumentsVault),
	candidateOffers: many(candidateOffers),
	candidateReferenceChecks: many(candidateReferenceChecks),
	mfaBackupCodes: many(mfaBackupCodes),
	candidateSources: many(candidateSources),
	documentAuditLogs: many(documentAuditLogs),
	documentTemplateVersions: many(documentTemplateVersions),
	candidateReferrals: many(candidateReferrals),
	interviewBookingLinks: many(interviewBookingLinks),
	documentTemplates: many(documentTemplates),
	scorecardTemplates: many(scorecardTemplates),
	leaveBlackoutDates: many(leaveBlackoutDates),
	onboardingTasks_completedBy: many(onboardingTasks, {
		relationName: "onboardingTasks_completedBy_users_id"
	}),
	onboardingTasks_userId: many(onboardingTasks, {
		relationName: "onboardingTasks_userId_users_id"
	}),
	interviewQuestions: many(interviewQuestions),
	onboardingTemplates: many(onboardingTemplates),
	onboardingDocuments_reviewedBy: many(onboardingDocuments, {
		relationName: "onboardingDocuments_reviewedBy_users_id"
	}),
	onboardingDocuments_userId: many(onboardingDocuments, {
		relationName: "onboardingDocuments_userId_users_id"
	}),
	interviewScorecards: many(interviewScorecards),
	clientOnboardingItems_assignedTo: many(clientOnboardingItems, {
		relationName: "clientOnboardingItems_assignedTo_users_id"
	}),
	clientOnboardingItems_completedBy: many(clientOnboardingItems, {
		relationName: "clientOnboardingItems_completedBy_users_id"
	}),
	clientOnboardingTemplates: many(clientOnboardingTemplates),
	clientOpportunities: many(clientOpportunities),
	csatSurveys: many(csatSurveys),
	customFieldDefinitions: many(customFieldDefinitions),
	dealMeetings: many(dealMeetings),
	terminations_ceoReviewedBy: many(terminations, {
		relationName: "terminations_ceoReviewedBy_users_id"
	}),
	terminations_initiatedBy: many(terminations, {
		relationName: "terminations_initiatedBy_users_id"
	}),
	terminations_userId: many(terminations, {
		relationName: "terminations_userId_users_id"
	}),
	vaultAccessLogs: many(vaultAccessLogs),
	taskSequences: many(taskSequences),
	tasks_assigneeId: many(tasks, {
		relationName: "tasks_assigneeId_users_id"
	}),
	tasks_createdBy: many(tasks, {
		relationName: "tasks_createdBy_users_id"
	}),
	territories: many(territories),
	webLeadForms: many(webLeadForms),
	aiUsageLogs: many(aiUsageLogs),
	announcements: many(announcements),
	leadImportBatches: many(leadImportBatches),
	apiKeys: many(apiKeys),
	eventAttendees: many(eventAttendees),
	abTests: many(abTests),
	interviews: many(interviews),
	contentCalendarItems_assignedTo: many(contentCalendarItems, {
		relationName: "contentCalendarItems_assignedTo_users_id"
	}),
	contentCalendarItems_createdBy: many(contentCalendarItems, {
		relationName: "contentCalendarItems_createdBy_users_id"
	}),
	landingPages: many(landingPages),
	socialMetrics: many(socialMetrics),
}));

export const organizationsRelations = relations(organizations, ({many}) => ({
	assets: many(assets),
	crmOrganizations: many(crmOrganizations),
	crmSlaPolicies: many(crmSlaPolicies),
	crmSupportTeamMembers: many(crmSupportTeamMembers),
	crmTeamPerformances: many(crmTeamPerformance),
	attendances: many(attendance),
	auditLogs: many(auditLogs),
	chatChannels: many(chatChannels),
	crmCampaigns: many(crmCampaigns),
	crmActivities: many(crmActivities),
	clients: many(clients),
	contacts: many(contacts),
	chatUserPresences: many(chatUserPresence),
	crmDeals: many(crmDeals),
	crmEmailTemplates: many(crmEmailTemplates),
	crmEvents: many(crmEvents),
	crmLeads: many(crmLeads),
	crmCompanies: many(crmCompanies),
	crmContents: many(crmContent),
	crmViews: many(crmViews),
	crmPeople: many(crmPeople),
	crmSupportTickets: many(crmSupportTickets),
	dealActivities: many(dealActivities),
	departments: many(departments),
	customStates: many(customStates),
	documents: many(documents),
	goals: many(goals),
	cycles: many(cycles),
	employeeDevices: many(employeeDevices),
	expenseCategories: many(expenseCategories),
	leaveBalances: many(leaveBalances),
	leaveTypes: many(leaveTypes),
	leads: many(leads),
	intakeItems: many(intakeItems),
	invitations: many(invitations),
	invoiceAiExtractions: many(invoiceAiExtractions),
	holidays: many(holidays),
	leadActivities: many(leadActivities),
	leadEmails: many(leadEmails),
	helpdeskTickets: many(helpdeskTickets),
	leadAssignmentRules: many(leadAssignmentRules),
	leadTasks: many(leadTasks),
	leaveRequests: many(leaveRequests),
	modules: many(modules),
	notifications: many(notifications),
	onboardingSteps: many(onboardingSteps),
	organizationMembers: many(organizationMembers),
	leadNotes: many(leadNotes),
	leadScoringRules: many(leadScoringRules),
	performanceReviews: many(performanceReviews),
	projectStatuses: many(projectStatuses),
	projectViews: many(projectViews),
	pages: many(pages),
	qrCodes: many(qrCodes),
	reports: many(reports),
	rolePermissions: many(rolePermissions),
	roles: many(roles),
	salaryStructures: many(salaryStructures),
	sprints: many(sprints),
	projects: many(projects),
	ticketAttachments: many(ticketAttachments),
	timesheets: many(timesheets),
	tickets: many(tickets),
	supportTickets: many(supportTickets),
	targets: many(targets),
	ticketLabels: many(ticketLabels),
	wfhRequests: many(wfhRequests),
	ticketComments: many(ticketComments),
	crmMonthlyMetrics: many(crmMonthlyMetrics),
	userPermissions: many(userPermissions),
	targetHistories: many(targetHistory),
	dmLeads: many(dmLeads),
	incentiveConfigs: many(incentiveConfig),
	incentives: many(incentives),
	branches: many(branches),
	clientAccounts: many(clientAccounts),
	socialMediaStats: many(socialMediaStats),
	webhookEndpoints: many(webhookEndpoints),
	webhookLogs: many(webhookLogs),
	payments: many(payments),
	expenses: many(expenses),
	payrolls: many(payrolls),
	calendarEvents: many(calendarEvents),
	invoices: many(invoices),
	deals: many(deals),
	candidates: many(candidates),
	notificationPreferences: many(notificationPreferences),
	pushSubscriptions: many(pushSubscriptions),
	candidateApplications: many(candidateApplications),
	jobPostings: many(jobPostings),
	alumniProfiles: many(alumniProfiles),
	richDocuments: many(richDocuments),
	assetReturns: many(assetReturns),
	backgroundVerifications: many(backgroundVerifications),
	careerLadders: many(careerLadders),
	certifications: many(certifications),
	hrEmailTemplates: many(hrEmailTemplates),
	employeeSkills: many(employeeSkills),
	enpsScores: many(enpsScores),
	feedbackRequests: many(feedbackRequests),
	bonuses: many(bonuses),
	learningPaths: many(learningPaths),
	oneOnOneMeetings: many(oneOnOneMeetings),
	performanceImprovementPlans: many(performanceImprovementPlans),
	policyAcknowledgments: many(policyAcknowledgments),
	pulseSurveys: many(pulseSurveys),
	recognitions: many(recognitions),
	fnfSettlements: many(fnfSettlements),
	handbookVersions: many(handbookVersions),
	reviewCycles: many(reviewCycles),
	reimbursements: many(reimbursements),
	resignations: many(resignations),
	teamEvents: many(teamEvents),
	trainingEnrollments: many(trainingEnrollments),
	skillAssessments: many(skillAssessments),
	salaryLoans: many(salaryLoans),
	trainingPrograms: many(trainingPrograms),
	emailCampaigns: many(emailCampaigns),
	salesQuotas: many(salesQuotas),
	commissionRules: many(commissionRules),
	commissions: many(commissions),
	dealApprovalRules: many(dealApprovalRules),
	dealApprovals: many(dealApprovals),
	projectMilestones: many(projectMilestones),
	projectTemplates: many(projectTemplates),
	calibrationSessions: many(calibrationSessions),
	candidateDocuments: many(candidateDocuments),
	candidateDocumentsVaults: many(candidateDocumentsVault),
	candidateOffers: many(candidateOffers),
	candidateReferenceChecks: many(candidateReferenceChecks),
	candidateSlaTrackings: many(candidateSlaTracking),
	candidateSources: many(candidateSources),
	documentAuditLogs: many(documentAuditLogs),
	documentTypes: many(documentTypes),
	candidateReferrals: many(candidateReferrals),
	interviewBookingLinks: many(interviewBookingLinks),
	documentTemplates: many(documentTemplates),
	scorecardTemplates: many(scorecardTemplates),
	leaveBlackoutDates: many(leaveBlackoutDates),
	onboardingTasks: many(onboardingTasks),
	interviewQuestions: many(interviewQuestions),
	onboardingTemplates: many(onboardingTemplates),
	interviewSlas: many(interviewSlas),
	onboardingDocuments: many(onboardingDocuments),
	clientOnboardingItems: many(clientOnboardingItems),
	clientOnboardingTemplates: many(clientOnboardingTemplates),
	clientOpportunities: many(clientOpportunities),
	csatSurveys: many(csatSurveys),
	customFieldDefinitions: many(customFieldDefinitions),
	dealMeetings: many(dealMeetings),
	terminations: many(terminations),
	taskSequences: many(taskSequences),
	tasks: many(tasks),
	territories: many(territories),
	webLeadForms: many(webLeadForms),
	aiUsageLogs: many(aiUsageLogs),
	announcements: many(announcements),
	leadImportBatches: many(leadImportBatches),
	apiKeys: many(apiKeys),
	interviews: many(interviews),
	csatResponses: many(csatResponses),
}));

export const assignmentRuleStateRelations = relations(assignmentRuleState, ({one}) => ({
	leadAssignmentRule: one(leadAssignmentRules, {
		fields: [assignmentRuleState.ruleId],
		references: [leadAssignmentRules.id]
	}),
}));

export const leadAssignmentRulesRelations = relations(leadAssignmentRules, ({one, many}) => ({
	assignmentRuleStates: many(assignmentRuleState),
	user: one(users, {
		fields: [leadAssignmentRules.assignToUserId],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [leadAssignmentRules.orgId],
		references: [organizations.id]
	}),
}));

export const crmOrganizationsRelations = relations(crmOrganizations, ({one, many}) => ({
	organization: one(organizations, {
		fields: [crmOrganizations.orgId],
		references: [organizations.id]
	}),
	crmOrganization: one(crmOrganizations, {
		fields: [crmOrganizations.parentId],
		references: [crmOrganizations.id],
		relationName: "crmOrganizations_parentId_crmOrganizations_id"
	}),
	crmOrganizations: many(crmOrganizations, {
		relationName: "crmOrganizations_parentId_crmOrganizations_id"
	}),
}));

export const crmSlaPoliciesRelations = relations(crmSlaPolicies, ({one}) => ({
	organization: one(organizations, {
		fields: [crmSlaPolicies.orgId],
		references: [organizations.id]
	}),
}));

export const crmSupportTeamMembersRelations = relations(crmSupportTeamMembers, ({one}) => ({
	organization: one(organizations, {
		fields: [crmSupportTeamMembers.orgId],
		references: [organizations.id]
	}),
}));

export const crmTeamPerformanceRelations = relations(crmTeamPerformance, ({one}) => ({
	organization: one(organizations, {
		fields: [crmTeamPerformance.orgId],
		references: [organizations.id]
	}),
	crmPerson: one(crmPeople, {
		fields: [crmTeamPerformance.personId],
		references: [crmPeople.id]
	}),
}));

export const crmPeopleRelations = relations(crmPeople, ({one, many}) => ({
	crmTeamPerformances: many(crmTeamPerformance),
	crmActivities: many(crmActivities),
	crmDeals: many(crmDeals),
	crmCompanies: many(crmCompanies),
	organization: one(organizations, {
		fields: [crmPeople.orgId],
		references: [organizations.id]
	}),
	crmSupportTickets: many(crmSupportTickets),
}));

export const accountsRelations = relations(accounts, ({one}) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	}),
}));

export const attendanceRelations = relations(attendance, ({one}) => ({
	organization: one(organizations, {
		fields: [attendance.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [attendance.userId],
		references: [users.id]
	}),
}));

export const chatAttachmentsRelations = relations(chatAttachments, ({one}) => ({
	chatMessage: one(chatMessages, {
		fields: [chatAttachments.messageId],
		references: [chatMessages.id]
	}),
}));

export const chatMessagesRelations = relations(chatMessages, ({one, many}) => ({
	chatAttachments: many(chatAttachments),
	chatChannel: one(chatChannels, {
		fields: [chatMessages.channelId],
		references: [chatChannels.id]
	}),
	user: one(users, {
		fields: [chatMessages.senderId],
		references: [users.id]
	}),
}));

export const chatChannelMembersRelations = relations(chatChannelMembers, ({one}) => ({
	chatChannel: one(chatChannels, {
		fields: [chatChannelMembers.channelId],
		references: [chatChannels.id]
	}),
	user: one(users, {
		fields: [chatChannelMembers.userId],
		references: [users.id]
	}),
}));

export const chatChannelsRelations = relations(chatChannels, ({one, many}) => ({
	chatChannelMembers: many(chatChannelMembers),
	user: one(users, {
		fields: [chatChannels.createdBy],
		references: [users.id]
	}),
	deal: one(deals, {
		fields: [chatChannels.linkedDealId],
		references: [deals.id]
	}),
	organization: one(organizations, {
		fields: [chatChannels.orgId],
		references: [organizations.id]
	}),
	chatMessages: many(chatMessages),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	organization: one(organizations, {
		fields: [auditLogs.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [auditLogs.userId],
		references: [users.id]
	}),
}));

export const dealsRelations = relations(deals, ({one, many}) => ({
	chatChannels: many(chatChannels),
	contacts: many(contacts),
	dealActivities: many(dealActivities),
	user: one(users, {
		fields: [deals.assignedToId],
		references: [users.id]
	}),
	client_clientId: one(clients, {
		fields: [deals.clientId],
		references: [clients.id],
		relationName: "deals_clientId_clients_id"
	}),
	lead_leadId: one(leads, {
		fields: [deals.leadId],
		references: [leads.id],
		relationName: "deals_leadId_leads_id"
	}),
	client_linkedClientId: one(clients, {
		fields: [deals.linkedClientId],
		references: [clients.id],
		relationName: "deals_linkedClientId_clients_id"
	}),
	lead_linkedLeadId: one(leads, {
		fields: [deals.linkedLeadId],
		references: [leads.id],
		relationName: "deals_linkedLeadId_leads_id"
	}),
	organization: one(organizations, {
		fields: [deals.orgId],
		references: [organizations.id]
	}),
	commissions: many(commissions),
	dealApprovals: many(dealApprovals),
	dealMeetings: many(dealMeetings),
}));

export const crmCampaignsRelations = relations(crmCampaigns, ({one, many}) => ({
	organization: one(organizations, {
		fields: [crmCampaigns.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [crmCampaigns.ownerId],
		references: [users.id]
	}),
	crmLeads: many(crmLeads),
	leads: many(leads),
	dmLeads: many(dmLeads),
}));

export const crmActivitiesRelations = relations(crmActivities, ({one}) => ({
	organization: one(organizations, {
		fields: [crmActivities.orgId],
		references: [organizations.id]
	}),
	crmPerson: one(crmPeople, {
		fields: [crmActivities.personId],
		references: [crmPeople.id]
	}),
}));

export const clientsRelations = relations(clients, ({one, many}) => ({
	user: one(users, {
		fields: [clients.accountManagerId],
		references: [users.id]
	}),
	lead: one(leads, {
		fields: [clients.leadId],
		references: [leads.id]
	}),
	organization: one(organizations, {
		fields: [clients.orgId],
		references: [organizations.id]
	}),
	supportTickets: many(supportTickets),
	invoices: many(invoices),
	deals_clientId: many(deals, {
		relationName: "deals_clientId_clients_id"
	}),
	deals_linkedClientId: many(deals, {
		relationName: "deals_linkedClientId_clients_id"
	}),
	clientOnboardingItems: many(clientOnboardingItems),
	clientOpportunities: many(clientOpportunities),
	csatSurveys: many(csatSurveys),
}));

export const leadsRelations = relations(leads, ({one, many}) => ({
	clients: many(clients),
	contacts: many(contacts),
	user_assignedById: one(users, {
		fields: [leads.assignedById],
		references: [users.id],
		relationName: "leads_assignedById_users_id"
	}),
	user_assignedToId: one(users, {
		fields: [leads.assignedToId],
		references: [users.id],
		relationName: "leads_assignedToId_users_id"
	}),
	crmCampaign: one(crmCampaigns, {
		fields: [leads.campaignId],
		references: [crmCampaigns.id]
	}),
	organization: one(organizations, {
		fields: [leads.orgId],
		references: [organizations.id]
	}),
	user_verifiedById: one(users, {
		fields: [leads.verifiedById],
		references: [users.id],
		relationName: "leads_verifiedById_users_id"
	}),
	leadActivities: many(leadActivities),
	leadEmails: many(leadEmails),
	leadTasks: many(leadTasks),
	leadNotes: many(leadNotes),
	dmLeads: many(dmLeads),
	clientAccounts: many(clientAccounts),
	deals_leadId: many(deals, {
		relationName: "deals_leadId_leads_id"
	}),
	deals_linkedLeadId: many(deals, {
		relationName: "deals_linkedLeadId_leads_id"
	}),
	emailCampaignRecipients: many(emailCampaignRecipients),
}));

export const contactsRelations = relations(contacts, ({one}) => ({
	deal: one(deals, {
		fields: [contacts.dealId],
		references: [deals.id]
	}),
	lead: one(leads, {
		fields: [contacts.leadId],
		references: [leads.id]
	}),
	organization: one(organizations, {
		fields: [contacts.orgId],
		references: [organizations.id]
	}),
}));

export const chatUserPresenceRelations = relations(chatUserPresence, ({one}) => ({
	organization: one(organizations, {
		fields: [chatUserPresence.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [chatUserPresence.userId],
		references: [users.id]
	}),
}));

export const crmDealsRelations = relations(crmDeals, ({one}) => ({
	organization: one(organizations, {
		fields: [crmDeals.orgId],
		references: [organizations.id]
	}),
	crmPerson: one(crmPeople, {
		fields: [crmDeals.salesRepId],
		references: [crmPeople.id]
	}),
}));

export const crmEmailTemplatesRelations = relations(crmEmailTemplates, ({one}) => ({
	user: one(users, {
		fields: [crmEmailTemplates.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [crmEmailTemplates.orgId],
		references: [organizations.id]
	}),
}));

export const crmEventsRelations = relations(crmEvents, ({one}) => ({
	organization: one(organizations, {
		fields: [crmEvents.orgId],
		references: [organizations.id]
	}),
}));

export const crmLeadsRelations = relations(crmLeads, ({one}) => ({
	crmCampaign: one(crmCampaigns, {
		fields: [crmLeads.campaignId],
		references: [crmCampaigns.id]
	}),
	organization: one(organizations, {
		fields: [crmLeads.orgId],
		references: [organizations.id]
	}),
}));

export const crmCompaniesRelations = relations(crmCompanies, ({one}) => ({
	crmPerson: one(crmPeople, {
		fields: [crmCompanies.csmId],
		references: [crmPeople.id]
	}),
	organization: one(organizations, {
		fields: [crmCompanies.orgId],
		references: [organizations.id]
	}),
}));

export const crmContentRelations = relations(crmContent, ({one}) => ({
	organization: one(organizations, {
		fields: [crmContent.orgId],
		references: [organizations.id]
	}),
}));

export const crmViewsRelations = relations(crmViews, ({one}) => ({
	user: one(users, {
		fields: [crmViews.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [crmViews.orgId],
		references: [organizations.id]
	}),
}));

export const crmSupportTicketsRelations = relations(crmSupportTickets, ({one}) => ({
	crmPerson: one(crmPeople, {
		fields: [crmSupportTickets.assigneeId],
		references: [crmPeople.id]
	}),
	organization: one(organizations, {
		fields: [crmSupportTickets.orgId],
		references: [organizations.id]
	}),
}));

export const dealActivitiesRelations = relations(dealActivities, ({one}) => ({
	deal: one(deals, {
		fields: [dealActivities.dealId],
		references: [deals.id]
	}),
	organization: one(organizations, {
		fields: [dealActivities.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [dealActivities.userId],
		references: [users.id]
	}),
}));

export const departmentsRelations = relations(departments, ({one, many}) => ({
	organization: one(organizations, {
		fields: [departments.orgId],
		references: [organizations.id]
	}),
	documents: many(documents),
	departmentMembers: many(departmentMembers),
	jobPostings: many(jobPostings),
}));

export const customStatesRelations = relations(customStates, ({one}) => ({
	organization: one(organizations, {
		fields: [customStates.orgId],
		references: [organizations.id]
	}),
	project: one(projects, {
		fields: [customStates.projectId],
		references: [projects.id]
	}),
}));

export const projectsRelations = relations(projects, ({one, many}) => ({
	customStates: many(customStates),
	cycles: many(cycles),
	intakeItems: many(intakeItems),
	modules: many(modules),
	projectMembers: many(projectMembers),
	projectStatuses: many(projectStatuses),
	projectViews: many(projectViews),
	pages: many(pages),
	sprints: many(sprints),
	user_clientId: one(users, {
		fields: [projects.clientId],
		references: [users.id],
		relationName: "projects_clientId_users_id"
	}),
	user_managerId: one(users, {
		fields: [projects.managerId],
		references: [users.id],
		relationName: "projects_managerId_users_id"
	}),
	organization: one(organizations, {
		fields: [projects.orgId],
		references: [organizations.id]
	}),
	tickets: many(tickets),
	expenses: many(expenses),
	invoices: many(invoices),
	projectMilestones: many(projectMilestones),
}));

export const documentsRelations = relations(documents, ({one, many}) => ({
	department: one(departments, {
		fields: [documents.departmentId],
		references: [departments.id]
	}),
	organization: one(organizations, {
		fields: [documents.orgId],
		references: [organizations.id]
	}),
	user_uploadedBy: one(users, {
		fields: [documents.uploadedBy],
		references: [users.id],
		relationName: "documents_uploadedBy_users_id"
	}),
	user_userId: one(users, {
		fields: [documents.userId],
		references: [users.id],
		relationName: "documents_userId_users_id"
	}),
	policyAcknowledgments: many(policyAcknowledgments),
}));

export const goalsRelations = relations(goals, ({one, many}) => ({
	organization: one(organizations, {
		fields: [goals.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [goals.userId],
		references: [users.id]
	}),
	keyResults: many(keyResults),
}));

export const cyclesRelations = relations(cycles, ({one}) => ({
	user: one(users, {
		fields: [cycles.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [cycles.orgId],
		references: [organizations.id]
	}),
	project: one(projects, {
		fields: [cycles.projectId],
		references: [projects.id]
	}),
}));

export const employeeDevicesRelations = relations(employeeDevices, ({one}) => ({
	organization: one(organizations, {
		fields: [employeeDevices.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [employeeDevices.userId],
		references: [users.id]
	}),
}));

export const expenseCategoriesRelations = relations(expenseCategories, ({one, many}) => ({
	organization: one(organizations, {
		fields: [expenseCategories.orgId],
		references: [organizations.id]
	}),
	expenses: many(expenses),
}));

export const leaveBalancesRelations = relations(leaveBalances, ({one}) => ({
	leaveType: one(leaveTypes, {
		fields: [leaveBalances.leaveTypeId],
		references: [leaveTypes.id]
	}),
	organization: one(organizations, {
		fields: [leaveBalances.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [leaveBalances.userId],
		references: [users.id]
	}),
}));

export const leaveTypesRelations = relations(leaveTypes, ({one, many}) => ({
	leaveBalances: many(leaveBalances),
	organization: one(organizations, {
		fields: [leaveTypes.orgId],
		references: [organizations.id]
	}),
	leaveRequests: many(leaveRequests),
}));

export const intakeItemsRelations = relations(intakeItems, ({one}) => ({
	ticket: one(tickets, {
		fields: [intakeItems.linkedWorkItemId],
		references: [tickets.id]
	}),
	organization: one(organizations, {
		fields: [intakeItems.orgId],
		references: [organizations.id]
	}),
	project: one(projects, {
		fields: [intakeItems.projectId],
		references: [projects.id]
	}),
}));

export const ticketsRelations = relations(tickets, ({one, many}) => ({
	intakeItems: many(intakeItems),
	ticketAttachments: many(ticketAttachments),
	timesheets: many(timesheets),
	user_assigneeId: one(users, {
		fields: [tickets.assigneeId],
		references: [users.id],
		relationName: "tickets_assigneeId_users_id"
	}),
	ticket_epicId: one(tickets, {
		fields: [tickets.epicId],
		references: [tickets.id],
		relationName: "tickets_epicId_tickets_id"
	}),
	tickets_epicId: many(tickets, {
		relationName: "tickets_epicId_tickets_id"
	}),
	organization: one(organizations, {
		fields: [tickets.orgId],
		references: [organizations.id]
	}),
	ticket_parentTicketId: one(tickets, {
		fields: [tickets.parentTicketId],
		references: [tickets.id],
		relationName: "tickets_parentTicketId_tickets_id"
	}),
	tickets_parentTicketId: many(tickets, {
		relationName: "tickets_parentTicketId_tickets_id"
	}),
	project: one(projects, {
		fields: [tickets.projectId],
		references: [projects.id]
	}),
	user_reporterId: one(users, {
		fields: [tickets.reporterId],
		references: [users.id],
		relationName: "tickets_reporterId_users_id"
	}),
	sprint: one(sprints, {
		fields: [tickets.sprintId],
		references: [sprints.id]
	}),
	ticketAssignees: many(ticketAssignees),
	workItemRelations_relatedWorkItemId: many(workItemRelations, {
		relationName: "workItemRelations_relatedWorkItemId_tickets_id"
	}),
	workItemRelations_workItemId: many(workItemRelations, {
		relationName: "workItemRelations_workItemId_tickets_id"
	}),
	ticketComments: many(ticketComments),
	ticketLabelMappings: many(ticketLabelMappings),
	ticketWatchers: many(ticketWatchers),
}));

export const invitationsRelations = relations(invitations, ({one}) => ({
	user: one(users, {
		fields: [invitations.invitedBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [invitations.orgId],
		references: [organizations.id]
	}),
}));

export const invoiceAiExtractionsRelations = relations(invoiceAiExtractions, ({one}) => ({
	user: one(users, {
		fields: [invoiceAiExtractions.createdBy],
		references: [users.id]
	}),
	invoice: one(invoices, {
		fields: [invoiceAiExtractions.invoiceId],
		references: [invoices.id]
	}),
	organization: one(organizations, {
		fields: [invoiceAiExtractions.orgId],
		references: [organizations.id]
	}),
}));

export const invoicesRelations = relations(invoices, ({one, many}) => ({
	invoiceAiExtractions: many(invoiceAiExtractions),
	payments: many(payments),
	client: one(clients, {
		fields: [invoices.clientId],
		references: [clients.id]
	}),
	user: one(users, {
		fields: [invoices.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [invoices.orgId],
		references: [organizations.id]
	}),
	project: one(projects, {
		fields: [invoices.projectId],
		references: [projects.id]
	}),
}));

export const holidaysRelations = relations(holidays, ({one}) => ({
	organization: one(organizations, {
		fields: [holidays.orgId],
		references: [organizations.id]
	}),
}));

export const leadActivitiesRelations = relations(leadActivities, ({one}) => ({
	lead: one(leads, {
		fields: [leadActivities.leadId],
		references: [leads.id]
	}),
	organization: one(organizations, {
		fields: [leadActivities.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [leadActivities.userId],
		references: [users.id]
	}),
}));

export const leadEmailsRelations = relations(leadEmails, ({one}) => ({
	lead: one(leads, {
		fields: [leadEmails.leadId],
		references: [leads.id]
	}),
	organization: one(organizations, {
		fields: [leadEmails.orgId],
		references: [organizations.id]
	}),
}));

export const helpdeskTicketsRelations = relations(helpdeskTickets, ({one}) => ({
	user_assigneeId: one(users, {
		fields: [helpdeskTickets.assigneeId],
		references: [users.id],
		relationName: "helpdeskTickets_assigneeId_users_id"
	}),
	organization: one(organizations, {
		fields: [helpdeskTickets.orgId],
		references: [organizations.id]
	}),
	user_userId: one(users, {
		fields: [helpdeskTickets.userId],
		references: [users.id],
		relationName: "helpdeskTickets_userId_users_id"
	}),
}));

export const leadTasksRelations = relations(leadTasks, ({one}) => ({
	user: one(users, {
		fields: [leadTasks.assigneeId],
		references: [users.id]
	}),
	lead: one(leads, {
		fields: [leadTasks.leadId],
		references: [leads.id]
	}),
	organization: one(organizations, {
		fields: [leadTasks.orgId],
		references: [organizations.id]
	}),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({one}) => ({
	user_approverId: one(users, {
		fields: [leaveRequests.approverId],
		references: [users.id],
		relationName: "leaveRequests_approverId_users_id"
	}),
	user_coveringEmployeeId: one(users, {
		fields: [leaveRequests.coveringEmployeeId],
		references: [users.id],
		relationName: "leaveRequests_coveringEmployeeId_users_id"
	}),
	leaveType: one(leaveTypes, {
		fields: [leaveRequests.leaveTypeId],
		references: [leaveTypes.id]
	}),
	organization: one(organizations, {
		fields: [leaveRequests.orgId],
		references: [organizations.id]
	}),
	user_userId: one(users, {
		fields: [leaveRequests.userId],
		references: [users.id],
		relationName: "leaveRequests_userId_users_id"
	}),
}));

export const modulesRelations = relations(modules, ({one, many}) => ({
	user_createdBy: one(users, {
		fields: [modules.createdBy],
		references: [users.id],
		relationName: "modules_createdBy_users_id"
	}),
	user_leadId: one(users, {
		fields: [modules.leadId],
		references: [users.id],
		relationName: "modules_leadId_users_id"
	}),
	organization: one(organizations, {
		fields: [modules.orgId],
		references: [organizations.id]
	}),
	project: one(projects, {
		fields: [modules.projectId],
		references: [projects.id]
	}),
	moduleLinks_linkedModuleId: many(moduleLinks, {
		relationName: "moduleLinks_linkedModuleId_modules_id"
	}),
	moduleLinks_moduleId: many(moduleLinks, {
		relationName: "moduleLinks_moduleId_modules_id"
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	organization: one(organizations, {
		fields: [notifications.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id]
	}),
}));

export const onboardingStepsRelations = relations(onboardingSteps, ({one}) => ({
	organization: one(organizations, {
		fields: [onboardingSteps.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [onboardingSteps.userId],
		references: [users.id]
	}),
}));

export const organizationMembersRelations = relations(organizationMembers, ({one}) => ({
	organization: one(organizations, {
		fields: [organizationMembers.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [organizationMembers.userId],
		references: [users.id]
	}),
}));

export const leadNotesRelations = relations(leadNotes, ({one}) => ({
	user: one(users, {
		fields: [leadNotes.authorId],
		references: [users.id]
	}),
	lead: one(leads, {
		fields: [leadNotes.leadId],
		references: [leads.id]
	}),
	organization: one(organizations, {
		fields: [leadNotes.orgId],
		references: [organizations.id]
	}),
}));

export const leadScoringRulesRelations = relations(leadScoringRules, ({one}) => ({
	organization: one(organizations, {
		fields: [leadScoringRules.orgId],
		references: [organizations.id]
	}),
}));

export const performanceReviewsRelations = relations(performanceReviews, ({one}) => ({
	reviewCycle: one(reviewCycles, {
		fields: [performanceReviews.cycleId],
		references: [reviewCycles.id]
	}),
	organization: one(organizations, {
		fields: [performanceReviews.orgId],
		references: [organizations.id]
	}),
	user_reviewerId: one(users, {
		fields: [performanceReviews.reviewerId],
		references: [users.id],
		relationName: "performanceReviews_reviewerId_users_id"
	}),
	user_userId: one(users, {
		fields: [performanceReviews.userId],
		references: [users.id],
		relationName: "performanceReviews_userId_users_id"
	}),
}));

export const reviewCyclesRelations = relations(reviewCycles, ({one, many}) => ({
	performanceReviews: many(performanceReviews),
	feedbackRequests: many(feedbackRequests),
	user: one(users, {
		fields: [reviewCycles.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [reviewCycles.orgId],
		references: [organizations.id]
	}),
}));

export const projectMembersRelations = relations(projectMembers, ({one}) => ({
	project: one(projects, {
		fields: [projectMembers.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [projectMembers.userId],
		references: [users.id]
	}),
}));

export const projectStatusesRelations = relations(projectStatuses, ({one}) => ({
	organization: one(organizations, {
		fields: [projectStatuses.orgId],
		references: [organizations.id]
	}),
	project: one(projects, {
		fields: [projectStatuses.projectId],
		references: [projects.id]
	}),
}));

export const projectViewsRelations = relations(projectViews, ({one}) => ({
	user: one(users, {
		fields: [projectViews.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [projectViews.orgId],
		references: [organizations.id]
	}),
	project: one(projects, {
		fields: [projectViews.projectId],
		references: [projects.id]
	}),
}));

export const pagesRelations = relations(pages, ({one, many}) => ({
	user: one(users, {
		fields: [pages.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [pages.orgId],
		references: [organizations.id]
	}),
	page: one(pages, {
		fields: [pages.parentPageId],
		references: [pages.id],
		relationName: "pages_parentPageId_pages_id"
	}),
	pages: many(pages, {
		relationName: "pages_parentPageId_pages_id"
	}),
	project: one(projects, {
		fields: [pages.projectId],
		references: [projects.id]
	}),
}));

export const qrCodesRelations = relations(qrCodes, ({one}) => ({
	organization: one(organizations, {
		fields: [qrCodes.orgId],
		references: [organizations.id]
	}),
}));

export const reportsRelations = relations(reports, ({one}) => ({
	user: one(users, {
		fields: [reports.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [reports.orgId],
		references: [organizations.id]
	}),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({one}) => ({
	organization: one(organizations, {
		fields: [rolePermissions.orgId],
		references: [organizations.id]
	}),
	permission: one(permissions, {
		fields: [rolePermissions.permissionId],
		references: [permissions.id]
	}),
}));

export const permissionsRelations = relations(permissions, ({many}) => ({
	rolePermissions: many(rolePermissions),
	userPermissions: many(userPermissions),
}));

export const rolesRelations = relations(roles, ({one}) => ({
	organization: one(organizations, {
		fields: [roles.orgId],
		references: [organizations.id]
	}),
}));

export const salaryStructuresRelations = relations(salaryStructures, ({one}) => ({
	organization: one(organizations, {
		fields: [salaryStructures.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [salaryStructures.userId],
		references: [users.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const sprintsRelations = relations(sprints, ({one, many}) => ({
	organization: one(organizations, {
		fields: [sprints.orgId],
		references: [organizations.id]
	}),
	project: one(projects, {
		fields: [sprints.projectId],
		references: [projects.id]
	}),
	tickets: many(tickets),
}));

export const ticketAttachmentsRelations = relations(ticketAttachments, ({one}) => ({
	organization: one(organizations, {
		fields: [ticketAttachments.orgId],
		references: [organizations.id]
	}),
	ticket: one(tickets, {
		fields: [ticketAttachments.ticketId],
		references: [tickets.id]
	}),
	user: one(users, {
		fields: [ticketAttachments.uploadedBy],
		references: [users.id]
	}),
}));

export const timesheetsRelations = relations(timesheets, ({one}) => ({
	user_approvedBy: one(users, {
		fields: [timesheets.approvedBy],
		references: [users.id],
		relationName: "timesheets_approvedBy_users_id"
	}),
	organization: one(organizations, {
		fields: [timesheets.orgId],
		references: [organizations.id]
	}),
	ticket: one(tickets, {
		fields: [timesheets.ticketId],
		references: [tickets.id]
	}),
	user_userId: one(users, {
		fields: [timesheets.userId],
		references: [users.id],
		relationName: "timesheets_userId_users_id"
	}),
}));

export const supportTicketsRelations = relations(supportTickets, ({one, many}) => ({
	user_assigneeId: one(users, {
		fields: [supportTickets.assigneeId],
		references: [users.id],
		relationName: "supportTickets_assigneeId_users_id"
	}),
	client: one(clients, {
		fields: [supportTickets.clientId],
		references: [clients.id]
	}),
	user_createdBy: one(users, {
		fields: [supportTickets.createdBy],
		references: [users.id],
		relationName: "supportTickets_createdBy_users_id"
	}),
	organization: one(organizations, {
		fields: [supportTickets.orgId],
		references: [organizations.id]
	}),
	supportTicketMessages: many(supportTicketMessages),
}));

export const supportTicketMessagesRelations = relations(supportTicketMessages, ({one}) => ({
	user: one(users, {
		fields: [supportTicketMessages.authorId],
		references: [users.id]
	}),
	supportTicket: one(supportTickets, {
		fields: [supportTicketMessages.ticketId],
		references: [supportTickets.id]
	}),
}));

export const ticketAssigneesRelations = relations(ticketAssignees, ({one}) => ({
	user_assignedBy: one(users, {
		fields: [ticketAssignees.assignedBy],
		references: [users.id],
		relationName: "ticketAssignees_assignedBy_users_id"
	}),
	ticket: one(tickets, {
		fields: [ticketAssignees.ticketId],
		references: [tickets.id]
	}),
	user_userId: one(users, {
		fields: [ticketAssignees.userId],
		references: [users.id],
		relationName: "ticketAssignees_userId_users_id"
	}),
}));

export const targetsRelations = relations(targets, ({one, many}) => ({
	organization: one(organizations, {
		fields: [targets.orgId],
		references: [organizations.id]
	}),
	target: one(targets, {
		fields: [targets.parentTargetId],
		references: [targets.id],
		relationName: "targets_parentTargetId_targets_id"
	}),
	targets: many(targets, {
		relationName: "targets_parentTargetId_targets_id"
	}),
	user_setById: one(users, {
		fields: [targets.setById],
		references: [users.id],
		relationName: "targets_setById_users_id"
	}),
	user_userId: one(users, {
		fields: [targets.userId],
		references: [users.id],
		relationName: "targets_userId_users_id"
	}),
	targetHistories: many(targetHistory),
}));

export const ticketLabelsRelations = relations(ticketLabels, ({one, many}) => ({
	organization: one(organizations, {
		fields: [ticketLabels.orgId],
		references: [organizations.id]
	}),
	ticketLabelMappings: many(ticketLabelMappings),
}));

export const wfhRequestsRelations = relations(wfhRequests, ({one}) => ({
	user_approverId: one(users, {
		fields: [wfhRequests.approverId],
		references: [users.id],
		relationName: "wfhRequests_approverId_users_id"
	}),
	organization: one(organizations, {
		fields: [wfhRequests.orgId],
		references: [organizations.id]
	}),
	user_userId: one(users, {
		fields: [wfhRequests.userId],
		references: [users.id],
		relationName: "wfhRequests_userId_users_id"
	}),
}));

export const workItemRelationsRelations = relations(workItemRelations, ({one}) => ({
	ticket_relatedWorkItemId: one(tickets, {
		fields: [workItemRelations.relatedWorkItemId],
		references: [tickets.id],
		relationName: "workItemRelations_relatedWorkItemId_tickets_id"
	}),
	ticket_workItemId: one(tickets, {
		fields: [workItemRelations.workItemId],
		references: [tickets.id],
		relationName: "workItemRelations_workItemId_tickets_id"
	}),
}));

export const ticketCommentsRelations = relations(ticketComments, ({one}) => ({
	organization: one(organizations, {
		fields: [ticketComments.orgId],
		references: [organizations.id]
	}),
	ticket: one(tickets, {
		fields: [ticketComments.ticketId],
		references: [tickets.id]
	}),
	user: one(users, {
		fields: [ticketComments.userId],
		references: [users.id]
	}),
}));

export const crmMonthlyMetricsRelations = relations(crmMonthlyMetrics, ({one}) => ({
	organization: one(organizations, {
		fields: [crmMonthlyMetrics.orgId],
		references: [organizations.id]
	}),
}));

export const departmentMembersRelations = relations(departmentMembers, ({one}) => ({
	department: one(departments, {
		fields: [departmentMembers.departmentId],
		references: [departments.id]
	}),
	user: one(users, {
		fields: [departmentMembers.userId],
		references: [users.id]
	}),
}));

export const moduleLinksRelations = relations(moduleLinks, ({one}) => ({
	module_linkedModuleId: one(modules, {
		fields: [moduleLinks.linkedModuleId],
		references: [modules.id],
		relationName: "moduleLinks_linkedModuleId_modules_id"
	}),
	module_moduleId: one(modules, {
		fields: [moduleLinks.moduleId],
		references: [modules.id],
		relationName: "moduleLinks_moduleId_modules_id"
	}),
}));

export const ticketLabelMappingsRelations = relations(ticketLabelMappings, ({one}) => ({
	ticketLabel: one(ticketLabels, {
		fields: [ticketLabelMappings.labelId],
		references: [ticketLabels.id]
	}),
	ticket: one(tickets, {
		fields: [ticketLabelMappings.ticketId],
		references: [tickets.id]
	}),
}));

export const userPermissionsRelations = relations(userPermissions, ({one}) => ({
	organization: one(organizations, {
		fields: [userPermissions.orgId],
		references: [organizations.id]
	}),
	permission: one(permissions, {
		fields: [userPermissions.permissionId],
		references: [permissions.id]
	}),
	user: one(users, {
		fields: [userPermissions.userId],
		references: [users.id]
	}),
}));

export const targetHistoryRelations = relations(targetHistory, ({one}) => ({
	user: one(users, {
		fields: [targetHistory.changedById],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [targetHistory.orgId],
		references: [organizations.id]
	}),
	target: one(targets, {
		fields: [targetHistory.targetId],
		references: [targets.id]
	}),
}));

export const dmLeadsRelations = relations(dmLeads, ({one}) => ({
	crmCampaign: one(crmCampaigns, {
		fields: [dmLeads.campaignId],
		references: [crmCampaigns.id]
	}),
	user_createdBy: one(users, {
		fields: [dmLeads.createdBy],
		references: [users.id],
		relationName: "dmLeads_createdBy_users_id"
	}),
	lead: one(leads, {
		fields: [dmLeads.importedLeadId],
		references: [leads.id]
	}),
	organization: one(organizations, {
		fields: [dmLeads.orgId],
		references: [organizations.id]
	}),
	user_verifiedBy: one(users, {
		fields: [dmLeads.verifiedBy],
		references: [users.id],
		relationName: "dmLeads_verifiedBy_users_id"
	}),
}));

export const incentiveConfigRelations = relations(incentiveConfig, ({one}) => ({
	branch: one(branches, {
		fields: [incentiveConfig.branchId],
		references: [branches.id]
	}),
	user: one(users, {
		fields: [incentiveConfig.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [incentiveConfig.orgId],
		references: [organizations.id]
	}),
}));

export const branchesRelations = relations(branches, ({one, many}) => ({
	incentiveConfigs: many(incentiveConfig),
	incentives: many(incentives),
	user_branchHrId: one(users, {
		fields: [branches.branchHrId],
		references: [users.id],
		relationName: "branches_branchHrId_users_id"
	}),
	user_branchManagerId: one(users, {
		fields: [branches.branchManagerId],
		references: [users.id],
		relationName: "branches_branchManagerId_users_id"
	}),
	organization: one(organizations, {
		fields: [branches.orgId],
		references: [organizations.id]
	}),
	clientAccounts: many(clientAccounts),
}));

export const incentivesRelations = relations(incentives, ({one}) => ({
	user_approvedBy: one(users, {
		fields: [incentives.approvedBy],
		references: [users.id],
		relationName: "incentives_approvedBy_users_id"
	}),
	branch: one(branches, {
		fields: [incentives.branchId],
		references: [branches.id]
	}),
	clientAccount: one(clientAccounts, {
		fields: [incentives.clientAccountId],
		references: [clientAccounts.id]
	}),
	organization: one(organizations, {
		fields: [incentives.orgId],
		references: [organizations.id]
	}),
	payroll: one(payrolls, {
		fields: [incentives.payrollId],
		references: [payrolls.id]
	}),
	user_salesRepId: one(users, {
		fields: [incentives.salesRepId],
		references: [users.id],
		relationName: "incentives_salesRepId_users_id"
	}),
}));

export const clientAccountsRelations = relations(clientAccounts, ({one, many}) => ({
	incentives: many(incentives),
	user_assignedCrmId: one(users, {
		fields: [clientAccounts.assignedCrmId],
		references: [users.id],
		relationName: "clientAccounts_assignedCrmId_users_id"
	}),
	branch: one(branches, {
		fields: [clientAccounts.branchId],
		references: [branches.id]
	}),
	lead: one(leads, {
		fields: [clientAccounts.leadId],
		references: [leads.id]
	}),
	organization: one(organizations, {
		fields: [clientAccounts.orgId],
		references: [organizations.id]
	}),
	user_salesRepId: one(users, {
		fields: [clientAccounts.salesRepId],
		references: [users.id],
		relationName: "clientAccounts_salesRepId_users_id"
	}),
	clientAccountActivities: many(clientAccountActivities),
}));

export const payrollsRelations = relations(payrolls, ({one, many}) => ({
	incentives: many(incentives),
	user_approvedBy: one(users, {
		fields: [payrolls.approvedBy],
		references: [users.id],
		relationName: "payrolls_approvedBy_users_id"
	}),
	user_generatedBy: one(users, {
		fields: [payrolls.generatedBy],
		references: [users.id],
		relationName: "payrolls_generatedBy_users_id"
	}),
	organization: one(organizations, {
		fields: [payrolls.orgId],
		references: [organizations.id]
	}),
	user_userId: one(users, {
		fields: [payrolls.userId],
		references: [users.id],
		relationName: "payrolls_userId_users_id"
	}),
}));

export const clientAccountActivitiesRelations = relations(clientAccountActivities, ({one}) => ({
	clientAccount: one(clientAccounts, {
		fields: [clientAccountActivities.clientAccountId],
		references: [clientAccounts.id]
	}),
	user: one(users, {
		fields: [clientAccountActivities.userId],
		references: [users.id]
	}),
}));

export const socialMediaStatsRelations = relations(socialMediaStats, ({one}) => ({
	user: one(users, {
		fields: [socialMediaStats.enteredBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [socialMediaStats.orgId],
		references: [organizations.id]
	}),
}));

export const webhookEndpointsRelations = relations(webhookEndpoints, ({one, many}) => ({
	user: one(users, {
		fields: [webhookEndpoints.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [webhookEndpoints.orgId],
		references: [organizations.id]
	}),
	webhookLogs: many(webhookLogs),
}));

export const webhookLogsRelations = relations(webhookLogs, ({one}) => ({
	webhookEndpoint: one(webhookEndpoints, {
		fields: [webhookLogs.endpointId],
		references: [webhookEndpoints.id]
	}),
	organization: one(organizations, {
		fields: [webhookLogs.orgId],
		references: [organizations.id]
	}),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	user: one(users, {
		fields: [payments.createdBy],
		references: [users.id]
	}),
	invoice: one(invoices, {
		fields: [payments.invoiceId],
		references: [invoices.id]
	}),
	organization: one(organizations, {
		fields: [payments.orgId],
		references: [organizations.id]
	}),
}));

export const expensesRelations = relations(expenses, ({one}) => ({
	user_approverId: one(users, {
		fields: [expenses.approverId],
		references: [users.id],
		relationName: "expenses_approverId_users_id"
	}),
	expenseCategory: one(expenseCategories, {
		fields: [expenses.categoryId],
		references: [expenseCategories.id]
	}),
	organization: one(organizations, {
		fields: [expenses.orgId],
		references: [organizations.id]
	}),
	project: one(projects, {
		fields: [expenses.projectId],
		references: [projects.id]
	}),
	user_userId: one(users, {
		fields: [expenses.userId],
		references: [users.id],
		relationName: "expenses_userId_users_id"
	}),
}));

export const calendarEventsRelations = relations(calendarEvents, ({one, many}) => ({
	user: one(users, {
		fields: [calendarEvents.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [calendarEvents.orgId],
		references: [organizations.id]
	}),
	eventAttendees: many(eventAttendees),
}));

export const passwordHistoryRelations = relations(passwordHistory, ({one}) => ({
	user: one(users, {
		fields: [passwordHistory.userId],
		references: [users.id]
	}),
}));

export const candidatesRelations = relations(candidates, ({one, many}) => ({
	organization: one(organizations, {
		fields: [candidates.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [candidates.referredBy],
		references: [users.id]
	}),
	candidateApplications: many(candidateApplications),
	calibrationSessions: many(calibrationSessions),
	candidateOffers: many(candidateOffers),
	candidateReferenceChecks: many(candidateReferenceChecks),
	candidateSlaTrackings: many(candidateSlaTracking),
	candidateReferrals: many(candidateReferrals),
	interviewBookingLinks: many(interviewBookingLinks),
	interviews: many(interviews),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({one}) => ({
	organization: one(organizations, {
		fields: [notificationPreferences.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [notificationPreferences.userId],
		references: [users.id]
	}),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({one}) => ({
	organization: one(organizations, {
		fields: [pushSubscriptions.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [pushSubscriptions.userId],
		references: [users.id]
	}),
}));

export const ticketWatchersRelations = relations(ticketWatchers, ({one}) => ({
	ticket: one(tickets, {
		fields: [ticketWatchers.ticketId],
		references: [tickets.id]
	}),
	user: one(users, {
		fields: [ticketWatchers.userId],
		references: [users.id]
	}),
}));

export const userSessionsRelations = relations(userSessions, ({one}) => ({
	user: one(users, {
		fields: [userSessions.userId],
		references: [users.id]
	}),
}));

export const candidateApplicationsRelations = relations(candidateApplications, ({one}) => ({
	candidate: one(candidates, {
		fields: [candidateApplications.candidateId],
		references: [candidates.id]
	}),
	jobPosting: one(jobPostings, {
		fields: [candidateApplications.jobPostingId],
		references: [jobPostings.id]
	}),
	organization: one(organizations, {
		fields: [candidateApplications.orgId],
		references: [organizations.id]
	}),
}));

export const jobPostingsRelations = relations(jobPostings, ({one, many}) => ({
	candidateApplications: many(candidateApplications),
	department: one(departments, {
		fields: [jobPostings.departmentId],
		references: [departments.id]
	}),
	organization: one(organizations, {
		fields: [jobPostings.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [jobPostings.postedBy],
		references: [users.id]
	}),
	calibrationSessions: many(calibrationSessions),
	candidateOffers: many(candidateOffers),
	interviewBookingLinks: many(interviewBookingLinks),
	interviews: many(interviews),
}));

export const alumniProfilesRelations = relations(alumniProfiles, ({one}) => ({
	organization: one(organizations, {
		fields: [alumniProfiles.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [alumniProfiles.userId],
		references: [users.id]
	}),
}));

export const richDocumentsRelations = relations(richDocuments, ({one, many}) => ({
	user_createdBy: one(users, {
		fields: [richDocuments.createdBy],
		references: [users.id],
		relationName: "richDocuments_createdBy_users_id"
	}),
	organization: one(organizations, {
		fields: [richDocuments.orgId],
		references: [organizations.id]
	}),
	user_updatedBy: one(users, {
		fields: [richDocuments.updatedBy],
		references: [users.id],
		relationName: "richDocuments_updatedBy_users_id"
	}),
	handbookVersions: many(handbookVersions),
}));

export const assessmentAttemptsRelations = relations(assessmentAttempts, ({one}) => ({
	skillAssessment: one(skillAssessments, {
		fields: [assessmentAttempts.assessmentId],
		references: [skillAssessments.id]
	}),
	user: one(users, {
		fields: [assessmentAttempts.userId],
		references: [users.id]
	}),
}));

export const skillAssessmentsRelations = relations(skillAssessments, ({one, many}) => ({
	assessmentAttempts: many(assessmentAttempts),
	user: one(users, {
		fields: [skillAssessments.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [skillAssessments.orgId],
		references: [organizations.id]
	}),
}));

export const assetReturnsRelations = relations(assetReturns, ({one}) => ({
	asset: one(assets, {
		fields: [assetReturns.assetId],
		references: [assets.id]
	}),
	organization: one(organizations, {
		fields: [assetReturns.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [assetReturns.userId],
		references: [users.id]
	}),
}));

export const backgroundVerificationsRelations = relations(backgroundVerifications, ({one}) => ({
	organization: one(organizations, {
		fields: [backgroundVerifications.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [backgroundVerifications.userId],
		references: [users.id]
	}),
}));

export const careerLaddersRelations = relations(careerLadders, ({one}) => ({
	organization: one(organizations, {
		fields: [careerLadders.orgId],
		references: [organizations.id]
	}),
}));

export const certificationsRelations = relations(certifications, ({one}) => ({
	organization: one(organizations, {
		fields: [certifications.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [certifications.userId],
		references: [users.id]
	}),
}));

export const hrEmailTemplatesRelations = relations(hrEmailTemplates, ({one}) => ({
	user: one(users, {
		fields: [hrEmailTemplates.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [hrEmailTemplates.orgId],
		references: [organizations.id]
	}),
}));

export const employeeSkillsRelations = relations(employeeSkills, ({one}) => ({
	organization: one(organizations, {
		fields: [employeeSkills.orgId],
		references: [organizations.id]
	}),
	user_userId: one(users, {
		fields: [employeeSkills.userId],
		references: [users.id],
		relationName: "employeeSkills_userId_users_id"
	}),
	user_verifiedBy: one(users, {
		fields: [employeeSkills.verifiedBy],
		references: [users.id],
		relationName: "employeeSkills_verifiedBy_users_id"
	}),
}));

export const enpsScoresRelations = relations(enpsScores, ({one}) => ({
	organization: one(organizations, {
		fields: [enpsScores.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [enpsScores.userId],
		references: [users.id]
	}),
}));

export const exitChecklistsRelations = relations(exitChecklists, ({one}) => ({
	user: one(users, {
		fields: [exitChecklists.assignedTo],
		references: [users.id]
	}),
	resignation: one(resignations, {
		fields: [exitChecklists.resignationId],
		references: [resignations.id]
	}),
}));

export const resignationsRelations = relations(resignations, ({one, many}) => ({
	exitChecklists: many(exitChecklists),
	fnfSettlements: many(fnfSettlements),
	user_approvedBy: one(users, {
		fields: [resignations.approvedBy],
		references: [users.id],
		relationName: "resignations_approvedBy_users_id"
	}),
	user_ceoReviewedBy: one(users, {
		fields: [resignations.ceoReviewedBy],
		references: [users.id],
		relationName: "resignations_ceoReviewedBy_users_id"
	}),
	user_exitInterviewConductedBy: one(users, {
		fields: [resignations.exitInterviewConductedBy],
		references: [users.id],
		relationName: "resignations_exitInterviewConductedBy_users_id"
	}),
	user_hrReviewedBy: one(users, {
		fields: [resignations.hrReviewedBy],
		references: [users.id],
		relationName: "resignations_hrReviewedBy_users_id"
	}),
	organization: one(organizations, {
		fields: [resignations.orgId],
		references: [organizations.id]
	}),
	user_userId: one(users, {
		fields: [resignations.userId],
		references: [users.id],
		relationName: "resignations_userId_users_id"
	}),
}));

export const feedbackRequestsRelations = relations(feedbackRequests, ({one}) => ({
	reviewCycle: one(reviewCycles, {
		fields: [feedbackRequests.cycleId],
		references: [reviewCycles.id]
	}),
	organization: one(organizations, {
		fields: [feedbackRequests.orgId],
		references: [organizations.id]
	}),
	user_reviewerUserId: one(users, {
		fields: [feedbackRequests.reviewerUserId],
		references: [users.id],
		relationName: "feedbackRequests_reviewerUserId_users_id"
	}),
	user_subjectUserId: one(users, {
		fields: [feedbackRequests.subjectUserId],
		references: [users.id],
		relationName: "feedbackRequests_subjectUserId_users_id"
	}),
}));

export const bonusesRelations = relations(bonuses, ({one}) => ({
	user_approvedBy: one(users, {
		fields: [bonuses.approvedBy],
		references: [users.id],
		relationName: "bonuses_approvedBy_users_id"
	}),
	organization: one(organizations, {
		fields: [bonuses.orgId],
		references: [organizations.id]
	}),
	user_userId: one(users, {
		fields: [bonuses.userId],
		references: [users.id],
		relationName: "bonuses_userId_users_id"
	}),
}));

export const keyResultsRelations = relations(keyResults, ({one}) => ({
	goal: one(goals, {
		fields: [keyResults.goalId],
		references: [goals.id]
	}),
}));

export const learningPathsRelations = relations(learningPaths, ({one}) => ({
	user: one(users, {
		fields: [learningPaths.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [learningPaths.orgId],
		references: [organizations.id]
	}),
}));

export const oneOnOneMeetingsRelations = relations(oneOnOneMeetings, ({one}) => ({
	user_employeeId: one(users, {
		fields: [oneOnOneMeetings.employeeId],
		references: [users.id],
		relationName: "oneOnOneMeetings_employeeId_users_id"
	}),
	user_managerId: one(users, {
		fields: [oneOnOneMeetings.managerId],
		references: [users.id],
		relationName: "oneOnOneMeetings_managerId_users_id"
	}),
	organization: one(organizations, {
		fields: [oneOnOneMeetings.orgId],
		references: [organizations.id]
	}),
}));

export const performanceImprovementPlansRelations = relations(performanceImprovementPlans, ({one}) => ({
	user_managerId: one(users, {
		fields: [performanceImprovementPlans.managerId],
		references: [users.id],
		relationName: "performanceImprovementPlans_managerId_users_id"
	}),
	organization: one(organizations, {
		fields: [performanceImprovementPlans.orgId],
		references: [organizations.id]
	}),
	user_userId: one(users, {
		fields: [performanceImprovementPlans.userId],
		references: [users.id],
		relationName: "performanceImprovementPlans_userId_users_id"
	}),
}));

export const policyAcknowledgmentsRelations = relations(policyAcknowledgments, ({one}) => ({
	document: one(documents, {
		fields: [policyAcknowledgments.documentId],
		references: [documents.id]
	}),
	organization: one(organizations, {
		fields: [policyAcknowledgments.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [policyAcknowledgments.userId],
		references: [users.id]
	}),
}));

export const pulseSurveysRelations = relations(pulseSurveys, ({one, many}) => ({
	user: one(users, {
		fields: [pulseSurveys.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [pulseSurveys.orgId],
		references: [organizations.id]
	}),
	surveyResponses: many(surveyResponses),
}));

export const recognitionsRelations = relations(recognitions, ({one}) => ({
	user_fromUserId: one(users, {
		fields: [recognitions.fromUserId],
		references: [users.id],
		relationName: "recognitions_fromUserId_users_id"
	}),
	organization: one(organizations, {
		fields: [recognitions.orgId],
		references: [organizations.id]
	}),
	user_toUserId: one(users, {
		fields: [recognitions.toUserId],
		references: [users.id],
		relationName: "recognitions_toUserId_users_id"
	}),
}));

export const fnfSettlementsRelations = relations(fnfSettlements, ({one}) => ({
	user_approvedBy: one(users, {
		fields: [fnfSettlements.approvedBy],
		references: [users.id],
		relationName: "fnfSettlements_approvedBy_users_id"
	}),
	organization: one(organizations, {
		fields: [fnfSettlements.orgId],
		references: [organizations.id]
	}),
	resignation: one(resignations, {
		fields: [fnfSettlements.resignationId],
		references: [resignations.id]
	}),
	user_userId: one(users, {
		fields: [fnfSettlements.userId],
		references: [users.id],
		relationName: "fnfSettlements_userId_users_id"
	}),
}));

export const handbookVersionsRelations = relations(handbookVersions, ({one}) => ({
	richDocument: one(richDocuments, {
		fields: [handbookVersions.documentId],
		references: [richDocuments.id]
	}),
	organization: one(organizations, {
		fields: [handbookVersions.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [handbookVersions.publishedBy],
		references: [users.id]
	}),
}));

export const reimbursementsRelations = relations(reimbursements, ({one}) => ({
	user_approvedBy: one(users, {
		fields: [reimbursements.approvedBy],
		references: [users.id],
		relationName: "reimbursements_approvedBy_users_id"
	}),
	organization: one(organizations, {
		fields: [reimbursements.orgId],
		references: [organizations.id]
	}),
	user_userId: one(users, {
		fields: [reimbursements.userId],
		references: [users.id],
		relationName: "reimbursements_userId_users_id"
	}),
}));

export const surveyResponsesRelations = relations(surveyResponses, ({one}) => ({
	pulseSurvey: one(pulseSurveys, {
		fields: [surveyResponses.surveyId],
		references: [pulseSurveys.id]
	}),
	user: one(users, {
		fields: [surveyResponses.userId],
		references: [users.id]
	}),
}));

export const teamEventsRelations = relations(teamEvents, ({one, many}) => ({
	organization: one(organizations, {
		fields: [teamEvents.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [teamEvents.organizedBy],
		references: [users.id]
	}),
	teamEventParticipants: many(teamEventParticipants),
}));

export const trainingEnrollmentsRelations = relations(trainingEnrollments, ({one}) => ({
	organization: one(organizations, {
		fields: [trainingEnrollments.orgId],
		references: [organizations.id]
	}),
	trainingProgram: one(trainingPrograms, {
		fields: [trainingEnrollments.programId],
		references: [trainingPrograms.id]
	}),
	user: one(users, {
		fields: [trainingEnrollments.userId],
		references: [users.id]
	}),
}));

export const trainingProgramsRelations = relations(trainingPrograms, ({one, many}) => ({
	trainingEnrollments: many(trainingEnrollments),
	user: one(users, {
		fields: [trainingPrograms.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [trainingPrograms.orgId],
		references: [organizations.id]
	}),
}));

export const salaryLoansRelations = relations(salaryLoans, ({one}) => ({
	user_approvedBy: one(users, {
		fields: [salaryLoans.approvedBy],
		references: [users.id],
		relationName: "salaryLoans_approvedBy_users_id"
	}),
	organization: one(organizations, {
		fields: [salaryLoans.orgId],
		references: [organizations.id]
	}),
	user_userId: one(users, {
		fields: [salaryLoans.userId],
		references: [users.id],
		relationName: "salaryLoans_userId_users_id"
	}),
}));

export const teamEventParticipantsRelations = relations(teamEventParticipants, ({one}) => ({
	teamEvent: one(teamEvents, {
		fields: [teamEventParticipants.eventId],
		references: [teamEvents.id]
	}),
	user: one(users, {
		fields: [teamEventParticipants.userId],
		references: [users.id]
	}),
}));

export const emailCampaignsRelations = relations(emailCampaigns, ({one, many}) => ({
	user: one(users, {
		fields: [emailCampaigns.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [emailCampaigns.orgId],
		references: [organizations.id]
	}),
	emailCampaignRecipients: many(emailCampaignRecipients),
}));

export const salesQuotasRelations = relations(salesQuotas, ({one}) => ({
	organization: one(organizations, {
		fields: [salesQuotas.orgId],
		references: [organizations.id]
	}),
	user_setById: one(users, {
		fields: [salesQuotas.setById],
		references: [users.id],
		relationName: "salesQuotas_setById_users_id"
	}),
	user_userId: one(users, {
		fields: [salesQuotas.userId],
		references: [users.id],
		relationName: "salesQuotas_userId_users_id"
	}),
}));

export const commissionRulesRelations = relations(commissionRules, ({one, many}) => ({
	organization: one(organizations, {
		fields: [commissionRules.orgId],
		references: [organizations.id]
	}),
	commissions: many(commissions),
}));

export const commissionsRelations = relations(commissions, ({one}) => ({
	deal: one(deals, {
		fields: [commissions.dealId],
		references: [deals.id]
	}),
	organization: one(organizations, {
		fields: [commissions.orgId],
		references: [organizations.id]
	}),
	commissionRule: one(commissionRules, {
		fields: [commissions.ruleId],
		references: [commissionRules.id]
	}),
	user: one(users, {
		fields: [commissions.userId],
		references: [users.id]
	}),
}));

export const dealApprovalRulesRelations = relations(dealApprovalRules, ({one}) => ({
	organization: one(organizations, {
		fields: [dealApprovalRules.orgId],
		references: [organizations.id]
	}),
}));

export const dealApprovalsRelations = relations(dealApprovals, ({one}) => ({
	user_approvedBy: one(users, {
		fields: [dealApprovals.approvedBy],
		references: [users.id],
		relationName: "dealApprovals_approvedBy_users_id"
	}),
	deal: one(deals, {
		fields: [dealApprovals.dealId],
		references: [deals.id]
	}),
	organization: one(organizations, {
		fields: [dealApprovals.orgId],
		references: [organizations.id]
	}),
	user_requestedBy: one(users, {
		fields: [dealApprovals.requestedBy],
		references: [users.id],
		relationName: "dealApprovals_requestedBy_users_id"
	}),
}));

export const emailCampaignRecipientsRelations = relations(emailCampaignRecipients, ({one}) => ({
	emailCampaign: one(emailCampaigns, {
		fields: [emailCampaignRecipients.campaignId],
		references: [emailCampaigns.id]
	}),
	lead: one(leads, {
		fields: [emailCampaignRecipients.leadId],
		references: [leads.id]
	}),
}));

export const projectMilestonesRelations = relations(projectMilestones, ({one}) => ({
	user: one(users, {
		fields: [projectMilestones.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [projectMilestones.orgId],
		references: [organizations.id]
	}),
	project: one(projects, {
		fields: [projectMilestones.projectId],
		references: [projects.id]
	}),
}));

export const projectTemplatesRelations = relations(projectTemplates, ({one, many}) => ({
	user: one(users, {
		fields: [projectTemplates.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [projectTemplates.orgId],
		references: [organizations.id]
	}),
	projectTemplateTickets: many(projectTemplateTickets),
}));

export const calibrationSessionsRelations = relations(calibrationSessions, ({one}) => ({
	candidate: one(candidates, {
		fields: [calibrationSessions.candidateId],
		references: [candidates.id]
	}),
	user: one(users, {
		fields: [calibrationSessions.createdBy],
		references: [users.id]
	}),
	jobPosting: one(jobPostings, {
		fields: [calibrationSessions.jobPostingId],
		references: [jobPostings.id]
	}),
	organization: one(organizations, {
		fields: [calibrationSessions.orgId],
		references: [organizations.id]
	}),
}));

export const candidateDocumentsRelations = relations(candidateDocuments, ({one}) => ({
	user: one(users, {
		fields: [candidateDocuments.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [candidateDocuments.orgId],
		references: [organizations.id]
	}),
	documentTemplate: one(documentTemplates, {
		fields: [candidateDocuments.templateId],
		references: [documentTemplates.id]
	}),
}));

export const documentTemplatesRelations = relations(documentTemplates, ({one, many}) => ({
	candidateDocuments: many(candidateDocuments),
	documentTemplateVersions: many(documentTemplateVersions),
	user: one(users, {
		fields: [documentTemplates.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [documentTemplates.orgId],
		references: [organizations.id]
	}),
}));

export const candidateDocumentsVaultRelations = relations(candidateDocumentsVault, ({one, many}) => ({
	organization: one(organizations, {
		fields: [candidateDocumentsVault.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [candidateDocumentsVault.uploadedBy],
		references: [users.id]
	}),
	vaultAccessLogs: many(vaultAccessLogs),
}));

export const candidateOffersRelations = relations(candidateOffers, ({one}) => ({
	candidate: one(candidates, {
		fields: [candidateOffers.candidateId],
		references: [candidates.id]
	}),
	jobPosting: one(jobPostings, {
		fields: [candidateOffers.jobPostingId],
		references: [jobPostings.id]
	}),
	user: one(users, {
		fields: [candidateOffers.offeredBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [candidateOffers.orgId],
		references: [organizations.id]
	}),
}));

export const candidateReferenceChecksRelations = relations(candidateReferenceChecks, ({one}) => ({
	candidate: one(candidates, {
		fields: [candidateReferenceChecks.candidateId],
		references: [candidates.id]
	}),
	user: one(users, {
		fields: [candidateReferenceChecks.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [candidateReferenceChecks.orgId],
		references: [organizations.id]
	}),
}));

export const mfaBackupCodesRelations = relations(mfaBackupCodes, ({one}) => ({
	user: one(users, {
		fields: [mfaBackupCodes.userId],
		references: [users.id]
	}),
}));

export const candidateSlaTrackingRelations = relations(candidateSlaTracking, ({one}) => ({
	candidate: one(candidates, {
		fields: [candidateSlaTracking.candidateId],
		references: [candidates.id]
	}),
	organization: one(organizations, {
		fields: [candidateSlaTracking.orgId],
		references: [organizations.id]
	}),
}));

export const candidateSourcesRelations = relations(candidateSources, ({one}) => ({
	user: one(users, {
		fields: [candidateSources.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [candidateSources.orgId],
		references: [organizations.id]
	}),
}));

export const documentAuditLogsRelations = relations(documentAuditLogs, ({one}) => ({
	onboardingDocument: one(onboardingDocuments, {
		fields: [documentAuditLogs.onboardingDocumentId],
		references: [onboardingDocuments.id]
	}),
	organization: one(organizations, {
		fields: [documentAuditLogs.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [documentAuditLogs.performedBy],
		references: [users.id]
	}),
}));

export const onboardingDocumentsRelations = relations(onboardingDocuments, ({one, many}) => ({
	documentAuditLogs: many(documentAuditLogs),
	documentType: one(documentTypes, {
		fields: [onboardingDocuments.documentTypeId],
		references: [documentTypes.id]
	}),
	organization: one(organizations, {
		fields: [onboardingDocuments.orgId],
		references: [organizations.id]
	}),
	user_reviewedBy: one(users, {
		fields: [onboardingDocuments.reviewedBy],
		references: [users.id],
		relationName: "onboardingDocuments_reviewedBy_users_id"
	}),
	user_userId: one(users, {
		fields: [onboardingDocuments.userId],
		references: [users.id],
		relationName: "onboardingDocuments_userId_users_id"
	}),
}));

export const documentTemplateVersionsRelations = relations(documentTemplateVersions, ({one}) => ({
	user: one(users, {
		fields: [documentTemplateVersions.archivedBy],
		references: [users.id]
	}),
	documentTemplate: one(documentTemplates, {
		fields: [documentTemplateVersions.templateId],
		references: [documentTemplates.id]
	}),
}));

export const documentTypesRelations = relations(documentTypes, ({one, many}) => ({
	organization: one(organizations, {
		fields: [documentTypes.orgId],
		references: [organizations.id]
	}),
	onboardingDocuments: many(onboardingDocuments),
}));

export const candidateReferralsRelations = relations(candidateReferrals, ({one}) => ({
	candidate: one(candidates, {
		fields: [candidateReferrals.candidateId],
		references: [candidates.id]
	}),
	organization: one(organizations, {
		fields: [candidateReferrals.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [candidateReferrals.referredBy],
		references: [users.id]
	}),
}));

export const interviewBookingLinksRelations = relations(interviewBookingLinks, ({one}) => ({
	candidate: one(candidates, {
		fields: [interviewBookingLinks.candidateId],
		references: [candidates.id]
	}),
	user: one(users, {
		fields: [interviewBookingLinks.createdBy],
		references: [users.id]
	}),
	jobPosting: one(jobPostings, {
		fields: [interviewBookingLinks.jobPostingId],
		references: [jobPostings.id]
	}),
	organization: one(organizations, {
		fields: [interviewBookingLinks.orgId],
		references: [organizations.id]
	}),
}));

export const scorecardTemplatesRelations = relations(scorecardTemplates, ({one, many}) => ({
	user: one(users, {
		fields: [scorecardTemplates.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [scorecardTemplates.orgId],
		references: [organizations.id]
	}),
	interviewScorecards: many(interviewScorecards),
}));

export const leaveBlackoutDatesRelations = relations(leaveBlackoutDates, ({one}) => ({
	user: one(users, {
		fields: [leaveBlackoutDates.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [leaveBlackoutDates.orgId],
		references: [organizations.id]
	}),
}));

export const onboardingTasksRelations = relations(onboardingTasks, ({one}) => ({
	user_completedBy: one(users, {
		fields: [onboardingTasks.completedBy],
		references: [users.id],
		relationName: "onboardingTasks_completedBy_users_id"
	}),
	organization: one(organizations, {
		fields: [onboardingTasks.orgId],
		references: [organizations.id]
	}),
	onboardingTemplateStep: one(onboardingTemplateSteps, {
		fields: [onboardingTasks.templateStepId],
		references: [onboardingTemplateSteps.id]
	}),
	user_userId: one(users, {
		fields: [onboardingTasks.userId],
		references: [users.id],
		relationName: "onboardingTasks_userId_users_id"
	}),
}));

export const onboardingTemplateStepsRelations = relations(onboardingTemplateSteps, ({one, many}) => ({
	onboardingTasks: many(onboardingTasks),
	onboardingTemplate: one(onboardingTemplates, {
		fields: [onboardingTemplateSteps.templateId],
		references: [onboardingTemplates.id]
	}),
}));

export const interviewQuestionsRelations = relations(interviewQuestions, ({one}) => ({
	user: one(users, {
		fields: [interviewQuestions.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [interviewQuestions.orgId],
		references: [organizations.id]
	}),
}));

export const onboardingTemplatesRelations = relations(onboardingTemplates, ({one, many}) => ({
	onboardingTemplateSteps: many(onboardingTemplateSteps),
	user: one(users, {
		fields: [onboardingTemplates.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [onboardingTemplates.orgId],
		references: [organizations.id]
	}),
}));

export const interviewSlasRelations = relations(interviewSlas, ({one}) => ({
	organization: one(organizations, {
		fields: [interviewSlas.orgId],
		references: [organizations.id]
	}),
}));

export const interviewScorecardsRelations = relations(interviewScorecards, ({one}) => ({
	interview: one(interviews, {
		fields: [interviewScorecards.interviewId],
		references: [interviews.id]
	}),
	user: one(users, {
		fields: [interviewScorecards.interviewerId],
		references: [users.id]
	}),
	scorecardTemplate: one(scorecardTemplates, {
		fields: [interviewScorecards.templateId],
		references: [scorecardTemplates.id]
	}),
}));

export const interviewsRelations = relations(interviews, ({one, many}) => ({
	interviewScorecards: many(interviewScorecards),
	candidate: one(candidates, {
		fields: [interviews.candidateId],
		references: [candidates.id]
	}),
	user: one(users, {
		fields: [interviews.interviewerId],
		references: [users.id]
	}),
	jobPosting: one(jobPostings, {
		fields: [interviews.jobPostingId],
		references: [jobPostings.id]
	}),
	organization: one(organizations, {
		fields: [interviews.orgId],
		references: [organizations.id]
	}),
}));

export const clientOnboardingItemsRelations = relations(clientOnboardingItems, ({one}) => ({
	user_assignedTo: one(users, {
		fields: [clientOnboardingItems.assignedTo],
		references: [users.id],
		relationName: "clientOnboardingItems_assignedTo_users_id"
	}),
	client: one(clients, {
		fields: [clientOnboardingItems.clientId],
		references: [clients.id]
	}),
	user_completedBy: one(users, {
		fields: [clientOnboardingItems.completedBy],
		references: [users.id],
		relationName: "clientOnboardingItems_completedBy_users_id"
	}),
	organization: one(organizations, {
		fields: [clientOnboardingItems.orgId],
		references: [organizations.id]
	}),
	clientOnboardingTemplate: one(clientOnboardingTemplates, {
		fields: [clientOnboardingItems.templateId],
		references: [clientOnboardingTemplates.id]
	}),
}));

export const clientOnboardingTemplatesRelations = relations(clientOnboardingTemplates, ({one, many}) => ({
	clientOnboardingItems: many(clientOnboardingItems),
	user: one(users, {
		fields: [clientOnboardingTemplates.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [clientOnboardingTemplates.orgId],
		references: [organizations.id]
	}),
}));

export const clientOpportunitiesRelations = relations(clientOpportunities, ({one}) => ({
	client: one(clients, {
		fields: [clientOpportunities.clientId],
		references: [clients.id]
	}),
	user: one(users, {
		fields: [clientOpportunities.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [clientOpportunities.orgId],
		references: [organizations.id]
	}),
}));

export const csatSurveysRelations = relations(csatSurveys, ({one, many}) => ({
	client: one(clients, {
		fields: [csatSurveys.clientId],
		references: [clients.id]
	}),
	user: one(users, {
		fields: [csatSurveys.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [csatSurveys.orgId],
		references: [organizations.id]
	}),
	csatResponses: many(csatResponses),
}));

export const customFieldDefinitionsRelations = relations(customFieldDefinitions, ({one}) => ({
	user: one(users, {
		fields: [customFieldDefinitions.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [customFieldDefinitions.orgId],
		references: [organizations.id]
	}),
}));

export const dealMeetingsRelations = relations(dealMeetings, ({one}) => ({
	user: one(users, {
		fields: [dealMeetings.createdBy],
		references: [users.id]
	}),
	deal: one(deals, {
		fields: [dealMeetings.dealId],
		references: [deals.id]
	}),
	organization: one(organizations, {
		fields: [dealMeetings.orgId],
		references: [organizations.id]
	}),
}));

export const terminationsRelations = relations(terminations, ({one}) => ({
	user_ceoReviewedBy: one(users, {
		fields: [terminations.ceoReviewedBy],
		references: [users.id],
		relationName: "terminations_ceoReviewedBy_users_id"
	}),
	user_initiatedBy: one(users, {
		fields: [terminations.initiatedBy],
		references: [users.id],
		relationName: "terminations_initiatedBy_users_id"
	}),
	organization: one(organizations, {
		fields: [terminations.orgId],
		references: [organizations.id]
	}),
	user_userId: one(users, {
		fields: [terminations.userId],
		references: [users.id],
		relationName: "terminations_userId_users_id"
	}),
}));

export const vaultAccessLogsRelations = relations(vaultAccessLogs, ({one}) => ({
	user: one(users, {
		fields: [vaultAccessLogs.accessedBy],
		references: [users.id]
	}),
	candidateDocumentsVault: one(candidateDocumentsVault, {
		fields: [vaultAccessLogs.vaultDocumentId],
		references: [candidateDocumentsVault.id]
	}),
}));

export const taskSequencesRelations = relations(taskSequences, ({one, many}) => ({
	user: one(users, {
		fields: [taskSequences.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [taskSequences.orgId],
		references: [organizations.id]
	}),
	taskSequenceSteps: many(taskSequenceSteps),
}));

export const tasksRelations = relations(tasks, ({one}) => ({
	user_assigneeId: one(users, {
		fields: [tasks.assigneeId],
		references: [users.id],
		relationName: "tasks_assigneeId_users_id"
	}),
	user_createdBy: one(users, {
		fields: [tasks.createdBy],
		references: [users.id],
		relationName: "tasks_createdBy_users_id"
	}),
	organization: one(organizations, {
		fields: [tasks.orgId],
		references: [organizations.id]
	}),
}));

export const territoriesRelations = relations(territories, ({one}) => ({
	user: one(users, {
		fields: [territories.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [territories.orgId],
		references: [organizations.id]
	}),
}));

export const webLeadFormsRelations = relations(webLeadForms, ({one}) => ({
	user: one(users, {
		fields: [webLeadForms.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [webLeadForms.orgId],
		references: [organizations.id]
	}),
}));

export const aiUsageLogsRelations = relations(aiUsageLogs, ({one}) => ({
	organization: one(organizations, {
		fields: [aiUsageLogs.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [aiUsageLogs.userId],
		references: [users.id]
	}),
}));

export const announcementsRelations = relations(announcements, ({one}) => ({
	user: one(users, {
		fields: [announcements.authorId],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [announcements.orgId],
		references: [organizations.id]
	}),
}));

export const leadImportBatchesRelations = relations(leadImportBatches, ({one}) => ({
	user: one(users, {
		fields: [leadImportBatches.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [leadImportBatches.orgId],
		references: [organizations.id]
	}),
}));

export const apiKeysRelations = relations(apiKeys, ({one}) => ({
	user: one(users, {
		fields: [apiKeys.createdBy],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [apiKeys.orgId],
		references: [organizations.id]
	}),
}));

export const taskSequenceStepsRelations = relations(taskSequenceSteps, ({one}) => ({
	taskSequence: one(taskSequences, {
		fields: [taskSequenceSteps.sequenceId],
		references: [taskSequences.id]
	}),
}));

export const eventAttendeesRelations = relations(eventAttendees, ({one}) => ({
	calendarEvent: one(calendarEvents, {
		fields: [eventAttendees.eventId],
		references: [calendarEvents.id]
	}),
	user: one(users, {
		fields: [eventAttendees.userId],
		references: [users.id]
	}),
}));

export const abTestsRelations = relations(abTests, ({one}) => ({
	user: one(users, {
		fields: [abTests.createdBy],
		references: [users.id]
	}),
}));

export const projectTemplateTicketsRelations = relations(projectTemplateTickets, ({one}) => ({
	projectTemplate: one(projectTemplates, {
		fields: [projectTemplateTickets.templateId],
		references: [projectTemplates.id]
	}),
}));

export const csatResponsesRelations = relations(csatResponses, ({one}) => ({
	organization: one(organizations, {
		fields: [csatResponses.orgId],
		references: [organizations.id]
	}),
	csatSurvey: one(csatSurveys, {
		fields: [csatResponses.surveyId],
		references: [csatSurveys.id]
	}),
}));

export const contentCalendarItemsRelations = relations(contentCalendarItems, ({one}) => ({
	user_assignedTo: one(users, {
		fields: [contentCalendarItems.assignedTo],
		references: [users.id],
		relationName: "contentCalendarItems_assignedTo_users_id"
	}),
	user_createdBy: one(users, {
		fields: [contentCalendarItems.createdBy],
		references: [users.id],
		relationName: "contentCalendarItems_createdBy_users_id"
	}),
}));

export const landingPagesRelations = relations(landingPages, ({one, many}) => ({
	user: one(users, {
		fields: [landingPages.createdBy],
		references: [users.id]
	}),
	pageViews: many(pageViews),
}));

export const pageViewsRelations = relations(pageViews, ({one}) => ({
	landingPage: one(landingPages, {
		fields: [pageViews.pageId],
		references: [landingPages.id]
	}),
}));

export const socialMetricsRelations = relations(socialMetrics, ({one}) => ({
	user: one(users, {
		fields: [socialMetrics.recordedBy],
		references: [users.id]
	}),
}));