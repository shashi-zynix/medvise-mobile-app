/**
 * MedviseApp - Main Application
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from './src/redux/store';
import { StatusBar, useColorScheme, View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { Colors } from './src/theme/Colors';
import { setupInterceptors } from './src/axios';
import { APP } from './src/utils/literals/appliterals';
import { SidebarProvider } from './src/context/SidebarContext';
import { OnboardingProvider } from './src/context/OnboardingContext';
import { restoreSessionCookies } from './src/utils/authStorage';
import ErrorBoundary from './src/components/ErrorBoundary';
import nativeModuleInit from './src/utils/nativeModuleInit';
import Toast from 'react-native-toast-message';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize native modules first with proper error handling
        const nativeModules = nativeModuleInit.initializeNativeModules();
        
        // Check if voice module was initialized correctly
        if (!nativeModules.voiceModule) {
          console.warn('Voice recognition module could not be initialized. Some features may be limited.');
        } else {
          console.log('Voice recognition module initialized successfully:', nativeModules.voiceModule);
        }
        
        // Wait a short time to ensure the JS environment is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Set up axios interceptors
        setupInterceptors();
        
        // Restore session cookies from AsyncStorage if they exist
        await restoreSessionCookies();
        
        // Mark initialization as complete
        setIsInitialized(true);
      } catch (error) {
        // Safely log the error without causing crashes
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during initialization';
        console.error('Error during app initialization:', errorMessage);
        
        // Store the error but still mark as initialized to prevent app from being stuck
        setInitError(errorMessage);
        setIsInitialized(true);
      }
    };
    
    // Wrap in setTimeout to ensure the JS runtime is fully ready
    setTimeout(() => {
      initializeApp();
    }, 100);
  }, []);

  // Show a loading indicator while the app is initializing
  if (!isInitialized) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={isDarkMode ? Colors.dark : Colors.light}
        />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading Medvise...</Text>
      </View>
    );
  }
  
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <View style={styles.container}>
          <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <OnboardingProvider>
              <SidebarProvider>
                <StatusBar
                  barStyle={isDarkMode ? 'light-content' : 'dark-content'}
                  backgroundColor={isDarkMode ? Colors.dark : Colors.light}
                />
                {initError ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorTitle}>Initialization Warning</Text>
                    <Text style={styles.errorMessage}>{initError}</Text>
                    <Text style={styles.errorHint}>The app will continue to function, but some features may be limited.</Text>
                  </View>
                ) : null}
                <AppNavigator />
              </SidebarProvider>
            </OnboardingProvider>
          </SafeAreaProvider>
        </View>
        <Toast />
      </Provider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.primary,
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: '#fff3cd',
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: '#ffeeba',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
  },
  errorMessage: {
    fontSize: 14,
    color: '#856404',
    marginTop: 4,
  },
  errorHint: {
    fontSize: 12,
    color: '#856404',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default App;
