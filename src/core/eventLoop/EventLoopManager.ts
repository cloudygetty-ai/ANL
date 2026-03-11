// src/core/eventLoop/EventLoopManager.ts
import { AppState } from 'react-native';
import { TaskQueue } from '@core/scheduler/TaskQueue';
import { HealthMonitor } from '@services/health/HealthMonitor';
import { useSystemStore } from '@services/state/systemStore';
import { logger } from '@utils/Logger';
import type { SystemError, AppLifecycleState } from '@types/index';

const MIN_DELAY_MS = 500;
const MAX_DELAY_MS = 5000;
const IDLE_THRESHOLD_MS = 1000;
const BUSY_THRESHOLD_MS = 3000;
const SELF_HEAL_ERROR_THRESHOLD = 50;

const MODULE = 'EventLoopManager';

export class EventLoopManager {
  private running = false;
  private currentDelay = 1000;
  private iterationCount = 0;
  private taskQueue: TaskQueue;
  private health: HealthMonitor;
  private lifecycleState: AppLifecycleState = 'active';
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

  constructor(taskQueue: TaskQueue, health: HealthMonitor) {
    this.taskQueue = taskQueue;
    this.health = health;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.subscribeToAppState();
    logger.info(MODULE, 'Event loop started');
    this.loop();
  }

  stop(): void {
    this.running = false;
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    logger.info(MODULE, 'Event loop stopped');
  }

  isRunning(): boolean {
    return this.running;
  }

  private subscribeToAppState(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      (nextState: string) => {
        const mapped = this.mapAppState(nextState);
        if (mapped !== this.lifecycleState) {
          logger.info(MODULE, `App state: ${this.lifecycleState} -> ${mapped}`);
          this.lifecycleState = mapped;
        }
      }
    );
  }

  private mapAppState(state: string): AppLifecycleState {
    switch (state) {
      case 'active':
        return 'active';
      case 'background':
        return 'background';
      default:
        return 'inactive';
    }
  }

  private async loop(): Promise<void> {
    while (this.running) {
      const start = Date.now();

      try {
        await this.processEvents();
        await this.executeTasks();
        await this.updateState();
        await this.checkHealth();
      } catch (err) {
        // WHY: Loop must never die due to a single failure
        const error: SystemError = {
          id: String(Date.now()),
          message: err instanceof Error ? err.message : String(err),
          module: MODULE,
          timestamp: Date.now(),
          recoverable: true,
        };
        this.health.recordError(error);
        logger.error(MODULE, 'Loop iteration error', error.message);
      }

      const elapsed = Date.now() - start;
      this.health.recordIteration(elapsed);
      this.iterationCount++;

      // Adaptive delay — backs off when idle, tightens when busy
      if (elapsed < IDLE_THRESHOLD_MS) {
        this.currentDelay = Math.min(this.currentDelay * 1.2, MAX_DELAY_MS);
      } else if (elapsed > BUSY_THRESHOLD_MS) {
        this.currentDelay = Math.max(this.currentDelay * 0.8, MIN_DELAY_MS);
      }

      // WHY: In background, relax further to save battery
      const delay =
        this.lifecycleState === 'background'
          ? Math.min(this.currentDelay * 2, MAX_DELAY_MS)
          : this.currentDelay;

      await this.wait(delay);
    }
  }

  private async processEvents(): Promise<void> {
    // Adjust behavior based on lifecycle state.
    // When backgrounded, only CRITICAL tasks run (filtered in executeTasks).
    if (this.lifecycleState === 'background') {
      logger.debug(MODULE, 'Background mode — limiting to critical tasks');
    }
  }

  private async executeTasks(): Promise<void> {
    const now = Date.now();
    let due = this.taskQueue.getDueTasks(now);

    // WHY: In background, only run CRITICAL tasks to conserve resources
    if (this.lifecycleState === 'background') {
      due = due.filter((t) => t.priority === 'CRITICAL');
    }

    for (const task of due) {
      try {
        await task.execute();
        this.taskQueue.markRan(task.id, now);
      } catch (err) {
        const error: SystemError = {
          id: String(Date.now()),
          message: err instanceof Error ? err.message : String(err),
          module: `Task:${task.name}`,
          timestamp: Date.now(),
          recoverable: true,
        };
        this.health.recordError(error);
        logger.error(MODULE, `Task ${task.name} failed`, error.message);
        this.taskQueue.markRan(task.id, now);
      }
    }
  }

  private async updateState(): Promise<void> {
    // Broadcast current iteration and health to the Zustand store
    const store = useSystemStore.getState();
    store.incrementIteration();

    const metrics = this.health.getMetrics();
    store.updateHealth(metrics);
  }

  private async checkHealth(): Promise<void> {
    const metrics = this.health.getMetrics();

    if (metrics.errorCount > SELF_HEAL_ERROR_THRESHOLD) {
      logger.warn(MODULE, 'High error count — triggering self-heal', {
        errorCount: metrics.errorCount,
      });
      this.selfHeal();
    }
  }

  private selfHeal(): void {
    // WHY: Self-heal clears accumulated errors, resets iteration timing,
    // and sets status to degraded so the dashboard reflects the healing event.
    logger.info(MODULE, 'Self-healing: resetting health metrics');

    this.health.reset();
    this.currentDelay = 1000;
    this.health.recordRecovery();

    const store = useSystemStore.getState();
    store.setStatus('degraded');

    // WHY: After heal, give the system a clean window. If errors recur
    // the threshold will be hit again and another heal will trigger.
    setTimeout(() => {
      const current = useSystemStore.getState().systemState.status;
      if (current === 'degraded') {
        useSystemStore.getState().setStatus('running');
        logger.info(MODULE, 'Self-heal recovery complete — status restored to running');
      }
    }, 30000);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getIterationCount(): number {
    return this.iterationCount;
  }

  getLifecycleState(): AppLifecycleState {
    return this.lifecycleState;
  }
}
