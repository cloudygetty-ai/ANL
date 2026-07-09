const logger = {
  debug: (msg: string, ...args: unknown[]) => console.debug(`[ANL] ${msg}`, ...args),
  info:  (msg: string, ...args: unknown[]) => console.info(`[ANL] ${msg}`, ...args),
  warn:  (msg: string, ...args: unknown[]) => console.warn(`[ANL] ${msg}`, ...args),
  error: (msg: string, ...args: unknown[]) => console.error(`[ANL] ${msg}`, ...args),
};

export default logger;
