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


# pricebooks.ts
pb_import = (
    'import { lazyContract } from "@/lib/api-envelope";' + nl + nl +
    'const pricebooksListLazy = lazyContract(() => import("@/hooks/api/crm/pricebooks-schema").then((m) => m.pricebooksListContract));' + nl +
    'const pricebookLazy = lazyContract(() => import("@/hooks/api/crm/pricebooks-schema").then((m) => m.pricebookContract));' + nl +
    'const pbEntriesListLazy = lazyContract(() => import("@/hooks/api/crm/pricebooks-schema").then((m) => m.pricebookEntriesListContract));' + nl +
    'const pbEntryLazy = lazyContract(() => import("@/hooks/api/crm/pricebooks-schema").then((m) => m.pricebookEntryContract));' + nl +
    'const quoteSettingsLazy = lazyContract(() => import("@/hooks/api/crm/pricebooks-schema").then((m) => m.quoteSettingsContract));' + nl +
    'const quoteTemplatesListLazy = lazyContract(() => import("@/hooks/api/crm/pricebooks-schema").then((m) => m.quoteTemplatesListContract));' + nl +
    'const quoteTemplateLazy = lazyContract(() => import("@/hooks/api/crm/pricebooks-schema").then((m) => m.quoteTemplateContract));' + nl +
    'const deletePricebookLazy = lazyContract(() => import("@/hooks/api/crm/pricebooks-schema").then((m) => m.deletePricebookContract));'
)
patch_file('hooks/api/crm/pricebooks.ts', pb_import, [
    ('apiClient.get<Pricebook[]>("/crm/pricebooks", undefined, signal)',
     'apiClient.get<Pricebook[]>("/crm/pricebooks", undefined, signal, pricebooksListLazy)'),
    ('apiClient.get<PricebookEntry[]>(' + bt + '/crm/pricebooks/${pricebookId}/entries' + bt + ', undefined, signal)',
     'apiClient.get<PricebookEntry[]>(' + bt + '/crm/pricebooks/${pricebookId}/entries' + bt + ', undefined, signal, pbEntriesListLazy)'),
    ('apiClient.post<Pricebook>("/crm/pricebooks", input)',
     'apiClient.post<Pricebook>("/crm/pricebooks", input, undefined, pricebookLazy)'),
    ('apiClient.patch<Pricebook>(' + bt + '/crm/pricebooks/${id}' + bt + ', data)',
     'apiClient.patch<Pricebook>(' + bt + '/crm/pricebooks/${id}' + bt + ', data, undefined, pricebookLazy)'),
    ('apiClient.delete<{ success: boolean }>(' + bt + '/crm/pricebooks/${id}' + bt + ')',
     'apiClient.delete<{ success: boolean }>(' + bt + '/crm/pricebooks/${id}' + bt + ', undefined, undefined, deletePricebookLazy)'),
    ('apiClient.post<PricebookEntry>(' + bt + '/crm/pricebooks/${pricebookId}/entries' + bt + ', data)',
     'apiClient.post<PricebookEntry>(' + bt + '/crm/pricebooks/${pricebookId}/entries' + bt + ', data, undefined, pbEntryLazy)'),
    ('apiClient.delete<{ success: boolean }>(' + nl +
     '        ' + bt + '/crm/pricebooks/${pricebookId}/entries/${entryId}' + bt + ',' + nl +
     '      )',
     'apiClient.delete<{ success: boolean }>(' + nl +
     '        ' + bt + '/crm/pricebooks/${pricebookId}/entries/${entryId}' + bt + ',' + nl +
     '        undefined,' + nl +
     '        undefined,' + nl +
     '        deletePricebookLazy,' + nl +
     '      )'),
    ('apiClient.get<QuoteSettings>("/crm/quote-settings", undefined, signal)',
     'apiClient.get<QuoteSettings>("/crm/quote-settings", undefined, signal, quoteSettingsLazy)'),
    ('apiClient.patch<QuoteSettings>("/crm/quote-settings", data)',
     'apiClient.patch<QuoteSettings>("/crm/quote-settings", data, undefined, quoteSettingsLazy)'),
    ('apiClient.get<QuoteTemplate[]>("/crm/quote-templates", undefined, signal)',
     'apiClient.get<QuoteTemplate[]>("/crm/quote-templates", undefined, signal, quoteTemplatesListLazy)'),
    (') => apiClient.post<QuoteTemplate>("/crm/quote-templates", input)',
     ') => apiClient.post<QuoteTemplate>("/crm/quote-templates", input, undefined, quoteTemplateLazy)'),
    (') => apiClient.patch<QuoteTemplate>(' + bt + '/crm/quote-templates/${id}' + bt + ', data)',
     ') => apiClient.patch<QuoteTemplate>(' + bt + '/crm/quote-templates/${id}' + bt + ', data, undefined, quoteTemplateLazy)'),
    ('apiClient.delete<{ success: boolean }>(' + bt + '/crm/quote-templates/${id}' + bt + ')',
     'apiClient.delete<{ success: boolean }>(' + bt + '/crm/quote-templates/${id}' + bt + ', undefined, undefined, deletePricebookLazy)'),
])


# quotes.ts
q_import = (
    'import { lazyContract } from "@/lib/api-envelope";' + nl + nl +
    'const quoteListLazy = lazyContract(() => import("@/hooks/api/crm/quotes-schema").then((m) => m.quoteListContract));' + nl +
    'const quoteDetailLazy = lazyContract(() => import("@/hooks/api/crm/quotes-schema").then((m) => m.quoteDetailContract));' + nl +
    'const quoteLazy = lazyContract(() => import("@/hooks/api/crm/quotes-schema").then((m) => m.quoteContract));' + nl +
    'const quoteDeleteLazy = lazyContract(() => import("@/hooks/api/crm/quotes-schema").then((m) => m.quoteDeleteContract));' + nl +
    'const quoteConvertLazy = lazyContract(() => import("@/hooks/api/crm/quotes-schema").then((m) => m.quoteConvertToInvoiceContract));'
)
patch_file('hooks/api/crm/quotes.ts', q_import, [
    ('return apiClient.get<QuoteListResponse>("/quotes", p, signal);',
     'return apiClient.get<QuoteListResponse>("/quotes", p, signal, quoteListLazy);'),
    ('apiClient.get<Quote>(' + bt + '/quotes/${id}' + bt + ', undefined, signal)',
     'apiClient.get<Quote>(' + bt + '/quotes/${id}' + bt + ', undefined, signal, quoteDetailLazy)'),
    ('apiClient.get<QuoteListResponse>("/quotes", { dealId, pageSize: 100 }, signal)',
     'apiClient.get<QuoteListResponse>("/quotes", { dealId, pageSize: 100 }, signal, quoteListLazy)'),
    ('apiClient.post<Quote>("/quotes", input)',
     'apiClient.post<Quote>("/quotes", input, undefined, quoteLazy)'),
    ('apiClient.patch<Quote>(' + bt + '/quotes/${id}' + bt + ', input)',
     'apiClient.patch<Quote>(' + bt + '/quotes/${id}' + bt + ', input, undefined, quoteLazy)'),
    ('apiClient.patch<Quote>(' + bt + '/quotes/${id}' + bt + ', { status, rejectionReason })',
     'apiClient.patch<Quote>(' + bt + '/quotes/${id}' + bt + ', { status, rejectionReason }, undefined, quoteLazy)'),
    ('apiClient.delete<{ success: boolean }>(' + bt + '/quotes/${id}' + bt + ')',
     'apiClient.delete<{ success: boolean }>(' + bt + '/quotes/${id}' + bt + ', undefined, undefined, quoteDeleteLazy)'),
    ('apiClient.post<Quote>(' + bt + '/quotes/${id}/approve' + bt + ')',
     'apiClient.post<Quote>(' + bt + '/quotes/${id}/approve' + bt + ', undefined, undefined, quoteLazy)'),
    ('apiClient.post<Quote>(' + bt + '/quotes/${id}/reject' + bt + ', { reason })',
     'apiClient.post<Quote>(' + bt + '/quotes/${id}/reject' + bt + ', { reason }, undefined, quoteLazy)'),
    ('apiClient.post<{ invoice: { id: number; invoiceNumber: string }; quoteId: number }>(' + nl +
     '        ' + bt + '/quotes/${id}/convert-to-invoice' + bt + ',' + nl +
     '      )',
     'apiClient.post<{ invoice: { id: number; invoiceNumber: string }; quoteId: number }>(' + nl +
     '        ' + bt + '/quotes/${id}/convert-to-invoice' + bt + ',' + nl +
     '        undefined,' + nl +
     '        undefined,' + nl +
     '        quoteConvertLazy,' + nl +
     '      )'),
    ('apiClient.post<Quote>(' + bt + '/quotes/${id}/mark-signed' + bt + ', { documentRef })',
     'apiClient.post<Quote>(' + bt + '/quotes/${id}/mark-signed' + bt + ', { documentRef }, undefined, quoteLazy)'),
])


# sequences.ts
seq_import = (
    'import { lazyContract } from "@/lib/api-envelope";' + nl + nl +
    'const sequencesListLazy = lazyContract(() => import("@/hooks/api/crm/sequences-schema").then((m) => m.sequencesListContract));' + nl +
    'const sequenceLazy = lazyContract(() => import("@/hooks/api/crm/sequences-schema").then((m) => m.sequenceContract));' + nl +
    'const stepsListLazy = lazyContract(() => import("@/hooks/api/crm/sequences-schema").then((m) => m.stepsListContract));' + nl +
    'const stepLazy = lazyContract(() => import("@/hooks/api/crm/sequences-schema").then((m) => m.stepContract));' + nl +
    'const enrollmentsListLazy = lazyContract(() => import("@/hooks/api/crm/sequences-schema").then((m) => m.enrollmentsListContract));' + nl +
    'const enrollmentLazy = lazyContract(() => import("@/hooks/api/crm/sequences-schema").then((m) => m.enrollmentContract));' + nl +
    'const deleteSequenceLazy = lazyContract(() => import("@/hooks/api/crm/sequences-schema").then((m) => m.deleteSequenceContract));'
)
patch_file('hooks/api/crm/sequences.ts', seq_import, [
    ('apiClient.get<SequencesResponse>("/crm/sequences", undefined, signal)',
     'apiClient.get<SequencesResponse>("/crm/sequences", undefined, signal, sequencesListLazy)'),
    (') => apiClient.post<CrmSequence>("/crm/sequences", input)',
     ') => apiClient.post<CrmSequence>("/crm/sequences", input, undefined, sequenceLazy)'),
    ('apiClient.patch<CrmSequence>(' + bt + '/crm/sequences/${id}' + bt + ', data)',
     'apiClient.patch<CrmSequence>(' + bt + '/crm/sequences/${id}' + bt + ', data, undefined, sequenceLazy)'),
    ('apiClient.delete<{ success: boolean }>(' + bt + '/crm/sequences/${id}' + bt + ')',
     'apiClient.delete<{ success: boolean }>(' + bt + '/crm/sequences/${id}' + bt + ', undefined, undefined, deleteSequenceLazy)'),
    ('apiClient.get<StepsResponse>(' + bt + '/crm/sequences/${sequenceId}/steps' + bt + ', undefined, signal)',
     'apiClient.get<StepsResponse>(' + bt + '/crm/sequences/${sequenceId}/steps' + bt + ', undefined, signal, stepsListLazy)'),
    ('apiClient.post<CrmSequenceStep>(' + bt + '/crm/sequences/${sequenceId}/steps' + bt + ', input)',
     'apiClient.post<CrmSequenceStep>(' + bt + '/crm/sequences/${sequenceId}/steps' + bt + ', input, undefined, stepLazy)'),
    ('apiClient.delete<{ success: boolean }>(' + bt + '/crm/sequences/${sequenceId}/steps/${stepId}' + bt + ')',
     'apiClient.delete<{ success: boolean }>(' + bt + '/crm/sequences/${sequenceId}/steps/${stepId}' + bt + ', undefined, undefined, deleteSequenceLazy)'),
    ('apiClient.get<EnrollmentsResponse>(' + bt + '/crm/sequences/${sequenceId}/enrollments' + bt + ', { page }, signal)',
     'apiClient.get<EnrollmentsResponse>(' + bt + '/crm/sequences/${sequenceId}/enrollments' + bt + ', { page }, signal, enrollmentsListLazy)'),
    ('apiClient.patch<CrmSequenceEnrollment>(' + nl +
     '        ' + bt + '/crm/sequences/${sequenceId}/enrollments/${enrollmentId}/stop' + bt + ',' + nl +
     '        {},' + nl +
     '      )',
     'apiClient.patch<CrmSequenceEnrollment>(' + nl +
     '        ' + bt + '/crm/sequences/${sequenceId}/enrollments/${enrollmentId}/stop' + bt + ',' + nl +
     '        {},' + nl +
     '        undefined,' + nl +
     '        enrollmentLazy,' + nl +
     '      )'),
])

print('pricebooks + quotes + sequences done')
