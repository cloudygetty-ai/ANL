// src/core/persistence/PersistenceLayer.test.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersistenceLayer } from './PersistenceLayer';
import type { SystemState, HealthMetrics, PersistedSnapshot } from '../../types/index';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('@utils/Logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Typed references to the mocked AsyncStorage methods for assertion convenience
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;

const SNAPSHOT_KEY = 'anl:system:snapshot';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeState(overrides?: Partial<SystemState>): SystemState {
  return {
    status: 'running',
    startedAt: 1000,
    iteration: 5,
    errors: [],
    recovery: {
      count: 0,
      lastRecoveredAt: null,
      restoredFromSnapshot: false,
    },
    ...overrides,
  };
}

function makeHealth(overrides?: Partial<HealthMetrics>): HealthMetrics {
  return {
    uptimeMs: 5000,
    errorCount: 0,
    errorLog: [],
    memoryPressureEvents: 0,
    avgIterationMs: 100,
    p95IterationMs: 200,
    recoveryEvents: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PersistenceLayer', () => {
  let persistence: PersistenceLayer;

  beforeEach(() => {
    jest.clearAllMocks();
    // Use a short interval so autosave tests can advance timers quickly
    persistence = new PersistenceLayer(1000);
  });

  afterEach(() => {
    // Always stop autosave to avoid timer leaks between tests
    persistence.stopAutosave();
  });

  // -------------------------------------------------------------------------
  // constructor
  // -------------------------------------------------------------------------

  describe('constructor', () => {
    it('accepts a custom snapshotIntervalMs', () => {
      // Verifying the constructor does not throw and the instance is valid
      const custom = new PersistenceLayer(5000);
      expect(custom).toBeInstanceOf(PersistenceLayer);
      custom.stopAutosave();
    });

    it('uses the default snapshotIntervalMs of 30000 when none is provided', () => {
      const defaultInstance = new PersistenceLayer();
      expect(defaultInstance).toBeInstanceOf(PersistenceLayer);
      defaultInstance.stopAutosave();
    });
  });

  // -------------------------------------------------------------------------
  // save
  // -------------------------------------------------------------------------

  describe('save()', () => {
    it('writes a JSON-serialised PersistedSnapshot to AsyncStorage under the correct key', async () => {
      const state = makeState();
      const health = makeHealth();

      await persistence.save(state, health);

      expect(mockSetItem).toHaveBeenCalledTimes(1);

      const [calledKey, calledValue] = mockSetItem.mock.calls[0] as [string, string];
      expect(calledKey).toBe(SNAPSHOT_KEY);

      const parsed = JSON.parse(calledValue) as PersistedSnapshot;
      expect(parsed.version).toBe(1);
      expect(parsed.systemState).toEqual(state);
      expect(parsed.health).toEqual(health);
      expect(typeof parsed.timestamp).toBe('number');
    });

    it('stores a timestamp that is close to the current time', async () => {
      const before = Date.now();
      await persistence.save(makeState(), makeHealth());
      const after = Date.now();

      const [, calledValue] = mockSetItem.mock.calls[0] as [string, string];
      const { timestamp } = JSON.parse(calledValue) as PersistedSnapshot;

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('preserves all SystemState fields in the snapshot', async () => {
      const state = makeState({
        status: 'degraded',
        startedAt: 9999,
        iteration: 42,
        errors: [
          {
            id: 'e1',
            message: 'boom',
            module: 'Test',
            timestamp: 1234,
            recoverable: true,
          },
        ],
        recovery: { count: 2, lastRecoveredAt: 8888, restoredFromSnapshot: true },
      });

      await persistence.save(state, makeHealth());

      const [, calledValue] = mockSetItem.mock.calls[0] as [string, string];
      const { systemState } = JSON.parse(calledValue) as PersistedSnapshot;

      expect(systemState).toEqual(state);
    });

    it('preserves all HealthMetrics fields in the snapshot', async () => {
      const health = makeHealth({
        uptimeMs: 99999,
        errorCount: 7,
        memoryPressureEvents: 3,
        avgIterationMs: 150,
        p95IterationMs: 400,
        recoveryEvents: 2,
      });

      await persistence.save(makeState(), health);

      const [, calledValue] = mockSetItem.mock.calls[0] as [string, string];
      const { health: savedHealth } = JSON.parse(calledValue) as PersistedSnapshot;

      expect(savedHealth).toEqual(health);
    });
  });

  // -------------------------------------------------------------------------
  // load
  // -------------------------------------------------------------------------

  describe('load()', () => {
    it('returns null when no snapshot exists in AsyncStorage', async () => {
      mockGetItem.mockResolvedValueOnce(null);

      const result = await persistence.load();

      expect(result).toBeNull();
      expect(mockGetItem).toHaveBeenCalledWith(SNAPSHOT_KEY);
    });

    it('returns a valid PersistedSnapshot when the stored data is well-formed', async () => {
      const state = makeState({ iteration: 10 });
      const health = makeHealth({ uptimeMs: 12345 });
      const snapshot: PersistedSnapshot = {
        version: 1,
        timestamp: Date.now(),
        systemState: state,
        health,
      };

      mockGetItem.mockResolvedValueOnce(JSON.stringify(snapshot));

      const result = await persistence.load();

      expect(result).not.toBeNull();
      expect(result!.version).toBe(1);
      expect(result!.systemState).toEqual(state);
      expect(result!.health).toEqual(health);
    });

    it('performs a save/load round trip and returns identical data', async () => {
      const state = makeState({ status: 'stopped', iteration: 99 });
      const health = makeHealth({ errorCount: 3, recoveryEvents: 1 });

      // Capture what save writes, then feed it back to load
      let stored = '';
      mockSetItem.mockImplementationOnce((_key: string, value: string) => {
        stored = value;
        return Promise.resolve();
      });
      mockGetItem.mockImplementationOnce(() => Promise.resolve(stored));

      await persistence.save(state, health);
      const result = await persistence.load();

      expect(result).not.toBeNull();
      expect(result!.systemState).toEqual(state);
      expect(result!.health).toEqual(health);
      expect(result!.version).toBe(1);
    });

    it('returns null and does not throw when the stored JSON is corrupt', async () => {
      mockGetItem.mockResolvedValueOnce('{ this is not valid JSON !!!');

      const result = await persistence.load();

      expect(result).toBeNull();
    });

    it('returns null when the snapshot version does not match', async () => {
      const snapshot = {
        version: 99, // wrong version
        timestamp: Date.now(),
        systemState: makeState(),
        health: makeHealth(),
      };

      mockGetItem.mockResolvedValueOnce(JSON.stringify(snapshot));

      const result = await persistence.load();

      expect(result).toBeNull();
    });

    it('returns null when version is 0', async () => {
      const snapshot = {
        version: 0,
        timestamp: Date.now(),
        systemState: makeState(),
        health: makeHealth(),
      };

      mockGetItem.mockResolvedValueOnce(JSON.stringify(snapshot));

      const result = await persistence.load();

      expect(result).toBeNull();
    });

    it('reads from the correct AsyncStorage key', async () => {
      mockGetItem.mockResolvedValueOnce(null);

      await persistence.load();

      expect(mockGetItem).toHaveBeenCalledWith(SNAPSHOT_KEY);
    });
  });

  // -------------------------------------------------------------------------
  // clear
  // -------------------------------------------------------------------------

  describe('clear()', () => {
    it('calls AsyncStorage.removeItem with the correct key', async () => {
      await persistence.clear();

      expect(mockRemoveItem).toHaveBeenCalledTimes(1);
      expect(mockRemoveItem).toHaveBeenCalledWith(SNAPSHOT_KEY);
    });

    it('does not throw when called multiple times', async () => {
      await expect(persistence.clear()).resolves.toBeUndefined();
      await expect(persistence.clear()).resolves.toBeUndefined();
      expect(mockRemoveItem).toHaveBeenCalledTimes(2);
    });

    it('causes a subsequent load to return null', async () => {
      // After clear, getItem should return null (simulating an empty store)
      mockGetItem.mockResolvedValueOnce(null);

      await persistence.clear();
      const result = await persistence.load();

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // startAutosave / stopAutosave
  // -------------------------------------------------------------------------

  describe('startAutosave()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('calls save after each interval elapses', async () => {
      const getState = jest.fn(() => makeState());
      const getHealth = jest.fn(() => makeHealth());

      persistence.startAutosave(getState, getHealth);

      // Advance past one interval (1000 ms from constructor)
      jest.advanceTimersByTime(1000);

      // Allow the async save call inside the interval to settle
      await Promise.resolve();

      expect(mockSetItem).toHaveBeenCalledTimes(1);
      expect(getState).toHaveBeenCalledTimes(1);
      expect(getHealth).toHaveBeenCalledTimes(1);
    });

    it('saves multiple times as the interval fires repeatedly', async () => {
      const getState = jest.fn(() => makeState());
      const getHealth = jest.fn(() => makeHealth());

      persistence.startAutosave(getState, getHealth);

      jest.advanceTimersByTime(3000);
      await Promise.resolve();

      expect(mockSetItem).toHaveBeenCalledTimes(3);
    });

    it('cancels any running interval before starting a new one', async () => {
      const getState = jest.fn(() => makeState());
      const getHealth = jest.fn(() => makeHealth());

      // Start twice — only one interval should be running
      persistence.startAutosave(getState, getHealth);
      persistence.startAutosave(getState, getHealth);

      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      // If two intervals were running we would see 2 calls
      expect(mockSetItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopAutosave()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('prevents further saves after being called', async () => {
      const getState = jest.fn(() => makeState());
      const getHealth = jest.fn(() => makeHealth());

      persistence.startAutosave(getState, getHealth);
      persistence.stopAutosave();

      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      expect(mockSetItem).not.toHaveBeenCalled();
    });

    it('is safe to call when autosave was never started', () => {
      // Should not throw
      expect(() => persistence.stopAutosave()).not.toThrow();
    });

    it('is safe to call multiple times in a row', () => {
      persistence.startAutosave(
        () => makeState(),
        () => makeHealth(),
      );
      expect(() => {
        persistence.stopAutosave();
        persistence.stopAutosave();
        persistence.stopAutosave();
      }).not.toThrow();
    });
  });
});
