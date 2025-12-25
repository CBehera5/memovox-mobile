/**
 * Logger Service
 * 
 * Centralized logging service for the Memovox app.
 * - In development: logs to console
 * - In production: sends to analytics/crash reporting service
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogData {
  [key: string]: any;
}

class Logger {
  private static instance: Logger;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = __DEV__;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Log debug information (only in development)
   */
  debug(message: string, data?: LogData): void {
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, data || '');
    }
  }

  /**
   * Log informational messages
   */
  info(message: string, data?: LogData): void {
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, data || '');
    }
    // TODO: Send to analytics service in production
  }

  /**
   * Log warnings
   */
  warn(message: string, data?: LogData): void {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, data || '');
    }
    // TODO: Send to monitoring service in production
  }

  /**
   * Log errors
   */
  error(message: string, error?: Error | any, data?: LogData): void {
    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, error, data || '');
    }
    // TODO: Send to crash reporting service (Sentry) in production
  }

  /**
   * Log user events for analytics
   */
  logEvent(eventName: string, properties?: LogData): void {
    if (this.isDevelopment) {
      console.log(`[EVENT] ${eventName}`, properties || '');
    }
    // TODO: Send to analytics service (Firebase Analytics, Mixpanel, etc.)
  }

  /**
   * Set user properties for analytics
   */
  setUser(userId: string, properties?: LogData): void {
    if (this.isDevelopment) {
      console.log(`[USER] ${userId}`, properties || '');
    }
    // TODO: Set user in analytics service
  }

  /**
   * Track screen views
   */
  logScreenView(screenName: string, properties?: LogData): void {
    if (this.isDevelopment) {
      console.log(`[SCREEN] ${screenName}`, properties || '');
    }
    // TODO: Send to analytics service
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Convenience exports
export const logDebug = (message: string, data?: LogData) => logger.debug(message, data);
export const logInfo = (message: string, data?: LogData) => logger.info(message, data);
export const logWarn = (message: string, data?: LogData) => logger.warn(message, data);
export const logError = (message: string, error?: Error | any, data?: LogData) => logger.error(message, error, data);
export const logEvent = (eventName: string, properties?: LogData) => logger.logEvent(eventName, properties);
export const setUser = (userId: string, properties?: LogData) => logger.setUser(userId, properties);
export const logScreenView = (screenName: string, properties?: LogData) => logger.logScreenView(screenName, properties);
