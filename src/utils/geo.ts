// src/utils/geo.ts — Geographic utility functions

const EARTH_RADIUS_M = 6371000;
const METERS_PER_MILE = 1609.344;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function distanceM(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function distanceMi(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  return distanceM(lat1, lon1, lat2, lon2) / METERS_PER_MILE;
}

export function bearing(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function fuzzyCoords(
  lat: number, lon: number, fuzzMeters: number
): { latitude: number; longitude: number } {
  const angle = Math.random() * 2 * Math.PI;
  const dist = Math.random() * fuzzMeters;
  const dLat = (dist * Math.cos(angle)) / EARTH_RADIUS_M;
  const dLon = (dist * Math.sin(angle)) / (EARTH_RADIUS_M * Math.cos(toRad(lat)));
  return {
    latitude: lat + (dLat * 180) / Math.PI,
    longitude: lon + (dLon * 180) / Math.PI,
  };
}

export function boundingBox(
  lat: number, lon: number, radiusM: number
): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
  const dLat = (radiusM / EARTH_RADIUS_M) * (180 / Math.PI);
  const dLon = dLat / Math.cos(toRad(lat));
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLon: lon - dLon,
    maxLon: lon + dLon,
  };
}

export function formatDistance(miles: number): string {
  if (miles < 0.1) return '<0.1 mi';
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}
