FE = 'D:/projects/personal/Streamlineos/frontend'
bt = chr(96)
nl = chr(10)
p = FE + '/hooks/api/crm/organizations.ts'
c = open(p, encoding='utf-8').read()

# Inject import block after last 'import' line
lines = c.split(nl)
last = -1
for i, l in enumerate(lines):
    if l.startswith('import '):
        last = i
ib = (
    'import { lazyContract } from "@/lib/api-envelope";' + nl + nl +
    'const crmOrgsListLazy = lazyContract(() => import("@/hooks/api/crm/organizations-schema").then((m) => m.crmOrgsListContract));' + nl +
    'const crmOrgDetailLazy = lazyContract(() => import("@/hooks/api/crm/organizations-schema").then((m) => m.crmOrgDetailContract));' + nl +
    'const crmOrgLazy = lazyContract(() => import("@/hooks/api/crm/organizations-schema").then((m) => m.crmOrgContract));' + nl +
    'const orgHierarchyLazy = lazyContract(() => import("@/hooks/api/crm/organizations-schema").then((m) => m.orgHierarchyNodeSchema));' + nl +
    'const orgRollupLazy = lazyContract(() => import("@/hooks/api/crm/organizations-schema").then((m) => m.orgRollupContract));' + nl +
    'const orgTimelineLazy = lazyContract(() => import("@/hooks/api/crm/organizations-schema").then((m) => m.orgTimelineContract));' + nl +
    'const orgRelatedLeadsLazy = lazyContract(() => import("@/hooks/api/crm/organizations-schema").then((m) => m.orgRelatedLeadsContract));' + nl +
    'const orgMergeResultLazy = lazyContract(() => import("@/hooks/api/crm/organizations-schema").then((m) => m.orgMergeResultContract));' + nl +
    'const deleteOrgLazy = lazyContract(() => import("@/hooks/api/crm/organizations-schema").then((m) => m.deleteOrgContract));'
)
lines.insert(last + 1, '')
lines.insert(last + 1, ib)
c = nl.join(lines)

patches = [
    # list GETs (both multiline)
    ('apiClient.get<PaginatedCrmOrganizations>(' + nl +
     '        "/crm/organizations",' + nl +
     '        filters as Record<string, unknown>' + nl +
     '      , signal)',
     'apiClient.get<PaginatedCrmOrganizations>(' + nl +
     '        "/crm/organizations",' + nl +
     '        filters as Record<string, unknown>,' + nl +
     '        signal,' + nl +
     '        crmOrgsListLazy,' + nl +
     '      )'),
    # picker GET
    ('apiClient.get<PaginatedCrmOrganizations>("/crm/organizations", {' + nl +
     '        page: 1,' + nl +
     '        limit: 100,' + nl +
     '        search: search ?? undefined,' + nl +
     '      }, signal)',
     'apiClient.get<PaginatedCrmOrganizations>("/crm/organizations", {' + nl +
     '        page: 1,' + nl +
     '        limit: 100,' + nl +
     '        search: search ?? undefined,' + nl +
     '      }, signal, crmOrgsListLazy)'),
    # detail GET
    ('apiClient.get<CrmOrganization>(' + bt + '/crm/organizations/${id}' + bt + ', undefined, signal)',
     'apiClient.get<CrmOrganization>(' + bt + '/crm/organizations/${id}' + bt + ', undefined, signal, crmOrgDetailLazy)'),
    # create
    ('apiClient.post<CrmOrganization>("/crm/organizations", input)',
     'apiClient.post<CrmOrganization>("/crm/organizations", input, undefined, crmOrgLazy)'),
    # update
    ('apiClient.patch<CrmOrganization>(' + bt + '/crm/organizations/${id}' + bt + ', input)',
     'apiClient.patch<CrmOrganization>(' + bt + '/crm/organizations/${id}' + bt + ', input, undefined, crmOrgLazy)'),
    # delete
    ('apiClient.delete<{ success: boolean }>(' + bt + '/crm/organizations/${id}' + bt + ')',
     'apiClient.delete<{ success: boolean }>(' + bt + '/crm/organizations/${id}' + bt + ', undefined, undefined, deleteOrgLazy)'),
    # hierarchy
    ('apiClient.get<OrgHierarchyNode>(' + bt + '/crm/organizations/${id}/hierarchy' + bt + ', undefined, signal)',
     'apiClient.get<OrgHierarchyNode>(' + bt + '/crm/organizations/${id}/hierarchy' + bt + ', undefined, signal, orgHierarchyLazy)'),
    # rollup
    ('apiClient.get<OrgRollup>(' + bt + '/crm/organizations/${id}/roll-up' + bt + ', undefined, signal)',
     'apiClient.get<OrgRollup>(' + bt + '/crm/organizations/${id}/roll-up' + bt + ', undefined, signal, orgRollupLazy)'),
    # timeline
    ('apiClient.get<OrgTimelineEvent[]>(' + bt + '/crm/organizations/${id}/timeline' + bt + ', undefined, signal)',
     'apiClient.get<OrgTimelineEvent[]>(' + bt + '/crm/organizations/${id}/timeline' + bt + ', undefined, signal, orgTimelineLazy)'),
    # related leads
    ('apiClient.get<RelatedLead[]>(' + bt + '/crm/organizations/${id}/related-leads' + bt + ', undefined, signal)',
     'apiClient.get<RelatedLead[]>(' + bt + '/crm/organizations/${id}/related-leads' + bt + ', undefined, signal, orgRelatedLeadsLazy)'),
    # people slugs - no specific contract, use crmOrgDetailLazy as proxy
    ('apiClient.get<Record<string, string>>("/crm/people-slugs", undefined, signal)',
     'apiClient.get<Record<string, string>>("/crm/people-slugs", undefined, signal, crmOrgDetailLazy)'),
    # merge
    ('apiClient.post<MergeOrgsResult>("/crm/organizations/merge", input)',
     'apiClient.post<MergeOrgsResult>("/crm/organizations/merge", input, undefined, orgMergeResultLazy)'),
]

for f, t in patches:
    if f in c:
        c = c.replace(f, t)
    else:
        print('  WARN not found:', repr(f[:80]))

open(p, 'w', encoding='utf-8').write(c)
print('organizations.ts done')
