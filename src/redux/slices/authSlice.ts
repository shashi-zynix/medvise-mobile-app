import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CookieManager from '@react-native-cookies/cookies';
import { Platform } from 'react-native';
import { authService } from '../../api';
import { STORAGE_KEYS } from '../../utils/literals/appliterals';
import logger from '../../utils/logger';
import { clearEncryptedCredentials } from '../../utils/secureStorage';
import env from '../../environment';

interface EmrSystemDetails {
  id: number;
  emr_name: string;
  emr_version: string;
  emr_verbose_name: string;
  emr_code: string;
}

interface Settings {
  [key: string]: string;
}

interface User {
  user_id: number;
  practitioner_id: number;
  practitioner_role: string;
  first_name: string;
  last_name: string;
  timezone: string;
  language: string;
  has_accepted_terms: boolean;
  settings: Settings;
  is_emr_linked: boolean;
  emr_system_details: EmrSystemDetails;
  speciality: string;
  email: string;
  license_number: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
};

interface LoginUserPayload {
  user: User;
}

export const loginUser = createAsyncThunk<
  LoginUserPayload,
  { email: string; password: string },
  { rejectValue: string }
>(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await authService.login(email, password);
      
      if (!response.success || !response.data) {
        return rejectWithValue(
          response.error?.message || 
          'Login failed'
        );
      }
      
      return {
        user: response.data as User,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'An unknown error occurred during login');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.error = null;
      AsyncStorage.getAllKeys()
        .then(keys => {
          const keysToPreserve: string[] = [
          ];
          
          const keysToRemove = keys.filter(key => !keysToPreserve.includes(key));
          
          return AsyncStorage.multiRemove(keysToRemove);
        })
        .then(() => {
         
          logger.info('All authentication and user data cleared from storage');
        })
        .catch(error => {
          logger.error('Error clearing data from storage:', error);
        });
      
      clearEncryptedCredentials().catch(error => {
        logger.error('Error clearing encrypted credentials:', error);
      });
      
      const apiUrl = env.API_BASE_URL;
      const cookieURL = Platform.OS === 'ios' 
        ? apiUrl.startsWith('http') ? apiUrl : `https://${apiUrl}`
        : apiUrl.replace(/^https?:\/\//, '');
      
      CookieManager.clearAll()
        .then(() => {
          logger.info('All cookies cleared successfully');
        })
        .catch(error => {
          logger.error('Error clearing cookies:', error);
        });
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<LoginUserPayload>) => {
        state.loading = false;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { logout, clearError } = authSlice.actions;

export default authSlice.reducer;