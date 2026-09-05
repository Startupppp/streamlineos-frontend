import { redirect } from "next/navigation";

/**
 * T09 — `/inventory/pick-lists` is an alias, not a screen.
 *
 * `inventory.md:1358` says it in as many words: "Do not 404
 * `/inventory/pick-lists` if you keep picking under operations — then make
 * operations picking the pick-list surface and say so in nav." Picking *is* kept
 * under operations. The wave workbench at `/inventory/operations/picking` is
 * built, tested, linked from the operations hub and reached from the RF queue,
 * and standing a second pick-list screen beside it would be a second surface
 * over one queue — the thing the programme's own rules forbid.
 *
 * So this route redirects rather than renders. A page that existed only to say
 * "pick lists live over there" would be a dead end with a link on it; a redirect
 * takes a bookmarked or pasted URL from an older map of the module straight to
 * the screen that actually holds the reader's pick lists. The nav half of that
 * sentence is discharged in `sidebar-nav-groups-inventory.ts`, where Operations
 * now lists "Pick lists" pointing at the same route, so the name people search
 * for appears in the sidebar rather than only in a redirect nobody can see.
 *
 * `redirect`, not `permanentRedirect`: a 308 is cached by the browser
 * indefinitely, and if this alias ever does grow a screen of its own — a
 * cross-warehouse wave list, say — a permanent redirect would be impossible to
 * take back on every device that had followed it once.
 *
 * No `loading.tsx` sits beside this file, and the exemption is written down in
 * `inventory-route-states.test.ts`: a route whose whole body is `redirect()`
 * never renders, so a segment fallback here could only flash the skeleton of a
 * screen that does not exist.
 */
export default function PickListsAliasRoute(): never {
  redirect("/inventory/operations/picking");
}
