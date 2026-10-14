import { render, renderHook, screen } from "@testing-library/react"
import { QuickCreatePanel, useQuickCreateGroups } from "./quick-create-button"

let granted: (key: string) => boolean = () => true
let enabledModules: string[] = []

jest.mock("next/navigation", () => ({ usePathname: () => "/payroll" }))
jest.mock("@/features/mail/mail-compose-provider", () => ({
  useGlobalMailComposer: () => ({ openCompose: jest.fn() }),
}))

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
  useCan: (key: string) => granted(key),
}))

jest.mock("@/hooks/api/access/org-modules", () => ({
  useEnabledModules: () => enabledModules,
}))

jest.mock("@/components/command-palette/hooks/use-command-palette", () => ({
  useCommandPalette: () => ({ openCreateTicket: jest.fn() }),
}))

describe("QuickCreatePanel", () => {
  it("uses its parent drawer's bounded flex space for one scrollport", () => {
    render(
      <QuickCreatePanel
        groups={[]}
        onCreateIssue={jest.fn()}
        onComposeMail={jest.fn()}
        onNavigate={jest.fn()}
      />,
    )

    const scrollport = screen.getByTestId("quick-create-scrollport")

    expect(scrollport).toHaveAttribute("data-fill", "false")
    expect(scrollport).toHaveClass("min-h-0", "flex-1")
  })
})

/** QA 2026-10-13 [P3]: the global Create menu had no payroll entries. */
describe("the Create menu's Payroll group", () => {
  afterEach(() => {
    granted = () => true
    enabledModules = []
  })

  function payrollItems() {
    const { result } = renderHook(() => useQuickCreateGroups())
    return result.current.find((group) => group.id === "payroll")?.items.map((item) => item.id) ?? []
  }

  it("leads the menu inside Payroll with run, bonus and expense-claim shortcuts", () => {
    enabledModules = ["PAYROLL"]
    const { result } = renderHook(() => useQuickCreateGroups())
    expect(result.current[0]?.id).toBe("payroll")
    expect(payrollItems()).toEqual(["payroll-run", "add-bonus", "expense-claim"])
  })

  it("drops each shortcut whose destination permission the viewer lacks", () => {
    enabledModules = ["PAYROLL"]
    granted = (key) => key === "hr:payroll:view"
    expect(payrollItems()).toEqual(["expense-claim"])
  })

  it("hides the group when the Payroll module is off", () => {
    expect(payrollItems()).toEqual([])
  })
})

