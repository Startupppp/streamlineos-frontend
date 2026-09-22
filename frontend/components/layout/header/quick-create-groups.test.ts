import { QUICK_CREATE_GROUPS, orderGroupsForProduct } from "./quick-create-groups"

describe("the Create menu leads with the product the viewer is in", () => {
  it("moves the People group first inside HR and keeps the rest in catalogue order", () => {
    const ordered = orderGroupsForProduct(QUICK_CREATE_GROUPS, "hrms").map((group) => group.id)
    expect(ordered).toEqual(["people", "comms", "work", "crm", "docs"])
  })

  it("keeps the catalogue order on a product no group claims", () => {
    const ordered = orderGroupsForProduct(QUICK_CREATE_GROUPS, "workflows").map((group) => group.id)
    expect(ordered).toEqual(QUICK_CREATE_GROUPS.map((group) => group.id))
  })

  it("claims every product at most once so the lead group is unambiguous", () => {
    const seen = new Map<string, string>()
    for (const group of QUICK_CREATE_GROUPS)
      for (const product of group.products) {
        expect(seen.get(product)).toBeUndefined()
        seen.set(product, group.id)
      }
  })
})
