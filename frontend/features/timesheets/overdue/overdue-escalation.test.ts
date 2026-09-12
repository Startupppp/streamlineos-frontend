import {
  describeEscalation,
  escalationLabel,
  escalationTone,
} from "./overdue-escalation";

/**
 * The whole point of this module is that `escalationLevel: 0` means two
 * opposite things, so that is what most of these assert.
 */
describe("describeEscalation", () => {
  it("reports an organisation with no thresholds as unconfigured, not as level zero", () => {
    const state = describeEscalation({ daysOverdue: 40, escalationLevel: 0 }, []);

    expect(state).toEqual({ kind: "unconfigured" });
    expect(escalationLabel(state)).toBe("No reminders configured");
    /*
     * Neutral, deliberately. Forty days late with nothing watching is bad, but
     * the badge describes the reminder system, and colouring "nobody has been
     * told" the same red as "three reminders have gone unanswered" would say
     * the system is escalating when it is switched off. The days-late column
     * carries the urgency.
     */
    expect(escalationTone(state)).toBe("neutral");
  });

  it("distinguishes a period that has passed no threshold from one with none to pass", () => {
    const unconfigured = describeEscalation({ daysOverdue: 3, escalationLevel: 0 }, []);
    const notYet = describeEscalation({ daysOverdue: 3, escalationLevel: 0 }, [7, 14]);

    expect(unconfigured.kind).toBe("unconfigured");
    expect(notYet).toEqual({
      kind: "within-thresholds",
      nextAt: 7,
      daysUntilNext: 4,
    });
    expect(escalationLabel(notYet)).toBe("First reminder in 4d");
  });

  it("says a reminder is due rather than showing a negative countdown", () => {
    const state = describeEscalation({ daysOverdue: 9, escalationLevel: 0 }, [7, 14]);

    expect(state).toEqual({ kind: "within-thresholds", nextAt: 7, daysUntilNext: 0 });
    expect(escalationLabel(state)).toBe("First reminder due");
  });

  it("names the level against the number configured, so 1 of 4 does not read like 1 of 1", () => {
    const state = describeEscalation({ daysOverdue: 8, escalationLevel: 1 }, [7, 14, 21, 30]);

    expect(state).toEqual({ kind: "escalated", level: 1, of: 4, passedAt: 7 });
    expect(escalationLabel(state)).toBe("Escalation 1 of 4");
    expect(escalationTone(state)).toBe("danger");
  });

  it("sorts the thresholds before reading them, because the API's order is not a contract", () => {
    const state = describeEscalation({ daysOverdue: 30, escalationLevel: 2 }, [21, 7, 14]);

    expect(state).toEqual({ kind: "escalated", level: 2, of: 3, passedAt: 14 });
  });

  it("clamps a level that outruns the thresholds it was counted against", () => {
    /*
     * A real sequence, not a defensive flourish: the row is counted against the
     * settings as they were when the request ran, and an administrator removing
     * a threshold between that count and this render leaves a level of 3 over a
     * list of 2. Unclamped this indexes past the end and reports "Escalation 3
     * of 2" over an undefined day count.
     */
    const state = describeEscalation({ daysOverdue: 60, escalationLevel: 3 }, [7, 14]);

    expect(state).toEqual({ kind: "escalated", level: 2, of: 2, passedAt: 14 });
    expect(escalationLabel(state)).toBe("Escalation 2 of 2");
  });

  it("treats a negative level as none passed rather than as an escalation", () => {
    const state = describeEscalation({ daysOverdue: 2, escalationLevel: -1 }, [7]);

    expect(state.kind).toBe("within-thresholds");
  });
});
