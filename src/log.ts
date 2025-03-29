import { LogLevel } from 'vscode';

/**
 * Logger.
 */
export interface Log {
  /**
   * Appends a new debug message to the log.
   * @param message Log message.
   * @param args Additional values to log.
   */
  debug(message: string, ...args: any[]): void;

  /**
   * Appends a new error message to the log.
   * @param message Log message.
   * @param error Error.
   * @param args Additional values to log.
   */
  error(message: string, error: Error, ...args: any[]): void;

  /**
   * Appends a new error message to the log.
   * @param errorOrMessage Error or log message.
   * @param args Additional values to log.
   */
  error(errorOrMessage: string | Error, ...args: any[]): void;

  /**
   * Appends a new information message to the log.
   * @param message Log message.
   * @param args Additional values to log.
   */
  info(message: string, ...args: any[]): void;

  /**
   * Log level.
   */
  logLevel: LogLevel;

  /**
   * Appends a new trace message to the log.
   * @param message Log message.
   * @param args Additional values to log.
   */
  trace(message: string, ...args: any[]): void;

  /**
   * Appends a new warning message to the log.
   * @param message Log message.
   * @param args Additional values to log.
   */
  warn(message: string, ...args: any[]): void;
}
