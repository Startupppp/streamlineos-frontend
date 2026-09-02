# 26 — Fix the six breached Web Vitals budgets on a production build

**What to build:** A production-mode capture currently breaches six of its own budgets: mobile INP, FCP and TTFB, and desktop LCP, FCP and TTFB. These are the project's own budgets measured the project's own way, so they are real. Close them and re-measure.

**Blocked by:** 25 — route composition drives most of these numbers, so measuring before the thinning lands wastes the run.

**Status:** ready-for-agent

- [ ] LCP, INP and CLS meet their targets on production builds for in-scope authenticated routes at the defined reference viewport and device profile.
- [ ] The six currently breached metrics are each brought inside budget, or an exception is recorded with a named owner and a concrete reason.
- [ ] The capture is a real production build at the stated repetition count, not a development-mode run.
- [ ] Localhost TTFB variance is acknowledged in the evidence rather than used to dismiss the breach.
- [ ] Navigation, skeleton, optimistic or queued feedback appears within the perceived-responsiveness target of user intent; no action looks unresponsive while work runs.
- [ ] Route-level JavaScript, CSS, server payload, image/font and third-party budgets are recorded and met.
- [ ] Public landing visuals and animations remain unchanged; if a frozen landing animation prevents an agreed target, that is escalated rather than worked around.
