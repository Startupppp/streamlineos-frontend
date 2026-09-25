import { geofenceSchema, GEOFENCE_PRESETS } from "./geofence-schema";

function issues(values: { name: string; lat: string; lng: string }): string[] {
  const result = geofenceSchema.safeParse({ ...values, radiusMeters: 200 });
  return result.success ? [] : result.error.issues.map((issue) => `${String(issue.path[0])}: ${issue.message}`);
}

describe("a geofence needs a real coordinate pair, not just any text", () => {
  it("flags only the location name when the coordinates are present and valid", () => {
    expect(issues({ name: "", lat: "13.0827", lng: "80.2707" })).toEqual(["name: Location name is required"]);
  });

  it("explains an out-of-range or non-numeric coordinate on its own field", () => {
    expect(issues({ name: "HQ", lat: "91", lng: "80.2707" })).toEqual(["lat: Latitude must be between -90 and 90"]);
    expect(issues({ name: "HQ", lat: "13.0827", lng: "east" })).toEqual(["lng: Longitude must be a number"]);
    expect(issues({ name: "HQ", lat: "", lng: "" })).toEqual(["lat: Latitude is required", "lng: Longitude is required"]);
  });

  it("validates all exported location presets", () => {
    expect(GEOFENCE_PRESETS.length).toBeGreaterThan(0);
    for (const preset of GEOFENCE_PRESETS) {
      expect(issues({ name: preset.name, lat: preset.lat, lng: preset.lng })).toEqual([]);
    }
  });
});

