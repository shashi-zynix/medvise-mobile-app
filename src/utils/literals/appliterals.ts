
export const APP = {
  NAME: 'MedviseApp',
  VERSION: '0.0.1',
  BUNDLE_ID: 'com.medviseapp',
};

export const PLATFORMS = {
  ANDROID: 'android',
  IOS: 'ios',
};

export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
};

export const UI = {
  HEADER_HEIGHT: 56,
  FOOTER_HEIGHT: 56,
  DEFAULT_PADDING: 20,
  BUTTON_HEIGHT: 48,
  BORDER_RADIUS: {
    SMALL: 4,
    MEDIUM: 8,
    LARGE: 16,
    PILL: 40,
  },
  ANIMATION_DURATION: 300,
  INPUT_HEIGHT: 48,
};

export const ROUTES = {
  LOGIN: 'Login',
  HOME: 'Home',
  FORGOT_PASSWORD: 'ForgotPassword',
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_INFO: 'user_info',
  SETTINGS: 'app_settings',
  CSRF_TOKEN: 'csrf_token',
  SESSION_ID: 'session_id',
  REMEMBER_ME: 'remember_me',
};

export const TIMEOUTS = {
  API_REQUEST: 30000, 
  TOKEN_REFRESH: 300000, 
  AUTO_LOGOUT: 1800000,  
};

export default {
  APP,
  PLATFORMS,
  ENVIRONMENTS,
  UI,
  ROUTES,
  STORAGE_KEYS,
  TIMEOUTS,
};