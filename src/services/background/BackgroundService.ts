// src/services/background/BackgroundService.ts
import { AppState, Platform } from 'react-native';
import type { AppLifecycleState, BackgroundTaskConfig } from '@types/index';
import { logger } from '@utils/Logger';

type LifecycleListener = (state: AppLifecycleState) => void;

const MODULE = 'BackgroundService';

const DEFAULT_CONFIG: BackgroundTaskConfig = {
  minimumFetchInterval: 15, // minutes
  stopOnTerminate: false,
  startOnBoot: true,
  enableHeadless: Platform.OS === 'android',
};

export class BackgroundService {
  private config: BackgroundTaskConfig;
  private currentState: AppLifecycleState = 'active';
  private listeners: LifecycleListener[] = [];
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

  constructor(config?: Partial<BackgroundTaskConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  start(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
    logger.info(MODULE, 'Started lifecycle monitoring', {
      platform: Platform.OS,
    });
    this.configureBackgroundFetch();
  }

  stop(): void {
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    logger.info(MODULE, 'Stopped lifecycle monitoring');
  }

  getCurrentState(): AppLifecycleState {
    return this.currentState;
  }

  onLifecycleChange(listener: LifecycleListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private handleAppStateChange(nextAppState: string): void {
    const mapped = this.mapAppState(nextAppState);
    if (mapped === this.currentState) return;

    const previous = this.currentState;
    this.currentState = mapped;
    logger.info(MODULE, `Lifecycle: ${previous} -> ${mapped}`);

    for (const listener of this.listeners) {
      try {
        listener(mapped);
      } catch (err) {
        logger.error(MODULE, 'Lifecycle listener error', err);
      }
    }
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

  private configureBackgroundFetch(): void {
    // WHY: Background fetch setup is platform-specific. This method
    // configures the native module. If BackgroundFetch is unavailable
    // (e.g., in Expo Go), the system still runs — just without background wake.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const BackgroundFetch = require('react-native-background-fetch');
      BackgroundFetch.default.configure(
        {
          minimumFetchInterval: this.config.minimumFetchInterval,
          stopOnTerminate: this.config.stopOnTerminate,
          startOnBoot: this.config.startOnBoot,
          enableHeadless: this.config.enableHeadless,
        },
        async (taskId: string) => {
          logger.info(MODULE, `Background fetch event: ${taskId}`);
          BackgroundFetch.default.finish(taskId);
        },
        async (taskId: string) => {
          logger.warn(MODULE, `Background fetch timeout: ${taskId}`);
          BackgroundFetch.default.finish(taskId);
        }
      );
      logger.info(MODULE, 'Background fetch configured', {
        interval: this.config.minimumFetchInterval,
      });
    } catch (err) {
      // WHY: In Expo Go or environments without native module, this is expected
      logger.warn(MODULE, 'Background fetch unavailable — running foreground only', err);
    }
  }

  getConfig(): BackgroundTaskConfig {
    return { ...this.config };
  }
}
