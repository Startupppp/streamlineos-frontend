import React from "react";
import { render, screen } from "@testing-library/react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { ScrollArea } from "@/components/ui/scroll-area";
import { expectNoAxeViolations } from "@/test-utils";

describe("Table container is a focusable named region (scrollable-region-focusable)", () => {
  it("renders a region with tabIndex=0 so keyboard users can scroll", () => {
    const { container } = render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Alice</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const region = container.querySelector('[data-slot="table-container"]');
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toHaveAttribute("role", "region");
    expect(region).toHaveAttribute("aria-label");
  });

  it("accepts a custom containerAriaLabel", () => {
    const { container } = render(
      <Table containerAriaLabel="Members table">
        <TableBody>
          <TableRow>
            <TableCell>Bob</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const region = container.querySelector('[data-slot="table-container"]');
    expect(region).toHaveAttribute("aria-label", "Members table");
  });

  it("defaults to 'Table' when no containerAriaLabel is provided", () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Carol</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const region = container.querySelector('[data-slot="table-container"]');
    expect(region).toHaveAttribute("aria-label", "Table");
  });

  it("passes axe with a named scrollable container", async () => {
    const { container } = render(
      <Table containerAriaLabel="Employees">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Dave</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    await expectNoAxeViolations(container);
  });

  it("BITE — a scrollable container with no tabIndex and no accessible name fails axe", async () => {
    const { container } = render(
      <div className="overflow-x-auto" style={{ width: "100px" }}>
        <div style={{ width: "200px" }}>overflowing content</div>
      </div>,
    );
    const scroller = container.querySelector(".overflow-x-auto") as HTMLElement;
    expect(scroller).not.toBeNull();
    expect(scroller.getAttribute("tabindex")).toBeNull();
  });
});

function PageWrap({ title, children }: { title?: string; children?: React.ReactNode }) {
  return (
    <TooltipProvider>
      <PageWrapper title={title}>{children}</PageWrapper>
    </TooltipProvider>
  );
}

describe("PageWrapper scroll container is a focusable named region", () => {
  it("has tabIndex=0 on the scroll container", () => {
    const { container } = render(
      <PageWrap title="Invoices">
        <p>Body content</p>
      </PageWrap>,
    );
    const scrollers = container.querySelectorAll('[tabindex="0"]');
    expect(scrollers.length).toBeGreaterThan(0);
  });

  it("scroll container has role=region", () => {
    const { container } = render(
      <PageWrap title="Projects">
        <p>Body content</p>
      </PageWrap>,
    );
    const regions = container.querySelectorAll('[role="region"]');
    expect(regions.length).toBeGreaterThan(0);
  });

  it("names the scroll region via aria-labelledby pointing at the h1", () => {
    const { container } = render(
      <PageWrap title="Members">
        <p>Body content</p>
      </PageWrap>,
    );
    const h1 = container.querySelector("h1");
    const h1Id = h1?.getAttribute("id");
    expect(h1Id).toBeTruthy();
    const region = container.querySelector(`[aria-labelledby="${h1Id}"]`);
    expect(region).not.toBeNull();
  });

  it("uses aria-label fallback when no title is provided", () => {
    const { container } = render(
      <PageWrap>
        <p>Body content</p>
      </PageWrap>,
    );
    const region = container.querySelector('[role="region"][aria-label="Page content"]');
    expect(region).not.toBeNull();
  });

  it("passes axe when PageWrapper has a title", async () => {
    const { container } = render(
      <PageWrap title="Billing">
        <p>Body content</p>
      </PageWrap>,
    );
    await expectNoAxeViolations(container);
  });

  it("BITE — without role=region the scroll container is invisible to AT", () => {
    const { container } = render(<div tabIndex={0}>scrollable</div>);
    expect(container.querySelector('[role="region"]')).toBeNull();
  });
});

describe("CommandList scroll container is keyboard-accessible (scrollable-region-focusable)", () => {
  it("wraps CommandPrimitive.List in a div with tabIndex=0 so keyboard users can scroll", () => {
    const { container } = render(
      <Command>
        <CommandInput placeholder="Search…" />
        <CommandList>
          <CommandGroup>
            <CommandItem value="alpha">Alpha</CommandItem>
            <CommandItem value="beta">Beta</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    );
    const scroller = container.querySelector('[tabindex="0"]');
    expect(scroller).not.toBeNull();
  });

  it("passes axe with items present", async () => {
    const { container } = render(
      <Command>
        <CommandInput placeholder="Search…" />
        <CommandList>
          <CommandGroup>
            <CommandItem value="alice">Alice</CommandItem>
            <CommandItem value="bob">Bob</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    );
    await expectNoAxeViolations(container);
  });

  it("BITE — a scrollable div with tabIndex=-1 and no focusable children is not keyboard-accessible", () => {
    const { container } = render(
      <div className="overflow-y-auto max-h-52" tabIndex={-1}>
        <div>Item one</div>
        <div>Item two</div>
      </div>,
    );
    const scroller = container.querySelector('[tabindex="-1"]');
    expect(scroller).not.toBeNull();
    expect(scroller?.getAttribute("tabindex")).toBe("-1");
  });
});

describe("ScrollArea viewport is keyboard-reachable (scrollable-region-focusable)", () => {
  it("gives the viewport tabIndex=0 by default, so the focus-visible ring it already styles is reachable", () => {
    const { container } = render(
      <ScrollArea className="max-h-40">
        <p>Message one</p>
        <p>Message two</p>
      </ScrollArea>,
    );
    const viewport = container.querySelector('[data-slot="scroll-area-viewport"]');
    expect(viewport).not.toBeNull();
    expect(viewport).toHaveAttribute("tabindex", "0");
  });

  it("keeps the default when the caller passes only fill and hideScrollbar", () => {
    const { container } = render(
      <ScrollArea fill hideScrollbar>
        <p>Body</p>
      </ScrollArea>,
    );
    expect(
      container.querySelector('[data-slot="scroll-area-viewport"]'),
    ).toHaveAttribute("tabindex", "0");
  });

  it("lets a caller that owns its own focus order opt out with viewportTabIndex", () => {
    const { container } = render(
      <ScrollArea viewportTabIndex={-1}>
        <p>Body</p>
      </ScrollArea>,
    );
    expect(
      container.querySelector('[data-slot="scroll-area-viewport"]'),
    ).toHaveAttribute("tabindex", "-1");
  });

  it("passes axe with scrolling content", async () => {
    const { container } = render(
      <ScrollArea className="max-h-40">
        <p>Message one</p>
        <p>Message two</p>
      </ScrollArea>,
    );
    await expectNoAxeViolations(container);
  });

  it("BITE — the Radix viewport carries no tabIndex of its own, so the ring style alone left it unreachable", () => {
    const { container } = render(
      <ScrollAreaPrimitive.Root>
        <ScrollAreaPrimitive.Viewport data-slot="raw-viewport">
          <p>Body</p>
        </ScrollAreaPrimitive.Viewport>
      </ScrollAreaPrimitive.Root>,
    );
    const raw = container.querySelector('[data-slot="raw-viewport"]');
    expect(raw).not.toBeNull();
    expect(raw?.getAttribute("tabindex")).toBeNull();
  });
});
