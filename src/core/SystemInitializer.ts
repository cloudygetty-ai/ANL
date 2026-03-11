// src/core/SystemInitializer.ts
import { EventLoopManager } from '@core/eventLoop/EventLoopManager';
import { TaskQueue } from '@core/scheduler/TaskQueue';
import { PersistenceLayer } from '@core/persistence/PersistenceLayer';
import { HealthMonitor } from '@services/health';
import { BackgroundService } from '@services/background';
import { useSystemStore } from '@services/state/systemStore';
import { logger } from '@utils/Logger';
import type { Task } from '@types/index';

const MODULE = 'SystemInitializer';

let _initialized = false;
let _eventLoop: EventLoopManager | null = null;
let _taskQueue: TaskQueue | null = null;
let _persistence: PersistenceLayer | null = null;
let _health: HealthMonitor | null = null;
let _background: BackgroundService | null = null;

export async function initializeSystem(): Promise<void> {
  if (_initialized) return;

  const store = useSystemStore.getState();
  store.setStatus('initializing');

  // WHY: Boot order matters — HealthMonitor first so other components can record errors
  _health = new HealthMonitor();
  _taskQueue = new TaskQueue();
  _persistence = new PersistenceLayer(30000);
  _background = new BackgroundService();

  // Attempt to restore from snapshot
  const snapshot = await _persistence.load();
  if (snapshot) {
    _health.recordRecovery();
    store.restoreFromSnapshot(snapshot.systemState, snapshot.health);
    logger.info(MODULE, 'Restored from snapshot', { at: new Date(snapshot.timestamp).toISOString() });
  } else {
    logger.info(MODULE, 'No snapshot found — fresh start');
  }

  // Register built-in CRITICAL tasks
  const healthCheckTask: Task = {
    id: 'system:health-check',
    name: 'HealthCheck',
    priority: 'CRITICAL',
    intervalMs: 10000,
    scheduledAt: Date.now(),
    lastRunAt: null,
    execute: async () => {
      const metrics = _health!.getMetrics();
      useSystemStore.getState().updateHealth(metrics);
    },
  };

  const persistTask: Task = {
    id: 'system:persist',
    name: 'PersistState',
    priority: 'CRITICAL',
    intervalMs: 30000,
    scheduledAt: Date.now(),
    lastRunAt: null,
    execute: async () => {
      const state = useSystemStore.getState().systemState;
      const health = _health!.getMetrics();
      await _persistence!.save(state, health);
    },
  };

  const iterationCountTask: Task = {
    id: 'system:iteration-count',
    name: 'IterationCount',
    priority: 'CRITICAL',
    intervalMs: 1000,
    scheduledAt: Date.now(),
    lastRunAt: null,
    execute: async () => {
      useSystemStore.getState().incrementIteration();
    },
  };

  _taskQueue.register(healthCheckTask);
  _taskQueue.register(persistTask);
  _taskQueue.register(iterationCountTask);

  // Start event loop and background service
  _eventLoop = new EventLoopManager(_taskQueue, _health);
  _eventLoop.start();
  _background.start();

  store.setStatus('running');
  _initialized = true;

  logger.info(MODULE, 'System running');
}

export function getEventLoop(): EventLoopManager | null {
  return _eventLoop;
}

export function getTaskQueue(): TaskQueue | null {
  return _taskQueue;
}

export function getHealth(): HealthMonitor | null {
  return _health;
}

export function getBackground(): BackgroundService | null {
  return _background;
}

export async function shutdownSystem(): Promise<void> {
  _eventLoop?.stop();
  _background?.stop();
  if (_persistence && _health) {
    const state = useSystemStore.getState().systemState;
    await _persistence.save(state, _health.getMetrics());
  }
  _initialized = false;
}
