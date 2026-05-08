// src/stubs/expo-notifications.ts
// Web stub — expo-notifications requires native runtime.

export const setNotificationHandler = () => {};
export const requestPermissionsAsync = async () => ({ status: "granted" });
export const getExpoPushTokenAsync = async () => ({ data: "" });
export const addNotificationReceivedListener = () => ({ remove: () => {} });
export const addNotificationResponseReceivedListener = () => ({ remove: () => {} });
export const scheduleNotificationAsync = async () => "";
export const cancelAllScheduledNotificationsAsync = async () => {};

export default {
  setNotificationHandler,
  requestPermissionsAsync,
  getExpoPushTokenAsync,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
};
