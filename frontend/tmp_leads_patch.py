FE = 'D:/projects/personal/Streamlineos/frontend'
bt = chr(96)
nl = chr(10)

def patch_file(rel, import_block, patches):
    path = FE + '/' + rel
    c = open(path, encoding='utf-8').read()
    if import_block:
        lines = c.split(nl)
        last = -1
        for i, l in enumerate(lines):
            if l.startswith('import '):
                last = i
        if last >= 0:
            while (last + 1 < len(lines) and
                   not lines[last + 1].startswith('import ') and
                   lines[last + 1] != '' and
                   not lines[last + 1].startswith('export') and
                   not lines[last + 1].startswith('const ') and
                   not lines[last + 1].startswith('function ') and
                   not lines[last + 1].startswith('interface ') and
                   not lines[last + 1].startswith('type ')):
                last += 1
            lines.insert(last + 1, '')
            lines.insert(last + 1, import_block)
            c = nl.join(lines)
    for f, t in patches:
        if f in c:
            c = c.replace(f, t)
        else:
            print('  WARN not found in', rel + ':', repr(f[:80]))
    open(path, 'w', encoding='utf-8').write(c)
    print('Updated', rel)


# leads.ts
leads_import = (
    'import { lazyContract } from "@/lib/api-envelope";' + nl + nl +
    'const leadListLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadListContract));' + nl +
    'const leadDetailLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadDetailContract));' + nl +
    'const leadBoardLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadBoardContract));' + nl +
    'const leadStatsLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadStatsContract));' + nl +
    'const leadTimelineLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadTimelineContract));' + nl +
    'const leadsSlaAlertsLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadsSlaAlertsContract));' + nl +
    'const leadsAnalyticsLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadsAnalyticsContract));' + nl +
    'const leadActivityLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadActivityContract));' + nl +
    'const leadsBulkUpdateLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadsBulkUpdateContract));' + nl +
    'const leadsBulkDeleteLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadsBulkDeleteContract));' + nl +
    'const leadsDistributeLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadsDistributeContract));' + nl +
    'const leadScoreExplanationLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadScoreExplanationContract));' + nl +
    'const leadsDuplicateLazy = lazyContract(() => import("@/hooks/api/leads-schema").then((m) => m.leadsDuplicateGroupsContract));'
)

patch_file('hooks/api/leads.ts', leads_import, [
    # GETs
    ('apiClient.get<PaginatedLeads>("/leads", filters as Record<string, unknown>, signal)',
     'apiClient.get<PaginatedLeads>("/leads", filters as Record<string, unknown>, signal, leadListLazy)'),
    ('apiClient.get<LeadWithActivities>(' + bt + '/leads/${id}' + bt + ', undefined, signal)',
     'apiClient.get<LeadWithActivities>(' + bt + '/leads/${id}' + bt + ', undefined, signal, leadDetailLazy)'),
    ('apiClient.get<LeadBoard>("/leads/board", undefined, signal)',
     'apiClient.get<LeadBoard>("/leads/board", undefined, signal, leadBoardLazy)'),
    ('apiClient.get<LeadStats>("/leads/stats", filters as Record<string, unknown>, signal)',
     'apiClient.get<LeadStats>("/leads/stats", filters as Record<string, unknown>, signal, leadStatsLazy)'),
    ('apiClient.get<TimelineItem[]>(' + bt + '/leads/${leadId}/timeline' + bt + ', limit ? { limit } : undefined, signal)',
     'apiClient.get<TimelineItem[]>(' + bt + '/leads/${leadId}/timeline' + bt + ', limit ? { limit } : undefined, signal, leadTimelineLazy)'),
    ('apiClient.get<SlaAlertResponse>("/leads/sla-alerts", undefined, signal)',
     'apiClient.get<SlaAlertResponse>("/leads/sla-alerts", undefined, signal, leadsSlaAlertsLazy)'),
    ('apiClient.get<LeadAnalyticsSummary>("/leads/analytics", filters as Record<string, unknown>, signal)',
     'apiClient.get<LeadAnalyticsSummary>("/leads/analytics", filters as Record<string, unknown>, signal, leadsAnalyticsLazy)'),
    ('apiClient.get<SalesLeaderboardEntry[]>("/leads/sales-leaderboard", undefined, signal)',
     'apiClient.get<SalesLeaderboardEntry[]>("/leads/sales-leaderboard", undefined, signal, leadsAnalyticsLazy)'),
    ('apiClient.get<SalesTeamCapacityEntry[]>("/leads/sales-team-capacity", undefined, signal)',
     'apiClient.get<SalesTeamCapacityEntry[]>("/leads/sales-team-capacity", undefined, signal, leadsAnalyticsLazy)'),
    ('apiClient.get<DuplicateCheckResult>("/leads/check-duplicates", params as Record<string, unknown>, signal)',
     'apiClient.get<DuplicateCheckResult>("/leads/check-duplicates", params as Record<string, unknown>, signal, leadsDuplicateLazy)'),
    ('apiClient.get<ScoreExplanation>(' + bt + '/leads/${leadId}/score-explanation' + bt + ', undefined, signal)',
     'apiClient.get<ScoreExplanation>(' + bt + '/leads/${leadId}/score-explanation' + bt + ', undefined, signal, leadScoreExplanationLazy)'),
    # mutations
    ('apiClient.post<Lead>("/leads", input)',
     'apiClient.post<Lead>("/leads", input, undefined, leadDetailLazy)'),
    ('apiClient.patch<Lead>(' + bt + '/leads/${id}' + bt + ', data)',
     'apiClient.patch<Lead>(' + bt + '/leads/${id}' + bt + ', data, undefined, leadDetailLazy)'),
    ('apiClient.patch<Lead>(' + bt + '/leads/${input.leadId}/status' + bt + ', input)',
     'apiClient.patch<Lead>(' + bt + '/leads/${input.leadId}/status' + bt + ', input, undefined, leadDetailLazy)'),
    ('apiClient.post<LeadActivity>(' + bt + '/leads/${input.leadId}/activities' + bt + ', input)',
     'apiClient.post<LeadActivity>(' + bt + '/leads/${input.leadId}/activities' + bt + ', input, undefined, leadActivityLazy)'),
    ('apiClient.patch<{ updated: number }>("/leads/bulk", input)',
     'apiClient.patch<{ updated: number }>("/leads/bulk", input, undefined, leadsBulkUpdateLazy)'),
    ('apiClient.delete<{ deleted: number }>("/leads/bulk", input)',
     'apiClient.delete<{ deleted: number }>("/leads/bulk", input, undefined, leadsBulkDeleteLazy)'),
    ('apiClient.post<DistributeResult>("/leads/distribute", input)',
     'apiClient.post<DistributeResult>("/leads/distribute", input, undefined, leadsDistributeLazy)'),
    ('apiClient.patch<Lead>(' + bt + '/leads/${leadId}/self-assign' + bt + ', {})',
     'apiClient.patch<Lead>(' + bt + '/leads/${leadId}/self-assign' + bt + ', {}, undefined, leadDetailLazy)'),
    ('apiClient.patch<Lead>(' + bt + '/leads/${input.leadId}/assign' + bt + ', { assignedToId: input.assignedToId })',
     'apiClient.patch<Lead>(' + bt + '/leads/${input.leadId}/assign' + bt + ', { assignedToId: input.assignedToId }, undefined, leadDetailLazy)'),
])

print('leads.ts done')
