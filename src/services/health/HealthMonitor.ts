// src/services/health/HealthMonitor.ts
import type { HealthMetrics, SystemError } from '@types/index';

const MAX_ERROR_LOG = 100;
const MAX_ITERATION_SAMPLES = 50;

export class HealthMonitor {
  private startedAt = Date.now();
  private errorLog: SystemError[] = [];
  private errorCount = 0;
  private memoryPressureEvents = 0;
  private recoveryEvents = 0;
  private iterationTimes: number[] = [];

  recordError(error: SystemError): void {
    this.errorCount++;
    this.errorLog.push(error);
    if (this.errorLog.length > MAX_ERROR_LOG) {
      this.errorLog.shift();
    }
  }

  recordMemoryPressure(): void {
    this.memoryPressureEvents++;
  }

  recordRecovery(): void {
    this.recoveryEvents++;
  }

  recordIteration(ms: number): void {
    this.iterationTimes.push(ms);
    if (this.iterationTimes.length > MAX_ITERATION_SAMPLES) {
      this.iterationTimes.shift();
    }
  }

  getMetrics(): HealthMetrics {
    const sorted = [...this.iterationTimes].sort((a, b) => a - b);
    const avg =
      sorted.length > 0
        ? sorted.reduce((s, v) => s + v, 0) / sorted.length
        : 0;
    const p95 =
      sorted.length > 0
        ? sorted[Math.floor(sorted.length * 0.95)]
        : 0;

    return {
      uptimeMs: Date.now() - this.startedAt,
      errorCount: this.errorCount,
      errorLog: [...this.errorLog],
      memoryPressureEvents: this.memoryPressureEvents,
      avgIterationMs: Math.round(avg),
      p95IterationMs: Math.round(p95),
      recoveryEvents: this.recoveryEvents,
    };
  }

  reset(): void {
    this.startedAt = Date.now();
    this.errorLog = [];
    this.errorCount = 0;
    this.memoryPressureEvents = 0;
    this.recoveryEvents = 0;
    this.iterationTimes = [];
  }
}
