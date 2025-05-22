import axios, { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import env from '../environment';
import logger from '../utils/logger';
import networkUtils from '../utils/networkUtils';

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    metadata?: {
      requestStartTime: number;
    };
  }
}

const baseURL = env.API_BASE_URL;

logger.info('API Base URL:', baseURL);

(async () => {
  try {
    if (!baseURL || baseURL.trim() === '') {
      logger.error('Empty API URL detected', {
        baseURL,
        environment: env.ENV
      });
      return;
    }
    
    if (!networkUtils || !networkUtils.validateApiUrl) {
      logger.error('Network utilities not properly initialized', {
        networkUtils: typeof networkUtils,
        hasValidateApiUrl: networkUtils ? 'validateApiUrl' in networkUtils : false
      });
      return;
    }
    
    const validation = await networkUtils.validateApiUrl(baseURL);
    if (!validation.isValid) {
      logger.error(`API URL validation failed: ${validation.error}`, {
        baseURL,
        environment: env.ENV
      });
    } else {
      logger.info('API URL validation successful', { baseURL });
    }
  } catch (error) {
    logger.error('Error validating API URL:', error);
  }
})();

const axiosInstance = axios.create({
  baseURL,
  timeout: 300000, 
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
  },
  withCredentials: true
});

axiosInstance.interceptors.request.use(
  (config) => {
    const fullUrl = (config.baseURL || '') + (config.url || '');
    
    // Add metadata for tracking request timing
    config.metadata = { requestStartTime: Date.now() };
    
    logger.group('API Request', false, () => {
      logger.info('Full API URL:', fullUrl);
      logger.debug('Base URL:', config.baseURL);
      logger.debug('Endpoint:', config.url);
      logger.debug('Method:', config.method?.toUpperCase());
      logger.debug('Headers:', config.headers);
      if (config.params) {
        logger.debug('Query Parameters:', config.params);
      }
      if (config.data) {
        logger.debug('Request Payload:', config.data);
      }
      logger.debug('Config Details:', {
        withCredentials: config.withCredentials,
        timeout: config.timeout,
        responseType: config.responseType || 'json',
        transitional: config.transitional,
        maxContentLength: config.maxContentLength,
        maxBodyLength: config.maxBodyLength
      });
    });
    
    return config;
  },
  (error) => {
    logger.error('Request Error', error);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    logger.group('API Response', false, () => {
      logger.info('Response Status:', response.status, response.statusText);
      logger.debug('Response Headers:', response.headers);
      logger.debug('Response Data:', response.data);
      logger.debug('Response Config URL:', response.config.url);
      
      const responseTime = response.config.metadata?.requestStartTime 
        ? `${Date.now() - response.config.metadata.requestStartTime}ms`
        : 'N/A';
      logger.debug('Response Time:', responseTime);
    });
    return response;
  },
  async (error) => {
    if (error.response) {
      logger.group('API Response Error', false, () => {
        logger.error('Status:', error.response.status);
        logger.error('Headers:', error.response.headers);
        logger.error('Data:', error.response.data);
        logger.error('Config:', error.config);
      });
    } else if (error.request) {
      logger.error('No Response Received:', error.request);
      
      try {
        if (networkUtils && typeof networkUtils.diagnoseNetworkIssue === 'function') {
          const diagnostics = await networkUtils.diagnoseNetworkIssue();
          logger.error('Network Diagnostics:', diagnostics);
          
          const apiUrl = error.config?.baseURL + (error.config?.url || '');
          if (apiUrl && typeof networkUtils.validateApiUrl === 'function') {
            const validation = await networkUtils.validateApiUrl(apiUrl);
            logger.error('API URL Validation:', {
              url: apiUrl,
              isValid: validation.isValid,
              error: validation.error
            });
          }
        } else {
          logger.error('Network diagnostics module not properly loaded');
        }
      } catch (diagError) {
        logger.error('Error running network diagnostics:', diagError);
      }
      
      logger.error('No response received');
    } else {
      logger.error('Request Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;