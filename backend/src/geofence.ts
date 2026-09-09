export interface GeofenceRow {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  type: 'circle' | 'polygon';
  active: boolean;
  vertices?: Array<{ lat: number; lng: number }> | null;
}

// Haversine distance in meters.
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Ray-casting point-in-polygon test (vertices as {lat,lng}, treated as planar coords —
// fine at city/regional scale).
function isInsidePolygon(lat: number, lng: number, vertices: Array<{ lat: number; lng: number }>): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].lng, yi = vertices[i].lat;
    const xj = vertices[j].lng, yj = vertices[j].lat;
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isInsideGeofence(lat: number, lng: number, fence: GeofenceRow): boolean {
  if (fence.type === 'polygon' && fence.vertices && fence.vertices.length >= 3) {
    return isInsidePolygon(lat, lng, fence.vertices);
  }
  return distanceMeters(lat, lng, fence.lat, fence.lng) <= fence.radius;
}
