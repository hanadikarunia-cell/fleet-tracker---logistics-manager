// Converts snake_case DB rows into the camelCase shape the frontend's src/types.ts expects.

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

export function toCamel<T = any>(row: Record<string, any>): T {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    out[snakeToCamel(key)] = value;
  }
  return out as T;
}

export function toCamelList<T = any>(rows: Record<string, any>[]): T[] {
  return rows.map((r) => toCamel<T>(r));
}

// Vehicle rows store lat/lng flat; the frontend Vehicle type nests them as location: {lat, lng}.
export function mapVehicleRow(row: Record<string, any>) {
  const camel = toCamel<Record<string, any>>(row);
  const { lat, lng, ...rest } = camel;
  return { ...rest, location: { lat, lng } };
}

export function mapVehicleRows(rows: Record<string, any>[]) {
  return rows.map(mapVehicleRow);
}

// Reverse: flatten an incoming Vehicle-shaped payload (location: {lat,lng}) plus camelCase -> snake_case for writes.
function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

export function toSnakeRow(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'location' && value && typeof value === 'object') {
      out.lat = value.lat;
      out.lng = value.lng;
      continue;
    }
    out[camelToSnake(key)] = value;
  }
  return out;
}
