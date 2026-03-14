// src/core/SystemInitializer.test.ts
import {
  initializeSystem,
  shutdownSystem,
  getEventLoop,
  getTaskQueue,
  getHealth,
  getBackground,
} from './SystemInitializer';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Platform: { OS: 'ios' },
}));

jest.mock('@utils/Logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// PersistenceLayer — default: no snapshot
const mockLoad = jest.fn().mockResolvedValue(null);
const mockSave = jest.fn().mockResolvedValue(undefined);

jest.mock('@core/persistence/PersistenceLayer', () => ({
  PersistenceLayer: jest.fn().mockImplementation(() => ({
    load: mockLoad,
    save: mockSave,
    startAutosave: jest.fn(),
    stopAutosave: jest.fn(),
    clear: jest.fn().mockResolvedValue(undefined),
  })),
}));

// HealthMonitor
const mockRecordRecovery = jest.fn();
const mockGetMetrics = jest.fn().mockReturnValue({
  uptimeMs: 0,
  errorCount: 0,
  errorLog: [],
  memoryPressureEvents: 0,
  avgIterationMs: 0,
  p95IterationMs: 0,
  recoveryEvents: 0,
});

jest.mock('@services/health/HealthMonitor', () => ({
  HealthMonitor: jest.fn().mockImplementation(() => ({
    recordRecovery: mockRecordRecovery,
    getMetrics: mockGetMetrics,
    recordError: jest.fn(),
    recordIteration: jest.fn(),
    reset: jest.fn(),
  })),
}));

// BackgroundService
const mockBgStart = jest.fn();
const mockBgStop = jest.fn();

jest.mock('@services/background/BackgroundService', () => ({
  BackgroundService: jest.fn().mockImplementation(() => ({
    start: mockBgStart,
    stop: mockBgStop,
    getCurrentState: jest.fn().mockReturnValue('active'),
    onLifecycleChange: jest.fn().mockReturnValue(() => undefined),
    getConfig: jest.fn().mockReturnValue({}),
  })),
}));

// Zustand store
const mockSetStatus = jest.fn();
const mockIncrementIteration = jest.fn();
const mockUpdateHealth = jest.fn();
const mockRestoreFromSnapshot = jest.fn();

jest.mock('@services/state/systemStore', () => ({
  useSystemStore: {
    getState: jest.fn(() => ({
      setStatus: mockSetStatus,
      incrementIteration: mockIncrementIteration,
      updateHealth: mockUpdateHealth,
      restoreFromSnapshot: mockRestoreFromSnapshot,
      systemState: {
        status: 'running',
        startedAt: Date.now(),
        iteration: 0,
        errors: [],
        recovery: { count: 0, lastRecoveredAt: null, restoredFromSnapshot: false },
      },
    })),
  },
}));

jest.mock(
  'react-native-background-fetch',
  () => ({ default: { configure: jest.fn(), finish: jest.fn() } }),
  { virtual: true }
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SystemInitializer', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockLoad.mockResolvedValue(null);
    // Always start from a clean slate — shutdownSystem nulls all refs
    await shutdownSystem();
  });

  afterEach(async () => {
    await shutdownSystem();
  });

  // -------------------------------------------------------------------------
  // accessor functions — before initialization
  // -------------------------------------------------------------------------

  describe('accessors before initialization', () => {
    it('getEventLoop() returns null before init', () => {
      expect(getEventLoop()).toBeNull();
    });

    it('getTaskQueue() returns null before init', () => {
      expect(getTaskQueue()).toBeNull();
    });

    it('getHealth() returns null before init', () => {
      expect(getHealth()).toBeNull();
    });

    it('getBackground() returns null before init', () => {
      expect(getBackground()).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // fresh start (no snapshot)
  // -------------------------------------------------------------------------

  describe('fresh start (no snapshot)', () => {
    it('sets status to "initializing" then "running"', async () => {
      await initializeSystem();

      expect(mockSetStatus).toHaveBeenCalledWith('initializing');
      expect(mockSetStatus).toHaveBeenCalledWith('running');
    });

    it('starts the background service', async () => {
      await initializeSystem();
      expect(mockBgStart).toHaveBeenCalledTimes(1);
    });

    it('does not call recordRecovery on a fresh start', async () => {
      await initializeSystem();
      expect(mockRecordRecovery).not.toHaveBeenCalled();
    });

    it('does not call restoreFromSnapshot on a fresh start', async () => {
      await initializeSystem();
      expect(mockRestoreFromSnapshot).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // snapshot recovery
  // -------------------------------------------------------------------------

  describe('snapshot recovery', () => {
    const snapshot = {
      version: 1,
      timestamp: Date.now(),
      systemState: {
        status: 'running' as const,
        startedAt: 1000,
        iteration: 42,
        errors: [],
        recovery: { count: 1, lastRecoveredAt: 999, restoredFromSnapshot: true },
      },
      health: {
        uptimeMs: 5000,
        errorCount: 0,
        errorLog: [],
        memoryPressureEvents: 0,
        avgIterationMs: 100,
        p95IterationMs: 200,
        recoveryEvents: 1,
      },
    };

    it('calls restoreFromSnapshot when a valid snapshot exists', async () => {
      mockLoad.mockResolvedValueOnce(snapshot);
      await initializeSystem();

      expect(mockRestoreFromSnapshot).toHaveBeenCalledWith(
        snapshot.systemState,
        snapshot.health
      );
    });

    it('records a recovery event in HealthMonitor when restoring', async () => {
      mockLoad.mockResolvedValueOnce(snapshot);
      await initializeSystem();

      expect(mockRecordRecovery).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // idempotency
  // -------------------------------------------------------------------------

  describe('idempotency', () => {
    it('does not re-initialize when called twice', async () => {
      await initializeSystem();
      await initializeSystem();

      expect(mockBgStart).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // shutdown
  // -------------------------------------------------------------------------

  describe('shutdownSystem()', () => {
    it('stops the background service on shutdown', async () => {
      await initializeSystem();
      await shutdownSystem();

      expect(mockBgStop).toHaveBeenCalledTimes(1);
    });

    it('persists state on shutdown', async () => {
      await initializeSystem();
      jest.clearAllMocks(); // clear init's own save calls
      mockSave.mockResolvedValue(undefined);
      await shutdownSystem();

      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('nulls all accessors after shutdown', async () => {
      await initializeSystem();
      await shutdownSystem();

      expect(getEventLoop()).toBeNull();
      expect(getTaskQueue()).toBeNull();
      expect(getHealth()).toBeNull();
      expect(getBackground()).toBeNull();
    });

    it('is safe to call before initialize', async () => {
      await expect(shutdownSystem()).resolves.not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // accessors after initialization
  // -------------------------------------------------------------------------

  describe('accessors after initialization', () => {
    beforeEach(async () => {
      await initializeSystem();
    });

    it('getEventLoop() returns an instance', () => {
      expect(getEventLoop()).not.toBeNull();
    });

    it('getTaskQueue() returns an instance', () => {
      expect(getTaskQueue()).not.toBeNull();
    });

    it('getHealth() returns an instance', () => {
      expect(getHealth()).not.toBeNull();
    });

    it('getBackground() returns an instance', () => {
      expect(getBackground()).not.toBeNull();
    });
  });
});
