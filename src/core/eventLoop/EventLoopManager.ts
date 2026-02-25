// src/core/eventLoop/EventLoopManager.ts
import { TaskQueue } from '@core/scheduler/TaskQueue';
import { HealthMonitor } from '@services/health/HealthMonitor';
import type { SystemError } from '@types/index';

const MIN_DELAY_MS = 500;
const MAX_DELAY_MS = 5000;
const IDLE_THRESHOLD_MS = 1000; // If iteration takes < this, back off
const BUSY_THRESHOLD_MS = 3000; // If iteration takes > this, tighten

export class EventLoopManager {
  private running = false;
  private currentDelay = 1000;
  private iterationCount = 0;
  private taskQueue: TaskQueue;
  private health: HealthMonitor;

  constructor(taskQueue: TaskQueue, health: HealthMonitor) {
    this.taskQueue = taskQueue;
    this.health = health;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  stop(): void {
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
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
          module: 'EventLoopManager',
          timestamp: Date.now(),
          recoverable: true,
        };
        this.health.recordError(error);
      }

      const elapsed = Date.now() - start;
      this.health.recordIteration(elapsed);
      this.iterationCount++;

      // Adaptive delay
      if (elapsed < IDLE_THRESHOLD_MS) {
        this.currentDelay = Math.min(this.currentDelay * 1.2, MAX_DELAY_MS);
      } else if (elapsed > BUSY_THRESHOLD_MS) {
        this.currentDelay = Math.max(this.currentDelay * 0.8, MIN_DELAY_MS);
      }

      await this.wait(this.currentDelay);
    }
  }

  private async processEvents(): Promise<void> {
    // TODO[NORMAL]: Hook into React Native AppState for background/foreground events
  }

  private async executeTasks(): Promise<void> {
    const now = Date.now();
    const due = this.taskQueue.getDueTasks(now);

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
        this.taskQueue.markRan(task.id, now); // Still mark ran to avoid tight-loop on failing task
      }
    }
  }

  private async updateState(): Promise<void> {
    // TODO[NORMAL]: Broadcast state changes to subscribers
  }

  private async checkHealth(): Promise<void> {
    const metrics = this.health.getMetrics();
    if (metrics.errorCount > 50) {
      // TODO[HIGH]: Trigger system self-heal if error rate is critical
      console.warn('[EventLoopManager] High error count:', metrics.errorCount);
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getIterationCount(): number {
    return this.iterationCount;
  }
}
