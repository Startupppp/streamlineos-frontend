import React from "react";
import { render, screen } from "@testing-library/react";
import { ReceiptManager } from "./receipt-manager";
import { MEDIA_IMAGE_ROUTE } from "@/lib/utils";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    unoptimized: _unoptimized,
    ...rest
  }: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ""} {...rest} />
  ),
}));

jest.mock("@animateicons/react/lucide", () => ({
  XIcon: () => <svg aria-hidden="true" />,
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({ "aria-label": ariaLabel }: { "aria-label"?: string }) => (
    <button type="button" aria-label={ariaLabel} />
  ),
}));

const ORG = "3f2a9c14-5b7e-4d81-9a02-6c8e1f4b7d33";
const RECEIPT_KEY = `${ORG}/receipts/9b1c2d3e-4f50-4a61-8b72-0c9d8e7f6a5b-lunch.png`;
/**
 * The authorized image route is the app's own `/api/media/image`, not the
 * backend's `/storage/image`. A browser cannot put an `Authorization` header on
 * an `<img src>`, so the proxy attaches the session's backend JWT server-side
 * and re-checks authorization per request; pointing the tag straight at the
 * backend would 401. This spec asserted the upstream URL and was stale.
 */

function noop() {}

describe("ReceiptManager — a storage key never reaches an image src raw", () => {
  it("resolves the persisted receipt key through the authorized image route", () => {
    render(
      <ReceiptManager
        existingReceipts={[{ url: RECEIPT_KEY, fileName: "lunch.png" }]}
        pendingReceipts={[]}
        onAddPending={noop}
        onRemoveExisting={noop}
        onRemovePending={noop}
      />,
    );

    const img = screen.getByAltText("lunch.png");
    expect(img).toHaveAttribute(
      "src",
      `${MEDIA_IMAGE_ROUTE}?key=${encodeURIComponent(RECEIPT_KEY)}`,
    );
    expect(img.getAttribute("src")).not.toBe(RECEIPT_KEY);
  });

  it("leaves a legacy absolute receipt URL untouched", () => {
    render(
      <ReceiptManager
        existingReceipts={[{ url: "https://cdn.example.com/old.png", fileName: "old.png" }]}
        pendingReceipts={[]}
        onAddPending={noop}
        onRemoveExisting={noop}
        onRemovePending={noop}
      />,
    );

    expect(screen.getByAltText("old.png")).toHaveAttribute(
      "src",
      "https://cdn.example.com/old.png",
    );
  });
});
