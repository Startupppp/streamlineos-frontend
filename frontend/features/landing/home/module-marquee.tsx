import { AREAS } from "./areas";

const MODULES = AREAS.flatMap((area) => area.apps);

/** Every module in one slow, endless strip. The second copy only completes the loop. */
export function ModuleMarquee() {
  return (
    <section aria-label="Modules in StreamlineOS" className="lp-marquee mt-16 border-y border-(--lp-rule) py-6 sm:mt-20">
      <div className="lp-marquee-track">
        {[0, 1].map((copy) => (
          <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 gap-14 pr-14">
            {MODULES.map((name) => (
              <li key={name} className="whitespace-nowrap text-base font-medium text-(--lp-dim)">
                {name}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
