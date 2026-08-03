/**
 * Lightweight client store for HRMS UI state.
 * Survives route changes within the HR module without a third-party store lib.
 * Prefer React Query for server data; use this for UI/session state only.
 */

export type HrDirectoryView = "grid" | "list";
export type HrDirectoryStatusFilter = "all" | "active" | "inactive";

export interface HrDirectoryFilters {
  search: string;
  departmentId: string; // "all" | id string
  status: HrDirectoryStatusFilter;
  role: string; // "all" | role slug
}

export type BulkImportRowStatus = "ready" | "error" | "duplicate_file" | "duplicate_org";

export interface BulkImportPreviewRow {
  row: number;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
  department: string;
  status: BulkImportRowStatus;
  errors: string[];
}

export interface BulkImportSession {
  fileName: string;
  uploadedAt: string;
  previewRows: BulkImportPreviewRow[];
  readyCount: number;
  errorCount: number;
  duplicateCount: number;
}

export interface HrUiState {
  directoryView: HrDirectoryView;
  directoryFilters: HrDirectoryFilters;
  bulkImport: BulkImportSession | null;
  /** Last visited HR path for back-navigation affordances */
  lastPath: string | null;
}

const DEFAULT_DIRECTORY_FILTERS: HrDirectoryFilters = {
  search: "",
  departmentId: "all",
  status: "active",
  role: "all",
};

const initialState: HrUiState = {
  directoryView: "grid",
  directoryFilters: { ...DEFAULT_DIRECTORY_FILTERS },
  bulkImport: null,
  lastPath: null,
};

type Listener = () => void;

let state: HrUiState = initialState;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

function setState(partial: Partial<HrUiState> | ((prev: HrUiState) => HrUiState)) {
  state = typeof partial === "function" ? partial(state) : { ...state, ...partial };
  emit();
}

export const hrStore = {
  getState: (): HrUiState => state,

  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setDirectoryView: (view: HrDirectoryView) => {
    setState({ directoryView: view });
  },

  setDirectoryFilters: (filters: Partial<HrDirectoryFilters>) => {
    setState((prev) => ({
      ...prev,
      directoryFilters: { ...prev.directoryFilters, ...filters },
    }));
  },

  resetDirectoryFilters: () => {
    setState({ directoryFilters: { ...DEFAULT_DIRECTORY_FILTERS } });
  },

  setBulkImportSession: (session: BulkImportSession | null) => {
    setState({ bulkImport: session });
  },

  clearBulkImportSession: () => {
    setState({ bulkImport: null });
  },

  setLastPath: (path: string | null) => {
    setState({ lastPath: path });
  },

  /** Full reset (e.g. workspace switch) */
  reset: () => {
    state = {
      directoryView: "grid",
      directoryFilters: { ...DEFAULT_DIRECTORY_FILTERS },
      bulkImport: null,
      lastPath: null,
    };
    emit();
  },
};
