import { Platform } from 'react-native';
import Config from 'react-native-config';
import logger from '../utils/logger';

type Environment = 'development' | 'staging' | 'production';

const logEnvVars = () => {
  logger.info('Environment Variables:', {
    ENVIRONMENT: Config.ENVIRONMENT,
    API_BASE_URL_DEVELOPMENT: Config.API_BASE_URL_DEVELOPMENT,
    API_BASE_URL_STAGING: Config.API_BASE_URL_STAGING,
    API_BASE_URL_PRODUCTION: Config.API_BASE_URL_PRODUCTION,
    AUTH_ENCRYPTION_KEY: Config.AUTH_ENCRYPTION_KEY ? '[REDACTED]' : undefined
  });
};

if (__DEV__) {
  logEnvVars();
}

const getEnvironment = (): Environment => {
  const environment = Config.ENVIRONMENT || 'development';
  
  if (['development', 'staging', 'production'].includes(environment)) {
    return environment as Environment;
  }
  
  return 'development';
};

const currentEnv = getEnvironment();

const getApiBaseUrl = (): string => {
  switch (currentEnv) {
    case 'development':
      return Config.API_BASE_URL_DEVELOPMENT || '';
    case 'staging':
      return Config.API_BASE_URL_STAGING || '';
    case 'production':
      return Config.API_BASE_URL_PRODUCTION || '';
    default:
      return Config.API_BASE_URL_DEVELOPMENT || '';
  }
};

export default {
  ENV: currentEnv,
  API_BASE_URL: getApiBaseUrl(),
  AUTH_ENCRYPTION_KEY: Config.AUTH_ENCRYPTION_KEY || 'default_encryption_key',
  IS_PRODUCTION: currentEnv === 'production',
  IS_DEVELOPMENT: currentEnv === 'development',
  IS_STAGING: currentEnv === 'staging',
  IS_ANDROID: Platform.OS === 'android',
  IS_IOS: Platform.OS === 'ios',
};