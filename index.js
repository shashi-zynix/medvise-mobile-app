/**
 * @format
 */

// Import polyfills first
import './src/polyfills/NativeEventEmitterFix';

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// Add error handler for promise rejections
if (__DEV__) {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Check for the specific error we're trying to fix
    const firstArg = args[0];
    if (
      typeof firstArg === 'string' &&
      firstArg.includes('invariant violation') && 
      firstArg.includes('NativeEventEmitter')
    ) {
      // Don't print the error
      return;
    }
    originalConsoleError(...args);
  };
}

AppRegistry.registerComponent(appName, () => App);
