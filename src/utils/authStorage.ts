import AsyncStorage from '@react-native-async-storage/async-storage';
import CookieManager from '@react-native-cookies/cookies';
import { Platform } from 'react-native';
import { STORAGE_KEYS } from './literals/appliterals';
import logger from './logger';
import env from '../environment';
import { getEncryptedCredentials } from './secureStorage';

const API_URL = env.API_BASE_URL;
const API_DOMAIN = API_URL.replace(/^https?:\/\//, '');

export const restoreSessionCookies = async (): Promise<boolean> => {
  try {
    const sessionId = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_ID);
    const csrfToken = await AsyncStorage.getItem(STORAGE_KEYS.CSRF_TOKEN);
    
    if (!sessionId && !csrfToken) {
      logger.debug('No session cookies found in storage');
      return false;
    }
    
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
    
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    
    if (sessionId) {
      await CookieManager.set(API_URL, {
        name: 'sessionid',
        value: sessionId,
        domain: `.${API_DOMAIN}`,
        path: '/',
        expires: twoWeeksLater.toISOString(),
        secure: true,
        httpOnly: false,
      });
      logger.debug('Session ID cookie restored from storage');
    }
    
    if (csrfToken) {
      await CookieManager.set(API_URL, {
        name: 'csrftoken',
        value: csrfToken,
        domain: `.${API_DOMAIN}`,
        path: '/',
        expires: nextYear.toISOString(),
        secure: true,
        httpOnly: false,
      });
      logger.debug('CSRF token cookie restored from storage');
    }
    
    return true;
  } catch (error) {
    logger.error('Failed to restore session cookies from storage', error);
    return false;
  }
};

export const hasStoredCredentials = async (): Promise<boolean> => {
  try {
    const rememberMe = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
    
    const userInfo = await AsyncStorage.getItem(STORAGE_KEYS.USER_INFO);
    
    const encryptedCredentials = await getEncryptedCredentials();
    
    return rememberMe === 'true' && (!!userInfo || !!encryptedCredentials);
  } catch (error) {
    logger.error('Error checking for stored credentials', error);
    return false;
  }
};

export const getStoredUserData = async (): Promise<any | null> => {
  try {
    const userDataString = await AsyncStorage.getItem(STORAGE_KEYS.USER_INFO);
    return userDataString ? JSON.parse(userDataString) : null;
  } catch (error) {
    logger.error('Error retrieving stored user data', error);
    return null;
  }
};

export const getStoredEncryptedCredentials = async (): Promise<{ email: string; password: string } | null> => {
  try {
    return await getEncryptedCredentials();
  } catch (error) {
    logger.error('Error retrieving encrypted credentials', error);
    return null;
  }
};

export default {
  restoreSessionCookies,
  hasStoredCredentials,
  getStoredUserData,
  getStoredEncryptedCredentials,
};
