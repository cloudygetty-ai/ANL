// src/services/background/BackgroundService.test.ts
import { BackgroundService } from './BackgroundService';
import type { AppLifecycleState } from '@types/index';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// WHY: jest.mock is hoisted above variable declarations, so factories cannot
// close over const/let declared in module scope. Use jest.fn() inline and
// retrieve the mock instance via require() inside test bodies.
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Platform: {
    OS: 'ios',
  },
}));

jest.mock('@utils/Logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock(
  'react-native-background-fetch',
  () => ({
    default: {
      configure: jest.fn((_config: unknown, callback: (id: string) => void) => {
        callback('test-task-id');
      }),
      finish: jest.fn(),
    },
  }),
  { virtual: true }
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAppState() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('react-native').AppState as {
    addEventListener: jest.Mock;
  };
}

/**
 * Returns the most recent AppState 'change' handler registered by BackgroundService.
 */
function getAppStateHandler(): (state: string) => void {
  const calls = getAppState().addEventListener.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[calls.length - 1][1] as (state: string) => void;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BackgroundService', () => {
  let service: BackgroundService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BackgroundService();
  });

  afterEach(() => {
    service.stop();
  });

  // -------------------------------------------------------------------------
  // initial state
  // -------------------------------------------------------------------------

  describe('initial state', () => {
    it('starts with lifecycle state "active"', () => {
      expect(service.getCurrentState()).toBe('active');
    });

    it('exposes the default config when none is provided', () => {
      const config = service.getConfig();
      expect(config.minimumFetchInterval).toBe(15);
      expect(config.stopOnTerminate).toBe(false);
      expect(config.startOnBoot).toBe(true);
    });

    it('accepts and merges partial config overrides', () => {
      const custom = new BackgroundService({ minimumFetchInterval: 30 });
      const config = custom.getConfig();
      expect(config.minimumFetchInterval).toBe(30);
      expect(config.stopOnTerminate).toBe(false);
      custom.stop();
    });

    it('returns a copy of config — mutations do not affect internal state', () => {
      const config = service.getConfig();
      config.minimumFetchInterval = 999;
      expect(service.getConfig().minimumFetchInterval).toBe(15);
    });
  });

  // -------------------------------------------------------------------------
  // start
  // -------------------------------------------------------------------------

  describe('start()', () => {
    it('subscribes to AppState changes', () => {
      service.start();
      expect(getAppState().addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('calls addEventListener exactly once per start()', () => {
      service.start();
      expect(getAppState().addEventListener).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // stop
  // -------------------------------------------------------------------------

  describe('stop()', () => {
    it('removes the AppState subscription', () => {
      // Capture the remove mock for this specific subscription
      const removeMock = jest.fn();
      getAppState().addEventListener.mockReturnValueOnce({ remove: removeMock });

      service.start();
      service.stop();

      expect(removeMock).toHaveBeenCalledTimes(1);
    });

    it('is safe to call before start()', () => {
      expect(() => service.stop()).not.toThrow();
    });

    it('is safe to call multiple times', () => {
      service.start();
      expect(() => {
        service.stop();
        service.stop();
      }).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // lifecycle state transitions
  // -------------------------------------------------------------------------

  describe('lifecycle state transitions', () => {
    beforeEach(() => {
      service.start();
    });

    it('updates state to "background" on AppState change', () => {
      getAppStateHandler()('background');
      expect(service.getCurrentState()).toBe('background');
    });

    it('updates state to "active" on AppState change', () => {
      getAppStateHandler()('background');
      getAppStateHandler()('active');
      expect(service.getCurrentState()).toBe('active');
    });

    it('maps unexpected state strings to "inactive"', () => {
      getAppStateHandler()('extension');
      expect(service.getCurrentState()).toBe('inactive');
    });

    it('does not trigger listeners when the state has not changed', () => {
      const listener = jest.fn();
      service.onLifecycleChange(listener);
      // Already active — send active again (no change)
      getAppStateHandler()('active');
      expect(listener).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // lifecycle listeners
  // -------------------------------------------------------------------------

  describe('onLifecycleChange()', () => {
    beforeEach(() => {
      service.start();
    });

    it('calls the listener with the new state when a transition occurs', () => {
      const listener = jest.fn();
      service.onLifecycleChange(listener);
      getAppStateHandler()('background');
      expect(listener).toHaveBeenCalledWith('background');
    });

    it('supports multiple listeners — all are called on transition', () => {
      const l1 = jest.fn();
      const l2 = jest.fn();
      service.onLifecycleChange(l1);
      service.onLifecycleChange(l2);
      getAppStateHandler()('background');
      expect(l1).toHaveBeenCalledWith('background');
      expect(l2).toHaveBeenCalledWith('background');
    });

    it('returns an unsubscribe function that removes the listener', () => {
      const listener = jest.fn();
      const unsub = service.onLifecycleChange(listener);
      unsub();
      getAppStateHandler()('background');
      expect(listener).not.toHaveBeenCalled();
    });

    it('does not call a removed listener on subsequent transitions', () => {
      const listener = jest.fn();
      const unsub = service.onLifecycleChange(listener);
      unsub();
      getAppStateHandler()('background');
      getAppStateHandler()('active');
      expect(listener).not.toHaveBeenCalled();
    });

    it('continues calling other listeners if one throws', () => {
      const throwing = jest.fn().mockImplementation(() => {
        throw new Error('listener exploded');
      });
      const ok = jest.fn();

      service.onLifecycleChange(throwing);
      service.onLifecycleChange(ok);

      expect(() => getAppStateHandler()('background')).not.toThrow();
      expect(ok).toHaveBeenCalledWith('background');
    });

    it('notifies the listener for every state transition', () => {
      const listener = jest.fn();
      service.onLifecycleChange(listener);

      const transitions: AppLifecycleState[] = ['background', 'inactive', 'active', 'background'];
      transitions.forEach((s) => getAppStateHandler()(s));

      expect(listener).toHaveBeenCalledTimes(transitions.length);
      transitions.forEach((s, i) => {
        expect(listener).toHaveBeenNthCalledWith(i + 1, s);
      });
    });
  });

  // -------------------------------------------------------------------------
  // background fetch configuration
  // -------------------------------------------------------------------------

  describe('background fetch', () => {
    it('configures BackgroundFetch on start when the native module is available', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const BackgroundFetch = require('react-native-background-fetch');
      service.start();
      expect(BackgroundFetch.default.configure).toHaveBeenCalledWith(
        expect.objectContaining({ minimumFetchInterval: 15 }),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('calls finish() after a background fetch event fires', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const BackgroundFetch = require('react-native-background-fetch');
      service.start();
      expect(BackgroundFetch.default.finish).toHaveBeenCalledWith('test-task-id');
    });
  });
});
