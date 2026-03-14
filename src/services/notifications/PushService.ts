/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires */
// src/services/notifications/PushService.ts
// Expo push notifications — token registration, local + remote handlers
let Notifications: any = null;
let Device: any = null;

const notif = () => {
  if (Notifications) return Notifications;
  try { Notifications = require('expo-notifications'); } catch { /* intentional */ }
  return Notifications;
};
const device = () => {
  if (Device) return Device;
  try { Device = require('expo-device'); } catch { /* intentional */ }
  return Device;
};

export type PushEventType = 'new_message' | 'vibe_received' | 'nearby_active' | 'match';

export interface PushPayload {
  type:      PushEventType;
  title:     string;
  body:      string;
  data?:     Record<string, any>;
}

export class PushService {
  private token: string | null = null;

  /** Register for push notifications, returns Expo push token */
  async register(): Promise<string | null> {
    const N = notif();
    const D = device();
    if (!N) return null;

    // Must be physical device
    if (D && !D.isDevice) {
      console.warn('[PushService] Push requires a physical device');
      return null;
    }

    const { status: existing } = await N.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await N.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    const tokenData = await N.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });

    this.token = tokenData.data;
    return this.token;
  }

  /** Configure notification appearance + handlers */
  configure(onReceive?: (payload: PushPayload) => void, onTap?: (payload: PushPayload) => void): void {
    const N = notif();
    if (!N) return;

    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge:  true,
      }),
    });

    if (onReceive) {
      N.addNotificationReceivedListener((notification: any) => {
        onReceive(notification.request.content.data as PushPayload);
      });
    }

    if (onTap) {
      N.addNotificationResponseReceivedListener((response: any) => {
        onTap(response.notification.request.content.data as PushPayload);
      });
    }
  }

  /** Send a local notification (for dev / in-app alerts) */
  async sendLocal(payload: PushPayload): Promise<void> {
    const N = notif();
    if (!N) return;

    await N.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body:  payload.body,
        data:  payload.data ?? {},
        sound: true,
      },
      trigger: null, // immediate
    });
  }

  /** Save token to Supabase user row */
  async saveToken(userId: string): Promise<void> {
    if (!this.token) return;
    try {
      const { createClient } = require('@supabase/supabase-js');
      const sb = createClient(
        process.env.EXPO_PUBLIC_SUPABASE_URL    ?? '',
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      );
      await sb.from('users').update({ push_token: this.token }).eq('id', userId);
    } catch { /* supabase not configured */ }
  }

  getToken(): string | null { return this.token; }
}

export const pushService = new PushService();
