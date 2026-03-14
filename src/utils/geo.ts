// src/utils/geo.ts
// Geospatial utilities — haversine, fuzzy coords, bearing, bounding box

export interface LatLng { lat: number; lng: number; }

const R = 6371000; // Earth radius in meters

/** Haversine distance in meters between two coords */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Distance in miles */
export function distanceMi(a: LatLng, b: LatLng): number {
  return distanceM(a, b) / 1609.344;
}

/** Bearing in degrees (0 = north, clockwise) */
export function bearing(a: LatLng, b: LatLng): number {
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLng);
  return ((toDeg(Math.atan2(y, x)) + 360) % 360);
}

/**
 * Fuzzy coords — add random offset within radiusM meters.
 * Used server-side before sending user coords to other clients.
 */
export function fuzzyCoords(coords: LatLng, radiusM = 150): LatLng {
  const r   = radiusM / R;
  const ang = Math.random() * 2 * Math.PI;
  const u   = Math.random() + Math.random();
  const d   = r * (u > 1 ? 2 - u : u);
  return {
    lat: coords.lat + toDeg(d * Math.cos(ang)),
    lng: coords.lng + toDeg(d * Math.sin(ang) / Math.cos(toRad(coords.lat))),
  };
}

/** Bounding box for a center + radius (for DB spatial queries) */
export function boundingBox(center: LatLng, radiusM: number) {
  const latD = toDeg(radiusM / R);
  const lngD = toDeg(radiusM / R / Math.cos(toRad(center.lat)));
  return {
    minLat: center.lat - latD,
    maxLat: center.lat + latD,
    minLng: center.lng - lngD,
    maxLng: center.lng + lngD,
  };
}

/** Format distance for display */
export function formatDistance(meters: number): string {
  if (meters < 1609) return `${Math.round(meters / 10) * 10}m`;
  const mi = meters / 1609.344;
  return mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
}

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;
