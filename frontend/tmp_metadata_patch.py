FE = 'D:/projects/personal/Streamlineos/frontend'
bt = chr(96)
nl = chr(10)
p = FE + '/hooks/api/crm/metadata.ts'
c = open(p, encoding='utf-8').read()

# Inject import block after last 'import' line
lines = c.split(nl)
last = -1
for i, l in enumerate(lines):
    if l.startswith('import '):
        last = i
ib = (
    'import { lazyContract } from "@/lib/api-envelope";' + nl + nl +
    'const crmAggregateLazy = lazyContract(() => import("@/hooks/api/crm/metadata-schema").then((m) => m.crmAggregateContract));' + nl +
    'const pipelineLazy = lazyContract(() => import("@/hooks/api/crm/metadata-schema").then((m) => m.pipelineContract));' + nl +
    'const pipelineStageLazy = lazyContract(() => import("@/hooks/api/crm/metadata-schema").then((m) => m.pipelineStageContract));' + nl +
    'const crmOptionLazy = lazyContract(() => import("@/hooks/api/crm/metadata-schema").then((m) => m.crmOptionContract));' + nl +
    'const validationRulesListLazy = lazyContract(() => import("@/hooks/api/crm/metadata-schema").then((m) => m.validationRulesListContract));' + nl +
    'const validationRuleLazy = lazyContract(() => import("@/hooks/api/crm/metadata-schema").then((m) => m.validationRuleContract));' + nl +
    'const testValidationLazy = lazyContract(() => import("@/hooks/api/crm/metadata-schema").then((m) => m.testValidationContract));' + nl +
    'const blueprintsListLazy = lazyContract(() => import("@/hooks/api/crm/metadata-schema").then((m) => m.blueprintsListContract));' + nl +
    'const blueprintLazy = lazyContract(() => import("@/hooks/api/crm/metadata-schema").then((m) => m.blueprintContract));' + nl +
    'const blueprintTransitionsListLazy = lazyContract(() => import("@/hooks/api/crm/metadata-schema").then((m) => m.blueprintTransitionsListContract));' + nl +
    'const blueprintTransitionLazy = lazyContract(() => import("@/hooks/api/crm/metadata-schema").then((m) => m.blueprintTransitionContract));' + nl +
    'const deleteSuccessLazy = lazyContract(() => import("@/hooks/api/crm/metadata-schema").then((m) => m.deleteSuccessContract));' + nl +
    'const reorderSuccessLazy = lazyContract(() => import("@/hooks/api/crm/metadata-schema").then((m) => m.reorderSuccessContract));' + nl +
    'const testTransitionLazy = lazyContract(() => import("@/hooks/api/crm/metadata-schema").then((m) => m.testTransitionContract));'
)
lines.insert(last + 1, '')
lines.insert(last + 1, ib)
c = nl.join(lines)

patches = [
    ('apiClient.get<CrmMetadataRaw>("/crm/metadata", undefined, signal)',
     'apiClient.get<CrmMetadataRaw>("/crm/metadata", undefined, signal, crmAggregateLazy)'),
    ('apiClient.post<CrmPipelineWithStages>("/crm/pipelines", input)',
     'apiClient.post<CrmPipelineWithStages>("/crm/pipelines", input, undefined, pipelineLazy)'),
    ('apiClient.patch<CrmPipelineWithStages>(' + bt + '/crm/pipelines/${id}' + bt + ', data)',
     'apiClient.patch<CrmPipelineWithStages>(' + bt + '/crm/pipelines/${id}' + bt + ', data, undefined, pipelineLazy)'),
    ('apiClient.post<CrmPipelineStage>(' + bt + '/crm/pipelines/${pipelineId}/stages' + bt + ', data)',
     'apiClient.post<CrmPipelineStage>(' + bt + '/crm/pipelines/${pipelineId}/stages' + bt + ', data, undefined, pipelineStageLazy)'),
    ('apiClient.patch<CrmPipelineStage>(' + bt + '/crm/stages/${id}' + bt + ', data)',
     'apiClient.patch<CrmPipelineStage>(' + bt + '/crm/stages/${id}' + bt + ', data, undefined, pipelineStageLazy)'),
    ('apiClient.delete<{ success: boolean }>(' + bt + '/crm/stages/${id}' + bt + ')',
     'apiClient.delete<{ success: boolean }>(' + bt + '/crm/stages/${id}' + bt + ', undefined, undefined, deleteSuccessLazy)'),
    ('apiClient.post<{ success: boolean }>(' + nl + '        ' + bt + '/crm/pipelines/${pipelineId}/stages/reorder' + bt + ',' + nl + '        { stageIds }' + nl + '      )',
     'apiClient.post<{ success: boolean }>(' + nl + '        ' + bt + '/crm/pipelines/${pipelineId}/stages/reorder' + bt + ',' + nl + '        { stageIds },' + nl + '        undefined,' + nl + '        reorderSuccessLazy,' + nl + '      )'),
    ('apiClient.post<CrmOption>(' + bt + '/crm/options/${type}' + bt + ', data)',
     'apiClient.post<CrmOption>(' + bt + '/crm/options/${type}' + bt + ', data, undefined, crmOptionLazy)'),
    ('apiClient.patch<CrmOption>(' + bt + '/crm/options/${type}/${id}' + bt + ', data)',
     'apiClient.patch<CrmOption>(' + bt + '/crm/options/${type}/${id}' + bt + ', data, undefined, crmOptionLazy)'),
    ('apiClient.delete<{ success: boolean }>(' + bt + '/crm/options/${type}/${id}' + bt + ')',
     'apiClient.delete<{ success: boolean }>(' + bt + '/crm/options/${type}/${id}' + bt + ', undefined, undefined, deleteSuccessLazy)'),
    ('apiClient.get<CrmValidationRule[]>("/crm/validation-rules", params, signal)',
     'apiClient.get<CrmValidationRule[]>("/crm/validation-rules", params, signal, validationRulesListLazy)'),
    ('apiClient.post<CrmValidationRule>("/crm/validation-rules", input)',
     'apiClient.post<CrmValidationRule>("/crm/validation-rules", input, undefined, validationRuleLazy)'),
    ('apiClient.patch<CrmValidationRule>(' + bt + '/crm/validation-rules/${id}' + bt + ', data)',
     'apiClient.patch<CrmValidationRule>(' + bt + '/crm/validation-rules/${id}' + bt + ', data, undefined, validationRuleLazy)'),
    ('apiClient.delete<{ success: boolean }>(' + bt + '/crm/validation-rules/${id}' + bt + ')',
     'apiClient.delete<{ success: boolean }>(' + bt + '/crm/validation-rules/${id}' + bt + ', undefined, undefined, deleteSuccessLazy)'),
    ('apiClient.post<{ errors: Record<string, string> }>("/crm/validation-rules/test", input)',
     'apiClient.post<{ errors: Record<string, string> }>("/crm/validation-rules/test", input, undefined, testValidationLazy)'),
    ('apiClient.get<CrmBlueprint[]>("/crm/blueprints", params, signal)',
     'apiClient.get<CrmBlueprint[]>("/crm/blueprints", params, signal, blueprintsListLazy)'),
    ('apiClient.post<CrmBlueprint>("/crm/blueprints", input)',
     'apiClient.post<CrmBlueprint>("/crm/blueprints", input, undefined, blueprintLazy)'),
    ('apiClient.patch<CrmBlueprint>(' + bt + '/crm/blueprints/${id}' + bt + ', data)',
     'apiClient.patch<CrmBlueprint>(' + bt + '/crm/blueprints/${id}' + bt + ', data, undefined, blueprintLazy)'),
    ('apiClient.get<CrmBlueprintTransition[]>(' + bt + '/crm/blueprints/${blueprintId}/transitions' + bt + ', undefined, signal)',
     'apiClient.get<CrmBlueprintTransition[]>(' + bt + '/crm/blueprints/${blueprintId}/transitions' + bt + ', undefined, signal, blueprintTransitionsListLazy)'),
    ('apiClient.post<CrmBlueprintTransition>(' + bt + '/crm/blueprints/${blueprintId}/transitions' + bt + ', input)',
     'apiClient.post<CrmBlueprintTransition>(' + bt + '/crm/blueprints/${blueprintId}/transitions' + bt + ', input, undefined, blueprintTransitionLazy)'),
    ('apiClient.patch<CrmBlueprintTransition>(' + nl + '        ' + bt + '/crm/blueprints/${blueprintId}/transitions/${id}' + bt + ',' + nl + '        data' + nl + '      )',
     'apiClient.patch<CrmBlueprintTransition>(' + nl + '        ' + bt + '/crm/blueprints/${blueprintId}/transitions/${id}' + bt + ',' + nl + '        data,' + nl + '        undefined,' + nl + '        blueprintTransitionLazy,' + nl + '      )'),
    ('apiClient.delete<{ success: boolean }>(' + nl + '        ' + bt + '/crm/blueprints/${blueprintId}/transitions/${id}' + bt + nl + '      )',
     'apiClient.delete<{ success: boolean }>(' + nl + '        ' + bt + '/crm/blueprints/${blueprintId}/transitions/${id}' + bt + ',' + nl + '        undefined,' + nl + '        undefined,' + nl + '        deleteSuccessLazy,' + nl + '      )'),
    ('apiClient.post<{ allowed: boolean; missing: string[] }>(' + bt + '/crm/blueprints/${blueprintId}/test' + bt + ', input)',
     'apiClient.post<{ allowed: boolean; missing: string[] }>(' + bt + '/crm/blueprints/${blueprintId}/test' + bt + ', input, undefined, testTransitionLazy)'),
]

for f, t in patches:
    if f in c:
        c = c.replace(f, t)
    else:
        print('  WARN not found:', repr(f[:80]))

open(p, 'w', encoding='utf-8').write(c)
print('metadata.ts done')
