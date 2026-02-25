// src/core/scheduler/TaskQueue.ts
import type { Task, TaskPriority } from '@types/index';

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};

export class TaskQueue {
  private tasks: Map<string, Task> = new Map();

  register(task: Task): void {
    this.tasks.set(task.id, task);
  }

  unregister(taskId: string): void {
    this.tasks.delete(taskId);
  }

  getDueTasks(now: number): Task[] {
    const due: Task[] = [];
    for (const task of this.tasks.values()) {
      const nextRun = (task.lastRunAt ?? task.scheduledAt) + task.intervalMs;
      if (now >= nextRun) {
        due.push(task);
      }
    }
    return due.sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    );
  }

  markRan(taskId: string, at: number): void {
    const task = this.tasks.get(taskId);
    if (task) task.lastRunAt = at;
  }

  size(): number {
    return this.tasks.size;
  }
}
