// src/services/pushNotifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from './api';

export async function setupPushNotifications(userId: string) {
  if (!Device.isDevice) return; // simulators don't support push

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  // Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'ANL Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#a855f7',
    });

    await Notifications.setNotificationChannelAsync('calls', {
      name: 'Incoming Calls',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500, 300, 500],
      lightColor: '#22c55e',
      sound: 'default',
    });
  }

  // Get token and register with backend
  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });

    await api.post('/users/push-token', { token: token.data });
  } catch (err) {
    console.warn('[push] token registration failed:', err);
  }
}

// ─── NOTIFICATION RESPONSE HANDLER ───────────────────────────
// Call this once in App.tsx to handle taps on notifications
export function registerNotificationHandlers(navigation: any) {
  // Foreground handler
  const sub1 = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data as any;
    console.log('[push] received:', data?.type);
  });

  // Background tap handler
  const sub2 = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as any;

    switch (data?.type) {
      case 'match':
        navigation.navigate('Matches');
        break;
      case 'message':
        navigation.navigate('Chat', {
          matchId: data.matchId,
          userId: data.senderId,
          displayName: data.senderName,
        });
        break;
      case 'call':
        navigation.navigate('IncomingCall', {
          callId: data.callId,
          callerId: data.callerId,
          callerName: data.callerName,
          callType: data.callType ?? 'video',
        });
        break;
    }
  });

  return () => {
    sub1.remove();
    sub2.remove();
  };
}
