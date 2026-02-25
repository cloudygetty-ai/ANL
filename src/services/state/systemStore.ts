// src/services/state/systemStore.ts
import { create } from 'zustand';
import type { SystemState, HealthMetrics, SystemStatus } from '@types/index';

interface SystemStore {
  systemState: SystemState;
  health: HealthMetrics;

  setStatus: (status: SystemStatus) => void;
  updateHealth: (health: HealthMetrics) => void;
  incrementIteration: () => void;
  restoreFromSnapshot: (state: SystemState, health: HealthMetrics) => void;
}

const defaultSystemState: SystemState = {
  status: 'initializing',
  startedAt: Date.now(),
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

export const useSystemStore = create<SystemStore>((set) => ({
  systemState: defaultSystemState,
  health: defaultHealth,

  setStatus: (status) =>
    set((s) => ({
      systemState: { ...s.systemState, status },
    })),

  updateHealth: (health) => set({ health }),

  incrementIteration: () =>
    set((s) => ({
      systemState: {
        ...s.systemState,
        iteration: s.systemState.iteration + 1,
      },
    })),

  restoreFromSnapshot: (state, health) =>
    set({
      systemState: {
        ...state,
        status: 'running',
        recovery: {
          ...state.recovery,
          restoredFromSnapshot: true,
          lastRecoveredAt: Date.now(),
          count: state.recovery.count + 1,
        },
      },
      health,
    }),
}));
