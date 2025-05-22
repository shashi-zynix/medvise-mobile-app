/**
 * Helper functions to safely initialize native modules
 */

import { NativeModules, Platform } from 'react-native';

/**
 * Safely initializes a native module by checking if it exists and is properly loaded
 * Returns the module if it exists, null otherwise
 */
export const safelyInitNativeModule = (moduleName: string): any | null => {
  try {
    const nativeModule = NativeModules[moduleName];
    if (!nativeModule) {
      console.warn(`Native module "${moduleName}" not found. It may not be linked correctly.`);
      return null;
    }
    return nativeModule;
  } catch (error) {
    console.warn(`Error initializing native module "${moduleName}":`, error);
    return null;
  }
};

/**
 * Special handling for voice recognition module
 * @returns The voice recognition native module or null if not available
 */
export const initializeVoiceRecognition = (): any | null => {
  try {
    // Voice module is imported dynamically to avoid issues if it's not available
    if (Platform.OS === 'ios') {
      // iOS-specific initialization
      return safelyInitNativeModule('Voice');
    } else if (Platform.OS === 'android') {
      // Android-specific initialization
      return safelyInitNativeModule('VoiceModule');
    }
    return null;
  } catch (error) {
    console.warn('Error initializing voice recognition:', error);
    return null;
  }
};

/**
 * Check if Hermes engine is enabled
 */
export const isHermesEnabled = (): boolean => {
  try {
    // @ts-ignore - HermesInternal is not in TypeScript definitions but exists at runtime
    return !!global.HermesInternal;
  } catch {
    return false;
  }
};

/**
 * Initialize all critical native modules
 * @returns An object containing references to initialized native modules
 */
export const initializeNativeModules = (): {
  voiceModule: any | null;
} => {
  if (isHermesEnabled()) {
    console.log('Running on Hermes JavaScript engine');
  } else {
    console.log('Running on JavaScriptCore');
  }
  
  // Add initialization for other critical modules here
  return {
    voiceModule: initializeVoiceRecognition(),
  };
};

// Export individual functions directly for named imports
export default {
  safelyInitNativeModule,
  initializeVoiceRecognition,
  initializeNativeModules,
  isHermesEnabled,
};
