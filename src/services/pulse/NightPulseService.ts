// src/services/pulse/NightPulseService.ts — NightPulse zone monitoring service
import type { PulseZone, NightPulseSnapshot } from '@types/index';
import { logger } from '@utils/Logger';
import { distanceMi } from '@utils/geo';
import { supabase, isSupabaseReady } from '@config/supabase';

const MODULE = 'NightPulseService';

// ---------------------------------------------------------------------------
// Mock data — 6 NYC zones with drifting intensities
// ---------------------------------------------------------------------------

const BASE_ZONES: Omit<PulseZone, 'intensity' | 'activeUsers'>[] = [
  {
    id: 'zone-lower-east',
    name: 'Lower East Side',
    latitude: 40.7157,
    longitude: -73.9863,
    category: 'bars',
  },
  {
    id: 'zone-williamsburg',
    name: 'Williamsburg',
    latitude: 40.7081,
    longitude: -73.9571,
    category: 'music',
  },
  {
    id: 'zone-meatpacking',
    name: 'Meatpacking District',
    latitude: 40.7408,
    longitude: -74.0055,
    category: 'clubs',
  },
  {
    id: 'zone-harlem',
    name: 'Harlem',
    latitude: 40.8116,
    longitude: -73.9465,
    category: 'live music',
  },
  {
    id: 'zone-astoria',
    name: 'Astoria',
    latitude: 40.7721,
    longitude: -73.9302,
    category: 'rooftops',
  },
  {
    id: 'zone-brooklyn-heights',
    name: 'Brooklyn Heights',
    latitude: 40.6960,
    longitude: -73.9937,
    category: 'cocktail bars',
  },
];

/**
 * Builds a mock snapshot by giving each zone a slightly drifted intensity
 * based on the current time, so the mock data feels alive over time.
 */
function buildMockSnapshot(): NightPulseSnapshot {
  const now = Date.now();
  // WHY: sin(time) gives slow oscillation without requiring state
  const zones: PulseZone[] = BASE_ZONES.map((base, i) => {
    const phase = (now / 30_000 + i * 1.3) % (2 * Math.PI);
    const intensity = Math.min(1, Math.max(0, 0.5 + 0.45 * Math.sin(phase)));
    const activeUsers = Math.round(intensity * 200 + 10);
    return { ...base, intensity, activeUsers };
  });

  const totalActive = zones.reduce((sum, z) => sum + z.activeUsers, 0);
  const peak = zones.reduce((max, z) => (z.intensity > max.intensity ? z : max), zones[0]);

  return {
    zones,
    timestamp: now,
    totalActive,
    peakZoneId: peak.id,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class NightPulseService {
  /**
   * Fetches the current NightPulse zone snapshot.
   * Calls the Supabase RPC 'get_pulse_snapshot' when available,
   * otherwise returns locally generated mock data.
   */
  async getSnapshot(): Promise<NightPulseSnapshot> {
    if (!isSupabaseReady) {
      logger.debug(MODULE, 'getSnapshot — mock mode');
      return buildMockSnapshot();
    }

    try {
      const { data, error } = await supabase.rpc('get_pulse_snapshot');
      if (error) throw error;

      const snapshot = data as NightPulseSnapshot;
      logger.debug(MODULE, 'Snapshot fetched', { zones: snapshot.zones.length });
      return snapshot;
    } catch (err) {
      logger.error(MODULE, 'getSnapshot failed — using mock data', err);
      return buildMockSnapshot();
    }
  }

  /**
   * Subscribes to live NightPulse broadcast events via Supabase Realtime.
   * The callback is invoked every time a new snapshot is broadcast.
   * Returns an unsubscribe function.
   *
   * Falls back to a 30-second mock poll when Supabase is unavailable.
   */
  subscribe(
    callback: (snapshot: NightPulseSnapshot) => void,
  ): () => void {
    if (!isSupabaseReady) {
      logger.debug(MODULE, 'subscribe — mock poll mode');
      const timer = setInterval(() => {
        callback(buildMockSnapshot());
      }, 30_000);

      // Deliver an immediate first snapshot without waiting for the first tick
      callback(buildMockSnapshot());

      return () => clearInterval(timer);
    }

    // WHY: Broadcast channel ('pulse-updates') is used rather than
    // postgres_changes because zone intensities are aggregated server-side,
    // not stored as individual rows — so there is no table to watch.
    const channel = supabase
      .channel('pulse-updates')
      .on('broadcast', { event: 'snapshot' }, (payload) => {
        try {
          callback(payload.payload as NightPulseSnapshot);
        } catch (err) {
          logger.error(MODULE, 'Realtime snapshot parse error', err);
        }
      })
      .subscribe((status) => {
        logger.debug(MODULE, `Realtime pulse status: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel).catch((err) => {
        logger.warn(MODULE, 'Failed to remove pulse Realtime channel', err);
      });
    };
  }

  /**
   * Returns the zone with the highest intensity value.
   * If zones is empty, returns null.
   */
  getPeakZone(zones: PulseZone[]): PulseZone | null {
    if (zones.length === 0) return null;
    return zones.reduce(
      (max, zone) => (zone.intensity > max.intensity ? zone : max),
      zones[0],
    );
  }

  /**
   * Filters zones to those within radiusMi miles of the given coordinates.
   * Uses Haversine distance for accuracy.
   */
  getZonesNear(
    zones: PulseZone[],
    lat: number,
    lon: number,
    radiusMi: number,
  ): PulseZone[] {
    return zones.filter(
      (zone) =>
        distanceMi(lat, lon, zone.latitude, zone.longitude) <= radiusMi,
    );
  }

  /**
   * Maps a 0–1 intensity value to a color string interpolated through:
   *   0.0 → cool blue  (#3b82f6)
   *   0.5 → yellow     (#f59e0b)
   *   1.0 → hot red    (#ef4444)
   *
   * WHY: Three-stop gradient gives more visual range than a simple
   * blue-to-red, making mid-intensity zones easier to distinguish.
   */
  pulseColor(intensity: number): string {
    const clamped = Math.min(1, Math.max(0, intensity));

    if (clamped <= 0.5) {
      // Blue → Yellow (0 to 0.5)
      const t = clamped * 2; // normalise 0-0.5 → 0-1
      return this.lerpColor('#3b82f6', '#f59e0b', t);
    } else {
      // Yellow → Red (0.5 to 1)
      const t = (clamped - 0.5) * 2; // normalise 0.5-1 → 0-1
      return this.lerpColor('#f59e0b', '#ef4444', t);
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Linearly interpolates between two hex color strings.
   * t = 0 → colorA, t = 1 → colorB.
   */
  private lerpColor(colorA: string, colorB: string, t: number): string {
    const parse = (hex: string): [number, number, number] => {
      const n = parseInt(hex.slice(1), 16);
      return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
    };

    const [r1, g1, b1] = parse(colorA);
    const [r2, g2, b2] = parse(colorB);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
  }
}
