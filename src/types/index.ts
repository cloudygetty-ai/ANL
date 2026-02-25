// src/types/index.ts — Central type definitions

export type TaskPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
export type SystemStatus = 'initializing' | 'running' | 'degraded' | 'stopped';
export type PresenceStatus = 'online' | 'away' | 'offline';

export interface SystemState {
  status: SystemStatus;
  startedAt: number;
  iteration: number;
  errors: SystemError[];
  recovery: RecoveryInfo;
}

export interface SystemError {
  id: string;
  message: string;
  module: string;
  timestamp: number;
  recoverable: boolean;
}

export interface RecoveryInfo {
  count: number;
  lastRecoveredAt: number | null;
  restoredFromSnapshot: boolean;
}

export interface Task {
  id: string;
  name: string;
  priority: TaskPriority;
  execute: () => Promise<void>;
  scheduledAt: number;
  lastRunAt: number | null;
  intervalMs: number;
}

export interface HealthMetrics {
  uptimeMs: number;
  errorCount: number;
  errorLog: SystemError[];
  memoryPressureEvents: number;
  avgIterationMs: number;
  p95IterationMs: number;
  recoveryEvents: number;
}

export interface PersistedSnapshot {
  version: number;
  timestamp: number;
  systemState: SystemState;
  health: HealthMetrics;
}
