import CryptoJS from 'react-native-crypto-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './literals/appliterals';
import logger from './logger';
import env from '../environment';

const ENCRYPTION_KEY = env.AUTH_ENCRYPTION_KEY || 'default_key_not_for_production';

const SECURE_STORAGE_KEYS = {
  ENCRYPTED_EMAIL: 'encrypted_email',
  ENCRYPTED_PASSWORD: 'encrypted_password',
};

const encrypt = (data: string): string => {
  try {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  } catch (error) {
    logger.error('Error encrypting data:', error);
    throw error;
  }
};

const decrypt = (encryptedData: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    logger.error('Error decrypting data:', error);
    throw error;
  }
};

export const storeEncryptedCredentials = async (email: string, password: string): Promise<void> => {
  try {
    const encryptedEmail = encrypt(email);
    const encryptedPassword = encrypt(password);

    await AsyncStorage.multiSet([
      [SECURE_STORAGE_KEYS.ENCRYPTED_EMAIL, encryptedEmail],
      [SECURE_STORAGE_KEYS.ENCRYPTED_PASSWORD, encryptedPassword]
    ]);

    logger.info('Credentials stored securely');
  } catch (error) {
    logger.error('Failed to store encrypted credentials:', error);
    throw error;
  }
};

export const getEncryptedCredentials = async (): Promise<{ email: string; password: string } | null> => {
  try {
    const results = await AsyncStorage.multiGet([
      SECURE_STORAGE_KEYS.ENCRYPTED_EMAIL,
      SECURE_STORAGE_KEYS.ENCRYPTED_PASSWORD
    ]);

    const encryptedEmail = results[0][1];
    const encryptedPassword = results[1][1];

    if (!encryptedEmail || !encryptedPassword) {
      return null;
    }

    return {
      email: decrypt(encryptedEmail),
      password: decrypt(encryptedPassword)
    };
  } catch (error) {
    logger.error('Failed to retrieve encrypted credentials:', error);
    return null;
  }
};


export const clearEncryptedCredentials = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      SECURE_STORAGE_KEYS.ENCRYPTED_EMAIL,
      SECURE_STORAGE_KEYS.ENCRYPTED_PASSWORD
    ]);
    logger.info('Encrypted credentials cleared');
    const credentials = await getEncryptedCredentials();
    logger.info('Encrypted credentials after clearing:', credentials);
  } catch (error) {
    logger.error('Failed to clear encrypted credentials:', error);
    throw error;
  }
};

export default {
  encrypt,
  decrypt,
  storeEncryptedCredentials,
  getEncryptedCredentials,
  clearEncryptedCredentials,
};
