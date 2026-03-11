// src/core/persistence/PersistenceLayer.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@utils/Logger';
import type { PersistedSnapshot, SystemState, HealthMetrics } from '@types/index';

const MODULE = 'PersistenceLayer';

const SNAPSHOT_KEY = 'anl:system:snapshot';
const SNAPSHOT_VERSION = 1;

export class PersistenceLayer {
  private snapshotIntervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(snapshotIntervalMs = 30000) {
    this.snapshotIntervalMs = snapshotIntervalMs;
  }

  startAutosave(
    getState: () => SystemState,
    getHealth: () => HealthMetrics
  ): void {
    this.stopAutosave();
    this.timer = setInterval(async () => {
      try {
        await this.save(getState(), getHealth());
      } catch (err) {
        // WHY: Autosave failure must not propagate — system continues running
        logger.warn(MODULE, 'Autosave failed', err);
      }
    }, this.snapshotIntervalMs);
  }

  stopAutosave(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async save(state: SystemState, health: HealthMetrics): Promise<void> {
    const snapshot: PersistedSnapshot = {
      version: SNAPSHOT_VERSION,
      timestamp: Date.now(),
      systemState: state,
      health,
    };
    await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  }

  async load(): Promise<PersistedSnapshot | null> {
    try {
      const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
      if (!raw) return null;
      const snapshot = JSON.parse(raw) as PersistedSnapshot;
      if (snapshot.version !== SNAPSHOT_VERSION) {
        logger.warn(MODULE, 'Snapshot version mismatch — discarding');
        return null;
      }
      return snapshot;
    } catch (err) {
      logger.warn(MODULE, 'Failed to load snapshot', err);
      return null;
    }
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(SNAPSHOT_KEY);
  }
}
