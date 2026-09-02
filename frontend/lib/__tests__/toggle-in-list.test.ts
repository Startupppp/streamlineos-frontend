import {
  setListMembership,
  toggleListMembership,
} from "@/lib/toggle-in-list";

describe("setListMembership", () => {
  it("adds a value that is not there", () => {
    expect(setListMembership(["a"], "b", true)).toEqual(["a", "b"]);
  });

  it("removes a value that is", () => {
    expect(setListMembership(["a", "b"], "b", false)).toEqual(["a"]);
  });

  it("does not add a duplicate — three call sites relied on the caller never double-firing", () => {
    expect(setListMembership(["a", "b"], "b", true)).toEqual(["a", "b"]);
  });

  it("removes every copy when one slipped in earlier", () => {
    expect(setListMembership(["a", "b", "b"], "b", false)).toEqual(["a"]);
  });

  it("never mutates the list it was given", () => {
    const original = ["a"];
    setListMembership(original, "b", true);
    expect(original).toEqual(["a"]);
  });

  it("removing something absent is a no-op, not an error", () => {
    expect(setListMembership(["a"], "z", false)).toEqual(["a"]);
  });
});

describe("toggleListMembership", () => {
  it("adds then removes the same value", () => {
    const once = toggleListMembership([], "a");
    expect(once).toEqual(["a"]);
    expect(toggleListMembership(once, "a")).toEqual([]);
  });
});
