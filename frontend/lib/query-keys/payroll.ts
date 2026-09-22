import { queryKeyBase as base, type QueryKeyParams } from "./base";

export const payrollQueryKeys = {
  payroll: {
    all: [...base, "payroll"] as const,
    templates: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "payroll", "templates"] as const)
        : ([...base, "payroll", "templates", params] as const),
    template: (templateId: number) =>
      [...base, "payroll", "template", templateId] as const,
    templatePreview: (templateId: number, annualCtc: string) =>
      [...base, "payroll", "template", templateId, "preview", annualCtc] as const,
    policy: () => [...base, "payroll", "policy"] as const,
    policyVersions: (policyId: number) =>
      [...base, "payroll", "policy", policyId, "versions"] as const,
    toggleImpact: (toggle: string) =>
      [...base, "payroll", "toggle-impact", toggle] as const,
    components: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "payroll", "components"] as const)
        : ([...base, "payroll", "components", params] as const),
    runApprovals: (runId: number) =>
      [...base, "payroll", "runs", runId, "approvals"] as const,
    bankValidation: (runId: number) =>
      [...base, "payroll", "runs", runId, "payout", "validation"] as const,
    // `payroll_runs.id` and `payroll_bank_batches.id` are independent sequences,
    // so run 1 -> batch 1 is the first payroll any org runs — and BatchesTable
    // (list, by run) and BatchDetailSheet (one batch) are mounted in the SAME
    // tree. Keying both on the bare id made those two hooks share one cache
    // entry with incompatible shapes. The discriminating segment is what keeps
    // them apart; `bankBatches()` with no argument stays the plain
    // payout/batches prefix so create-batch invalidation still sweeps both.
    bankBatches: (runId?: number) =>
      runId === undefined
        ? ([...base, "payroll", "payout", "batches"] as const)
        : ([...base, "payroll", "payout", "batches", "by-run", runId] as const),
    bankBatch: (batchId: number) =>
      [...base, "payroll", "payout", "batches", "detail", batchId] as const,
    employeeBank: (employeeUserId: string) =>
      [...base, "payroll", "employees", employeeUserId, "bank"] as const,
    payslipTemplates: () => [...base, "payroll", "payslip-templates"] as const,
    runPublications: (runId: number) =>
      [...base, "payroll", "runs", runId, "payslips"] as const,
    runs: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "payroll", "runs"] as const)
        : ([...base, "payroll", "runs", params] as const),
    run: (runId: number) => [...base, "payroll", "runs", runId] as const,
    reports: (kind: string, params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "payroll", "reports", kind] as const)
        : ([...base, "payroll", "reports", kind, params] as const),
    journal: (month: string) => [...base, "payroll", "journal", month] as const,
    journalBatchesAll: [...base, "payroll", "journal-batches"] as const,
    periodReconciliation: (periodKey: string) =>
      [...base, "payroll", "period-reconciliation", periodKey] as const,
    journalBatches: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "payroll", "journal-batches", "list"] as const)
        : ([...base, "payroll", "journal-batches", "list", params] as const),
    journalBatch: (batchId: number) =>
      [...base, "payroll", "journal-batches", batchId] as const,
    accountingMappings: () =>
      [...base, "payroll", "accounting-mappings"] as const,
    calendar: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "payroll", "calendar"] as const)
        : ([...base, "payroll", "calendar", params] as const),
    taxWindows: () => [...base, "payroll", "tax-windows"] as const,
    taxDeclarations: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "payroll", "tax-declarations"] as const)
        : ([...base, "payroll", "tax-declarations", params] as const),
    fnfAll: [...base, "payroll", "fnf"] as const,
    fnfList: () => [...base, "payroll", "fnf", "list"] as const,
    fnfSettlement: (settlementId: number) =>
      [...base, "payroll", "fnf", settlementId] as const,
    fnfStatement: (settlementId: number) =>
      [...base, "payroll", "fnf", settlementId, "statement"] as const,
    commandCenterAll: [...base, "payroll", "command-center"] as const,
    commandCenter: (month: string) =>
      [...base, "payroll", "command-center", month] as const,
    readiness: (month: string) => [...base, "payroll", "readiness", month] as const,
    employees: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "payroll", "employees", "list"] as const)
        : ([...base, "payroll", "employees", "list", params] as const),
    employee: (employeeUserId: string) =>
      [...base, "payroll", "employees", employeeUserId] as const,
    employeeHistory: (employeeUserId: string) =>
      [...base, "payroll", "employees", employeeUserId, "history"] as const,
    worker: (workerId: string) => [...base, "payroll", "workers", workerId] as const,
    runEmployeesAll: (runId: number) =>
      [...base, "payroll", "run-employees", runId] as const,
    runEmployeesList: (runId: number, params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "payroll", "run-employees", runId, "list"] as const)
        : ([...base, "payroll", "run-employees", runId, "list", params] as const),
    runEmployee: (runId: number, runEmployeeId: number) =>
      [...base, "payroll", "run-employees", runId, runEmployeeId] as const,
    runVariance: (runId: number) =>
      [...base, "payroll", "run-variance", runId] as const,
    runExceptionsAll: (runId: number) =>
      [...base, "payroll", "run-exceptions", runId] as const,
    runExceptions: (runId: number, params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "payroll", "run-exceptions", runId, "list"] as const)
        : ([...base, "payroll", "run-exceptions", runId, "list", params] as const),
    runInputsAll: (runId: number) =>
      [...base, "payroll", "run-inputs", runId] as const,
    runInputs: (runId: number, params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "payroll", "run-inputs", runId, "list"] as const)
        : ([...base, "payroll", "run-inputs", runId, "list", params] as const),
    calendarAll: [...base, "payroll", "calendar"] as const,
    taxDeclarationsAll: [...base, "payroll", "tax-declarations"] as const,
    entitiesAll: [...base, "payroll", "entities"] as const,
    entityCountryPacks: () =>
      [...base, "payroll", "entities", "country-packs"] as const,
    entityContext: (entityId: number) =>
      [...base, "payroll", "entities", entityId, "context"] as const,
    filingsAll: [...base, "payroll", "filings"] as const,
    filingCapabilities: () =>
      [...base, "payroll", "filings", "capabilities"] as const,
    filingExportJob: (jobId: number) =>
      [...base, "payroll", "filings", "export-jobs", jobId] as const,
    loansAdmin: () => [...base, "payroll", "loans-admin"] as const,
    bonuses: () => [...base, "payroll", "bonuses"] as const,
    incentivesAll: [...base, "payroll", "incentives"] as const,
    incentives: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "payroll", "incentives", "list"] as const)
        : ([...base, "payroll", "incentives", "list", params] as const),
    essAll: [...base, "payroll", "ess"] as const,
    essOverview: () => [...base, "payroll", "ess", "overview"] as const,
    essPayslips: () => [...base, "payroll", "ess", "payslips"] as const,
    essSalaryStructure: () =>
      [...base, "payroll", "ess", "salary-structure"] as const,
    essReimbursements: () =>
      [...base, "payroll", "ess", "reimbursements"] as const,
    essLoans: () => [...base, "payroll", "ess", "loans"] as const,
    essTaxDeclaration: () =>
      [...base, "payroll", "ess", "tax-declaration"] as const,
    essBank: () => [...base, "payroll", "ess", "bank"] as const,
    essFnf: () => [...base, "payroll", "ess", "fnf"] as const,
    essTotalRewards: () =>
      [...base, "payroll", "ess", "total-rewards"] as const,
    managerInbox: () => [...base, "payroll", "manager", "inbox"] as const,
    teamRewards: () => [...base, "payroll", "manager", "team-rewards"] as const,
    orgPayCompression: () =>
      [...base, "payroll", "analytics", "pay-compression"] as const,
  },

  hrPayrollInputs: {
    all: [...base, "hr-payroll-inputs"] as const,
    periods: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr-payroll-inputs", "periods"] as const)
        : ([...base, "hr-payroll-inputs", "periods", params] as const),
    period: (periodId: number) =>
      [...base, "hr-payroll-inputs", "periods", periodId] as const,
    section: (periodId: number, section: string, params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr-payroll-inputs", "periods", periodId, section] as const)
        : ([...base, "hr-payroll-inputs", "periods", periodId, section, params] as const),
    adjustments: (periodId: number, params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "hr-payroll-inputs", "periods", periodId, "adjustments"] as const)
        : ([...base, "hr-payroll-inputs", "periods", periodId, "adjustments", params] as const),
  },

} as const;
