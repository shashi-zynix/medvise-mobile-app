import { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import axiosInstance from './instance';
import { store } from '../redux/store';
import logger from '../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CookieManager from '@react-native-cookies/cookies';
import { Platform } from 'react-native';
import { STORAGE_KEYS } from '../utils/literals/appliterals';
import { logout } from '../redux/slices/authSlice';
import env from '../environment';

const CSRF_COOKIE_NAME = 'csrftoken';
const API_URL = env.API_BASE_URL;
const API_DOMAIN = API_URL.replace(/^https?:\/\//, '');

const setCsrfCookie = async (csrfToken: string) => {
  try {
    if (Platform.OS === 'android') {
      await CookieManager.set(API_URL, {
        name: CSRF_COOKIE_NAME,
        value: csrfToken,
        domain: `.${API_DOMAIN}`,
        path: '/',
        expires: '2030-05-30T12:30:00.00-05:00',
        secure: true,
        httpOnly: false,
      });
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.CSRF_TOKEN, csrfToken);
    logger.debug('CSRF token set successfully', { csrfToken });
  } catch (error) {
    logger.error('Failed to set CSRF cookie', error);
  }
};

const getCsrfToken = async (): Promise<string | null> => {
  try {
    let csrfToken = await AsyncStorage.getItem(STORAGE_KEYS.CSRF_TOKEN);
    if (csrfToken) {
      return csrfToken;
    }
    
    const cookieURL = Platform.OS === 'ios' ? API_URL : API_DOMAIN;
    const cookies = await CookieManager.get(cookieURL);
    
    if (cookies && cookies[CSRF_COOKIE_NAME]) {
      csrfToken = cookies[CSRF_COOKIE_NAME].value;
      
      await AsyncStorage.setItem(STORAGE_KEYS.CSRF_TOKEN, csrfToken);
      return csrfToken;
    }
    
    return null;
  } catch (error) {
    logger.error('Error retrieving CSRF token', error);
    return null;
  }
};

const extractCsrfTokenFromResponse = async (response: AxiosResponse) => {
  try {
    const setCookieHeader = response.headers['set-cookie'];
    
    if (setCookieHeader) {
      const csrfCookie = Array.isArray(setCookieHeader) 
        ? setCookieHeader.find(cookie => cookie.includes(`${CSRF_COOKIE_NAME}=`))
        : (typeof setCookieHeader === 'string' && (setCookieHeader as string).includes(`${CSRF_COOKIE_NAME}=`)) 
          ? setCookieHeader 
          : null;
          
      if (csrfCookie) {
        const csrfToken = csrfCookie.split('=')[1]?.split(';')[0];
        if (csrfToken) {
          await setCsrfCookie(csrfToken);
        }
      }
    }
    
    if (response.data && response.data.csrftoken) {
      await setCsrfCookie(response.data.csrftoken);
    }
  } catch (error) {
    logger.error('Error extracting CSRF token from response', error);
  }
};

const setupRequestInterceptor = () => {
  axiosInstance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const state = store.getState();
      
      config.headers.set('accept', 'application/json, text/plain, */*');
      // config.headers.set('content-type', 'application/json');
      // Create referer URL based on environment config
      const portalDomain = API_DOMAIN.replace('testapi', 'www.testportal');
      config.headers.set('referer', `https://${portalDomain}/`);

      try {
        // Get CSRF token
        const csrfToken = await getCsrfToken();
          if (csrfToken) {
          // Add CSRF token to headers
          logger.debug('CSRF token found:', csrfToken);
          // config.headers.set('x-csrftoken', csrfToken);
          
          // For Android, we also need to add it as a cookie header
          if (Platform.OS === 'android') {
            // config.headers.set('Cookie', `${CSRF_COOKIE_NAME}=${csrfToken}`);
          }
          
          config.withCredentials = true;
        }
      } catch (error) {
        logger.error('Error setting CSRF token', error);
      }

      logger.httpRequest(config.method || 'unknown', config.url || 'unknown', config);
      return config;
    },
    (error: AxiosError) => {
      logger.httpError('Request Error', error);
      return Promise.reject(error);
    }
  );
};

const setupResponseInterceptor = () => {
  axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
      const timestamp = new Date();
      const requestId = (response.config as any).__requestId;
      let duration: number | undefined;
      
      if (requestId) {
        const requestInfo = (global as any).__API_REQUESTS?.get(requestId);
        if (requestInfo) {
          duration = timestamp.getTime() - requestInfo.timestamp;
          (global as any).__API_REQUESTS?.delete(requestId);
        }
      }
      
      const responseId = `res_${Math.random().toString(36).substring(2, 10)}`;
      
      console.log(`\n━━━━━━━━━━━━━━━━ API RESPONSE [${requestId || responseId}] ━━━━━━━━━━━━━━━━`);
      
      logger.group(`📥 API Response: ${response.config.method?.toUpperCase() || 'UNKNOWN'} ${response.config.url || 'unknown'}`, false, () => {
        logger.info(`Status: ${response.status} ${response.statusText}`);
        logger.info(`Time: ${timestamp.toISOString()}`);
        
        if (requestId) {
          logger.info(`Request ID: ${requestId}`);
        }
        
        if (duration !== undefined) {
          logger.info(`Response time: ${duration}ms`);
        }
        
        const filteredHeaders = { ...response.headers };
        if (filteredHeaders.authorization) {
          filteredHeaders.authorization = '[FILTERED]';
        }
        logger.debug('Headers:', filteredHeaders);
        
        logger.debug('Response data:', response.data);
        
        logger.debug('Request details:', {
          url: response.config.url,
          method: response.config.method?.toUpperCase(),
          params: response.config.params,
          data: response.config.data
        });
      });
      
      if (__DEV__) {
        try {
          const networkLogger = require('../utils/networkLoggerSafe').default;
          
          if (requestId) {
            const requestData = {
              url: response.config.url,
              method: response.config.method?.toUpperCase(),
              headers: response.config.headers,
              params: response.config.params,
              data: response.config.data,
              timestamp: timestamp.toISOString()
            };
            
            networkLogger.logRequest(requestId, requestData);
            
            const responseData = {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
              data: response.data,
              duration: duration,
              timestamp: timestamp.toISOString()
            };
            
            networkLogger.logResponse(requestId, responseData);
          }
        } catch (error) {
          console.warn('Failed to log response to file:', error);
        }
      }
      
      extractCsrfTokenFromResponse(response);
      
      return response;
    },
    (error: AxiosError) => {
      const { response, request, config, message } = error;
      const timestamp = new Date();
      
      const requestId = (config as any)?.__requestId;
      let duration: number | undefined;
      
      if (requestId) {
        const requestInfo = (global as any).__API_REQUESTS?.get(requestId);
        if (requestInfo) {
          duration = timestamp.getTime() - requestInfo.timestamp;
          (global as any).__API_REQUESTS?.delete(requestId);
        }
      }
      
      const errorDetails = {
        requestId,
        message,
        url: config?.url || 'unknown URL',
        method: config?.method?.toUpperCase() || 'UNKNOWN',
        status: response?.status,
        statusText: response?.statusText,
        headers: response?.headers,
        data: response?.data,
        duration,
        request: request ? {
          url: request.url || config?.url,
          method: config?.method,
          headers: config?.headers,
          data: config?.data
        } : undefined,
        timestamp: timestamp.toISOString()
      };

      logger.httpError(`${errorDetails.method} ${errorDetails.url} - ${errorDetails.status || 'Network Error'}`, error);
      
      if (__DEV__) {
        try {
          const networkLogger = require('../utils/networkLoggerSafe').default;
          
          const errorId = requestId || `err_${Math.random().toString(36).substring(2, 10)}`;
          
          networkLogger.logError(errorId, {
            ...errorDetails,
            stack: error.stack
          });
        } catch (logError) {
          console.warn('Failed to log error to file:', logError);
        }
      }

      if (response?.status === 401 || response?.status === 403) {
        const { dispatch } = store;
        dispatch(logout());
      }
      
      return Promise.reject(error);
    }
  );
};

export const setupInterceptors = () => {
  setupRequestInterceptor();
  setupResponseInterceptor();
};

export default setupInterceptors;
