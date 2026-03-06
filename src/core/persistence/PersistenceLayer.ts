// src/core/persistence/PersistenceLayer.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PersistedSnapshot, SystemState, HealthMetrics } from '@types/index';

const SNAPSHOT_KEY    = 'anl:system:snapshot';
const CURRENT_VERSION = 1;

export class PersistenceLayer {
  private autosaveTimer: ReturnType<typeof setInterval> | null = null;
  private intervalMs: number;

  constructor(intervalMs = 30000) {
    this.intervalMs = intervalMs;
  }

  /** Persist current system + health state. Called by TaskQueue task or shutdown. */
  async save(systemState: SystemState, health: HealthMetrics): Promise<void> {
    const snapshot: PersistedSnapshot = {
      version:     CURRENT_VERSION,
      timestamp:   Date.now(),
      systemState,
      health,
    };
    await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  }

  /** Load and validate snapshot. Returns null if missing or incompatible version. */
  async load(): Promise<PersistedSnapshot | null> {
    try {
      const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
      if (!raw) return null;
      const snapshot = JSON.parse(raw) as PersistedSnapshot;
      if (snapshot.version !== CURRENT_VERSION) {
        console.warn('[PersistenceLayer] Version mismatch — discarding snapshot');
        return null;
      }
      return snapshot;
    } catch {
      return null;
    }
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(SNAPSHOT_KEY);
  }

  /** Autosave is handled via registered TaskQueue task — these methods kept for flexibility */
  startAutosave(getState: () => { systemState: SystemState; health: HealthMetrics }): void {
    if (this.autosaveTimer) return;
    this.autosaveTimer = setInterval(async () => {
      const { systemState, health } = getState();
      await this.save(systemState, health).catch(console.warn);
    }, this.intervalMs);
  }

  stopAutosave(): void {
    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer);
      this.autosaveTimer = null;
    }
  }
}
