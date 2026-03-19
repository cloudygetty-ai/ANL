// src/hooks/usePatentFeatures.ts
// Single hook that wires all 5 patent features to the RN frontend

import { useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import { Audio } from 'expo-av';
import { useSocketStore } from '../stores/socketStore';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';

// ─── 1. CIRCADIAN — passive activity tracking ─────────────────
export function useCircadianTracking() {
  useEffect(() => {
    // Ping backend on foreground — activity recorded server-side
    api.post('/discovery/location', {}).catch(() => {});
  }, []);
}

// ─── 2. VENUE MATCHING — location + venue detection ───────────
export function useVenueMatching() {
  const socket = useSocketStore((s) => s.socket);
  const locationRef = useRef<Location.LocationSubscription | null>(null);

  const startTracking = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    locationRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000,   // every 30s
        distanceInterval: 50,  // or every 50m
      },
      (location) => {
        const { latitude, longitude } = location.coords;
        socket?.emit('location:update', { lat: latitude, lng: longitude });
      }
    );
  }, [socket]);

  const stopTracking = useCallback(() => {
    locationRef.current?.remove();
    locationRef.current = null;
  }, []);

  useEffect(() => {
    startTracking();
    return () => stopTracking();
  }, [startTracking]);

  // Listen for venue match triggers
  useEffect(() => {
    if (!socket) return;
    socket.on('venue:match_nearby', (data: any) => {
      // Handled in useDiscovery or notification system
      console.log('[venue] match nearby:', data);
    });
    return () => { socket.off('venue:match_nearby'); };
  }, [socket]);
}

// ─── 3. VOICE TONE — audio feature extraction during calls ────
export function useVoiceToneAnalysis(callId: string | null, active: boolean) {
  const socket = useSocketStore((s) => s.socket);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorderRef = useRef<Audio.Recording | null>(null);

  const extractFeatures = useCallback(async (): Promise<any | null> => {
    if (!recorderRef.current) return null;

    try {
      const status = await recorderRef.current.getStatusAsync();
      if (!status.isRecording) return null;

      // Extract features from metering data
      // expo-av provides dBFS metering
      const db = status.metering ?? -160;
      const volumeRms = Math.pow(10, db / 20); // convert dBFS to linear

      // Simulate feature extraction (production: use Web Audio API or DSP lib)
      const features = {
        pitchMean: 180 + Math.random() * 60,      // Hz estimate
        pitchVariance: 20 + Math.random() * 40,
        speakingRate: 3 + Math.random() * 2,       // syllables/sec
        pauseFrequency: 8 + Math.random() * 12,    // pauses/min
        volumeRms: Math.max(0, Math.min(1, volumeRms)),
        laughDetected: Math.random() < 0.05,        // 5% baseline
        overlapDetected: Math.random() < 0.1,
        timestamp: Date.now(),
      };

      return features;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!active || !callId || !socket) return;

    const startRecording = async () => {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.LOW_QUALITY,
        undefined,
        200 // metering interval ms
      );
      recorderRef.current = recording;
    };

    startRecording().catch(console.error);

    // Send snapshot every 5 seconds
    intervalRef.current = setInterval(async () => {
      const features = await extractFeatures();
      if (features) {
        socket.emit('call:audio_snapshot', { callId, features });
      }
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      recorderRef.current?.stopAndUnloadAsync().catch(console.error);
      recorderRef.current = null;
    };
  }, [active, callId, socket, extractFeatures]);

  // Listen for chemistry score updates
  useEffect(() => {
    if (!socket) return;
    socket.on('call:chemistry_update', (data: any) => {
      console.log('[voice] chemistry score:', data.score, data.label);
    });
    socket.on('call:report', (report: any) => {
      console.log('[voice] call report:', report);
    });
    return () => {
      socket.off('call:chemistry_update');
      socket.off('call:report');
    };
  }, [socket]);
}

// ─── 4. CRYPTO REVEAL — init encrypted profile on signup ──────
export function useCryptoReveal() {
  const { user } = useAuthStore();

  const initReveal = useCallback(async () => {
    try {
      const { data } = await api.post('/users/encrypt-profile');
      // Store reveal token in SecureStore
      const SecureStore = require('expo-secure-store');
      await SecureStore.setItemAsync('anl_reveal_token', data.revealToken);
      return data.revealToken;
    } catch (err) {
      console.error('[crypto] init reveal failed:', err);
      return null;
    }
  }, []);

  const getRevealToken = useCallback(async (): Promise<string | null> => {
    const SecureStore = require('expo-secure-store');
    return SecureStore.getItemAsync('anl_reveal_token');
  }, []);

  const revealProfile = useCallback(async (targetUserId: string, theirToken: string) => {
    const myToken = await getRevealToken();
    if (!myToken) throw new Error('No reveal token found');

    const { data } = await api.post('/users/reveal', {
      targetUserId,
      myRevealToken: myToken,
      theirRevealToken: theirToken,
    });
    return data;
  }, [getRevealToken]);

  return { initReveal, getRevealToken, revealProfile };
}

// ─── 5. SOCIAL GRAPH EXCLUSION — sync contacts ────────────────
export function useSocialGraphExclusion() {
  const syncContacts = useCallback(async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') return { synced: 0 };

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers],
    });

    const phoneNumbers = data
      .flatMap((c) => c.phoneNumbers ?? [])
      .map((p) => p.number ?? '')
      .filter(Boolean);

    if (!phoneNumbers.length) return { synced: 0 };

    await api.post('/users/contacts/sync', { phoneNumbers });
    return { synced: phoneNumbers.length };
  }, []);

  const setExclusionEnabled = useCallback(async (enabled: boolean) => {
    await api.put('/users/settings/exclusion', { enabled });
  }, []);

  return { syncContacts, setExclusionEnabled };
}

// ─── MASTER HOOK — use this in App.tsx or auth flow ───────────
export function useAllPatentFeatures() {
  useCircadianTracking();
  useVenueMatching();
  // useVoiceToneAnalysis called per-call in VideoCallScreen
  // useCryptoReveal called on profile setup
  // useSocialGraphExclusion called on onboarding
}
