import { queryKeyBase as base, type QueryKeyParams } from "./base";

export const employeeSupportQueryKeys = {
  employeeSupport: {
    all: [...base, "employee-support"] as const,
    queueList: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "employee-support", "queue-list"] as const)
        : ([...base, "employee-support", "queue-list", params] as const),
    queueTicket: (ticketId: number) => [...base, "employee-support", "queue-ticket", ticketId] as const,
    queues: () => [...base, "employee-support", "queues"] as const,
    routing: () => [...base, "employee-support", "routing"] as const,
    myRequests: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "employee-support", "my-requests"] as const)
        : ([...base, "employee-support", "my-requests", params] as const),
    myRequest: (ticketId: number) => [...base, "employee-support", "my-request", ticketId] as const,
    suggest: (query: string) => [...base, "employee-support", "suggest", query] as const,
  },
} as const;
