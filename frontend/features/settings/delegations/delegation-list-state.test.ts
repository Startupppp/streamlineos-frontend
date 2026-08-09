import {
  buildDelegationListUrl,
  readDelegationListState,
} from "./delegation-list-state";

describe("delegation list URL state", () => {
  it("defaults each list to the first 20 records", () => {
    const params = new URLSearchParams();

    expect(readDelegationListState(params, "received")).toEqual({
      page: 1,
      limit: 20,
      search: "",
    });
    expect(readDelegationListState(params, "granted")).toEqual({
      page: 1,
      limit: 20,
      search: "",
    });
  });

  it("keeps received and granted pagination/search independent", () => {
    const params = new URLSearchParams({
      receivedPage: "3",
      receivedSize: "50",
      receivedSearch: "  Alex  ",
      grantedPage: "2",
      grantedSize: "10",
      grantedSearch: "coverage",
    });

    expect(readDelegationListState(params, "received")).toEqual({
      page: 3,
      limit: 50,
      search: "Alex",
    });
    expect(readDelegationListState(params, "granted")).toEqual({
      page: 2,
      limit: 10,
      search: "coverage",
    });
  });

  it("sanitizes invalid page and size values", () => {
    const params = new URLSearchParams({
      receivedPage: "0",
      receivedSize: "25",
    });

    expect(readDelegationListState(params, "received")).toEqual({
      page: 1,
      limit: 20,
      search: "",
    });
  });

  it("builds an encoded server-pagination request", () => {
    expect(
      buildDelegationListUrl("/access/delegations/given", {
        page: 4,
        limit: 10,
        search: "Sam & Alex",
      }),
    ).toBe(
      "/access/delegations/given?page=4&limit=10&search=Sam+%26+Alex",
    );
  });
});
