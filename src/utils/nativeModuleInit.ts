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
    // Voice module from @react-native-voice/voice package
    // The module name is 'Voice' on both iOS and Android in newer versions
    const voiceModule = safelyInitNativeModule('Voice');
    
    if (voiceModule) {
      console.log('Voice recognition module initialized successfully');
      return voiceModule;
    }
    
    // Fallback to try alternative name for backwards compatibility
    if (Platform.OS === 'android') {
      const legacyModule = safelyInitNativeModule('VoiceModule');
      if (legacyModule) {
        console.log('Voice recognition module initialized with legacy name');
        return legacyModule;
      }
    }
    
    console.warn('Voice recognition module not available');
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

// Initialize voice module on import to ensure it's available early
// This provides a singleton instance that can be imported where needed
export let voiceModuleInstance: any | null = null;

// Delay initialization slightly to ensure JS environment is ready
setTimeout(() => {
  voiceModuleInstance = initializeVoiceRecognition();
  if (voiceModuleInstance) {
    console.log('Voice module singleton initialized successfully');
  }
}, 500);

// Create an object with all the functions
const nativeModuleInit = {
  safelyInitNativeModule,
  initializeVoiceRecognition,
  initializeNativeModules,
  isHermesEnabled,
  // Dynamic getter for the voice module to ensure it's initialized when accessed
  get voiceModule() {
    if (!voiceModuleInstance) {
      voiceModuleInstance = initializeVoiceRecognition();
    }
    return voiceModuleInstance;
  }
};

// Export default only to avoid redeclaration errors
export default nativeModuleInit;