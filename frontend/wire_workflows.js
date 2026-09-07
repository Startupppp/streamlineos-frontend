const fs = require('fs');

const base = 'D:/projects/personal/Streamlineos/frontend/hooks/api/';

function addLazyImport(content, afterLine, lazy) {
  return content.replace(afterLine, afterLine + '\n' + lazy);
}

// workflows-definitions.ts
{
  let content = fs.readFileSync(base + 'workflows-definitions.ts', 'utf8');

  content = content.replace(
    'import { apiClient } from "@/lib/api-client";',
    'import { apiClient } from "@/lib/api-client";\nimport { lazyContract } from "@/lib/api-envelope";'
  );

  const lazy = `
const workflowListContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowListContract),
);
const workflowDetailContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowDetailContract),
);
const workflowCreateContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowCreateContract),
);
const workflowUpdateContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowUpdateContract),
);
const workflowPublishContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowPublishContract),
);
`;
  content = content.replace(
    'import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";',
    'import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";\n' + lazy
  );

  content = content.replace(
    'apiClient.get<WorkflowCursorPage<Workflow>>("/workflows", params as Record<string, unknown>, signal),',
    'apiClient.get<WorkflowCursorPage<Workflow>>("/workflows", params as Record<string, unknown>, signal, workflowListContract),'
  );
  content = content.replace(
    'apiClient.get<Workflow>(`/workflows/${workflowId}`, undefined, signal),',
    'apiClient.get<Workflow>(`/workflows/${workflowId}`, undefined, signal, workflowDetailContract),'
  );

  fs.writeFileSync(base + 'workflows-definitions.ts', content, 'utf8');
  console.log('wired workflows-definitions.ts');
}

// workflows-executions.ts
{
  let content = fs.readFileSync(base + 'workflows-executions.ts', 'utf8');

  content = content.replace(
    'import { apiClient } from "@/lib/api-client";',
    'import { apiClient } from "@/lib/api-client";\nimport { lazyContract } from "@/lib/api-envelope";'
  );

  const lazy = `
const workflowExecutionListContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowExecutionListContract),
);
const workflowExecutionTriggerContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowExecutionTriggerContract),
);
const workflowExecutionCancelContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowExecutionCancelContract),
);
`;
  content = content.replace(
    'import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";',
    'import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";\n' + lazy
  );

  content = content.replace(
    "return apiClient.post<WorkflowExecution>(`/workflows/${id}/trigger`, data);",
    "return apiClient.post<WorkflowExecution>(`/workflows/${id}/trigger`, data, undefined, workflowExecutionTriggerContract);"
  );

  fs.writeFileSync(base + 'workflows-executions.ts', content, 'utf8');
  console.log('wired workflows-executions.ts');
}

// workflows-schedules.ts
{
  let content = fs.readFileSync(base + 'workflows-schedules.ts', 'utf8');

  content = content.replace(
    'import { apiClient } from "@/lib/api-client";',
    'import { apiClient } from "@/lib/api-client";\nimport { lazyContract } from "@/lib/api-envelope";'
  );

  const lazy = `
const workflowScheduleListContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowScheduleListContract),
);
const workflowScheduleUpdateContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowScheduleUpdateContract),
);
`;
  content = content.replace(
    'import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";',
    'import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";\n' + lazy
  );

  fs.writeFileSync(base + 'workflows-schedules.ts', content, 'utf8');
  console.log('wired workflows-schedules.ts');
}

// workflows-approvals.ts
{
  let content = fs.readFileSync(base + 'workflows-approvals.ts', 'utf8');

  content = content.replace(
    'import { apiClient } from "@/lib/api-client";',
    'import { apiClient } from "@/lib/api-client";\nimport { lazyContract } from "@/lib/api-envelope";'
  );

  const lazy = `
const workflowPendingApprovalsContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowPendingApprovalsContract),
);
const workflowApprovalActionContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowApprovalActionContract),
);
`;
  content = content.replace(
    'import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";',
    'import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";\n' + lazy
  );

  content = content.replace(
    'apiClient.get<WorkflowApproval[]>("/workflows/approvals/pending", undefined, signal),',
    'apiClient.get<WorkflowApproval[]>("/workflows/approvals/pending", undefined, signal, workflowPendingApprovalsContract),'
  );
  content = content.replace(
    'return apiClient.post<WorkflowApproval>(`/workflows/approvals/${approvalId}/action`, input);',
    'return apiClient.post<WorkflowApproval>(`/workflows/approvals/${approvalId}/action`, input, undefined, workflowApprovalActionContract);'
  );

  fs.writeFileSync(base + 'workflows-approvals.ts', content, 'utf8');
  console.log('wired workflows-approvals.ts');
}

// workflows-secrets.ts
{
  let content = fs.readFileSync(base + 'workflows-secrets.ts', 'utf8');

  content = content.replace(
    'import { apiClient } from "@/lib/api-client";',
    'import { apiClient } from "@/lib/api-client";\nimport { lazyContract } from "@/lib/api-envelope";'
  );

  const lazy = `
const workflowSecretListContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowSecretListContract),
);
const workflowSecretCreateContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowSecretCreateContract),
);
`;
  content = content.replace(
    'import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";',
    'import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";\n' + lazy
  );

  content = content.replace(
    'return apiClient.post<WorkflowSecret>("/workflows/secrets", input);',
    'return apiClient.post<WorkflowSecret>("/workflows/secrets", input, undefined, workflowSecretCreateContract);'
  );

  fs.writeFileSync(base + 'workflows-secrets.ts', content, 'utf8');
  console.log('wired workflows-secrets.ts');
}

// workflows-variables.ts
{
  let content = fs.readFileSync(base + 'workflows-variables.ts', 'utf8');

  content = content.replace(
    'import { apiClient } from "@/lib/api-client";',
    'import { apiClient } from "@/lib/api-client";\nimport { lazyContract } from "@/lib/api-envelope";'
  );

  const lazy = `
const workflowVariableListContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowVariableListContract),
);
`;
  content = content.replace(
    'import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";',
    'import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";\n' + lazy
  );

  content = content.replace(
    'apiClient.get<WorkflowVariable[]>("/workflows/variables", undefined, signal),',
    'apiClient.get<WorkflowVariable[]>("/workflows/variables", undefined, signal, workflowVariableListContract),'
  );

  fs.writeFileSync(base + 'workflows-variables.ts', content, 'utf8');
  console.log('wired workflows-variables.ts');
}

// workflows-analytics.ts
{
  let content = fs.readFileSync(base + 'workflows-analytics.ts', 'utf8');

  content = content.replace(
    'import { apiClient } from "@/lib/api-client";',
    'import { apiClient } from "@/lib/api-client";\nimport { lazyContract } from "@/lib/api-envelope";'
  );

  const lazy = `
const workflowAnalyticsContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowAnalyticsContract),
);
const workflowTemplateListContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowTemplateListContract),
);
`;
  content = content.replace(
    'import { useCan } from "@/hooks/api/access";',
    'import { useCan } from "@/hooks/api/access";\n' + lazy
  );

  content = content.replace(
    'apiClient.get<WorkflowAnalytics>("/workflows/analytics", undefined, signal),',
    'apiClient.get<WorkflowAnalytics>("/workflows/analytics", undefined, signal, workflowAnalyticsContract),'
  );
  content = content.replace(
    'apiClient.get<WorkflowTemplate[]>("/workflows/templates", undefined, signal),',
    'apiClient.get<WorkflowTemplate[]>("/workflows/templates", undefined, signal, workflowTemplateListContract),'
  );

  fs.writeFileSync(base + 'workflows-analytics.ts', content, 'utf8');
  console.log('wired workflows-analytics.ts');
}

console.log('All workflow files wired.');
