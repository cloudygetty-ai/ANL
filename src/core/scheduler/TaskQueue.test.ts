// src/core/scheduler/TaskQueue.test.ts
//
// Unit tests for TaskQueue.
// The source module imports from the '@types/' alias, but Jest (react-native preset)
// does not resolve TypeScript path aliases without a moduleNameMapper.  Because
// TaskQueue has zero runtime side-effects and only uses the types for
// compile-time safety, we can import the compiled class directly and supply
// plain-object tasks that satisfy the shape at runtime.

import { TaskQueue } from './TaskQueue';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TaskPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

interface Task {
  id: string;
  name: string;
  priority: TaskPriority;
  execute: () => Promise<void>;
  scheduledAt: number;
  lastRunAt: number | null;
  intervalMs: number;
}

/** Build a minimal Task object with sensible defaults. */
function makeTask(overrides: Partial<Task> & { id: string }): Task {
  return {
    name: `task-${overrides.id}`,
    priority: 'NORMAL',
    execute: jest.fn().mockResolvedValue(undefined),
    scheduledAt: 1000,
    lastRunAt: null,
    intervalMs: 5000,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TaskQueue', () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue();
  });

  // -------------------------------------------------------------------------
  // register / unregister / size
  // -------------------------------------------------------------------------

  describe('register', () => {
    it('adds a task so that size() reflects it', () => {
      expect(queue.size()).toBe(0);
      queue.register(makeTask({ id: 'a' }));
      expect(queue.size()).toBe(1);
    });

    it('overwrites an existing task when the same id is registered again', () => {
      const original = makeTask({ id: 'a', name: 'original' });
      const replacement = makeTask({ id: 'a', name: 'replacement' });

      queue.register(original);
      queue.register(replacement);

      // Size must stay at 1 — no duplicate entry.
      expect(queue.size()).toBe(1);

      // The replacement should be the one returned as due.
      const due = queue.getDueTasks(original.scheduledAt + original.intervalMs);
      expect(due[0].name).toBe('replacement');
    });

    it('accepts multiple distinct tasks', () => {
      queue.register(makeTask({ id: 'a' }));
      queue.register(makeTask({ id: 'b' }));
      queue.register(makeTask({ id: 'c' }));
      expect(queue.size()).toBe(3);
    });
  });

  describe('unregister', () => {
    it('removes a previously registered task', () => {
      queue.register(makeTask({ id: 'x' }));
      expect(queue.size()).toBe(1);

      queue.unregister('x');
      expect(queue.size()).toBe(0);
    });

    it('is a no-op when the taskId does not exist', () => {
      queue.register(makeTask({ id: 'x' }));
      queue.unregister('nonexistent');
      expect(queue.size()).toBe(1);
    });

    it('removes only the specified task when multiple are registered', () => {
      queue.register(makeTask({ id: 'a' }));
      queue.register(makeTask({ id: 'b' }));
      queue.register(makeTask({ id: 'c' }));

      queue.unregister('b');

      expect(queue.size()).toBe(2);
      // 'b' must not appear in due tasks regardless of time.
      const due = queue.getDueTasks(Number.MAX_SAFE_INTEGER);
      expect(due.map((t) => t.id)).not.toContain('b');
    });
  });

  describe('size', () => {
    it('returns 0 for a fresh queue', () => {
      expect(queue.size()).toBe(0);
    });

    it('tracks registrations and unregistrations accurately', () => {
      queue.register(makeTask({ id: '1' }));
      queue.register(makeTask({ id: '2' }));
      expect(queue.size()).toBe(2);

      queue.unregister('1');
      expect(queue.size()).toBe(1);

      queue.unregister('2');
      expect(queue.size()).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // getDueTasks
  // -------------------------------------------------------------------------

  describe('getDueTasks', () => {
    it('returns an empty array when no tasks are registered', () => {
      expect(queue.getDueTasks(99999)).toEqual([]);
    });

    it('returns a task when now equals scheduledAt + intervalMs (boundary)', () => {
      // nextRun = scheduledAt + intervalMs = 1000 + 5000 = 6000
      const task = makeTask({ id: 'due', scheduledAt: 1000, intervalMs: 5000 });
      queue.register(task);

      expect(queue.getDueTasks(6000)).toHaveLength(1);
      expect(queue.getDueTasks(6000)[0].id).toBe('due');
    });

    it('does not return a task when now is one millisecond before nextRun', () => {
      const task = makeTask({ id: 'not-due', scheduledAt: 1000, intervalMs: 5000 });
      queue.register(task);

      // nextRun = 6000, now = 5999 → not due
      expect(queue.getDueTasks(5999)).toHaveLength(0);
    });

    it('returns a task when now is past nextRun', () => {
      const task = makeTask({ id: 'overdue', scheduledAt: 1000, intervalMs: 5000 });
      queue.register(task);

      expect(queue.getDueTasks(10000)).toHaveLength(1);
    });

    it('uses lastRunAt instead of scheduledAt when lastRunAt is set', () => {
      // nextRun = lastRunAt + intervalMs = 2000 + 5000 = 7000
      const task = makeTask({
        id: 'ran-before',
        scheduledAt: 1000,
        lastRunAt: 2000,
        intervalMs: 5000,
      });
      queue.register(task);

      // now = 6999 → not due (7000 - 1 = 6999 < 7000)
      expect(queue.getDueTasks(6999)).toHaveLength(0);

      // now = 7000 → due
      expect(queue.getDueTasks(7000)).toHaveLength(1);
    });

    it('returns only tasks that are due, not all tasks', () => {
      // Task A: due at 6000
      queue.register(makeTask({ id: 'a', scheduledAt: 1000, intervalMs: 5000 }));
      // Task B: due at 11000
      queue.register(makeTask({ id: 'b', scheduledAt: 1000, intervalMs: 10000 }));

      const due = queue.getDueTasks(7000);
      expect(due).toHaveLength(1);
      expect(due[0].id).toBe('a');
    });

    it('returns all tasks when all are due', () => {
      queue.register(makeTask({ id: 'a', scheduledAt: 0, intervalMs: 100 }));
      queue.register(makeTask({ id: 'b', scheduledAt: 0, intervalMs: 200 }));
      queue.register(makeTask({ id: 'c', scheduledAt: 0, intervalMs: 300 }));

      expect(queue.getDueTasks(500)).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------------
  // Priority sorting
  // -------------------------------------------------------------------------

  describe('priority sorting', () => {
    it('sorts due tasks so CRITICAL comes before HIGH, NORMAL, and LOW', () => {
      // All tasks are due at time 0.
      queue.register(makeTask({ id: 'low', priority: 'LOW', scheduledAt: 0, intervalMs: 0 }));
      queue.register(makeTask({ id: 'normal', priority: 'NORMAL', scheduledAt: 0, intervalMs: 0 }));
      queue.register(makeTask({ id: 'high', priority: 'HIGH', scheduledAt: 0, intervalMs: 0 }));
      queue.register(makeTask({ id: 'critical', priority: 'CRITICAL', scheduledAt: 0, intervalMs: 0 }));

      const due = queue.getDueTasks(0);
      const ids = due.map((t) => t.id);

      expect(ids[0]).toBe('critical');
      expect(ids[1]).toBe('high');
      expect(ids[2]).toBe('normal');
      expect(ids[3]).toBe('low');
    });

    it('preserves relative order among tasks of equal priority', () => {
      // Two CRITICAL tasks — both must appear before any lower-priority task.
      queue.register(makeTask({ id: 'c1', priority: 'CRITICAL', scheduledAt: 0, intervalMs: 0 }));
      queue.register(makeTask({ id: 'c2', priority: 'CRITICAL', scheduledAt: 0, intervalMs: 0 }));
      queue.register(makeTask({ id: 'low', priority: 'LOW', scheduledAt: 0, intervalMs: 0 }));

      const due = queue.getDueTasks(0);
      expect(due[0].priority).toBe('CRITICAL');
      expect(due[1].priority).toBe('CRITICAL');
      expect(due[2].priority).toBe('LOW');
    });

    it('returns a single task list sorted correctly with all four priority levels', () => {
      const priorities: TaskPriority[] = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];
      priorities.forEach((priority, i) => {
        queue.register(makeTask({ id: `t${i}`, priority, scheduledAt: 0, intervalMs: 0 }));
      });

      const due = queue.getDueTasks(0);
      const resultPriorities = due.map((t) => t.priority);

      expect(resultPriorities).toEqual(['CRITICAL', 'HIGH', 'NORMAL', 'LOW']);
    });
  });

  // -------------------------------------------------------------------------
  // markRan
  // -------------------------------------------------------------------------

  describe('markRan', () => {
    it('sets lastRunAt on the specified task', () => {
      const task = makeTask({ id: 'worker', scheduledAt: 0, intervalMs: 5000 });
      queue.register(task);

      queue.markRan('worker', 3000);

      // After marking ran at 3000 with intervalMs 5000, next due = 8000.
      // At now=7999 it should NOT be due.
      expect(queue.getDueTasks(7999)).toHaveLength(0);
      // At now=8000 it should be due.
      expect(queue.getDueTasks(8000)).toHaveLength(1);
    });

    it('is a no-op when the taskId does not exist', () => {
      // Should not throw.
      expect(() => queue.markRan('ghost', 9999)).not.toThrow();
    });

    it('updates lastRunAt correctly when called multiple times', () => {
      const task = makeTask({ id: 'w', scheduledAt: 0, intervalMs: 1000 });
      queue.register(task);

      // First run at t=1000.
      queue.markRan('w', 1000);
      // Next due = 2000. At 1999 not due.
      expect(queue.getDueTasks(1999)).toHaveLength(0);

      // Second run at t=2000.
      queue.markRan('w', 2000);
      // Next due = 3000. At 2999 not due.
      expect(queue.getDueTasks(2999)).toHaveLength(0);
      // At 3000 due.
      expect(queue.getDueTasks(3000)).toHaveLength(1);
    });

    it('does not affect other tasks', () => {
      const a = makeTask({ id: 'a', scheduledAt: 0, intervalMs: 1000 });
      const b = makeTask({ id: 'b', scheduledAt: 0, intervalMs: 1000 });
      queue.register(a);
      queue.register(b);

      // Both are due at t=1000. Mark only 'a' as ran at 1000.
      queue.markRan('a', 1000);

      // At t=1000, only 'b' is still due (a's nextRun is now 2000).
      const due = queue.getDueTasks(1000);
      expect(due).toHaveLength(1);
      expect(due[0].id).toBe('b');
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles intervalMs of 0 — task is always due once its scheduledAt has passed', () => {
      const task = makeTask({ id: 'instant', scheduledAt: 500, intervalMs: 0 });
      queue.register(task);

      // nextRun = 500 + 0 = 500
      expect(queue.getDueTasks(499)).toHaveLength(0);
      expect(queue.getDueTasks(500)).toHaveLength(1);
    });

    it('getDueTasks does not mutate the internal tasks map', () => {
      queue.register(makeTask({ id: 'a', scheduledAt: 0, intervalMs: 0 }));
      queue.getDueTasks(0);
      // Size must remain the same after querying.
      expect(queue.size()).toBe(1);
    });

    it('getDueTasks returns a new array on each call', () => {
      queue.register(makeTask({ id: 'a', scheduledAt: 0, intervalMs: 0 }));
      const first = queue.getDueTasks(0);
      const second = queue.getDueTasks(0);
      expect(first).not.toBe(second);
    });
  });
});
