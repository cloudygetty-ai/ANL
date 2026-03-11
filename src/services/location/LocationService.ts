// src/services/location/LocationService.ts — Expo Location wrapper with fuzzy privacy layer
import { logger } from '@utils/Logger';
import { fuzzyCoords } from '@utils/geo';
import { PROXIMITY } from '@config/constants';

const MODULE = 'LocationService';

// WHY: NYC fallback so dev flows work without a device or simulator location
const DEV_LAT = 40.7128;
const DEV_LON = -74.006;

// Default polling interval when watchPositionAsync is not used (background-safe)
const DEFAULT_INTERVAL_MS = 60_000;

interface Coords {
  latitude: number;
  longitude: number;
}

type LocationCallback = (coords: Coords) => void;

export class LocationService {
  private watchSubscription: { remove: () => void } | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Requests foreground location permission from the OS.
   * Returns true if granted, false otherwise.
   * In dev (no Expo Location available) always returns true.
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const Location = await this.importLocation();
      if (!Location) {
        logger.warn(MODULE, 'expo-location unavailable — skipping permission request');
        return true;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      logger.info(MODULE, `Location permission: ${status}`);
      return granted;
    } catch (err) {
      logger.error(MODULE, 'requestPermissions failed', err);
      return false;
    }
  }

  /**
   * Returns the device's current location with a fuzz of PROXIMITY.fuzzMeters
   * applied so the exact position is never exposed to other users.
   * Falls back to NYC coordinates in dev.
   */
  async getCurrentLocation(): Promise<Coords> {
    try {
      const Location = await this.importLocation();

      if (!Location) {
        return this.devFuzzed();
      }

      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return fuzzyCoords(
        result.coords.latitude,
        result.coords.longitude,
        PROXIMITY.fuzzMeters,
      );
    } catch (err) {
      logger.error(MODULE, 'getCurrentLocation failed — using dev fallback', err);
      return this.devFuzzed();
    }
  }

  /**
   * Starts continuous location watching.
   * In production uses Location.watchPositionAsync for OS-managed updates.
   * Falls back to a setInterval poll when watchPositionAsync is unavailable
   * (e.g. Expo Go, web, CI).
   *
   * @param callback  Called each time a new location arrives.
   * @param intervalMs  Polling interval used by the fallback path. Default 60 s.
   */
  async startWatching(
    callback: LocationCallback,
    intervalMs: number = DEFAULT_INTERVAL_MS,
  ): Promise<void> {
    this.stopWatching(); // Ensure no duplicate watchers

    try {
      const Location = await this.importLocation();

      if (Location) {
        // WHY: watchPositionAsync is the preferred mechanism — the OS batches
        // updates efficiently. The fallback poll is for environments where the
        // native module is absent.
        this.watchSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: intervalMs,
            distanceInterval: 20, // meters — skip update if user barely moved
          },
          (position) => {
            const coords = fuzzyCoords(
              position.coords.latitude,
              position.coords.longitude,
              PROXIMITY.fuzzMeters,
            );
            callback(coords);
          },
        );

        logger.info(MODULE, 'Location watch started (native)', { intervalMs });
        return;
      }
    } catch (err) {
      logger.warn(MODULE, 'watchPositionAsync unavailable — falling back to poll', err);
    }

    // Fallback: poll getCurrentLocation on a timer
    this.pollTimer = setInterval(async () => {
      try {
        const coords = await this.getCurrentLocation();
        callback(coords);
      } catch (err) {
        logger.error(MODULE, 'Location poll error', err);
      }
    }, intervalMs);

    // Deliver an immediate first reading without waiting for the first tick
    this.getCurrentLocation()
      .then(callback)
      .catch((err) => logger.error(MODULE, 'Initial location read failed', err));

    logger.info(MODULE, 'Location watch started (poll fallback)', { intervalMs });
  }

  /**
   * Stops all active location watching, releasing both the native subscription
   * and any polling timer.
   */
  stopWatching(): void {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
      logger.debug(MODULE, 'Native location watch stopped');
    }

    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      logger.debug(MODULE, 'Location poll timer stopped');
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Attempts to dynamically import expo-location.
   * Returns null instead of throwing if the module is not available
   * (e.g. web build, CI environment, Expo Go without native modules).
   */
  private async importLocation(): Promise<typeof import('expo-location') | null> {
    try {
      const Location = await import('expo-location');
      return Location;
    } catch {
      return null;
    }
  }

  /** Returns the NYC dev coordinates with fuzz applied. */
  private devFuzzed(): Coords {
    return fuzzyCoords(DEV_LAT, DEV_LON, PROXIMITY.fuzzMeters);
  }
}
