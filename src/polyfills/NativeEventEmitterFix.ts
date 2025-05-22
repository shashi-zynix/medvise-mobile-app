/**
 * This polyfill ensures that NativeEventEmitter doesn't throw an error when initialized with a null module
 * Addresses the error: "runtime not ready: invariant violation new nativeeventemitter requires a non null argument"
 */

import { NativeEventEmitter } from 'react-native';

// Only apply the fix if we're in a Hermes environment
try {
  // Safely check for Hermes
  const isHermes = !!global.HermesInternal;
  if (isHermes) {
    // Store the original constructor
    const originalConstructor = NativeEventEmitter.prototype.constructor;

  // Override the constructor to handle null/undefined arguments
  NativeEventEmitter.prototype.constructor = function(...args: any[]) {
    if (args[0] === null || args[0] === undefined) {
      // Create a dummy native module that won't throw errors
      const dummyModule = {
        addListener: () => {},
        removeListeners: () => {},
      };
      return originalConstructor.call(this, dummyModule);
    }
    return originalConstructor.call(this, ...args);
  };
  }
} catch (error) {
  console.warn("Failed to apply NativeEventEmitter polyfill:", error);
}

export default {};
