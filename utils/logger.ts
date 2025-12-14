/**
 * Centralized logging utility
 * Provides structured logging with configurable debug levels
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogContext {
    [key: string]: any;
}

class Logger {
    private isDebugEnabled: boolean;

    constructor() {
        // Check if debug logs are enabled via environment variable
        this.isDebugEnabled = import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true';
    }

    /**
     * Format log message with timestamp and level
     */
    private format(level: LogLevel, message: string, context?: LogContext): string {
        const timestamp = new Date().toISOString();
        const contextStr = context ? ` ${JSON.stringify(context)}` : '';
        return `[${timestamp}] [${level}] ${message}${contextStr}`;
    }

    /**
     * Debug level logs - only shown when VITE_ENABLE_DEBUG_LOGS=true
     * Use for verbose debugging information
     */
    debug(message: string, context?: LogContext): void {
        if (this.isDebugEnabled) {
            console.log(this.format('DEBUG', message, context));
        }
    }

    /**
     * Info level logs - shown in development, can be filtered in production
     * Use for general informational messages
     */
    info(message: string, context?: LogContext): void {
        if (this.isDebugEnabled || import.meta.env.DEV) {
            console.log(this.format('INFO', message, context));
        }
    }

    /**
     * Warning level logs - always shown
     * Use for recoverable issues that should be investigated
     */
    warn(message: string, context?: LogContext): void {
        console.warn(this.format('WARN', message, context));
    }

    /**
     * Error level logs - always shown
     * Use for errors and exceptions
     */
    error(message: string, error?: Error | any, context?: LogContext): void {
        const errorContext = error instanceof Error
            ? { ...context, error: error.message, stack: error.stack }
            : { ...context, error };
        console.error(this.format('ERROR', message, errorContext));
    }
}

// Export singleton instance
export const logger = new Logger();

// Export type for contexts
export type { LogContext };
