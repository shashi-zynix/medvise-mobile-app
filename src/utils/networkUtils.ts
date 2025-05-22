/**
 * Network utility functions for the Medvise App
 */

import NetInfo from '@react-native-community/netinfo';
import logger from './logger';

/**
 * Check if a URL is valid and reachable
 * @param url The URL to check
 * @returns Promise that resolves to a validation result
 */
export const validateApiUrl = async (url: string): Promise<{
  isValid: boolean;
  error?: string;
}> => {
  try {
    // Check if URL is empty or undefined
    if (!url || url.trim() === '') {
      return {
        isValid: false,
        error: 'Cannot load an empty url Object'
      };
    }
    
    // Check if the URL is valid
    try {
      new URL(url);
    } catch (err) {
      return {
        isValid: false,
        error: `Invalid URL format: ${url}`
      };
    }
    
    // Check if network is available
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return {
        isValid: false,
        error: 'No internet connection available'
      };
    }
    
    // Try to fetch the domain without making a full request
    // This uses a HEAD request which only retrieves headers, not body
    try {
      const controller = new AbortController();
      // Timeout after 5 seconds
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      logger.debug('API URL validation result:', {
        url,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      return {
        isValid: response.status < 500, // Consider any non-server error as "valid"
        error: response.status >= 400 ? `Server returned status: ${response.status}` : undefined
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          isValid: false,
          error: `Connection to ${url} timed out after 5s`
        };
      }
      
      return {
        isValid: false,
        error: `Connection error: ${err.message}`
      };
    }
  } catch (error: any) {
    logger.error('Error validating API URL:', error);
    return {
      isValid: false,
      error: `Validation error: ${error.message}`
    };
  }
};

/**
 * Diagnose network issues and return helpful information
 */
export const diagnoseNetworkIssue = async (): Promise<string> => {
  try {
    // Check basic connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return 'Device is not connected to the internet. Please check your connection.';
    }
    
    // Get network details
    let details = `Network Type: ${netInfo.type}\n`;
    
    if (netInfo.type === 'cellular' && netInfo.details) {
      details += `Cellular Generation: ${netInfo.details.cellularGeneration}\n`;
    }
    
    if (netInfo.type === 'wifi' && netInfo.details) {
      details += `WiFi Strength: ${netInfo.details.strength}\n`;
      details += `WiFi SSID: ${netInfo.details.ssid || 'Unknown'}\n`;
    }
    
    // Check if we can reach common services
    const services = [
      {name: 'Google', url: 'https://www.google.com'},
      {name: 'CloudFlare DNS', url: 'https://1.1.1.1'},
    ];
    
    details += '\nReachability tests:\n';
    
    for (const service of services) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const start = Date.now();
        const response = await fetch(service.url, {
          method: 'HEAD',
          signal: controller.signal
        });
        const duration = Date.now() - start;
        
        clearTimeout(timeoutId);
        details += `${service.name}: ${response.status === 200 ? '✓' : '✗'} (${duration}ms)\n`;
      } catch (err) {
        details += `${service.name}: ✗ (unreachable)\n`;
      }
    }
    
    return details;
  } catch (error: any) {
    return `Error diagnosing network: ${error.message}`;
  }
};

// Create the module object with the functions
const networkUtils = {
  validateApiUrl,
  diagnoseNetworkIssue
};

// Export as default
export default networkUtils;
