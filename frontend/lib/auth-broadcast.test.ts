import { publishLogout, subscribeLogout } from "@/lib/auth-broadcast";

const CHANNEL_NAME = "streamlineos:auth";
const LOGOUT_VALUE = "auth:logout";

describe("subscribeLogout / publishLogout — storage-event path (jsdom)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("(positive) fires onLogout when a storage event carrying the logout value arrives", () => {
    const onLogout = jest.fn();
    const cleanup = subscribeLogout(onLogout);

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: CHANNEL_NAME,
        newValue: LOGOUT_VALUE,
        storageArea: window.localStorage,
      }),
    );

    expect(onLogout).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it("(negative control) does not fire when a storage event carries a different key", () => {
    const onLogout = jest.fn();
    const cleanup = subscribeLogout(onLogout);

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "some-other-key",
        newValue: LOGOUT_VALUE,
        storageArea: window.localStorage,
      }),
    );

    expect(onLogout).not.toHaveBeenCalled();
    cleanup();
  });

  it("(negative) does not fire when a storage event carries the right key but wrong value", () => {
    const onLogout = jest.fn();
    const cleanup = subscribeLogout(onLogout);

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: CHANNEL_NAME,
        newValue: "some-other-value",
        storageArea: window.localStorage,
      }),
    );

    expect(onLogout).not.toHaveBeenCalled();
    cleanup();
  });

  it("(cleanup) does not fire after the subscription is removed", () => {
    const onLogout = jest.fn();
    const cleanup = subscribeLogout(onLogout);
    cleanup();

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: CHANNEL_NAME,
        newValue: LOGOUT_VALUE,
        storageArea: window.localStorage,
      }),
    );

    expect(onLogout).not.toHaveBeenCalled();
  });
});

describe("publishLogout — does not throw in a browser-like environment", () => {
  it("does not throw when called (BroadcastChannel may or may not be available)", () => {
    expect(() => publishLogout()).not.toThrow();
  });
});
