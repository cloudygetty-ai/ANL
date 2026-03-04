// src/services/background/BackgroundService.ts
// WHY: Abstracts platform differences for background fetch so callers write
//      one API regardless of iOS BGTaskScheduler vs Android headless JS.
import { Platform } from 'react-native';
import type { Task } from '@types/index';

// react-native-background-fetch API surface we depend on
interface BgFetch {
  configure(config: Record<string, unknown>, callback: (status: number) => void, failure: (status: number) => void): void;
  start(success?: () => void, failure?: (status: number) => void): void;
  stop(success?: () => void, failure?: () => void): void;
  finish(taskId: string): void;
  STATUS_AVAILABLE: number;
}

// WHY: Lazy-require so TS doesn't fail at compile time if native module isn't linked yet.
const getBgFetch = (): BgFetch | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-background-fetch').default as BgFetch;
  } catch {
    return null;
  }
};

export interface BackgroundServiceConfig {
  minimumFetchInterval: number; // minutes
  stopOnTerminate:      boolean;
  startOnBoot:          boolean;
  enableHeadless:       boolean;
}

const DEFAULT_CONFIG: BackgroundServiceConfig = {
  minimumFetchInterval: 15,
  stopOnTerminate:      false,
  startOnBoot:          true,
  enableHeadless:       true,
};

export class BackgroundService {
  private config: BackgroundServiceConfig;
  private tasks: Task[] = [];
  private running = false;

  constructor(config: Partial<BackgroundServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a task to run during background fetch.
   * Priority determines execution order (CRITICAL first).
   */
  registerTask(task: Task): void {
    this.tasks.push(task);
    this.tasks.sort((a, b) => {
      const order = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
      return order[a.priority] - order[b.priority];
    });
  }

  async start(): Promise<void> {
    if (this.running) return;

    const bgFetch = getBgFetch();
    if (!bgFetch) {
      console.warn('[BackgroundService] react-native-background-fetch not available — skipping');
      return;
    }

    bgFetch.configure(
      {
        minimumFetchInterval: this.config.minimumFetchInterval,
        stopOnTerminate:      this.config.stopOnTerminate,
        startOnBoot:          this.config.startOnBoot,
        enableHeadless:       this.config.enableHeadless,
        // iOS-specific
        ...(Platform.OS === 'ios' && {
          requiredNetworkType: 0, // NETWORK_TYPE_NONE
        }),
        // Android-specific
        ...(Platform.OS === 'android' && {
          forceAlarmManager: false,
        }),
      },
      async (taskId) => {
        await this.executeRegisteredTasks();
        bgFetch.finish(taskId);
      },
      (status) => {
        console.warn('[BackgroundService] Failed to configure, status:', status);
      }
    );

    bgFetch.start();
    this.running = true;
    console.info('[BackgroundService] Started on', Platform.OS);
  }

  stop(): void {
    const bgFetch = getBgFetch();
    bgFetch?.stop();
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  private async executeRegisteredTasks(): Promise<void> {
    const now = Date.now();
    for (const task of this.tasks) {
      // iOS background tasks must complete in ~30 seconds total
      // So we only run CRITICAL and HIGH priority tasks in background
      if (task.priority === 'NORMAL' || task.priority === 'LOW') continue;

      const nextRun = (task.lastRunAt ?? task.scheduledAt) + task.intervalMs;
      if (now < nextRun) continue;

      try {
        await task.execute();
        task.lastRunAt = now;
      } catch (err) {
        console.warn(`[BackgroundService] Task "${task.name}" failed:`, err);
      }
    }
  }
}
