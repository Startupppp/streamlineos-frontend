export const HR_READ_ENDPOINTS = [
  { path: "/hr/dashboard/metrics", name: "hr_dashboard_metrics" },
  { path: "/hr/dashboard/headcount-trends", name: "hr_headcount_trends" },
  { path: "/hr/dashboard/onboarding-status", name: "hr_onboarding_status" },
  { path: "/hr/dashboard/diversity", name: "hr_diversity" },
  { path: "/hr/dashboard/time-to-fill", name: "hr_time_to_fill" },
  { path: "/hr/dashboard/attendance-analytics", name: "hr_attendance_analytics" },
  { path: "/hr/leave-calendar", name: "hr_leave_calendar" },
  { path: "/hr/headcount?groupBy=department", name: "hr_headcount" },
  { path: "/hr/employees", name: "hr_employees_all" },
  { path: "/hr/employees?page=1&limit=20", name: "hr_employees_paginated" },
  { path: "/hr/departments", name: "hr_departments" },
  { path: "/hr/org-chart", name: "hr_org_chart" },
  { path: "/hr/assets", name: "hr_assets" },
  { path: "/hr/my-profile", name: "hr_my_profile" },
  { path: "/hr/attendance/status", name: "hr_attendance_status" },
  { path: "/hr/attendance/logs", name: "hr_attendance_logs" },
  { path: "/hr/attendance/team-status", name: "hr_team_attendance" },
  { path: "/hr/leaves", name: "hr_leaves" },
  { path: "/hr/leaves/balance", name: "hr_leave_balance" },
  { path: "/hr/leaves/team", name: "hr_leaves_team" },
  { path: "/hr/leaves/this-week", name: "hr_leaves_this_week" },
  { path: "/hr/payrolls", name: "hr_payrolls" },
  { path: "/hr/salary-structures", name: "hr_salary_structures" },
  { path: "/hr/expenses/categories", name: "hr_expense_categories" },
  { path: "/hr/documents", name: "hr_documents" },
  { path: "/hr/analytics", name: "hr_analytics" },
  { path: "/hr/analytics/attendance", name: "hr_analytics_attendance" },
  { path: "/hr/analytics/attrition", name: "hr_analytics_attrition" },
  { path: "/hr/recognition", name: "hr_recognition" },
  { path: "/hr/surveys", name: "hr_surveys" },
  { path: "/hr/compliance", name: "hr_compliance" },
  { path: "/hr/termination", name: "hr_termination" },
  { path: "/hr/background-verification", name: "hr_bgv" },
  { path: "/hr/reimbursements", name: "hr_reimbursements" },
  { path: "/hr/work-logs?year=2026&quarter=2", name: "hr_work_logs" },
  { path: "/hr/performance/cycles", name: "hr_perf_cycles" },
  { path: "/hr/performance/one-on-ones", name: "hr_one_on_ones" },
  { path: "/hr/skills", name: "hr_skills" },
  { path: "/hr/employees/skills-matrix", name: "hr_skills_matrix" },
  { path: "/hr/exit", name: "hr_exit" },
  { path: "/hr/incentives", name: "hr_incentives" },
  { path: "/hr/documents/templates", name: "hr_doc_templates" },
  { path: "/hr/rich-documents", name: "hr_rich_documents" },
  { path: "/hr/holidays", name: "hr_holidays" },
  { path: "/hr/directory", name: "hr_directory" },
];

export const RECRUITMENT_READ_ENDPOINTS = [
  { path: "/hr/recruitment/stats", name: "recruitment_stats" },
  { path: "/hr/recruitment/pipeline", name: "recruitment_pipeline" },
  { path: "/hr/recruitment/jobs", name: "recruitment_jobs" },
  { path: "/hr/recruitment/candidates", name: "recruitment_candidates" },
  { path: "/hr/recruitment/candidates?limit=50", name: "recruitment_candidates_paged" },
  { path: "/hr/recruitment/interviews", name: "recruitment_interviews" },
  { path: "/hr/recruitment/interviews?upcoming=true", name: "recruitment_interviews_upcoming" },
  { path: "/hr/recruitment/analytics", name: "recruitment_analytics" },
  { path: "/hr/recruitment/diversity-report", name: "recruitment_diversity" },
  { path: "/hr/recruitment/interviews/slas", name: "recruitment_slas" },
  { path: "/hr/recruitment/interviews/sla-report", name: "recruitment_sla_report" },
  { path: "/hr/recruitment/scorecard-templates", name: "recruitment_scorecard_templates" },
  { path: "/hr/interview-questions", name: "recruitment_question_bank" },
  { path: "/reports/source-effectiveness", name: "recruitment_source_effectiveness" },
];

export function recruitmentDetailEndpoints(ids) {
  const routes = [];
  const { candidateId, jobId, interviewId } = ids;

  if (candidateId) {
    routes.push(
      { path: `/hr/recruitment/candidates/${candidateId}`, name: "recruitment_candidate_detail" },
      { path: `/hr/recruitment/candidates/${candidateId}/sla`, name: "recruitment_candidate_sla" },
      { path: `/hr/recruitment/candidates/${candidateId}/referral`, name: "recruitment_candidate_referral" },
      { path: `/hr/recruitment/candidates/${candidateId}/calibration`, name: "recruitment_candidate_calibration" },
      { path: `/hr/recruitment/candidates/${candidateId}/reference-checks`, name: "recruitment_reference_checks" },
      { path: `/hr/recruitment/candidates/${candidateId}/rollout-documents`, name: "recruitment_rollout_docs" },
      { path: `/hr/recruitment/candidates/${candidateId}/documents`, name: "recruitment_candidate_documents" },
    );
  }

  if (jobId) {
    routes.push(
      { path: `/hr/recruitment/jobs/${jobId}`, name: "recruitment_job_detail" },
      { path: `/hr/recruitment/jobs/${jobId}/share`, name: "recruitment_job_share" },
    );
  }

  if (interviewId) {
    routes.push(
      { path: `/hr/recruitment/interviews/${interviewId}/scorecard`, name: "recruitment_interview_scorecard" },
      { path: `/hr/recruitment/interviews/${interviewId}/scorecard/summary`, name: "recruitment_scorecard_summary" },
    );
  }

  return routes;
}

export const CHAT_READ_ENDPOINTS = [
  { path: "/chat/channels", name: "chat_channels" },
  { path: "/chat/unread", name: "chat_unread" },
  { path: "/chat/presence/online", name: "chat_online" },
  { path: "/chat/users", name: "chat_users" },
];

export function chatDetailEndpoints(channelId) {
  if (!channelId) return [];
  return [
    { path: `/chat/channels/${channelId}`, name: "chat_channel_detail" },
    { path: `/chat/channels/${channelId}/messages`, name: "chat_messages" },
    { path: `/chat/channels/${channelId}/typing`, name: "chat_typing" },
  ];
}
