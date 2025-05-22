
export const AUTH = {
  LOGIN: '/api/V2/account/auth/login',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  LOGOUT: '/auth/logout',
  CURRENT_USER: '/auth/me',
};

export const USER = {
  PROFILE: '/user/profile',
  SETTINGS: '/user/settings',
};

export const FILES = {
  UPLOAD: '/files/upload',
  DOWNLOAD: '/files/download',
};

export const SPEECH = {
  TRANSCRIBE: '/speech/transcribe',
  ANALYZE: '/speech/analyze',
};

export default {
  AUTH,
  USER,
  FILES,
  SPEECH,
};