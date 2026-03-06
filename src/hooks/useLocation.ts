// src/hooks/useLocation.ts
// Returns fuzzy location (PROXIMITY.FUZZ_M jitter) — never exposes exact coords
import { useState, useEffect, useRef } from 'react';
import { PROXIMITY, PRESENCE } from '@config/constants';
import type { LatLng } from '@types/index';

export interface LocationState {
  coords:    LatLng | null;
  accuracy:  number | null;
  isReady:   boolean;
  error:     string | null;
}

function fuzz(coords: LatLng): LatLng {
  const r     = PROXIMITY.FUZZ_M / 111320;
  const angle = Math.random() * Math.PI * 2;
  return {
    lat: coords.lat + Math.cos(angle) * r * Math.random(),
    lng: coords.lng + Math.sin(angle) * r * Math.random(),
  };
}

export function useLocation(fuzzy = true): LocationState {
  const [state, setState] = useState<LocationState>({
    coords: null, accuracy: null, isReady: false, error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let Loc: any = null;
    try { Loc = require('expo-location'); } catch { /* not linked */ }

    if (!Loc) {
      // Dev fallback — NYC coords
      const mock = { lat: 40.7128, lng: -74.006 };
      setState({ coords: fuzzy ? fuzz(mock) : mock, accuracy: 10, isReady: true, error: null });
      return;
    }

    (async () => {
      const { status } = await Loc.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setState(s => ({ ...s, isReady: true, error: 'Location permission denied' }));
        return;
      }

      const update = async () => {
        const loc = await Loc.getCurrentPositionAsync({ accuracy: Loc.Accuracy.Balanced });
        const raw = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setState({ coords: fuzzy ? fuzz(raw) : raw, accuracy: loc.coords.accuracy, isReady: true, error: null });
      };

      await update();
      intervalRef.current = setInterval(update, PRESENCE.UPDATE_INTERVAL);
    })();

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fuzzy]);

  return state;
}
