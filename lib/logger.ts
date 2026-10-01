// lib/logger.ts
// Structured JSON logger. Works in Node and Edge runtimes.
// Never throws. Never blocks on sinks.

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LogContext {
  traceId?: string;
  spanId?: string;
  userId?: string;
  orgId?: string;
  serviceId?: string;
  event?: string;
  [key: string]: unknown;
}

function levelEnabled(level: LogLevel): boolean {
  if (process.env.NODE_ENV === "production") {
    return level !== "debug";
  }
  return true;
}

function emit(level: LogLevel, message: string, context: LogContext = {}): void {
  if (!levelEnabled(level)) return;
  const record = {
    level,
    message,
    at: new Date().toISOString(),
    ...context,
  };
  let line: string;
  try {
    line = JSON.stringify(record);
  } catch {
    line = `${level}: ${message}`;
  }
  if (level === "error" || level === "fatal") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  fatal(message: string, context?: LogContext): void;
  child(baseContext: LogContext): Logger;
}

function createLogger(baseContext: LogContext = {}): Logger {
  return {
    debug: (m, c = {}) => emit("debug", m, { ...baseContext, ...c }),
    info: (m, c = {}) => emit("info", m, { ...baseContext, ...c }),
    warn: (m, c = {}) => emit("warn", m, { ...baseContext, ...c }),
    error: (m, c = {}) => emit("error", m, { ...baseContext, ...c }),
    fatal: (m, c = {}) => emit("fatal", m, { ...baseContext, ...c }),
    child: (more) => createLogger({ ...baseContext, ...more }),
  };
}

export const logger = createLogger();
export { createLogger };
