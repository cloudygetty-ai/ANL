// src/services/location/LocationService.ts
// GPS polling with Expo Location, fuzzy coords before broadcast,
// background updates via expo-task-manager
import type { LatLng } from '@types/index';
import { fuzzyCoords } from '@utils/geo';

let ExpoLocation: any = null;
const loc = () => {
  if (ExpoLocation) return ExpoLocation;
  try { ExpoLocation = require('expo-location'); } catch {}
  return ExpoLocation;
};

export const LOCATION_TASK = 'anl-background-location';

export interface LocationUpdate {
  exact:  LatLng;
  fuzzy:  LatLng;
  accuracy: number;
  ts:     number;
}

type LocationHandler = (update: LocationUpdate) => void;
const subscribers: LocationHandler[] = [];

let watchSubscription: any = null;
let lastLocation: LocationUpdate | null = null;

export class LocationService {
  /** Request foreground + background permissions */
  async requestPermissions(): Promise<boolean> {
    const L = loc();
    if (!L) return false;

    const { status: fg } = await L.requestForegroundPermissionsAsync();
    if (fg !== 'granted') return false;

    const { status: bg } = await L.requestBackgroundPermissionsAsync();
    return bg === 'granted';
  }

  /** Get current position once */
  async getCurrentLocation(): Promise<LocationUpdate | null> {
    const L = loc();
    if (!L) return this.mockLocation();

    try {
      const pos = await L.getCurrentPositionAsync({
        accuracy: L.Accuracy.Balanced,
      });
      return this.toUpdate(pos.coords);
    } catch {
      return this.mockLocation();
    }
  }

  /** Start continuous watch (foreground) */
  async startWatching(onUpdate: LocationHandler): Promise<void> {
    subscribers.push(onUpdate);
    if (watchSubscription) return;

    const L = loc();
    if (!L) {
      // Mock: emit every 30s in dev
      const mock = setInterval(() => {
        const u = this.mockLocation();
        lastLocation = u;
        subscribers.forEach(fn => fn(u));
      }, 30000);
      watchSubscription = { remove: () => clearInterval(mock) };
      return;
    }

    watchSubscription = await L.watchPositionAsync(
      { accuracy: L.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 20 },
      (pos: any) => {
        const u = this.toUpdate(pos.coords);
        lastLocation = u;
        subscribers.forEach(fn => fn(u));
      }
    );
  }

  /** Stop watching */
  stopWatching(handler: LocationHandler): void {
    const idx = subscribers.indexOf(handler);
    if (idx >= 0) subscribers.splice(idx, 1);
    if (subscribers.length === 0 && watchSubscription) {
      watchSubscription.remove?.();
      watchSubscription = null;
    }
  }

  /** Last known location */
  getLastLocation(): LocationUpdate | null {
    return lastLocation;
  }

  private toUpdate(coords: any): LocationUpdate {
    const exact: LatLng = { lat: coords.latitude, lng: coords.longitude };
    return {
      exact,
      fuzzy:    fuzzyCoords(exact, 150),
      accuracy: coords.accuracy ?? 10,
      ts:       Date.now(),
    };
  }

  private mockLocation(): LocationUpdate {
    // NYC default for dev
    const exact: LatLng = { lat: 40.7128, lng: -74.006 };
    return { exact, fuzzy: fuzzyCoords(exact), accuracy: 15, ts: Date.now() };
  }
}

export const locationService = new LocationService();
