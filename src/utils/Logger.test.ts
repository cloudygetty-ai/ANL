// src/utils/Logger.test.ts
/* eslint-disable no-console */
import { logger } from './Logger';
import type { LogEntry } from '../types/index';

// ---------------------------------------------------------------------------
// Global setup
// ---------------------------------------------------------------------------

// WHY: Logger.ts branches on __DEV__ for console output. Setting it true
// mirrors the React Native development environment and exercises that path.
(global as unknown as Record<string, unknown>).__DEV__ = true;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Logger', () => {
  beforeEach(() => {
    // Reset the logger to a clean state before every test so that buffer
    // contents and min-level choices from one test cannot pollute the next.
    logger.clearBuffer();
    logger.setMinLevel('DEBUG');

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Basic logging methods
  // -------------------------------------------------------------------------

  describe('debug()', () => {
    it('adds a DEBUG entry to the buffer', () => {
      logger.debug('TestModule', 'a debug message');
      const buffer = logger.getBuffer();

      expect(buffer).toHaveLength(1);
      expect(buffer[0].level).toBe('DEBUG');
      expect(buffer[0].module).toBe('TestModule');
      expect(buffer[0].message).toBe('a debug message');
    });

    it('stores optional data in the entry', () => {
      const payload = { key: 'value' };
      logger.debug('TestModule', 'msg', payload);

      expect(logger.getBuffer()[0].data).toEqual(payload);
    });

    it('calls console.log in __DEV__ mode', () => {
      logger.debug('M', 'hello');
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('info()', () => {
    it('adds an INFO entry to the buffer', () => {
      logger.info('TestModule', 'an info message');
      const buffer = logger.getBuffer();

      expect(buffer).toHaveLength(1);
      expect(buffer[0].level).toBe('INFO');
    });

    it('calls console.log in __DEV__ mode', () => {
      logger.info('M', 'hello');
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('warn()', () => {
    it('adds a WARN entry to the buffer', () => {
      logger.warn('TestModule', 'a warning');
      const buffer = logger.getBuffer();

      expect(buffer).toHaveLength(1);
      expect(buffer[0].level).toBe('WARN');
    });

    it('calls console.warn in __DEV__ mode', () => {
      logger.warn('M', 'careful');
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('error()', () => {
    it('adds an ERROR entry to the buffer', () => {
      logger.error('TestModule', 'something broke');
      const buffer = logger.getBuffer();

      expect(buffer).toHaveLength(1);
      expect(buffer[0].level).toBe('ERROR');
    });

    it('calls console.error in __DEV__ mode', () => {
      logger.error('M', 'fatal');
      expect(console.error).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Timestamps
  // -------------------------------------------------------------------------

  describe('timestamps', () => {
    it('records a timestamp that is close to the current time', () => {
      const before = Date.now();
      logger.info('M', 'msg');
      const after = Date.now();

      const { timestamp } = logger.getBuffer()[0];
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  // -------------------------------------------------------------------------
  // setMinLevel / level filtering
  // -------------------------------------------------------------------------

  describe('setMinLevel()', () => {
    it('allows all levels when min level is DEBUG', () => {
      logger.setMinLevel('DEBUG');
      logger.debug('M', 'd');
      logger.info('M', 'i');
      logger.warn('M', 'w');
      logger.error('M', 'e');

      expect(logger.getBuffer()).toHaveLength(4);
    });

    it('suppresses DEBUG when min level is INFO', () => {
      logger.setMinLevel('INFO');
      logger.debug('M', 'should be dropped');
      logger.info('M', 'should appear');

      const buffer = logger.getBuffer();
      expect(buffer).toHaveLength(1);
      expect(buffer[0].level).toBe('INFO');
    });

    it('suppresses DEBUG and INFO when min level is WARN', () => {
      logger.setMinLevel('WARN');
      logger.debug('M', 'drop');
      logger.info('M', 'drop');
      logger.warn('M', 'keep');
      logger.error('M', 'keep');

      const levels = logger.getBuffer().map((e) => e.level);
      expect(levels).toEqual(['WARN', 'ERROR']);
    });

    it('suppresses DEBUG, INFO, and WARN when min level is ERROR', () => {
      logger.setMinLevel('ERROR');
      logger.debug('M', 'drop');
      logger.info('M', 'drop');
      logger.warn('M', 'drop');
      logger.error('M', 'keep');

      const buffer = logger.getBuffer();
      expect(buffer).toHaveLength(1);
      expect(buffer[0].level).toBe('ERROR');
    });

    it('can be raised and then lowered again', () => {
      logger.setMinLevel('ERROR');
      logger.debug('M', 'dropped');

      logger.setMinLevel('DEBUG');
      logger.debug('M', 'kept');

      const buffer = logger.getBuffer();
      expect(buffer).toHaveLength(1);
      expect(buffer[0].message).toBe('kept');
    });
  });

  // -------------------------------------------------------------------------
  // getBuffer
  // -------------------------------------------------------------------------

  describe('getBuffer()', () => {
    it('returns an empty array before any messages are logged', () => {
      expect(logger.getBuffer()).toEqual([]);
    });

    it('returns entries in the order they were logged', () => {
      logger.info('M', 'first');
      logger.info('M', 'second');
      logger.info('M', 'third');

      const messages = logger.getBuffer().map((e) => e.message);
      expect(messages).toEqual(['first', 'second', 'third']);
    });

    it('returns a copy — mutating the returned array does not affect the internal buffer', () => {
      logger.info('M', 'original');
      const buf = logger.getBuffer();
      buf.pop(); // remove from our copy

      // Internal buffer should still have one entry
      expect(logger.getBuffer()).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // Buffer overflow at MAX_BUFFER_SIZE (200)
  // -------------------------------------------------------------------------

  describe('buffer overflow', () => {
    it('never exceeds 200 entries regardless of how many messages are logged', () => {
      for (let i = 0; i < 250; i++) {
        logger.info('M', `message ${i}`);
      }

      expect(logger.getBuffer()).toHaveLength(200);
    });

    it('drops the oldest entry when the buffer is full', () => {
      for (let i = 0; i < 200; i++) {
        logger.info('M', `message ${i}`);
      }

      // The 201st message should push out message 0
      logger.info('M', 'new arrival');

      const buffer = logger.getBuffer();
      expect(buffer[0].message).toBe('message 1');
      expect(buffer[buffer.length - 1].message).toBe('new arrival');
    });

    it('retains exactly the 200 most recent messages after overflow', () => {
      for (let i = 0; i < 210; i++) {
        logger.info('M', `message ${i}`);
      }

      const buffer = logger.getBuffer();
      expect(buffer[0].message).toBe('message 10');
      expect(buffer[199].message).toBe('message 209');
    });
  });

  // -------------------------------------------------------------------------
  // clearBuffer
  // -------------------------------------------------------------------------

  describe('clearBuffer()', () => {
    it('empties the buffer', () => {
      logger.info('M', 'one');
      logger.info('M', 'two');
      logger.clearBuffer();

      expect(logger.getBuffer()).toHaveLength(0);
    });

    it('is safe to call on an already-empty buffer', () => {
      expect(() => logger.clearBuffer()).not.toThrow();
      expect(logger.getBuffer()).toHaveLength(0);
    });

    it('does not affect future log entries after clearing', () => {
      logger.info('M', 'before clear');
      logger.clearBuffer();
      logger.info('M', 'after clear');

      const buffer = logger.getBuffer();
      expect(buffer).toHaveLength(1);
      expect(buffer[0].message).toBe('after clear');
    });
  });

  // -------------------------------------------------------------------------
  // getBufferByLevel
  // -------------------------------------------------------------------------

  describe('getBufferByLevel()', () => {
    beforeEach(() => {
      logger.debug('M', 'debug msg');
      logger.info('M', 'info msg');
      logger.warn('M', 'warn msg');
      logger.error('M', 'error msg');
    });

    it('returns all entries when filtering at DEBUG level', () => {
      const entries = logger.getBufferByLevel('DEBUG');
      expect(entries).toHaveLength(4);
    });

    it('excludes DEBUG entries when filtering at INFO level', () => {
      const entries = logger.getBufferByLevel('INFO');
      const levels = entries.map((e) => e.level);

      expect(levels).not.toContain('DEBUG');
      expect(levels).toContain('INFO');
      expect(levels).toContain('WARN');
      expect(levels).toContain('ERROR');
    });

    it('returns only WARN and ERROR entries when filtering at WARN level', () => {
      const entries = logger.getBufferByLevel('WARN');
      const levels = entries.map((e) => e.level);

      expect(levels).toEqual(['WARN', 'ERROR']);
    });

    it('returns only ERROR entries when filtering at ERROR level', () => {
      const entries = logger.getBufferByLevel('ERROR');

      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe('ERROR');
    });

    it('returns an empty array when no entries match the filter', () => {
      logger.clearBuffer();
      logger.debug('M', 'only a debug');

      const entries = logger.getBufferByLevel('WARN');
      expect(entries).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // subscribe / unsubscribe
  // -------------------------------------------------------------------------

  describe('subscribe()', () => {
    it('invokes the listener immediately when a message is logged', () => {
      const listener = jest.fn();
      logger.subscribe(listener);

      logger.info('M', 'hello subscriber');

      expect(listener).toHaveBeenCalledTimes(1);

      const received = listener.mock.calls[0][0] as LogEntry;
      expect(received.level).toBe('INFO');
      expect(received.message).toBe('hello subscriber');
    });

    it('passes the full LogEntry to the listener', () => {
      const listener = jest.fn();
      logger.subscribe(listener);

      const data = { extra: 42 };
      logger.warn('MyModule', 'a warning', data);

      const entry = listener.mock.calls[0][0] as LogEntry;
      expect(entry.level).toBe('WARN');
      expect(entry.module).toBe('MyModule');
      expect(entry.message).toBe('a warning');
      expect(entry.data).toEqual(data);
      expect(typeof entry.timestamp).toBe('number');
    });

    it('supports multiple simultaneous listeners', () => {
      const listenerA = jest.fn();
      const listenerB = jest.fn();

      logger.subscribe(listenerA);
      logger.subscribe(listenerB);

      logger.info('M', 'broadcast');

      expect(listenerA).toHaveBeenCalledTimes(1);
      expect(listenerB).toHaveBeenCalledTimes(1);
    });

    it('returns an unsubscribe function', () => {
      const unsubscribe = logger.subscribe(jest.fn());
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('unsubscribe (returned function)', () => {
    it('stops the listener from receiving further messages', () => {
      const listener = jest.fn();
      const unsubscribe = logger.subscribe(listener);

      logger.info('M', 'before unsubscribe');
      unsubscribe();
      logger.info('M', 'after unsubscribe');

      // Only the message logged before unsubscribing should have been received
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('does not affect other listeners when one unsubscribes', () => {
      const listenerA = jest.fn();
      const listenerB = jest.fn();

      const unsubscribeA = logger.subscribe(listenerA);
      logger.subscribe(listenerB);

      unsubscribeA();
      logger.info('M', 'after A unsubscribed');

      expect(listenerA).not.toHaveBeenCalled();
      expect(listenerB).toHaveBeenCalledTimes(1);
    });

    it('is safe to call more than once', () => {
      const listener = jest.fn();
      const unsubscribe = logger.subscribe(listener);

      expect(() => {
        unsubscribe();
        unsubscribe();
      }).not.toThrow();
    });

    it('does not invoke the listener for messages suppressed by minLevel', () => {
      logger.setMinLevel('ERROR');
      const listener = jest.fn();
      logger.subscribe(listener);

      logger.debug('M', 'filtered out');
      logger.info('M', 'filtered out');
      logger.warn('M', 'filtered out');

      expect(listener).not.toHaveBeenCalled();
    });

    it('does invoke the listener for messages that pass minLevel', () => {
      logger.setMinLevel('WARN');
      const listener = jest.fn();
      logger.subscribe(listener);

      logger.warn('M', 'passes filter');
      logger.error('M', 'also passes');

      expect(listener).toHaveBeenCalledTimes(2);
    });
  });
});
