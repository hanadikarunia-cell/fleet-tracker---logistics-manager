// Snaps a plotted driver route onto actual roads, so it follows real streets instead of
// straight lines between the points someone clicked. Uses OSRM's public demo routing
// server — free, no API key, same "free key-free service" pattern as the OSM map tiles
// and the Open-Meteo weather feed elsewhere in this app. It's a shared demo instance with
// no uptime guarantee, so every caller must treat a failure as normal and fall back to the
// straight-line path between the original points rather than losing the user's work.
export interface LatLng {
  lat: number;
  lng: number;
}

// Haversine total length of a path, in meters — used to show a route's distance without
// pulling in a mapping library just for arithmetic.
export function pathLengthMeters(points: LatLng[]): number {
  const R = 6371e3;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const phi1 = (a.lat * Math.PI) / 180;
    const phi2 = (b.lat * Math.PI) / 180;
    const deltaPhi = ((b.lat - a.lat) * Math.PI) / 180;
    const deltaLambda = ((b.lng - a.lng) * Math.PI) / 180;
    const h =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    total += R * (2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
  }
  return total;
}

export async function fetchRoadRoute(points: LatLng[]): Promise<LatLng[] | null> {
  if (points.length < 2) return null;
  try {
    const coords = points.map((p) => `${p.lng},${p.lat}`).join(';');
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const coordinates = data?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
    return coordinates.map((c: [number, number]) => ({ lat: c[1], lng: c[0] }));
  } catch {
    // Network hiccup or the demo server is unavailable — the caller falls back to the
    // straight-line path rather than blocking route creation on a free third-party service.
    return null;
  }
}
