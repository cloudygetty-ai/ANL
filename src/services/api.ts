// src/services/api.ts
// Centralized Axios instance for ANL backend REST API.
// All requests automatically include the auth token from AsyncStorage.
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// WHY: attach the JWT on every request without callers needing to think about it
api.interceptors.request.use(async (config) => {
  try {
    const raw = await AsyncStorage.getItem('@anl:auth_session');
    if (raw) {
      const session = JSON.parse(raw) as { token?: string };
      if (session.token) {
        config.headers.Authorization = `Bearer ${session.token}`;
      }
    }
  } catch {
    // Missing or corrupt session — request will proceed unauthenticated
  }
  return config;
});

// WHY: surface API errors consistently so callers can handle them without
//      parsing raw Axios error objects
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ??
      error.response?.data?.message ??
      error.message ??
      'Unknown API error';
    return Promise.reject(new Error(message));
  }
);
