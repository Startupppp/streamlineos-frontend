# 02 — The Build product's sidebar heading says "Build"

**What to build:** The heading users read above Build's navigation matches the product they opened.

Root `CLAUDE.md` §8 renamed the delivery module to **Build**. The product tile says "Build" and the route is `/build`, but the sidebar heading above its routes still reads "Product Management" — the pre-rename name. It could not be changed before ticket 01, because the heading string was how the group found its product: renaming it removed Build's main group from Build's sidebar.

After ticket 01 the heading is free text. This ticket spends that freedom.

**Blocked by:** 01 — A nav group declares its product.

**Status:** ready-for-agent

- [ ] Build's primary group heading reads "Build".
- [ ] The secondary group heading ("More") is reviewed in the same pass and given a name that says what it contains, or left alone with the reason recorded.
- [ ] Nothing outside the heading string changes — no href, no permission, no product assignment.
- [ ] No remaining nav heading names a module by a retired name. Check the rest while you are here: `project` ≠ `product` ≠ Build (root §8).
- [ ] The reachability test from ticket 01 passes unchanged, proving the rename cannot move a group between products any more. That is the point of doing this ticket second.
- [ ] Verified by running the app at 375, 768 and 1280 pixels: the heading renders, is not clipped, and Build's routes are all still under it.
