export interface CalendarOfflineIntent {
  identity: string;
  start: string;
  end: string;
  policyVersion: number;
  createdAt: number;
}

export interface CalendarOfflineEditIntent extends CalendarOfflineIntent {
  sourceRecordId: string;
  occurrenceId: string;
  expectedSourceVersion: string;
  originalStart: string;
  originalEnd: string;
}
