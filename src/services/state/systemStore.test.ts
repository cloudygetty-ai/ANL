// src/services/state/systemStore.test.ts
//
// Unit tests for the Zustand system store.
//
// The store is a module-level singleton, so we reset it to its default shape
// before every test using setState({ ... }).  This avoids state leaking
// between tests without needing to re-import the module.
//
// No React rendering is required — Zustand exposes getState() and setState()
// directly on the store object, which is the correct way to test stores in
// isolation.

import { useSystemStore } from './systemStore';

// ---------------------------------------------------------------------------
// Inline types (mirrors src/types/index.ts — no alias resolution needed)
// ---------------------------------------------------------------------------

type SystemStatus = 'initializing' | 'running' | 'degraded' | 'stopped';

interface SystemError {
  id: string;
  message: string;
  module: string;
  timestamp: number;
  recoverable: boolean;
}

interface RecoveryInfo {
  count: number;
  lastRecoveredAt: number | null;
  restoredFromSnapshot: boolean;
}

interface SystemState {
  status: SystemStatus;
  startedAt: number;
  iteration: number;
  errors: SystemError[];
  recovery: RecoveryInfo;
}

interface HealthMetrics {
  uptimeMs: number;
  errorCount: number;
  errorLog: SystemError[];
  memoryPressureEvents: number;
  avgIterationMs: number;
  p95IterationMs: number;
  recoveryEvents: number;
}

// ---------------------------------------------------------------------------
// Default shapes — kept in sync with the store's own defaults.
// ---------------------------------------------------------------------------

const defaultSystemState: SystemState = {
  status: 'initializing',
  startedAt: 0,
  iteration: 0,
  errors: [],
  recovery: {
    count: 0,
    lastRecoveredAt: null,
    restoredFromSnapshot: false,
  },
};

const defaultHealth: HealthMetrics = {
  uptimeMs: 0,
  errorCount: 0,
  errorLog: [],
  memoryPressureEvents: 0,
  avgIterationMs: 0,
  p95IterationMs: 0,
  recoveryEvents: 0,
};

// ---------------------------------------------------------------------------
// Helper: reset the store to a known blank state before each test.
// ---------------------------------------------------------------------------

function resetStore(): void {
  useSystemStore.setState({
    systemState: { ...defaultSystemState, startedAt: Date.now() },
    health: { ...defaultHealth },
  });
}

// ---------------------------------------------------------------------------
// Helper: build a HealthMetrics object with optional overrides.
// ---------------------------------------------------------------------------

function makeHealth(overrides: Partial<HealthMetrics> = {}): HealthMetrics {
  return { ...defaultHealth, ...overrides };
}

// ---------------------------------------------------------------------------
// Helper: build a SystemState with optional overrides.
// ---------------------------------------------------------------------------

function makeState(overrides: Partial<SystemState> = {}): SystemState {
  return {
    ...defaultSystemState,
    startedAt: Date.now(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetStore();
});

describe('useSystemStore', () => {

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------

  describe('initial state', () => {
    it('has status "initializing" by default', () => {
      const { systemState } = useSystemStore.getState();
      expect(systemState.status).toBe('initializing');
    });

    it('starts with iteration count of 0', () => {
      const { systemState } = useSystemStore.getState();
      expect(systemState.iteration).toBe(0);
    });

    it('starts with an empty error list', () => {
      const { systemState } = useSystemStore.getState();
      expect(systemState.errors).toEqual([]);
    });

    it('starts with recovery count of 0', () => {
      const { systemState } = useSystemStore.getState();
      expect(systemState.recovery.count).toBe(0);
    });

    it('starts with restoredFromSnapshot false', () => {
      const { systemState } = useSystemStore.getState();
      expect(systemState.recovery.restoredFromSnapshot).toBe(false);
    });

    it('starts with default zeroed health metrics', () => {
      const { health } = useSystemStore.getState();
      expect(health.errorCount).toBe(0);
      expect(health.uptimeMs).toBe(0);
      expect(health.avgIterationMs).toBe(0);
      expect(health.p95IterationMs).toBe(0);
      expect(health.memoryPressureEvents).toBe(0);
      expect(health.recoveryEvents).toBe(0);
      expect(health.errorLog).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // setStatus
  // -------------------------------------------------------------------------

  describe('setStatus', () => {
    it('updates systemState.status to the given value', () => {
      useSystemStore.getState().setStatus('running');
      expect(useSystemStore.getState().systemState.status).toBe('running');
    });

    it('accepts all valid status values', () => {
      const statuses: SystemStatus[] = ['initializing', 'running', 'degraded', 'stopped'];
      for (const status of statuses) {
        useSystemStore.getState().setStatus(status);
        expect(useSystemStore.getState().systemState.status).toBe(status);
      }
    });

    it('does not mutate other fields in systemState', () => {
      const before = useSystemStore.getState().systemState;
      useSystemStore.getState().setStatus('degraded');
      const after = useSystemStore.getState().systemState;

      expect(after.iteration).toBe(before.iteration);
      expect(after.startedAt).toBe(before.startedAt);
      expect(after.errors).toEqual(before.errors);
      expect(after.recovery).toEqual(before.recovery);
    });

    it('does not mutate health', () => {
      const healthBefore = useSystemStore.getState().health;
      useSystemStore.getState().setStatus('stopped');
      const healthAfter = useSystemStore.getState().health;

      expect(healthAfter).toEqual(healthBefore);
    });

    it('can be called multiple times and reflects the last value', () => {
      useSystemStore.getState().setStatus('running');
      useSystemStore.getState().setStatus('degraded');
      useSystemStore.getState().setStatus('stopped');

      expect(useSystemStore.getState().systemState.status).toBe('stopped');
    });
  });

  // -------------------------------------------------------------------------
  // updateHealth
  // -------------------------------------------------------------------------

  describe('updateHealth', () => {
    it('replaces the entire health object', () => {
      const newHealth = makeHealth({ uptimeMs: 9000, errorCount: 3 });
      useSystemStore.getState().updateHealth(newHealth);

      expect(useSystemStore.getState().health).toEqual(newHealth);
    });

    it('replaces all health fields, including those not explicitly changed', () => {
      // Set non-default values in health first.
      useSystemStore.getState().updateHealth(makeHealth({ errorCount: 5, uptimeMs: 1000 }));

      // Replace with a fresh health object that has errorCount: 0.
      const freshHealth = makeHealth({ uptimeMs: 2000 });
      useSystemStore.getState().updateHealth(freshHealth);

      expect(useSystemStore.getState().health.errorCount).toBe(0);
      expect(useSystemStore.getState().health.uptimeMs).toBe(2000);
    });

    it('does not mutate systemState', () => {
      const stateBefore = useSystemStore.getState().systemState;
      useSystemStore.getState().updateHealth(makeHealth({ uptimeMs: 5000 }));
      const stateAfter = useSystemStore.getState().systemState;

      expect(stateAfter).toEqual(stateBefore);
    });

    it('can be called repeatedly and always reflects the latest value', () => {
      useSystemStore.getState().updateHealth(makeHealth({ uptimeMs: 100 }));
      useSystemStore.getState().updateHealth(makeHealth({ uptimeMs: 200 }));
      useSystemStore.getState().updateHealth(makeHealth({ uptimeMs: 300 }));

      expect(useSystemStore.getState().health.uptimeMs).toBe(300);
    });
  });

  // -------------------------------------------------------------------------
  // incrementIteration
  // -------------------------------------------------------------------------

  describe('incrementIteration', () => {
    it('increments iteration from 0 to 1', () => {
      useSystemStore.getState().incrementIteration();
      expect(useSystemStore.getState().systemState.iteration).toBe(1);
    });

    it('increments correctly across multiple calls', () => {
      useSystemStore.getState().incrementIteration();
      useSystemStore.getState().incrementIteration();
      useSystemStore.getState().incrementIteration();

      expect(useSystemStore.getState().systemState.iteration).toBe(3);
    });

    it('does not mutate other fields in systemState', () => {
      // Set a known status so we can verify it is untouched.
      useSystemStore.getState().setStatus('running');

      const before = useSystemStore.getState().systemState;
      useSystemStore.getState().incrementIteration();
      const after = useSystemStore.getState().systemState;

      expect(after.status).toBe(before.status);
      expect(after.startedAt).toBe(before.startedAt);
      expect(after.errors).toEqual(before.errors);
      expect(after.recovery).toEqual(before.recovery);
    });

    it('does not mutate health', () => {
      const healthBefore = useSystemStore.getState().health;
      useSystemStore.getState().incrementIteration();
      const healthAfter = useSystemStore.getState().health;

      expect(healthAfter).toEqual(healthBefore);
    });
  });

  // -------------------------------------------------------------------------
  // restoreFromSnapshot
  // -------------------------------------------------------------------------

  describe('restoreFromSnapshot', () => {
    it('sets systemState.status to "running" regardless of snapshot status', () => {
      const snapshot = makeState({ status: 'degraded' });
      useSystemStore.getState().restoreFromSnapshot(snapshot, makeHealth());

      expect(useSystemStore.getState().systemState.status).toBe('running');
    });

    it('sets restoredFromSnapshot to true', () => {
      const snapshot = makeState({ recovery: { count: 0, lastRecoveredAt: null, restoredFromSnapshot: false } });
      useSystemStore.getState().restoreFromSnapshot(snapshot, makeHealth());

      expect(useSystemStore.getState().systemState.recovery.restoredFromSnapshot).toBe(true);
    });

    it('increments recovery.count by 1 relative to the snapshot value', () => {
      const snapshot = makeState({ recovery: { count: 4, lastRecoveredAt: null, restoredFromSnapshot: false } });
      useSystemStore.getState().restoreFromSnapshot(snapshot, makeHealth());

      expect(useSystemStore.getState().systemState.recovery.count).toBe(5);
    });

    it('sets recovery.lastRecoveredAt to a recent timestamp', () => {
      const before = Date.now();
      const snapshot = makeState();
      useSystemStore.getState().restoreFromSnapshot(snapshot, makeHealth());
      const after = Date.now();

      const { lastRecoveredAt } = useSystemStore.getState().systemState.recovery;
      expect(lastRecoveredAt).not.toBeNull();
      expect(lastRecoveredAt as number).toBeGreaterThanOrEqual(before);
      expect(lastRecoveredAt as number).toBeLessThanOrEqual(after);
    });

    it('restores iteration count from the snapshot', () => {
      const snapshot = makeState({ iteration: 42 });
      useSystemStore.getState().restoreFromSnapshot(snapshot, makeHealth());

      expect(useSystemStore.getState().systemState.iteration).toBe(42);
    });

    it('restores the health object exactly', () => {
      const health = makeHealth({ uptimeMs: 8000, errorCount: 7, avgIterationMs: 120 });
      useSystemStore.getState().restoreFromSnapshot(makeState(), health);

      expect(useSystemStore.getState().health).toEqual(health);
    });

    it('restores startedAt from the snapshot', () => {
      const startedAt = Date.now() - 60_000;
      const snapshot = makeState({ startedAt });
      useSystemStore.getState().restoreFromSnapshot(snapshot, makeHealth());

      expect(useSystemStore.getState().systemState.startedAt).toBe(startedAt);
    });

    it('preserves errors array from the snapshot', () => {
      const errors: SystemError[] = [
        { id: 'e1', message: 'old error', module: 'mod', timestamp: 1000, recoverable: false },
      ];
      const snapshot = makeState({ errors });
      useSystemStore.getState().restoreFromSnapshot(snapshot, makeHealth());

      expect(useSystemStore.getState().systemState.errors).toEqual(errors);
    });

    it('consecutive restores keep incrementing recovery.count', () => {
      const snap1 = makeState({ recovery: { count: 0, lastRecoveredAt: null, restoredFromSnapshot: false } });
      useSystemStore.getState().restoreFromSnapshot(snap1, makeHealth());
      expect(useSystemStore.getState().systemState.recovery.count).toBe(1);

      // The second restore receives the current store state as the snapshot
      // (simulating a second crash-recovery cycle).
      const currentState = useSystemStore.getState().systemState;
      useSystemStore.getState().restoreFromSnapshot(currentState, makeHealth());
      expect(useSystemStore.getState().systemState.recovery.count).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // Cross-action / integration scenarios
  // -------------------------------------------------------------------------

  describe('cross-action behaviour', () => {
    it('setStatus and incrementIteration can be called independently without interference', () => {
      useSystemStore.getState().setStatus('running');
      useSystemStore.getState().incrementIteration();
      useSystemStore.getState().incrementIteration();
      useSystemStore.getState().setStatus('degraded');

      const { systemState } = useSystemStore.getState();
      expect(systemState.status).toBe('degraded');
      expect(systemState.iteration).toBe(2);
    });

    it('updateHealth and incrementIteration do not affect each other', () => {
      useSystemStore.getState().incrementIteration();
      useSystemStore.getState().updateHealth(makeHealth({ errorCount: 9 }));
      useSystemStore.getState().incrementIteration();

      const state = useSystemStore.getState();
      expect(state.systemState.iteration).toBe(2);
      expect(state.health.errorCount).toBe(9);
    });

    it('restoreFromSnapshot followed by incrementIteration works correctly', () => {
      const snapshot = makeState({ iteration: 10 });
      useSystemStore.getState().restoreFromSnapshot(snapshot, makeHealth());

      useSystemStore.getState().incrementIteration();
      useSystemStore.getState().incrementIteration();

      expect(useSystemStore.getState().systemState.iteration).toBe(12);
    });

    it('restoreFromSnapshot followed by setStatus overwrites the forced "running" status', () => {
      useSystemStore.getState().restoreFromSnapshot(makeState(), makeHealth());
      expect(useSystemStore.getState().systemState.status).toBe('running');

      useSystemStore.getState().setStatus('degraded');
      expect(useSystemStore.getState().systemState.status).toBe('degraded');
    });
  });
});
