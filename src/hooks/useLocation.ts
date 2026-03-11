// src/hooks/useLocation.ts
import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { fuzzyCoords } from '@utils/geo';

// Poll every 60 seconds — balances freshness vs battery drain
const POLL_MS = 60_000;
// Fuzz by 50 m so the server never sees exact position
const FUZZ_M = 50;
// Safe fallback when permission denied or device has no fix
const NYC = { latitude: 40.7128, longitude: -74.006 };

export function useLocation() {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Guard flag prevents state updates after unmount
    let cancelled = false;

    async function init() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          setError('Location permission denied');
          // Fall back to fuzzy NYC so the map still renders something sensible
          setCoords(fuzzyCoords(NYC.latitude, NYC.longitude, FUZZ_M));
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        if (!cancelled) {
          setCoords(fuzzyCoords(loc.coords.latitude, loc.coords.longitude, FUZZ_M));
        }

        // Poll on interval rather than continuous watch to conserve battery
        watchRef.current = setInterval(async () => {
          try {
            const l = await Location.getCurrentPositionAsync({});
            if (!cancelled) {
              setCoords(fuzzyCoords(l.coords.latitude, l.coords.longitude, FUZZ_M));
            }
          } catch {
            // Keep last known coords on transient failures
          }
        }, POLL_MS);
      } catch {
        if (!cancelled) {
          setCoords(fuzzyCoords(NYC.latitude, NYC.longitude, FUZZ_M));
          setError('Location unavailable — using default');
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (watchRef.current) clearInterval(watchRef.current);
    };
  }, []);

  return { coords, error };
}
