/**
 * config.example.js
 *
 * Configuration template for the ANL Continuous System.
 *
 * SETUP:
 *   cp config.example.js config.js
 *
 * config.js is gitignored and is your local override.
 * Never commit config.js — it may contain environment-specific values.
 *
 * All values here are production-safe defaults.
 * Adjust them in config.js for your local development environment.
 */

module.exports = {
  // ---------------------------------------------------------------------------
  // Event Loop Timing
  //
  // Controls how frequently the event loop iterates.
  // The actual delay is adaptive between these two bounds:
  //   - Under load: delay approaches minDelayMs
  //   - Under idle: delay approaches maxDelayMs
  // When the app is backgrounded, the effective ceiling doubles.
  // ---------------------------------------------------------------------------
  eventLoop: {
    minDelayMs: 500,   // Fastest the loop will run (ms). Lower = more CPU.
    maxDelayMs: 5000,  // Slowest the loop will run at idle (ms).
  },

  // ---------------------------------------------------------------------------
  // Persistence
  //
  // Controls how often the system snapshots state to AsyncStorage.
  // Shorter intervals = more resilient to sudden kills, more I/O.
  // ---------------------------------------------------------------------------
  persistence: {
    snapshotIntervalMs: 30000, // How often to write a state snapshot (ms).
  },

  // ---------------------------------------------------------------------------
  // Background Fetch
  //
  // Controls react-native-background-fetch behavior.
  // minimumFetchInterval is a minimum — the OS may wake the app less often.
  // On iOS, background execution windows are limited to ~30 seconds.
  // ---------------------------------------------------------------------------
  background: {
    minimumFetchInterval: 15, // Minimum interval between background wakes (minutes).
    stopOnTerminate: false,   // Keep background fetch running after app is force-quit.
    startOnBoot: true,        // Re-register background fetch after device reboot.
  },

  // ---------------------------------------------------------------------------
  // Health Monitoring
  //
  // Controls when the system decides it needs to heal itself.
  // selfHealErrorThreshold: if HealthMonitor.errorCount exceeds this value
  //   in a session, the event loop triggers a self-heal sequence.
  // healthCheckIntervalMs: how often HealthMonitor is polled per loop cycle.
  // ---------------------------------------------------------------------------
  health: {
    selfHealErrorThreshold: 50,   // Error count that triggers self-heal.
    healthCheckIntervalMs: 10000, // How often to run a health check (ms).
  },

  // ---------------------------------------------------------------------------
  // Logger
  //
  // Controls the centralized Logger utility in src/utils/logger.ts.
  // minLevel: logs below this level are suppressed entirely.
  //   Levels (ascending): DEBUG | INFO | WARN | ERROR
  // maxBufferSize: number of log entries retained in the in-memory ring buffer.
  //   Older entries are dropped when the buffer is full.
  // ---------------------------------------------------------------------------
  logger: {
    minLevel: 'DEBUG', // Set to 'INFO' or higher in production to reduce noise.
    maxBufferSize: 200, // Max log entries held in memory at once.
  },
};
