/**
 * Logger utility for consistent logging throughout the app.
 * This module provides various log levels and specialized logging functions.
 */

import { Platform } from 'react-native';

// Define log levels
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

// Configuration for logger
interface LoggerConfig {
  level: LogLevel;
  enableConsoleOutput: boolean;
}

// Default configuration
const defaultConfig: LoggerConfig = {
  level: __DEV__ ? 'debug' : 'error', // Use debug in dev mode, only errors in production
  enableConsoleOutput: __DEV__, // Only log to console in dev mode
};

// Current configuration
let config: LoggerConfig = { ...defaultConfig };

/**
 * Get timestamp string for logs
 */
const getTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Get formatted log prefix with timestamp
 */
const getLogPrefix = (level: string): string => {
  return `[${getTimestamp()}][${level.toUpperCase()}]`;
};

/**
 * Convert any value to a loggable string representation
 */
const formatLogValue = (value: any): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch (e) {
      return `[Object: circular or non-serializable]`;
    }
  }
  
  return String(value);
};

// Mapping of log levels to console methods
const logMethods: Record<LogLevel, keyof Console> = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
  none: 'log', // Not used, but needed for type safety
};

// Log level hierarchy for filtering
const logLevelHierarchy: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

/**
 * Check if a log level should be logged based on the current configuration
 */
const shouldLog = (level: LogLevel): boolean => {
  if (config.level === 'none') return false;
  if (!config.enableConsoleOutput) return false;
  
  return logLevelHierarchy[level] >= logLevelHierarchy[config.level];
};

/**
 * Generic log function
 */
const log = (level: LogLevel, message: string, ...args: any[]): void => {
  if (!shouldLog(level)) return;
  
  // Safely handle cases where console might not be fully initialized
  if (typeof console === 'undefined') return;
  
  const prefix = getLogPrefix(level);
  const method = logMethods[level];
  
  try {
    if (args.length > 0) {
      (console[method] as (...data: any[]) => void)(`${prefix} ${message}`, ...args);
    } else {
      (console[method] as (...data: any[]) => void)(`${prefix} ${message}`);
    }
  } catch (error) {
    // Fallback to console.log if the specific method is not available
    try {
      console.log(`${prefix} ${message}`, ...(args || []));
    } catch {
      // Silent fail if console logging is completely unavailable
    }
  }
};

/**
 * Create a grouped log
 */
const group = (title: string, collapsed: boolean, callback: () => void): void => {
  if (!config.enableConsoleOutput) return;
  
  if (collapsed) {
    console.groupCollapsed(title);
  } else {
    console.group(title);
  }
  
  try {
    callback();
  } finally {
    console.groupEnd();
  }
};

/**
 * Log HTTP request details
 */
const httpRequest = (method: string, url: string, requestDetails: any): void => {
  if (!shouldLog('debug')) return;
  
  group(`🚀 HTTP Request: ${method} ${url}`, false, () => {
    log('info', `Method: ${method}`);
    log('info', `URL: ${url}`);
    
    if (requestDetails) {
      if (requestDetails.headers) {
        log('debug', 'Headers:', requestDetails.headers);
      }
      
      if (requestDetails.data) {
        log('debug', 'Request Data:', requestDetails.data);
      }
      
      if (requestDetails.params) {
        log('debug', 'Query Params:', requestDetails.params);
      }
    }
  });
};

/**
 * Log HTTP error details
 */
const httpError = (message: string, error: any): void => {
  if (!shouldLog('error')) return;
  
  group(`❌ HTTP Error: ${message}`, false, () => {
    if (error.response) {
      log('error', `Status: ${error.response.status} ${error.response.statusText || ''}`);
      log('error', 'Response:', error.response.data);
      log('debug', 'Headers:', error.response.headers);
    } else if (error.request) {
      log('error', 'No response received');
      log('debug', 'Request:', error.request);
    } else {
      log('error', 'Error:', error.message);
    }
    
    if (error.config) {
      log('debug', 'Request Config:', {
        url: error.config.url,
        method: error.config.method,
        headers: error.config.headers,
        data: error.config.data,
      });
    }
    
    log('debug', 'Stack:', error.stack);
  });
};

/**
 * The logger object with all logging methods
 */
const logger = {
  // Basic logging methods
  debug: (message: string, ...args: any[]) => log('debug', message, ...args),
  info: (message: string, ...args: any[]) => log('info', message, ...args),
  warn: (message: string, ...args: any[]) => log('warn', message, ...args),
  error: (message: string, ...args: any[]) => log('error', message, ...args),
  
  // Specialized logging methods
  group,
  httpRequest,
  httpError,
  
  // Configuration methods
  configure: (newConfig: Partial<LoggerConfig>) => {
    config = { ...config, ...newConfig };
  },
  
  // Reset configuration to defaults
  resetConfig: () => {
    config = { ...defaultConfig };
  },
  
  // Get current configuration
  getConfig: (): LoggerConfig => ({ ...config }),
  
  // Enable/disable console output
  enableConsole: () => {
    config.enableConsoleOutput = true;
  },
  
  disableConsole: () => {
    config.enableConsoleOutput = false;
  },
};

export default logger;