import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FE = __dirname;

function updateFile(relPath, importBlock, patches) {
  const path = join(FE, relPath);
  let c = readFileSync(path, 'utf8');

  const lines = c.split('\n');
  let lastImportLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) lastImportLine = i;
  }

  if (lastImportLine >= 0) {
    while (
      lastImportLine + 1 < lines.length &&
      !lines[lastImportLine + 1].startsWith('import ') &&
      lines[lastImportLine + 1] !== '' &&
      !lines[lastImportLine + 1].startsWith('export') &&
      !lines[lastImportLine + 1].startsWith('const ') &&
      !lines[lastImportLine + 1].startsWith('function ') &&
      !lines[lastImportLine + 1].startsWith('interface ') &&
      !lines[lastImportLine + 1].startsWith('type ') &&
      !lines[lastImportLine + 1].startsWith('"use client"') &&
      !lines[lastImportLine + 1].startsWith('} from')
    ) {
      lastImportLine++;
    }
    lines.splice(lastImportLine + 1, 0, '', importBlock);
    c = lines.join('\n');
  }

  for (const [from, to] of patches) {
    if (c.includes(from)) {
      c = c.split(from).join(to);
    } else {
      console.log(`  WARNING: patch not found in ${relPath}: "${from.slice(0, 60)}"`);
    }
  }

  writeFileSync(path, c, 'utf8');
  console.log(`Updated ${relPath}`);
}

// automations.ts
updateFile('hooks/api/crm/automations.ts',
`import { lazyContract } from "@/lib/api-envelope";

const automationEventsLazy = lazyContract(() =>
  import("@/hooks/api/crm/automations-schema").then((m) => m.automationEventsListContract),
);
const automationActionsLazy = lazyContract(() =>
  import("@/hooks/api/crm/automations-schema").then((m) => m.automationActionsListContract),
);
const automationRulesLazy = lazyContract(() =>
  import("@/hooks/api/crm/automations-schema").then((m) => m.automationRulesListContract),
);
const automationRunsLazy = lazyContract(() =>
  import("@/hooks/api/crm/automations-schema").then((m) => m.automationRunsPageContract),
);`,
  [
    ['apiClient.get<{ events: CrmAutomationEvent[] }>("/crm/automation/events", undefined, signal)', 'apiClient.get<{ events: CrmAutomationEvent[] }>("/crm/automation/events", undefined, signal, automationEventsLazy)'],
    ['apiClient.get<{ rules: CrmAutomationRule[] }>("/crm/automations", undefined, signal)', 'apiClient.get<{ rules: CrmAutomationRule[] }>("/crm/automations", undefined, signal, automationRulesLazy)'],
  ]
);

// autonomy.ts
updateFile('hooks/api/crm/autonomy.ts',
`import { lazyContract } from "@/lib/api-envelope";

const decisionsPageLazy = lazyContract(() =>
  import("@/hooks/api/crm/autonomy-schema").then((m) => m.decisionsPageContract),
);
const switchesLazy = lazyContract(() =>
  import("@/hooks/api/crm/autonomy-schema").then((m) => m.switchesContract),
);
const scoreboardLazy = lazyContract(() =>
  import("@/hooks/api/crm/autonomy-schema").then((m) => m.scoreboardContract),
);
const reviewQueueLazy = lazyContract(() =>
  import("@/hooks/api/crm/autonomy-schema").then((m) => m.reviewQueueContract),
);
const autonomySettingsLazy = lazyContract(() =>
  import("@/hooks/api/crm/autonomy-schema").then((m) => m.autonomySettingsContract),
);
const liveHoldsLazy = lazyContract(() =>
  import("@/hooks/api/crm/autonomy-schema").then((m) => m.liveHoldsContract),
);`,
  [
    ['apiClient.get<SwitchesResponse>("/crm/autonomy/switches", undefined, signal)', 'apiClient.get<SwitchesResponse>("/crm/autonomy/switches", undefined, signal, switchesLazy)'],
    ['apiClient.get<ReviewQueueItem[]>("/crm/autonomy/review-queue", undefined, signal)', 'apiClient.get<ReviewQueueItem[]>("/crm/autonomy/review-queue", undefined, signal, reviewQueueLazy)'],
    ['apiClient.get<AutonomySettings>("/crm/autonomy/settings", undefined, signal)', 'apiClient.get<AutonomySettings>("/crm/autonomy/settings", undefined, signal, autonomySettingsLazy)'],
    ['apiClient.get<LiveHold[]>("/crm/autonomy/holds", undefined, signal)', 'apiClient.get<LiveHold[]>("/crm/autonomy/holds", undefined, signal, liveHoldsLazy)'],
  ]
);

// campaigns.ts
updateFile('hooks/api/crm/campaigns.ts',
`import { lazyContract } from "@/lib/api-envelope";

const campaignsListLazy = lazyContract(() =>
  import("@/hooks/api/crm/campaigns-schema").then((m) => m.campaignsListContract),
);
const campaignRoiLazy = lazyContract(() =>
  import("@/hooks/api/crm/campaigns-schema").then((m) => m.campaignRoiContract),
);
const campaignLeadsLazy = lazyContract(() =>
  import("@/hooks/api/crm/campaigns-schema").then((m) => m.campaignLeadsContract),
);
const campaignAttributionLazy = lazyContract(() =>
  import("@/hooks/api/crm/campaigns-schema").then((m) => m.campaignAttributionListContract),
);`,
  [
    ['apiClient.get<PaginatedCampaigns>("/crm/campaigns", p, signal)', 'apiClient.get<PaginatedCampaigns>("/crm/campaigns", p, signal, campaignsListLazy)'],
    ['apiClient.get<CampaignRoi>(`/crm/campaigns/${campaignId}/roi`, undefined, signal)', 'apiClient.get<CampaignRoi>(`/crm/campaigns/${campaignId}/roi`, undefined, signal, campaignRoiLazy)'],
    ['apiClient.get<CampaignAttribution[]>("/crm/campaigns/attribution/first-touch", undefined, signal)', 'apiClient.get<CampaignAttribution[]>("/crm/campaigns/attribution/first-touch", undefined, signal, campaignAttributionLazy)'],
    ['apiClient.get<CampaignAttribution[]>("/crm/campaigns/attribution/last-touch", undefined, signal)', 'apiClient.get<CampaignAttribution[]>("/crm/campaigns/attribution/last-touch", undefined, signal, campaignAttributionLazy)'],
  ]
);

// clients.ts
updateFile('hooks/api/crm/clients.ts',
`import { lazyContract } from "@/lib/api-envelope";

const clientsListLazy = lazyContract(() =>
  import("@/hooks/api/crm/clients-schema").then((m) => m.clientAccountsListContract),
);
const clientDetailLazy = lazyContract(() =>
  import("@/hooks/api/crm/clients-schema").then((m) => m.clientAccountDetailContract),
);
const clientTimelineLazy = lazyContract(() =>
  import("@/hooks/api/crm/clients-schema").then((m) => m.clientTimelineContract),
);
const simpleClientsLazy = lazyContract(() =>
  import("@/hooks/api/crm/clients-schema").then((m) => m.simpleClientsListContract),
);
const clientOpportunitiesLazy = lazyContract(() =>
  import("@/hooks/api/crm/clients-schema").then((m) => m.clientOpportunitiesContract),
);
const onboardingItemsLazy = lazyContract(() =>
  import("@/hooks/api/crm/clients-schema").then((m) => m.onboardingItemsListContract),
);`,
  [
    ['apiClient.get<PaginatedClientAccounts>("/clients", filters as Record<string, unknown>, signal)', 'apiClient.get<PaginatedClientAccounts>("/clients", filters as Record<string, unknown>, signal, clientsListLazy)'],
    ['apiClient.get<ClientAccountWithActivities>(`/clients/${id}`, undefined, signal)', 'apiClient.get<ClientAccountWithActivities>(`/clients/${id}`, undefined, signal, clientDetailLazy)'],
    ['apiClient.get<{ events: ClientTimelineEvent[]; total: number }>(`/clients/${clientId}/timeline`, undefined, signal)', 'apiClient.get<{ events: ClientTimelineEvent[]; total: number }>(`/clients/${clientId}/timeline`, undefined, signal, clientTimelineLazy)'],
    ['apiClient.get<SimpleClient[]>("/clients/list", undefined, signal)', 'apiClient.get<SimpleClient[]>("/clients/list", undefined, signal, simpleClientsLazy)'],
    ['apiClient.get<OnboardingItem[]>("/clients/onboarding/items", { clientId }, signal)', 'apiClient.get<OnboardingItem[]>("/clients/onboarding/items", { clientId }, signal, onboardingItemsLazy)'],
  ]
);

// contacts.ts
updateFile('hooks/api/crm/contacts.ts',
`import { lazyContract } from "@/lib/api-envelope";

const contactListLazy = lazyContract(() =>
  import("@/hooks/api/crm/contacts-schema").then((m) => m.contactListContract),
);
const contactDetailLazy = lazyContract(() =>
  import("@/hooks/api/crm/contacts-schema").then((m) => m.contactDetailContract),
);
const contactRolesLazy = lazyContract(() =>
  import("@/hooks/api/crm/contacts-schema").then((m) => m.contactRolesListContract),
);
const duplicateContactsLazy = lazyContract(() =>
  import("@/hooks/api/crm/contacts-schema").then((m) => m.duplicateContactsContract),
);`,
  [
    ['apiClient.get<PaginatedContacts>("/contacts", filters, signal)', 'apiClient.get<PaginatedContacts>("/contacts", filters, signal, contactListLazy)'],
    ['apiClient.get<Contact>(`/contacts/${id}`, undefined, signal)', 'apiClient.get<Contact>(`/contacts/${id}`, undefined, signal, contactDetailLazy)'],
    ['apiClient.get<ContactRole[]>(`/contacts/${contactId}/roles`, params as Record<string, unknown>, signal)', 'apiClient.get<ContactRole[]>(`/contacts/${contactId}/roles`, params as Record<string, unknown>, signal, contactRolesLazy)'],
    ['apiClient.get<DuplicateContactPair[]>("/contacts/duplicates", params as Record<string, unknown>, signal)', 'apiClient.get<DuplicateContactPair[]>("/contacts/duplicates", params as Record<string, unknown>, signal, duplicateContactsLazy)'],
  ]
);

console.log('Done!');
