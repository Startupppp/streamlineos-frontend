import { render, screen } from "@testing-library/react"
import { QuickCreatePanel } from "./quick-create-button"

jest.mock("next/link", () => {
  return function Link({
    children,
    href,
    ...props
  }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }
})

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({
    children,
    fill = false,
    className,
    ...props
  }: React.PropsWithChildren<
    { fill?: boolean; className?: string } & React.HTMLAttributes<HTMLDivElement>
  >) => (
    <div {...props} data-fill={String(fill)} className={className}>
      {children}
    </div>
  ),
}))

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}))

jest.mock("@/hooks/api/access/org-modules", () => ({
  useEnabledModules: () => [],
}))

jest.mock("@/features/command-palette/hooks/use-command-palette", () => ({
  useCommandPalette: () => ({ openCreateTicket: jest.fn() }),
}))

describe("QuickCreatePanel", () => {
  it("uses its parent drawer's bounded flex space for one scrollport", () => {
    render(
      <QuickCreatePanel
        groups={[]}
        onCreateIssue={jest.fn()}
        onNavigate={jest.fn()}
      />,
    )

    const scrollport = screen.getByTestId("quick-create-scrollport")

    expect(scrollport).toHaveAttribute("data-fill", "false")
    expect(scrollport).toHaveClass("min-h-0", "flex-1")
  })
})
