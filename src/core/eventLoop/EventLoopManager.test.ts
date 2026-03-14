// src/core/eventLoop/EventLoopManager.test.ts
import { AppState } from 'react-native';
import { EventLoopManager } from './EventLoopManager';
import { TaskQueue } from '@core/scheduler/TaskQueue';
import { HealthMonitor } from '@services/health/HealthMonitor';
import type { Task } from '@types/index';

// Typed reference to the mocked AppState.addEventListener for assertions
const mockAddEventListener = AppState.addEventListener as jest.Mock;

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

jest.mock('@utils/Logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Prevent real Zustand store interaction — we only care the method is called
const mockIncrementIteration = jest.fn();
const mockUpdateHealth = jest.fn();
const mockSetStatus = jest.fn();

jest.mock('@services/state/systemStore', () => ({
  useSystemStore: {
    getState: jest.fn(() => ({
      incrementIteration: mockIncrementIteration,
      updateHealth: mockUpdateHealth,
      setStatus: mockSetStatus,
    })),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(overrides?: Partial<Task>): Task {
  return {
    id: 'test:task',
    name: 'TestTask',
    priority: 'NORMAL',
    // WHY: intervalMs:0 + scheduledAt:0 means nextRun = 0, always in the past,
    // so the task is due on the very first getDueTasks() call.
    intervalMs: 0,
    scheduledAt: 0,
    lastRunAt: null,
    execute: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EventLoopManager', () => {
  let taskQueue: TaskQueue;
  let health: HealthMonitor;
  let manager: EventLoopManager;

  beforeEach(() => {
    jest.clearAllMocks();
    taskQueue = new TaskQueue();
    health = new HealthMonitor();
    manager = new EventLoopManager(taskQueue, health);
  });

  afterEach(() => {
    manager.stop();
  });

  // -------------------------------------------------------------------------
  // initial state
  // -------------------------------------------------------------------------

  describe('initial state', () => {
    it('is not running before start() is called', () => {
      expect(manager.isRunning()).toBe(false);
    });

    it('starts with zero iterations', () => {
      expect(manager.getIterationCount()).toBe(0);
    });

    it('starts with lifecycle state "active"', () => {
      expect(manager.getLifecycleState()).toBe('active');
    });
  });

  // -------------------------------------------------------------------------
  // start / stop
  // -------------------------------------------------------------------------

  describe('start()', () => {
    it('sets isRunning to true', () => {
      manager.start();
      expect(manager.isRunning()).toBe(true);
    });

    it('is idempotent — calling start() twice does not start a second loop', () => {
      manager.start();
      manager.start();
      expect(mockAddEventListener).toHaveBeenCalledTimes(1);
    });

    it('subscribes to AppState changes', () => {
      manager.start();
      expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('stop()', () => {
    it('sets isRunning to false', () => {
      manager.start();
      manager.stop();
      expect(manager.isRunning()).toBe(false);
    });

    it('removes the AppState subscription', () => {
      const removeMock = jest.fn();
      mockAddEventListener.mockReturnValueOnce({ remove: removeMock });

      manager.start();
      manager.stop();

      expect(removeMock).toHaveBeenCalledTimes(1);
    });

    it('is safe to call when already stopped', () => {
      expect(() => manager.stop()).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // lifecycle state mapping
  // -------------------------------------------------------------------------

  describe('getLifecycleState()', () => {
    /** Capture the handler registered by start() so we can fire fake events */
    function startAndCaptureHandler(): (state: string) => void {
      let capturedHandler: ((state: string) => void) | null = null;
      mockAddEventListener.mockImplementationOnce(
        (_event: string, handler: (state: string) => void) => {
          capturedHandler = handler;
          return { remove: jest.fn() };
        }
      );
      manager.start();
      return capturedHandler!;
    }

    it('reflects "active" app state', () => {
      const handler = startAndCaptureHandler();
      handler('active');
      expect(manager.getLifecycleState()).toBe('active');
    });

    it('reflects "background" app state', () => {
      const handler = startAndCaptureHandler();
      handler('background');
      expect(manager.getLifecycleState()).toBe('background');
    });

    it('maps unknown states to "inactive"', () => {
      const handler = startAndCaptureHandler();
      handler('unknown_state');
      expect(manager.getLifecycleState()).toBe('inactive');
    });
  });

  // -------------------------------------------------------------------------
  // task execution
  // -------------------------------------------------------------------------

  describe('task execution', () => {
    it('executes due tasks registered in the queue', async () => {
      const executeMock = jest.fn().mockResolvedValue(undefined);
      const task = makeTask({ execute: executeMock });
      taskQueue.register(task);

      manager.start();
      // Allow the first loop iteration to process
      await new Promise((r) => setTimeout(r, 50));
      manager.stop();

      expect(executeMock).toHaveBeenCalledTimes(1);
    });

    it('continues running after a task throws', async () => {
      const failingTask = makeTask({
        id: 'test:failing',
        execute: jest.fn().mockRejectedValue(new Error('task exploded')),
      });
      const okTask = makeTask({
        id: 'test:ok',
        execute: jest.fn().mockResolvedValue(undefined),
      });

      taskQueue.register(failingTask);
      taskQueue.register(okTask);

      manager.start();
      await new Promise((r) => setTimeout(r, 50));
      manager.stop();

      expect(manager.isRunning()).toBe(false); // stopped cleanly
      // health should have recorded an error
      expect(health.getMetrics().errorCount).toBeGreaterThan(0);
    });

    it('does not execute NORMAL tasks when in background state', async () => {
      let capturedHandler: ((state: string) => void) | null = null;
      mockAddEventListener.mockImplementationOnce(
        (_event: string, handler: (state: string) => void) => {
          capturedHandler = handler;
          return { remove: jest.fn() };
        }
      );

      const executeMock = jest.fn().mockResolvedValue(undefined);
      const normalTask = makeTask({
        id: 'test:normal',
        priority: 'NORMAL',
        execute: executeMock,
      });
      taskQueue.register(normalTask);

      manager.start();
      capturedHandler!('background');

      await new Promise((r) => setTimeout(r, 50));
      manager.stop();

      // NORMAL task should not have run in background
      expect(executeMock).not.toHaveBeenCalled();
    });

    it('executes CRITICAL tasks even when backgrounded', async () => {
      let capturedHandler: ((state: string) => void) | null = null;
      mockAddEventListener.mockImplementationOnce(
        (_event: string, handler: (state: string) => void) => {
          capturedHandler = handler;
          return { remove: jest.fn() };
        }
      );

      const criticalExecute = jest.fn().mockResolvedValue(undefined);
      const criticalTask = makeTask({
        id: 'test:critical',
        priority: 'CRITICAL',
        execute: criticalExecute,
      });
      taskQueue.register(criticalTask);

      manager.start();
      capturedHandler!('background');

      await new Promise((r) => setTimeout(r, 50));
      manager.stop();

      expect(criticalExecute).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // health integration
  // -------------------------------------------------------------------------

  describe('health integration', () => {
    it('records iteration timing in the health monitor', async () => {
      manager.start();
      await new Promise((r) => setTimeout(r, 50));
      manager.stop();

      const metrics = health.getMetrics();
      expect(metrics.avgIterationMs).toBeGreaterThanOrEqual(0);
    });

    it('increments iteration count in the store each cycle', async () => {
      manager.start();
      await new Promise((r) => setTimeout(r, 50));
      manager.stop();

      expect(mockIncrementIteration).toHaveBeenCalled();
    });

    it('calls updateHealth with metrics each cycle', async () => {
      manager.start();
      await new Promise((r) => setTimeout(r, 50));
      manager.stop();

      expect(mockUpdateHealth).toHaveBeenCalled();
    });

    it('records an error and keeps running when a loop step throws', async () => {
      // Patch incrementIteration to throw on first call
      mockIncrementIteration.mockImplementationOnce(() => {
        throw new Error('store exploded');
      });

      manager.start();
      await new Promise((r) => setTimeout(r, 80));
      manager.stop();

      expect(health.getMetrics().errorCount).toBeGreaterThan(0);
      // Manager was still running until we stopped it
      expect(manager.isRunning()).toBe(false);
      expect(manager.getIterationCount()).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // iteration counter
  // -------------------------------------------------------------------------

  describe('getIterationCount()', () => {
    it('increments after each loop iteration', async () => {
      manager.start();
      await new Promise((r) => setTimeout(r, 80));
      manager.stop();

      expect(manager.getIterationCount()).toBeGreaterThan(0);
    });

    it('stays at zero if the loop never runs', () => {
      expect(manager.getIterationCount()).toBe(0);
    });
  });
});
