// src/services/pulse/NightPulseService.ts
// NightPulse: real-time anonymous heatwave showing which neighborhoods are 🔥
// Data: user activity events aggregated by neighborhood polygon server-side
// Update cycle: 60s via EventLoop task + Supabase Realtime subscription
import type { PulseZone, NightPulseSnapshot, LatLng } from '@types/index';

// Intensity → color mapping (purple → pink → amber → white at peak)
export const pulseColor = (intensity: number): string => {
  if (intensity >= 0.9) return '#fffbeb'; // near-white peak
  if (intensity >= 0.75) return '#fbbf24'; // amber hot
  if (intensity >= 0.55) return '#ec4899'; // pink rising
  if (intensity >= 0.35) return '#a855f7'; // purple active
  return '#3b0764';                         // deep purple quiet
};

// Mock zones — replace with Supabase RPC call `get_pulse_snapshot()`
const MOCK_ZONES: PulseZone[] = [
  { id:'z-les',  name:'Lower East Side', center:{lat:40.715,lng:-73.988}, radiusM:600, intensity:.92, activeCount:47, trend:'peaking', peakHour:1,  color:pulseColor(.92), updatedAt:Date.now() },
  { id:'z-wv',   name:'West Village',    center:{lat:40.734,lng:-74.005}, radiusM:500, intensity:.71, activeCount:31, trend:'rising',  peakHour:0,  color:pulseColor(.71), updatedAt:Date.now() },
  { id:'z-ev',   name:'East Village',    center:{lat:40.727,lng:-73.985}, radiusM:550, intensity:.58, activeCount:22, trend:'rising',  peakHour:2,  color:pulseColor(.58), updatedAt:Date.now() },
  { id:'z-hell', name:'Hell\'s Kitchen', center:{lat:40.763,lng:-73.993}, radiusM:700, intensity:.44, activeCount:18, trend:'fading',  peakHour:23, color:pulseColor(.44), updatedAt:Date.now() },
  { id:'z-bk',   name:'Williamsburg',    center:{lat:40.713,lng:-73.957}, radiusM:650, intensity:.66, activeCount:28, trend:'rising',  peakHour:1,  color:pulseColor(.66), updatedAt:Date.now() },
];

type PulseHandler = (snapshot: NightPulseSnapshot) => void;
const pulseSubscribers: PulseHandler[] = [];

export class NightPulseService {
  private snapshot: NightPulseSnapshot | null = null;
  private realtimeChannel: any = null;

  /** Fetch current pulse snapshot */
  async getSnapshot(): Promise<NightPulseSnapshot> {
    let supabase: any = null;
    try {
      const { createClient } = require('@supabase/supabase-js');
      supabase = createClient(
        process.env.EXPO_PUBLIC_SUPABASE_URL    ?? '',
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      );
    } catch { /* not installed */ }

    if (supabase) {
      const { data, error } = await supabase.rpc('get_pulse_snapshot');
      if (!error && data) {
        this.snapshot = this.processSnapshot(data);
        return this.snapshot;
      }
    }

    // Mock: simulate drift each call
    const zones = MOCK_ZONES.map(z => ({
      ...z,
      intensity:   Math.min(1, Math.max(0, z.intensity + (Math.random() - 0.48) * 0.04)),
      activeCount: Math.max(0, z.activeCount + Math.floor((Math.random() - 0.48) * 3)),
      updatedAt:   Date.now(),
    })).map(z => ({ ...z, color: pulseColor(z.intensity) }));

    const peakZone = zones.reduce((a, b) => a.intensity > b.intensity ? a : b);
    this.snapshot = {
      zones,
      cityTotal:  zones.reduce((s, z) => s + z.activeCount, 0),
      updatedAt:  Date.now(),
      peakZoneId: peakZone.id,
    };

    return this.snapshot;
  }

  /** Subscribe to real-time pulse updates (60s cadence) */
  subscribe(handler: PulseHandler): () => void {
    pulseSubscribers.push(handler);

    let supabase: any = null;
    try {
      const { createClient } = require('@supabase/supabase-js');
      supabase = createClient(
        process.env.EXPO_PUBLIC_SUPABASE_URL    ?? '',
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      );
    } catch { /* mock mode */ }

    if (supabase) {
      this.realtimeChannel = supabase
        .channel('nightpulse')
        .on('broadcast', { event: 'pulse_update' }, (payload: any) => {
          const snap = this.processSnapshot(payload.payload);
          pulseSubscribers.forEach(fn => fn(snap));
        })
        .subscribe();
    }

    return () => {
      const idx = pulseSubscribers.indexOf(handler);
      if (idx >= 0) pulseSubscribers.splice(idx, 1);
      if (supabase && this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel);
      }
    };
  }

  /** Get the hottest zone right now */
  getPeakZone(): PulseZone | null {
    if (!this.snapshot) return null;
    return this.snapshot.zones.reduce((a, b) => a.intensity > b.intensity ? a : b);
  }

  /** Get zones within radius of coords (for "near you" filter) */
  getZonesNear(coords: LatLng, radiusM: number): PulseZone[] {
    if (!this.snapshot) return [];
    return this.snapshot.zones.filter(z => {
      const dx = (z.center.lng - coords.lng) * 111320 * Math.cos(coords.lat * Math.PI / 180);
      const dy = (z.center.lat - coords.lat) * 110574;
      return Math.sqrt(dx*dx + dy*dy) <= radiusM;
    });
  }

  private processSnapshot(raw: any): NightPulseSnapshot {
    const zones: PulseZone[] = (raw.zones ?? raw).map((z: any) => ({
      ...z,
      color: pulseColor(z.intensity),
    }));
    const peak = zones.reduce((a, b) => a.intensity > b.intensity ? a : b);
    return {
      zones,
      cityTotal:  zones.reduce((s: number, z: PulseZone) => s + z.activeCount, 0),
      updatedAt:  Date.now(),
      peakZoneId: peak.id,
    };
  }
}

// Singleton
export const nightPulse = new NightPulseService();
