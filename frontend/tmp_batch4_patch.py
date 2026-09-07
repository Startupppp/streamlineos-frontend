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


# issues.ts
issues_import = (
    'import { lazyContract } from "@/lib/api-envelope";' + nl + nl +
    'const issueRecordTypesLazy = lazyContract(() => import("@/hooks/api/crm/issues-schema").then((m) => m.issueRecordTypesContract));' + nl +
    'const issueListLazy = lazyContract(() => import("@/hooks/api/crm/issues-schema").then((m) => m.issueListContract));' + nl +
    'const issueDetailLazy = lazyContract(() => import("@/hooks/api/crm/issues-schema").then((m) => m.issueDetailContract));' + nl +
    'const issueDeleteLazy = lazyContract(() => import("@/hooks/api/crm/issues-schema").then((m) => m.issueDeleteContract));'
)
patch_file('hooks/api/crm/issues.ts', issues_import, [
    ('apiClient.get<IssueRecordTypesResponse>(' + bt + '${BASE}/record-types' + bt + ', undefined, signal)',
     'apiClient.get<IssueRecordTypesResponse>(' + bt + '${BASE}/record-types' + bt + ', undefined, signal, issueRecordTypesLazy)'),
    ('return apiClient.get<IssuePage>(' + bt + '${BASE}?${search.toString()}' + bt + ', undefined, signal);',
     'return apiClient.get<IssuePage>(' + bt + '${BASE}?${search.toString()}' + bt + ', undefined, signal, issueListLazy);'),
    ('apiClient.get<IssueDetailResponse>(' + bt + '${BASE}/${issueRecordId}' + bt + ', undefined, signal)',
     'apiClient.get<IssueDetailResponse>(' + bt + '${BASE}/${issueRecordId}' + bt + ', undefined, signal, issueDetailLazy)'),
    ('apiClient.post<IssueDetailResponse>(BASE, input)',
     'apiClient.post<IssueDetailResponse>(BASE, input, undefined, issueDetailLazy)'),
    ('apiClient.patch<IssueDetailResponse>(' + bt + '${BASE}/${issueRecordId}' + bt + ', patch)',
     'apiClient.patch<IssueDetailResponse>(' + bt + '${BASE}/${issueRecordId}' + bt + ', patch, undefined, issueDetailLazy)'),
    ('apiClient.post<IssueDetailResponse>(' + bt + '${BASE}/${issueRecordId}/stage' + bt + ', body)',
     'apiClient.post<IssueDetailResponse>(' + bt + '${BASE}/${issueRecordId}/stage' + bt + ', body, undefined, issueDetailLazy)'),
    ('apiClient.post<IssueDetailResponse>(' + bt + '${BASE}/${issueRecordId}/escalate' + bt + ', { reason })',
     'apiClient.post<IssueDetailResponse>(' + bt + '${BASE}/${issueRecordId}/escalate' + bt + ', { reason }, undefined, issueDetailLazy)'),
])


# import.ts
import_import = (
    'import { lazyContract } from "@/lib/api-envelope";' + nl + nl +
    'const importProgressLazy = lazyContract(() => import("@/hooks/api/crm/import-schema").then((m) => m.importProgressContract));' + nl +
    'const importPreviewLazy = lazyContract(() => import("@/hooks/api/crm/import-schema").then((m) => m.importPreviewContract));'
)
patch_file('hooks/api/crm/import.ts', import_import, [
    (') => apiClient.post<ImportPreview>("/crm/imports/preview", input)',
     ') => apiClient.post<ImportPreview>("/crm/imports/preview", input, undefined, importPreviewLazy)'),
    ('let progress = await apiClient.post<ImportProgress>(' + nl +
     '        ' + bt + '/crm/imports/${crmImportId}/commit' + bt + ',' + nl +
     '        {},' + nl +
     '      );',
     'let progress = await apiClient.post<ImportProgress>(' + nl +
     '        ' + bt + '/crm/imports/${crmImportId}/commit' + bt + ',' + nl +
     '        {},' + nl +
     '        undefined,' + nl +
     '        importProgressLazy,' + nl +
     '      );'),
    ('progress = await apiClient.get<ImportProgress>(' + bt + '/crm/imports/${crmImportId}/progress' + bt + ');',
     'progress = await apiClient.get<ImportProgress>(' + bt + '/crm/imports/${crmImportId}/progress' + bt + ', undefined, undefined, importProgressLazy);'),
    ('apiClient.post<ImportProgress>(' + bt + '/crm/imports/${crmImportId}/revert' + bt + ', {})',
     'apiClient.post<ImportProgress>(' + bt + '/crm/imports/${crmImportId}/revert' + bt + ', {}, undefined, importProgressLazy)'),
])


# ai.ts - many mutations, some with signal config
ai_import = (
    'import { lazyContract } from "@/lib/api-envelope";' + nl + nl +
    'const leadSummaryLazy = lazyContract(() => import("@/hooks/api/crm/ai-schema").then((m) => m.leadSummaryContract));' + nl +
    'const dealSummaryLazy = lazyContract(() => import("@/hooks/api/crm/ai-schema").then((m) => m.dealSummaryContract));' + nl +
    'const nextBestActionsLazy = lazyContract(() => import("@/hooks/api/crm/ai-schema").then((m) => m.nextBestActionsContract));' + nl +
    'const emailDraftLazy = lazyContract(() => import("@/hooks/api/crm/ai-schema").then((m) => m.emailDraftContract));' + nl +
    'const leadEnrichmentLazy = lazyContract(() => import("@/hooks/api/crm/ai-schema").then((m) => m.leadEnrichmentContract));'
)
patch_file('hooks/api/crm/ai.ts', ai_import, [
    ('apiClient.post<LeadSummaryResult>(' + bt + '/ai/crm/leads/${leadId}/summary' + bt + ', {})',
     'apiClient.post<LeadSummaryResult>(' + bt + '/ai/crm/leads/${leadId}/summary' + bt + ', {}, undefined, leadSummaryLazy)'),
    ('apiClient.post<DealSummaryResult>(' + bt + '/ai/crm/deals/${dealId}/summary' + bt + ', {})',
     'apiClient.post<DealSummaryResult>(' + bt + '/ai/crm/deals/${dealId}/summary' + bt + ', {}, undefined, dealSummaryLazy)'),
    ('apiClient.post<NextBestActionsWithEvidenceResult>(' + nl +
     '        "/ai/crm/next-best-actions",' + nl +
     '        { limit },' + nl +
     '        { signal },' + nl +
     '      )',
     'apiClient.post<NextBestActionsWithEvidenceResult>(' + nl +
     '        "/ai/crm/next-best-actions",' + nl +
     '        { limit },' + nl +
     '        { signal },' + nl +
     '        nextBestActionsLazy,' + nl +
     '      )'),
    ('apiClient.post<EmailDraftResult>("/ai/crm/email-draft", input, { signal })',
     'apiClient.post<EmailDraftResult>("/ai/crm/email-draft", input, { signal }, emailDraftLazy)'),
    ('apiClient.post<SummarizeNotesResult>("/ai/crm/summarize-notes", { text })',
     'apiClient.post<SummarizeNotesResult>("/ai/crm/summarize-notes", { text }, undefined, leadSummaryLazy)'),
    ('apiClient.post<ObjectionHelpResult>("/ai/crm/objection-help", input, { signal })',
     'apiClient.post<ObjectionHelpResult>("/ai/crm/objection-help", input, { signal }, leadEnrichmentLazy)'),
    ('apiClient.post<DuplicateSuggestionsResult>(' + nl +
     '        ' + bt + '/ai/crm/duplicate-suggestions/${leadId}' + bt + ',' + nl +
     '        {},' + nl +
     '        { signal },' + nl +
     '      )',
     'apiClient.post<DuplicateSuggestionsResult>(' + nl +
     '        ' + bt + '/ai/crm/duplicate-suggestions/${leadId}' + bt + ',' + nl +
     '        {},' + nl +
     '        { signal },' + nl +
     '        leadSummaryLazy,' + nl +
     '      )'),
    ('apiClient.post<LeadSummaryWithCitationsResult>(' + nl +
     '        ' + bt + '/ai/crm/leads/${leadId}/summary-with-citations' + bt + ',' + nl +
     '        {},' + nl +
     '        { signal },' + nl +
     '      )',
     'apiClient.post<LeadSummaryWithCitationsResult>(' + nl +
     '        ' + bt + '/ai/crm/leads/${leadId}/summary-with-citations' + bt + ',' + nl +
     '        {},' + nl +
     '        { signal },' + nl +
     '        leadSummaryLazy,' + nl +
     '      )'),
    ('apiClient.post<DealSummaryWithCitationsResult>(' + nl +
     '        ' + bt + '/ai/crm/deals/${dealId}/summary-with-citations' + bt + ',' + nl +
     '        {},' + nl +
     '        { signal },' + nl +
     '      )',
     'apiClient.post<DealSummaryWithCitationsResult>(' + nl +
     '        ' + bt + '/ai/crm/deals/${dealId}/summary-with-citations' + bt + ',' + nl +
     '        {},' + nl +
     '        { signal },' + nl +
     '        dealSummaryLazy,' + nl +
     '      )'),
    ('apiClient.post<AccountSummaryWithCitationsResult>(' + nl +
     '        "/ai/crm/account-summary-with-citations",' + nl +
     '        { clientId },' + nl +
     '        { signal },' + nl +
     '      )',
     'apiClient.post<AccountSummaryWithCitationsResult>(' + nl +
     '        "/ai/crm/account-summary-with-citations",' + nl +
     '        { clientId },' + nl +
     '        { signal },' + nl +
     '        leadSummaryLazy,' + nl +
     '      )'),
    ('apiClient.post<MeetingFollowUpResult>("/ai/crm/meeting-follow-up", input, { signal })',
     'apiClient.post<MeetingFollowUpResult>("/ai/crm/meeting-follow-up", input, { signal }, emailDraftLazy)'),
])

print('issues + import + ai done')
