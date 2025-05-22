import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Text, View, Button } from 'react-native';
import logger from '../utils/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { 
    hasError: false, 
    error: null,
    errorInfo: null
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    if (
      error.message?.includes('NativeEventEmitter') || 
      error.message?.includes('invariant violation')
    ) {
      console.warn('Suppressed non-fatal error:', error.message);
      return {};
    }
    
    return { 
      hasError: true, 
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (
      error.message?.includes('NativeEventEmitter') || 
      error.message?.includes('invariant violation')
    ) {
      console.warn('Suppressed non-fatal error in componentDidCatch:', error.message);
      return;
    }
    
    this.setState({ errorInfo });
    
    try {
      logger.group('App Error', false, () => {
        logger.error('Error', error);
        logger.error('Error Info', errorInfo);
      });
    } catch (loggingError) {
      console.error('Error while logging error:', loggingError);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Something went wrong.
          </Text>
          <Text style={{ textAlign: 'center', marginBottom: 20 }}>
            {this.state.error?.toString()}
          </Text>
          <Button 
            title="Try Again" 
            onPress={this.resetError} 
          />
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
