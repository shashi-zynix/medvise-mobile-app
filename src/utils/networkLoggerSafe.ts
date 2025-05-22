/**
 * Network Logger Safe - Handles file-based logging of network requests
 * 
 * This module is designed to be loaded with require() instead of import
 * to avoid circular dependency issues with axios and logger modules.
 */

import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

// Create interface for request data
interface NetworkRequestData {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  data?: any;
  params?: any;
}

// Create interface for response data
interface NetworkResponseData {
  id: string;
  timestamp: string;
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
  data?: any;
  duration?: number;
}

// Create interface for error data
interface NetworkErrorData {
  id: string;
  timestamp: string;
  method?: string;
  url?: string;
  status?: number;
  statusText?: string;
  message?: string;
  stack?: string;
  requestData?: any;
  responseData?: any;
}

// Configuration options for network logger
interface NetworkLoggerConfig {
  enabled: boolean;
  maxLogSize: number;
  logDirectory: string;
  logFilePrefix: string;
  logRequestsEnabled: boolean;
  logResponsesEnabled: boolean;
  logErrorsEnabled: boolean;
  maxRequestLogSize: number;
  maxResponseLogSize: number;
}

// Default configuration
const defaultConfig: NetworkLoggerConfig = {
  enabled: __DEV__, // Only enable in development by default
  maxLogSize: 5 * 1024 * 1024, // 5 MB
  logDirectory: `${Platform.OS === 'ios' ? RNFS.DocumentDirectoryPath : RNFS.ExternalDirectoryPath}/logs`,
  logFilePrefix: 'network_logs_',
  logRequestsEnabled: true,
  logResponsesEnabled: true,
  logErrorsEnabled: true,
  maxRequestLogSize: 100 * 1024, // 100 KB max for request data
  maxResponseLogSize: 200 * 1024, // 200 KB max for response data
};

// Current configuration
let config: NetworkLoggerConfig = { ...defaultConfig };

// Ensure log directory exists
const ensureLogDirectoryExists = async (): Promise<void> => {
  if (!config.enabled) return;
  
  try {
    const exists = await RNFS.exists(config.logDirectory);
    if (!exists) {
      await RNFS.mkdir(config.logDirectory);
    }
  } catch (error) {
    console.error('Failed to create log directory:', error);
  }
};

/**
 * Generate a log file path with date
 */
const getLogFilePath = (): string => {
  const date = new Date();
  const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return `${config.logDirectory}/${config.logFilePrefix}${formattedDate}.json`;
};

/**
 * Write log entry to file
 */
const writeLogEntry = async <T>(entry: T): Promise<void> => {
  if (!config.enabled) return;
  
  try {
    await ensureLogDirectoryExists();
    
    const logFilePath = getLogFilePath();
    let logs: any[] = [];
    
    // Read existing logs if file exists
    const fileExists = await RNFS.exists(logFilePath);
    if (fileExists) {
      const content = await RNFS.readFile(logFilePath, 'utf8');
      try {
        logs = JSON.parse(content);
      } catch (error) {
        // File exists but content is not valid JSON, create new log array
        logs = [];
      }
    }
    
    // Add new log entry
    logs.push(entry);
    
    // Write updated logs back to file
    await RNFS.writeFile(logFilePath, JSON.stringify(logs, null, 2), 'utf8');
    
  } catch (error) {
    console.error('Failed to write network log entry:', error);
  }
};

/**
 * Trim object to max size by removing properties or truncating strings
 */
const trimObjectSize = (obj: any, maxSize: number): any => {
  if (!obj) return obj;
  
  // Convert to string to check size
  const jsonString = JSON.stringify(obj);
  
  // If already within size limit, return as is
  if (jsonString.length <= maxSize) {
    return obj;
  }
  
  // For simple types, just return truncated string
  if (typeof obj !== 'object') {
    return jsonString.substring(0, maxSize) + '... [truncated]';
  }
  
  // For objects and arrays, try to preserve structure but reduce content
  const result = { ...obj };
  
  // If it's an array with lots of items, keep only first few
  if (Array.isArray(obj) && obj.length > 10) {
    return obj.slice(0, 10).concat(['... and ' + (obj.length - 10) + ' more items (truncated)']);
  }
  
  // For objects with large string properties, truncate those strings
  Object.keys(result).forEach(key => {
    if (typeof result[key] === 'string' && result[key].length > 1000) {
      result[key] = result[key].substring(0, 1000) + '... [truncated]';
    }
    else if (typeof result[key] === 'object') {
      // Recursively trim nested objects
      result[key] = trimObjectSize(result[key], maxSize / 2);
    }
  });
  
  return result;
};

// Network logger implementation
const networkLogger = {
  /**
   * Log a network request
   */
  logRequest: async (requestId: string, data: NetworkRequestData): Promise<void> => {
    if (!config.enabled || !config.logRequestsEnabled) return;
    
    // Trim request data to avoid huge log files
    const trimmedData = {
      ...data,
      data: data.data ? trimObjectSize(data.data, config.maxRequestLogSize) : undefined,
    };
    
    await writeLogEntry(trimmedData);
  },
  
  /**
   * Log a network response
   */
  logResponse: async (responseId: string, data: NetworkResponseData): Promise<void> => {
    if (!config.enabled || !config.logResponsesEnabled) return;
    
    // Trim response data to avoid huge log files
    const trimmedData = {
      ...data,
      data: data.data ? trimObjectSize(data.data, config.maxResponseLogSize) : undefined,
    };
    
    await writeLogEntry(trimmedData);
  },
  
  /**
   * Log a network error
   */
  logError: async (errorId: string, data: NetworkErrorData): Promise<void> => {
    if (!config.enabled || !config.logErrorsEnabled) return;
    
    // Trim error data to avoid huge log files
    const trimmedData = {
      ...data,
      requestData: data.requestData ? trimObjectSize(data.requestData, config.maxRequestLogSize) : undefined,
      responseData: data.responseData ? trimObjectSize(data.responseData, config.maxResponseLogSize) : undefined,
    };
    
    await writeLogEntry(trimmedData);
  },
  
  /**
   * Update network logger configuration
   */
  configure: (newConfig: Partial<NetworkLoggerConfig>): void => {
    config = { ...config, ...newConfig };
  },
  
  /**
   * Reset configuration to defaults
   */
  resetConfig: (): void => {
    config = { ...defaultConfig };
  },
  
  /**
   * Get current configuration
   */
  getConfig: (): NetworkLoggerConfig => ({ ...config }),
  
  /**
   * Enable or disable network logging
   */
  setEnabled: (enabled: boolean): void => {
    config.enabled = enabled;
  },
  
  /**
   * Clean old log files
   */
  cleanOldLogs: async (maxDays: number = 7): Promise<void> => {
    if (!config.enabled) return;
    
    try {
      await ensureLogDirectoryExists();
      
      const files = await RNFS.readdir(config.logDirectory);
      const now = new Date();
      
      for (const file of files) {
        if (file.startsWith(config.logFilePrefix)) {
          // Extract date from filename
          const match = file.match(/(\d{4}-\d{2}-\d{2})/);
          
          if (match && match[1]) {
            const fileDate = new Date(match[1]);
            const diffDays = (now.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24);
            
            if (diffDays > maxDays) {
              await RNFS.unlink(`${config.logDirectory}/${file}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to clean old log files:', error);
    }
  },
};

export default networkLogger;