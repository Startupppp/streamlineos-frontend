/**
 * HRMS-E2E-012b. The Settings Expenses card pointed at `GET /hr/expenses/export`,
 * a route that has never existed — the backend serves expenses through a job:
 * `POST /hr/expenses/export/jobs`, poll, download. The browser answered
 * "Cannot GET /hr/expenses/export", so the card read as broken rather than as
 * unavailable, and the real contract was only implemented on the module's own
 * page.
 *
 * These assertions pin the job contract Settings and the page now share.
 */
import {
  ExportJobFailedError,
  ExportJobTimeoutError,
  downloadExportJob,
} from "./download-export-job";

const post = jest.fn();
const get = jest.fn();
jest.mock("@/lib/api-client", () => ({
  apiClient: {
    post: (...args: unknown[]) => post(...args),
    get: (...args: unknown[]) => get(...args),
    download: jest.fn(),
  },
}));

const downloadExport = jest.fn();
jest.mock("@/lib/download-export", () => ({
  downloadExport: (...args: unknown[]) => downloadExport(...args),
}));

const routes = {
  create: "/hr/expenses/export/jobs",
  status: (jobId: string) => `/hr/expenses/export/jobs/${jobId}`,
  download: (jobId: string) => `/hr/expenses/export/jobs/${jobId}/download`,
};

const base = {
  label: "Expenses",
  fallbackName: "expenses-export.csv",
  routes,
  idempotencyKey: "key-1",
  wait: async () => undefined,
};

beforeEach(() => {
  post.mockReset();
  get.mockReset();
  downloadExport.mockReset();
  downloadExport.mockResolvedValue({ filename: "expenses.csv", bytes: 120 });
});

describe("downloadExportJob", () => {
  it("creates the job at the job route, never at a bare export path", async () => {
    post.mockResolvedValue({ id: "job-1", status: "completed" });

    await downloadExportJob(base);

    expect(post).toHaveBeenCalledWith(
      "/hr/expenses/export/jobs",
      {},
      expect.objectContaining({ headers: expect.objectContaining({ "Idempotency-Key": "key-1" }) }),
    );
  });

  it("polls until the job leaves pending, then downloads it", async () => {
    post.mockResolvedValue({ id: "job-7", status: "pending" });
    get
      .mockResolvedValueOnce({ id: "job-7", status: "running" })
      .mockResolvedValueOnce({ id: "job-7", status: "completed" });

    const result = await downloadExportJob(base);

    expect(get).toHaveBeenCalledTimes(2);
    expect(downloadExport).toHaveBeenCalledWith(
      "/hr/expenses/export/jobs/job-7/download",
      expect.objectContaining({ label: "Expenses" }),
    );
    expect(result.filename).toBe("expenses.csv");
  });

  it("downloads immediately when the job is already complete", async () => {
    post.mockResolvedValue({ id: "job-2", status: "completed" });

    await downloadExportJob(base);

    expect(get).not.toHaveBeenCalled();
    expect(downloadExport).toHaveBeenCalledTimes(1);
  });

  it("raises the server's reason when the job fails, and saves nothing", async () => {
    post.mockResolvedValue({ id: "job-3", status: "pending" });
    // The backend's job view carries `errorCode` / `errorMessage` (expenseExportJobViewSchema), never `error`.
    get.mockResolvedValue({ id: "job-3", status: "failed", errorCode: "EMPTY", errorMessage: "No expenses in range" });

    await expect(downloadExportJob(base)).rejects.toBeInstanceOf(ExportJobFailedError);
    await expect(downloadExportJob(base)).rejects.toThrow(/No expenses in range/);
    expect(downloadExport).not.toHaveBeenCalled();
  });

  it("stops at an expired job and says so, instead of polling until the timeout", async () => {
    post.mockResolvedValue({ id: "job-6", status: "pending" });
    get.mockResolvedValue({ id: "job-6", status: "expired", errorCode: null, errorMessage: null });

    let polls = 0;
    const wait = () => {
      polls += 1;
      return Promise.resolve();
    };
    let clock = 0;
    await expect(
      downloadExportJob({ ...base, wait, now: () => (clock += 10_000) }),
    ).rejects.toThrow(/expired/);
    expect(polls).toBe(1);
    expect(downloadExport).not.toHaveBeenCalled();
  });

  it("gives up rather than polling forever, and says the job is still running", async () => {
    post.mockResolvedValue({ id: "job-4", status: "pending" });
    get.mockResolvedValue({ id: "job-4", status: "running" });

    let clock = 0;
    await expect(
      downloadExportJob({ ...base, now: () => (clock += 60_000) }),
    ).rejects.toBeInstanceOf(ExportJobTimeoutError);
    expect(downloadExport).not.toHaveBeenCalled();
  });

  it("passes the caller's filters to the job", async () => {
    post.mockResolvedValue({ id: "job-5", status: "completed" });

    await downloadExportJob({ ...base, body: { startDate: "2026-09-01" } });

    expect(post).toHaveBeenCalledWith(
      "/hr/expenses/export/jobs",
      { startDate: "2026-09-01" },
      expect.anything(),
    );
  });
});
