import re

FE = 'D:/projects/personal/Streamlineos/frontend'
bt = chr(96)
nl = chr(10)

path = FE + '/hooks/api/crm/deals.ts'
c = open(path, encoding='utf-8').read()

# --- 1. Inject import block after last import line ---
import_block = (
    'import { lazyContract } from "@/lib/api-envelope";' + nl + nl +
    'const dealLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealContract));' + nl +
    'const dealListLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealListContract));' + nl +
    'const dealStatsLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealStatsContract));' + nl +
    'const dealAgingLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealAgingContract));' + nl +
    'const dealForecastSnapshotsLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealForecastSnapshotsContract));' + nl +
    'const dealForecastSnapshotLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealForecastSnapshotContract));' + nl +
    'const dealWinLossLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealWinLossContract));' + nl +
    'const dealHealthLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealHealthContract));' + nl +
    'const dealApprovalLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealApprovalContract));' + nl +
    'const dealApprovalsListLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealApprovalsListContract));' + nl +
    'const dealStakeholdersListLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealStakeholdersListContract));' + nl +
    'const dealStakeholderLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealStakeholderContract));' + nl +
    'const dealCompetitorsListLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealCompetitorsListContract));' + nl +
    'const dealCompetitorLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealCompetitorContract));' + nl +
    'const dealMeetingsListLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealMeetingsListContract));' + nl +
    'const dealMeetingLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealMeetingContract));' + nl +
    'const dealActivityLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealActivityContract));' + nl +
    'const dealStageTransitionsLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealStageTransitionsContract));' + nl +
    'const dealUpdateResultLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealUpdateResultContract));' + nl +
    'const dealDeleteLazy = lazyContract(() => import("@/hooks/api/crm/deals-schema").then((m) => m.dealDeleteContract));'
)

lines = c.split(nl)
last = -1
for i, l in enumerate(lines):
    if l.startswith('import '):
        last = i
if last >= 0:
    lines.insert(last + 1, '')
    lines.insert(last + 1, import_block)
    c = nl.join(lines)

# --- 2. Apply patches ---
patches = [
    # GET list (line 74) — special: ends with .items
    (
        '(await apiClient.get<OffsetPage<Deal>>("/deals", filters as Record<string, unknown>, signal)).items,',
        '(await apiClient.get<OffsetPage<Deal>>("/deals", filters as Record<string, unknown>, signal, dealListLazy)).items,'
    ),
    # GET stats (line 82)
    (
        'apiClient.get<DealStats>("/deals/stats", undefined, signal),',
        'apiClient.get<DealStats>("/deals/stats", undefined, signal, dealStatsLazy),'
    ),
    # GET detail (line 90)
    (
        'apiClient.get<Deal>(' + bt + '/deals/${id}' + bt + ', undefined, signal),',
        'apiClient.get<Deal>(' + bt + '/deals/${id}' + bt + ', undefined, signal, dealLazy),'
    ),
    # POST create (line 100)
    (
        'mutationFn: (input: CreateDealInput) => apiClient.post<Deal>("/deals", input),',
        'mutationFn: (input: CreateDealInput) => apiClient.post<Deal>("/deals", input, undefined, dealLazy),'
    ),
    # PATCH update (line 114-115)
    (
        'mutationFn: ({ id, ...data }: UpdateDealInput) =>' + nl +
        '      apiClient.patch<Deal>(' + bt + '/deals/${id}' + bt + ', data),',
        'mutationFn: ({ id, ...data }: UpdateDealInput) =>' + nl +
        '      apiClient.patch<Deal>(' + bt + '/deals/${id}' + bt + ', data, undefined, dealLazy),'
    ),
    # PATCH updateStage (line 130-131) — complex type
    (
        'apiClient.patch<Deal | { approvalPending: true; approvalId: number }>(' + bt + '/deals/${id}' + bt + ', { stage, lostReason, version }),',
        'apiClient.patch<Deal | { approvalPending: true; approvalId: number }>(' + bt + '/deals/${id}' + bt + ', { stage, lostReason, version }, undefined, dealUpdateResultLazy),'
    ),
    # DELETE deal (line 162-163)
    (
        'mutationFn: (id: number) =>' + nl +
        '      apiClient.delete<{ success: boolean }>(' + bt + '/deals/${id}' + bt + '),',
        'mutationFn: (id: number) =>' + nl +
        '      apiClient.delete<{ success: boolean }>(' + bt + '/deals/${id}' + bt + ', undefined, undefined, dealDeleteLazy),'
    ),
    # POST clone (line 176-177)
    (
        'mutationFn: (id: number) =>' + nl +
        '      apiClient.post<Deal>(' + bt + '/deals/${id}/clone' + bt + ', {}),',
        'mutationFn: (id: number) =>' + nl +
        '      apiClient.post<Deal>(' + bt + '/deals/${id}/clone' + bt + ', {}, undefined, dealLazy),'
    ),
    # POST log activity (line 191-192)
    (
        'mutationFn: ({ dealId, ...data }: LogDealActivityInput) =>' + nl +
        '      apiClient.post<DealActivity>(' + bt + '/deals/${dealId}/activities' + bt + ', data),',
        'mutationFn: ({ dealId, ...data }: LogDealActivityInput) =>' + nl +
        '      apiClient.post<DealActivity>(' + bt + '/deals/${dealId}/activities' + bt + ', data, undefined, dealActivityLazy),'
    ),
    # GET meetings (line 202)
    (
        'apiClient.get<DealMeeting[]>(' + bt + '/deals/${dealId}/meetings' + bt + ', undefined, signal),',
        'apiClient.get<DealMeeting[]>(' + bt + '/deals/${dealId}/meetings' + bt + ', undefined, signal, dealMeetingsListLazy),'
    ),
    # POST create meeting (line 213-214)
    (
        'mutationFn: (input: CreateDealMeetingInput) =>' + nl +
        '      apiClient.post<DealMeeting>(' + bt + '/deals/${dealId}/meetings' + bt + ', input),',
        'mutationFn: (input: CreateDealMeetingInput) =>' + nl +
        '      apiClient.post<DealMeeting>(' + bt + '/deals/${dealId}/meetings' + bt + ', input, undefined, dealMeetingLazy),'
    ),
    # DELETE meeting (line 225-226)
    (
        'mutationFn: (meetingId: number) =>' + nl +
        '      apiClient.delete<{ success: boolean }>(' + bt + '/deals/${dealId}/meetings/${meetingId}' + bt + '),',
        'mutationFn: (meetingId: number) =>' + nl +
        '      apiClient.delete<{ success: boolean }>(' + bt + '/deals/${dealId}/meetings/${meetingId}' + bt + ', undefined, undefined, dealDeleteLazy),'
    ),
    # GET win-loss (line 235)
    (
        'apiClient.get<WinLossAnalysis>("/deals/win-loss", undefined, signal),',
        'apiClient.get<WinLossAnalysis>("/deals/win-loss", undefined, signal, dealWinLossLazy),'
    ),
    # GET approvals (line 243)
    (
        'apiClient.get<DealApproval[]>("/deals/approvals", params as Record<string, unknown>, signal),',
        'apiClient.get<DealApproval[]>("/deals/approvals", params as Record<string, unknown>, signal, dealApprovalsListLazy),'
    ),
    # GET aging (line 251)
    (
        'apiClient.get<AgingResponse>("/deals/aging", undefined, signal),',
        'apiClient.get<AgingResponse>("/deals/aging", undefined, signal, dealAgingLazy),'
    ),
    # POST resolve approval (line 262-263)
    (
        'mutationFn: (input: { approvalId: number; action: "approve" | "reject"; rejectionReason?: string }) =>' + nl +
        '      apiClient.post("/deals/approvals", input),',
        'mutationFn: (input: { approvalId: number; action: "approve" | "reject"; rejectionReason?: string }) =>' + nl +
        '      apiClient.post("/deals/approvals", input, undefined, dealApprovalLazy),'
    ),
    # GET forecast snapshots (line 273)
    (
        'apiClient.get<ForecastSnapshot[]>("/deals/forecast/snapshots", params as Record<string, unknown>, signal),',
        'apiClient.get<ForecastSnapshot[]>("/deals/forecast/snapshots", params as Record<string, unknown>, signal, dealForecastSnapshotsLazy),'
    ),
    # POST capture forecast snapshot (line 283-284)
    (
        'mutationFn: (input: CaptureForecastSnapshotInput) =>' + nl +
        '      apiClient.post<ForecastSnapshot>("/deals/forecast/snapshot", input),',
        'mutationFn: (input: CaptureForecastSnapshotInput) =>' + nl +
        '      apiClient.post<ForecastSnapshot>("/deals/forecast/snapshot", input, undefined, dealForecastSnapshotLazy),'
    ),
    # GET competitors (line 293)
    (
        'apiClient.get<DealCompetitor[]>(' + bt + '/deals/${dealId}/competitors' + bt + ', undefined, signal),',
        'apiClient.get<DealCompetitor[]>(' + bt + '/deals/${dealId}/competitors' + bt + ', undefined, signal, dealCompetitorsListLazy),'
    ),
    # POST add competitor (line 304-305)
    (
        'mutationFn: (input: CreateDealCompetitorInput) =>' + nl +
        '      apiClient.post<DealCompetitor>(' + bt + '/deals/${dealId}/competitors' + bt + ', input),',
        'mutationFn: (input: CreateDealCompetitorInput) =>' + nl +
        '      apiClient.post<DealCompetitor>(' + bt + '/deals/${dealId}/competitors' + bt + ', input, undefined, dealCompetitorLazy),'
    ),
    # DELETE competitor (line 316-317)
    (
        'mutationFn: (competitorId: string) =>' + nl +
        '      apiClient.delete<{ success: boolean }>(' + bt + '/deals/${dealId}/competitors/${competitorId}' + bt + '),',
        'mutationFn: (competitorId: string) =>' + nl +
        '      apiClient.delete<{ success: boolean }>(' + bt + '/deals/${dealId}/competitors/${competitorId}' + bt + ', undefined, undefined, dealDeleteLazy),'
    ),
    # GET health (line 326)
    (
        'apiClient.get<DealHealth>(' + bt + '/deals/${dealId}/health' + bt + ', undefined, signal),',
        'apiClient.get<DealHealth>(' + bt + '/deals/${dealId}/health' + bt + ', undefined, signal, dealHealthLazy),'
    ),
    # PATCH next step (line 338-339)
    (
        'mutationFn: (input: PatchNextStepInput) =>' + nl +
        '      apiClient.patch<Deal>(' + bt + '/deals/${dealId}' + bt + ', { nextStep: input.nextStep }),',
        'mutationFn: (input: PatchNextStepInput) =>' + nl +
        '      apiClient.patch<Deal>(' + bt + '/deals/${dealId}' + bt + ', { nextStep: input.nextStep }, undefined, dealLazy),'
    ),
    # GET stakeholders (line 348)
    (
        'apiClient.get<DealStakeholder[]>(' + bt + '/deals/${dealId}/stakeholders' + bt + ', undefined, signal),',
        'apiClient.get<DealStakeholder[]>(' + bt + '/deals/${dealId}/stakeholders' + bt + ', undefined, signal, dealStakeholdersListLazy),'
    ),
    # POST create stakeholder (line 358-359)
    (
        'mutationFn: (input: CreateStakeholderInput) =>' + nl +
        '      apiClient.post<DealStakeholder>(' + bt + '/deals/${dealId}/stakeholders' + bt + ', input),',
        'mutationFn: (input: CreateStakeholderInput) =>' + nl +
        '      apiClient.post<DealStakeholder>(' + bt + '/deals/${dealId}/stakeholders' + bt + ', input, undefined, dealStakeholderLazy),'
    ),
    # DELETE stakeholder (line 373-374)
    (
        'mutationFn: (stakeholderId: string) =>' + nl +
        '      apiClient.delete<{ deleted: boolean }>(' + bt + '/deals/${dealId}/stakeholders/${stakeholderId}' + bt + '),',
        'mutationFn: (stakeholderId: string) =>' + nl +
        '      apiClient.delete<{ deleted: boolean }>(' + bt + '/deals/${dealId}/stakeholders/${stakeholderId}' + bt + ', undefined, undefined, dealDeleteLazy),'
    ),
    # PATCH override forecast (line 398-399)
    (
        'mutationFn: ({ snapshotId, ...data }: OverrideForecastInput & { snapshotId: string }) =>' + nl +
        '      apiClient.patch<ForecastSnapshot>(' + bt + '/deals/forecast/${snapshotId}/override' + bt + ', data),',
        'mutationFn: ({ snapshotId, ...data }: OverrideForecastInput & { snapshotId: string }) =>' + nl +
        '      apiClient.patch<ForecastSnapshot>(' + bt + '/deals/forecast/${snapshotId}/override' + bt + ', data, undefined, dealForecastSnapshotLazy),'
    ),
    # GET transitions (line 416-417) — multiline
    (
        'apiClient.get<{ data: DealStageTransition[] }>(' + bt + '/deals/${dealId}/transitions' + bt + ', undefined, signal),',
        'apiClient.get<{ data: DealStageTransition[] }>(' + bt + '/deals/${dealId}/transitions' + bt + ', undefined, signal, dealStageTransitionsLazy),'
    ),
]

missed = []
for f, t in patches:
    if f in c:
        c = c.replace(f, t)
    else:
        missed.append(repr(f[:100]))

open(path, 'w', encoding='utf-8').write(c)

if missed:
    print('WARN — not found:')
    for m in missed:
        print(' ', m)
else:
    print('All 27 patches applied successfully')
