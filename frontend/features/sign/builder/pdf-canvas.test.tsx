import { render, waitFor } from "@testing-library/react";
import { PdfCanvas } from "./pdf-canvas";

class MockRenderingCancelled extends Error {}

const tasks: { cancel: jest.Mock; settle: () => void; started: number }[] = [];
let busyCanvasRenders = 0;
let overlappingRenders = 0;

function makeTask() {
  let resolve: () => void = () => undefined;
  let reject: (e: Error) => void = () => undefined;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  }).finally(() => {
    busyCanvasRenders -= 1;
  });
  busyCanvasRenders += 1;
  if (busyCanvasRenders > 1) overlappingRenders += 1;
  const task = {
    promise,
    cancel: jest.fn(() => reject(new MockRenderingCancelled("cancelled"))),
    settle: () => resolve(),
    started: tasks.length,
  };
  tasks.push(task);
  return task;
}

jest.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {},
  get RenderingCancelledException() { return MockRenderingCancelled; },
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 2,
      getPage: async () => ({
        getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale }),
        render: () => makeTask(),
      }),
    }),
  }),
}));

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({})) as never;
});

beforeEach(() => {
  tasks.length = 0;
  busyCanvasRenders = 0;
  overlappingRenders = 0;
});

describe("the PDF page canvas never runs two renders at once", () => {
  it("cancels the page being drawn and waits for it before drawing the next page", async () => {
    const { rerender } = render(<PdfCanvas fileUrl="https://files.test/a.pdf" pageNumber={1} />);
    await waitFor(() => expect(tasks).toHaveLength(1));

    rerender(<PdfCanvas fileUrl="https://files.test/a.pdf" pageNumber={2} />);

    await waitFor(() => expect(tasks[0].cancel).toHaveBeenCalled());
    await waitFor(() => expect(tasks).toHaveLength(2));
    tasks[1].settle();
    expect(overlappingRenders).toBe(0);
  });

  it("does not leave an unhandled rejection when a render is cancelled", async () => {
    const unhandled = jest.fn();
    process.on("unhandledRejection", unhandled);
    const { rerender } = render(<PdfCanvas fileUrl="https://files.test/a.pdf" pageNumber={1} />);
    await waitFor(() => expect(tasks).toHaveLength(1));

    rerender(<PdfCanvas fileUrl="https://files.test/a.pdf" pageNumber={2} />);
    await waitFor(() => expect(tasks).toHaveLength(2));
    tasks[1].settle();
    await new Promise((r) => setTimeout(r, 0));

    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
});
