type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  group?: string;
  collapsed?: boolean;
}

class Logger {
  private isProduction: boolean;

  constructor() {
    this.isProduction = !__DEV__;
  }

  log(level: LogLevel, message: string, data?: any, options?: LogOptions) {
    if (this.isProduction && level === 'debug') {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (options?.group) {
      if (options?.collapsed) {
        console.groupCollapsed(`${prefix} ${options.group}`);
      } else {
        console.group(`${prefix} ${options.group}`);
      }
    }

    switch (level) {
      case 'debug':
        console.debug(`${prefix} ${message}`, data !== undefined ? data : '');
        break;
      case 'info':
        console.info(`${prefix} ${message}`, data !== undefined ? data : '');
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`, data !== undefined ? data : '');
        break;
      case 'error':
        console.error(`${prefix} ${message}`, data !== undefined ? data : '');
        break;
    }

    if (options?.group) {
      console.groupEnd();
    }
  }

  debug(message: string, data?: any, options?: LogOptions) {
    this.log('debug', message, data, options);
  }

  info(message: string, data?: any, options?: LogOptions) {
    this.log('info', message, data, options);
  }

  warn(message: string, data?: any, options?: LogOptions) {
    this.log('warn', message, data, options);
  }

  error(message: string, data?: any, options?: LogOptions) {
    this.log('error', message, data, options);
  }

  group(title: string, collapsed: boolean = false, callback: () => void) {
    if (this.isProduction) {
      callback(); 
      return;
    }

    if (collapsed) {
      console.groupCollapsed(title);
    } else {
      console.group(title);
    }
    
    callback();
    console.groupEnd();
  }

  httpRequest(method: string, url: string, config?: any) {
    this.info(`🚀 REQUEST: ${method.toUpperCase()} ${url}`, config);
  }

  httpResponse(method: string, url: string, response?: any) {
    this.info(`✅ RESPONSE: ${method.toUpperCase()} ${url}`, response);
  }

  httpError(message: string, error?: any) {
    this.error(`❌ HTTP ERROR: ${message}`, error);
  }
}

export const logger = new Logger();
export default logger;