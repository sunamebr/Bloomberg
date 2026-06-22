export type LogLevel = "debug" | "info" | "warn" | "error";

export const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const COLORS: Record<LogLevel, string> = {
  debug: "\x1b[90m",
  info: "\x1b[34m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
};

export class Logger {
  constructor(
    private name: string,
    private level: LogLevel = "info",
    private parent?: Logger,
  ) {}

  debug(msg: string, ...args: unknown[]): void {
    this.log("debug", msg, args);
  }

  info(msg: string, ...args: unknown[]): void {
    this.log("info", msg, args);
  }

  warn(msg: string, ...args: unknown[]): void {
    this.log("warn", msg, args);
  }

  error(msg: string, ...args: unknown[]): void {
    this.log("error", msg, args);
  }

  child(name: string): Logger {
    return new Logger(`${this.name}.${name}`, this.level, this);
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private format(level: LogLevel, msg: string): string {
    const color = COLORS[level];
    const timestamp = new Date().toISOString();
    return `${color}[${timestamp}] [${level.toUpperCase()}] [${this.name}] ${msg}\x1b[0m`;
  }

  private log(level: LogLevel, msg: string, args: unknown[]): void {
    if (!this.shouldLog(level)) return;
    const formatted = this.format(level, msg);
    if (level === "error") {
      console.error(formatted, ...args);
    } else if (level === "warn") {
      console.warn(formatted, ...args);
    } else {
      console.log(formatted, ...args);
    }
  }
}
