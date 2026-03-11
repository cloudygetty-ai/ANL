// src/utils/Logger.ts — Centralized logging service
import type { LogLevel, LogEntry } from '@types/index';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const MAX_BUFFER_SIZE = 200;

class Logger {
  private minLevel: LogLevel = 'DEBUG';
  private buffer: LogEntry[] = [];
  private listeners: Array<(entry: LogEntry) => void> = [];

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  debug(module: string, message: string, data?: unknown): void {
    this.log('DEBUG', module, message, data);
  }

  info(module: string, message: string, data?: unknown): void {
    this.log('INFO', module, message, data);
  }

  warn(module: string, message: string, data?: unknown): void {
    this.log('WARN', module, message, data);
  }

  error(module: string, message: string, data?: unknown): void {
    this.log('ERROR', module, message, data);
  }

  getBuffer(): LogEntry[] {
    return [...this.buffer];
  }

  getBufferByLevel(level: LogLevel): LogEntry[] {
    const minPri = LEVEL_PRIORITY[level];
    return this.buffer.filter(
      (entry) => LEVEL_PRIORITY[entry.level] >= minPri
    );
  }

  clearBuffer(): void {
    this.buffer = [];
  }

  subscribe(listener: (entry: LogEntry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private log(
    level: LogLevel,
    module: string,
    message: string,
    data?: unknown
  ): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.minLevel]) return;

    const entry: LogEntry = {
      level,
      module,
      message,
      timestamp: Date.now(),
      data,
    };

    this.buffer.push(entry);
    if (this.buffer.length > MAX_BUFFER_SIZE) {
      this.buffer.shift();
    }

    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch {
        // WHY: Listener failure must not break logging
      }
    }

    // Output to console in development
    if (__DEV__) {
      const prefix = `[${level}][${module}]`;
      switch (level) {
        case 'ERROR':
          console.error(prefix, message, data ?? '');
          break;
        case 'WARN':
          console.warn(prefix, message, data ?? '');
          break;
        default:
          console.log(prefix, message, data ?? '');
      }
    }
  }
}

// WHY: Singleton — one logger instance shared across the entire system
export const logger = new Logger();
