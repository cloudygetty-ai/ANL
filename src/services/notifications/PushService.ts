// src/services/notifications/PushService.ts — Expo push notification wrapper
import { logger } from '@utils/Logger';
import { supabase, isSupabaseReady } from '@config/supabase';

const MODULE = 'PushService';

export class PushService {
  /**
   * Installs foreground and background notification handlers.
   * Must be called once at app startup, before the user interacts.
   *
   * Notification behaviour configured here:
   *   - Foreground: show alert, play sound, show badge.
   *   - Response: no automatic navigation (callers subscribe separately).
   */
  async configure(): Promise<void> {
    try {
      const Notifications = await this.importNotifications();
      if (!Notifications) {
        logger.warn(MODULE, 'expo-notifications unavailable — skipping configure');
        return;
      }

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      logger.info(MODULE, 'Notification handler configured');
    } catch (err) {
      logger.error(MODULE, 'configure failed', err);
    }
  }

  /**
   * Requests permission and retrieves the Expo push token for this device.
   * Returns the token string, or null if permission was denied or the
   * module is unavailable.
   *
   * WHY: We store the token in Supabase so the server can send targeted
   * pushes. This method only retrieves the token — saving it is a separate
   * responsibility (saveToken).
   */
  async registerToken(): Promise<string | null> {
    try {
      const Notifications = await this.importNotifications();
      if (!Notifications) {
        logger.warn(MODULE, 'expo-notifications unavailable — registerToken skipped');
        return null;
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        logger.warn(MODULE, 'Push permission denied');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;

      logger.info(MODULE, 'Push token registered', { token });
      return token;
    } catch (err) {
      logger.error(MODULE, 'registerToken failed', err);
      return null;
    }
  }

  /**
   * Schedules an immediate local notification with the given title and body.
   * Useful for in-app events (new match, chat message when app is active).
   */
  async sendLocal(title: string, body: string): Promise<void> {
    try {
      const Notifications = await this.importNotifications();
      if (!Notifications) {
        logger.warn(MODULE, 'expo-notifications unavailable — sendLocal skipped');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: true },
        // trigger: null means deliver immediately
        trigger: null,
      });

      logger.debug(MODULE, 'Local notification scheduled', { title });
    } catch (err) {
      logger.error(MODULE, 'sendLocal failed', err);
    }
  }

  /**
   * Persists the device push token to the user's row in the 'users' table.
   * The server reads this token when sending targeted push notifications.
   */
  async saveToken(userId: string, token: string): Promise<void> {
    if (!isSupabaseReady) {
      logger.warn(MODULE, 'Supabase not ready — saveToken skipped (dev mode)');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ push_token: token })
        .eq('id', userId);

      if (error) throw error;
      logger.info(MODULE, 'Push token saved to Supabase', { userId });
    } catch (err) {
      logger.error(MODULE, 'saveToken failed', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Dynamically imports expo-notifications.
   * Returns null instead of throwing when the module is unavailable
   * (web builds, CI, Expo Go without push support).
   */
  private async importNotifications(): Promise<
    typeof import('expo-notifications') | null
  > {
    try {
      const Notifications = await import('expo-notifications');
      return Notifications;
    } catch {
      return null;
    }
  }
}
