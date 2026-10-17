export interface ClockLocation {
  lat: number;
  lng: number;
}

export function getClockLocation(timeoutMs = 5_000): Promise<ClockLocation | undefined> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), timeoutMs + 500);
    function settle(value: ClockLocation | undefined) {
      clearTimeout(timer);
      resolve(value);
    }
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => settle({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => settle(undefined),
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 },
      );
    } catch {
      settle(undefined);
    }
  });
}
