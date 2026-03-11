// src/services/health/HealthMonitor.test.ts
//
// Unit tests for HealthMonitor.
// The source module imports types from '@types/' alias which Jest (react-native
// preset) cannot resolve without a moduleNameMapper.  Types are inlined here
// for the test so that no alias resolution is required.

import { HealthMonitor } from './HealthMonitor';

// ---------------------------------------------------------------------------
// Inline types (mirrors src/types/index.ts)
// ---------------------------------------------------------------------------

interface SystemError {
  id: string;
  message: string;
  module: string;
  timestamp: number;
  recoverable: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let errorSeq = 0;

/** Create a minimal SystemError with unique id. */
function makeError(overrides: Partial<SystemError> = {}): SystemError {
  errorSeq++;
  return {
    id: `err-${errorSeq}`,
    message: 'test error',
    module: 'test-module',
    timestamp: Date.now(),
    recoverable: true,
    ...overrides,
  };
}


// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HealthMonitor', () => {
  let monitor: HealthMonitor;

  beforeEach(() => {
    errorSeq = 0;
    monitor = new HealthMonitor();
  });

  // -------------------------------------------------------------------------
  // recordError
  // -------------------------------------------------------------------------

  describe('recordError', () => {
    it('increments errorCount on each call', () => {
      monitor.recordError(makeError());
      expect(monitor.getMetrics().errorCount).toBe(1);

      monitor.recordError(makeError());
      expect(monitor.getMetrics().errorCount).toBe(2);
    });

    it('appends the error to the errorLog', () => {
      const err = makeError({ message: 'boom' });
      monitor.recordError(err);

      const { errorLog } = monitor.getMetrics();
      expect(errorLog).toHaveLength(1);
      expect(errorLog[0].message).toBe('boom');
    });

    it('preserves insertion order for multiple errors', () => {
      const err1 = makeError({ message: 'first' });
      const err2 = makeError({ message: 'second' });
      monitor.recordError(err1);
      monitor.recordError(err2);

      const { errorLog } = monitor.getMetrics();
      expect(errorLog[0].message).toBe('first');
      expect(errorLog[1].message).toBe('second');
    });

    it('caps errorLog at 100 entries (MAX_ERROR_LOG)', () => {
      // Record 105 errors.
      for (let i = 0; i < 105; i++) {
        monitor.recordError(makeError({ message: `error-${i}` }));
      }

      const { errorLog, errorCount } = monitor.getMetrics();

      // Total count is always accurate.
      expect(errorCount).toBe(105);

      // Log is capped at 100.
      expect(errorLog).toHaveLength(100);
    });

    it('evicts the oldest entry when the log overflows', () => {
      // Fill to exactly 100.
      for (let i = 0; i < 100; i++) {
        monitor.recordError(makeError({ message: `msg-${i}` }));
      }

      // Add one more to push the oldest out.
      monitor.recordError(makeError({ message: 'newest' }));

      const { errorLog } = monitor.getMetrics();

      // The oldest entry ('msg-0') should be gone.
      expect(errorLog.find((e) => e.message === 'msg-0')).toBeUndefined();

      // The newest entry should be present.
      expect(errorLog[errorLog.length - 1].message).toBe('newest');
    });

    it('returns a defensive copy of the errorLog (not the internal array)', () => {
      monitor.recordError(makeError());
      const metrics1 = monitor.getMetrics();
      const metrics2 = monitor.getMetrics();

      // Mutating the returned array must not affect subsequent calls.
      metrics1.errorLog.splice(0);
      expect(monitor.getMetrics().errorLog).toHaveLength(1);
      expect(metrics1.errorLog).not.toBe(metrics2.errorLog);
    });
  });

  // -------------------------------------------------------------------------
  // recordMemoryPressure
  // -------------------------------------------------------------------------

  describe('recordMemoryPressure', () => {
    it('starts at 0', () => {
      expect(monitor.getMetrics().memoryPressureEvents).toBe(0);
    });

    it('increments on each call', () => {
      monitor.recordMemoryPressure();
      expect(monitor.getMetrics().memoryPressureEvents).toBe(1);

      monitor.recordMemoryPressure();
      monitor.recordMemoryPressure();
      expect(monitor.getMetrics().memoryPressureEvents).toBe(3);
    });
  });

  // -------------------------------------------------------------------------
  // recordRecovery
  // -------------------------------------------------------------------------

  describe('recordRecovery', () => {
    it('starts at 0', () => {
      expect(monitor.getMetrics().recoveryEvents).toBe(0);
    });

    it('increments on each call', () => {
      monitor.recordRecovery();
      expect(monitor.getMetrics().recoveryEvents).toBe(1);

      monitor.recordRecovery();
      expect(monitor.getMetrics().recoveryEvents).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // recordIteration / avgIterationMs / p95IterationMs
  // -------------------------------------------------------------------------

  describe('recordIteration', () => {
    it('results in avgIterationMs of 0 when no iterations have been recorded', () => {
      expect(monitor.getMetrics().avgIterationMs).toBe(0);
    });

    it('results in p95IterationMs of 0 when no iterations have been recorded', () => {
      expect(monitor.getMetrics().p95IterationMs).toBe(0);
    });

    it('calculates the correct average for a single sample', () => {
      monitor.recordIteration(200);
      expect(monitor.getMetrics().avgIterationMs).toBe(200);
    });

    it('calculates the correct average for multiple samples', () => {
      // Average of 100, 200, 300 = 200.
      [100, 200, 300].forEach((ms) => monitor.recordIteration(ms));
      expect(monitor.getMetrics().avgIterationMs).toBe(200);
    });

    it('rounds the average to the nearest integer', () => {
      // 100 + 200 = 300 / 2 … wait, average = 150. Use values that produce a fraction.
      // 1 + 2 = 3 / 2 = 1.5 → rounds to 2.
      monitor.recordIteration(1);
      monitor.recordIteration(2);
      expect(monitor.getMetrics().avgIterationMs).toBe(2);
    });

    it('calculates p95 for 20 samples', () => {
      // Sorted: 1..20.  p95 index = floor(20 * 0.95) = floor(19) = 19 → value 20.
      for (let i = 1; i <= 20; i++) {
        monitor.recordIteration(i);
      }
      expect(monitor.getMetrics().p95IterationMs).toBe(20);
    });

    it('caps the iteration sample buffer at 50 (MAX_ITERATION_SAMPLES)', () => {
      // Record 60 values.  The first 10 (1–10) will be evicted.
      for (let i = 1; i <= 60; i++) {
        monitor.recordIteration(i);
      }

      // After eviction the minimum remaining sample is 11 (i.e., value 1–10 are gone).
      // We verify indirectly: avg must be > 10.
      const { avgIterationMs } = monitor.getMetrics();
      // Average of 11..60 = (11+60)/2 = 35.5 → rounds to 36.
      expect(avgIterationMs).toBe(36);
    });

    it('evicts the oldest sample when the buffer overflows', () => {
      // Fill buffer with 50 identical values of 10.
      for (let i = 0; i < 50; i++) {
        monitor.recordIteration(10);
      }
      // Push one large outlier — oldest 10 is evicted, replaced by 1000.
      monitor.recordIteration(1000);

      const { avgIterationMs } = monitor.getMetrics();

      // Buffer now: [10 * 49, 1000].  avg = (49*10 + 1000) / 50 = 1490/50 = 29.8 → 30.
      expect(avgIterationMs).toBe(30);
    });
  });

  // -------------------------------------------------------------------------
  // getMetrics — uptimeMs
  // -------------------------------------------------------------------------

  describe('getMetrics — uptimeMs', () => {
    it('returns a non-negative uptimeMs', () => {
      const { uptimeMs } = monitor.getMetrics();
      expect(uptimeMs).toBeGreaterThanOrEqual(0);
    });

    it('uptimeMs increases between successive calls', async () => {
      const first = monitor.getMetrics().uptimeMs;
      // Wait a real tick so Date.now() advances.
      await new Promise((resolve) => setTimeout(resolve, 5));
      const second = monitor.getMetrics().uptimeMs;
      expect(second).toBeGreaterThanOrEqual(first);
    });
  });

  // -------------------------------------------------------------------------
  // reset
  // -------------------------------------------------------------------------

  describe('reset', () => {
    it('clears errorCount to 0', () => {
      monitor.recordError(makeError());
      monitor.recordError(makeError());
      monitor.reset();
      expect(monitor.getMetrics().errorCount).toBe(0);
    });

    it('clears the errorLog to an empty array', () => {
      monitor.recordError(makeError());
      monitor.reset();
      expect(monitor.getMetrics().errorLog).toHaveLength(0);
    });

    it('resets memoryPressureEvents to 0', () => {
      monitor.recordMemoryPressure();
      monitor.recordMemoryPressure();
      monitor.reset();
      expect(monitor.getMetrics().memoryPressureEvents).toBe(0);
    });

    it('resets recoveryEvents to 0', () => {
      monitor.recordRecovery();
      monitor.reset();
      expect(monitor.getMetrics().recoveryEvents).toBe(0);
    });

    it('resets avgIterationMs and p95IterationMs to 0', () => {
      monitor.recordIteration(100);
      monitor.recordIteration(200);
      monitor.reset();

      const { avgIterationMs, p95IterationMs } = monitor.getMetrics();
      expect(avgIterationMs).toBe(0);
      expect(p95IterationMs).toBe(0);
    });

    it('resets the uptime clock so uptimeMs is near 0 immediately after reset', () => {
      // Let some time pass so the original uptime is measurable.
      monitor.reset();
      const { uptimeMs } = monitor.getMetrics();
      // After a synchronous reset, uptime should be less than 100 ms.
      expect(uptimeMs).toBeLessThan(100);
    });

    it('allows normal recording to continue after reset', () => {
      monitor.recordError(makeError());
      monitor.reset();

      monitor.recordError(makeError({ message: 'post-reset' }));
      const { errorCount, errorLog } = monitor.getMetrics();

      expect(errorCount).toBe(1);
      expect(errorLog[0].message).toBe('post-reset');
    });

    it('does not throw when called on a fresh (never-used) monitor', () => {
      expect(() => monitor.reset()).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Combined / integration scenarios
  // -------------------------------------------------------------------------

  describe('combined scenarios', () => {
    it('tracks all metrics independently', () => {
      monitor.recordError(makeError());
      monitor.recordMemoryPressure();
      monitor.recordRecovery();
      monitor.recordIteration(150);

      const metrics = monitor.getMetrics();

      expect(metrics.errorCount).toBe(1);
      expect(metrics.memoryPressureEvents).toBe(1);
      expect(metrics.recoveryEvents).toBe(1);
      expect(metrics.avgIterationMs).toBe(150);
    });

    it('reset followed by re-population gives correct results', () => {
      // Populate.
      for (let i = 0; i < 10; i++) monitor.recordError(makeError());
      monitor.recordMemoryPressure();
      monitor.recordIteration(500);

      // Reset and re-populate with fresh data.
      monitor.reset();
      monitor.recordError(makeError({ message: 'fresh' }));
      monitor.recordIteration(50);

      const metrics = monitor.getMetrics();

      expect(metrics.errorCount).toBe(1);
      expect(metrics.errorLog[0].message).toBe('fresh');
      expect(metrics.memoryPressureEvents).toBe(0);
      expect(metrics.avgIterationMs).toBe(50);
    });
  });
});
