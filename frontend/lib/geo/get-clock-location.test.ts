import { getClockLocation } from "./get-clock-location";

function installGeolocation(getCurrentPosition: jest.Mock | undefined): void {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: getCurrentPosition ? { getCurrentPosition } : undefined,
  });
}

afterEach(() => {
  jest.useRealTimers();
  installGeolocation(undefined);
});

describe("getClockLocation", () => {
  it("resolves the coordinates when the browser grants a position", async () => {
    const getCurrentPosition = jest.fn((success: PositionCallback, _failure?: PositionErrorCallback | null, _options?: PositionOptions) =>
      success({ coords: { latitude: 17.4, longitude: 78.5 } } as GeolocationPosition),
    );
    installGeolocation(getCurrentPosition);

    await expect(getClockLocation()).resolves.toEqual({ lat: 17.4, lng: 78.5 });
    expect(getCurrentPosition.mock.calls[0][2]).toMatchObject({ timeout: 5_000, maximumAge: 60_000 });
  });

  it("resolves undefined when the user denies the prompt", async () => {
    installGeolocation(
      jest.fn((_success: PositionCallback, failure: PositionErrorCallback) =>
        failure({ code: 1, message: "denied" } as GeolocationPositionError),
      ),
    );
    await expect(getClockLocation()).resolves.toBeUndefined();
  });

  it("resolves undefined when the browser never answers", async () => {
    jest.useFakeTimers();
    installGeolocation(jest.fn());
    const pending = getClockLocation(5_000);
    jest.advanceTimersByTime(6_000);
    await expect(pending).resolves.toBeUndefined();
  });

  it("resolves undefined when geolocation is unsupported", async () => {
    installGeolocation(undefined);
    await expect(getClockLocation()).resolves.toBeUndefined();
  });
});
