import Toast from 'react-native-toast-message';

/**
 * Utility functions for showing toast messages
 */

export type ToastType = 'success' | 'error' | 'info';

/**
 * Show a toast message
 * @param type - Toast type (success, error, info)
 * @param title - The title/heading of the toast
 * @param message - The message body of the toast
 * @param duration - How long to show the toast in milliseconds
 */
export const showToast = (
  type: ToastType,
  title: string,
  message: string,
  duration: number = 3000
) => {
  Toast.show({
    type,
    text1: title,
    text2: message,
    visibilityTime: duration,
    autoHide: true,
    topOffset: 60,
  });
};

/**
 * Show an error toast
 * @param title - The error title
 * @param message - The error message
 */
export const showErrorToast = (title: string, message: string) => {
  showToast('error', title, message, 4000);
};

/**
 * Show a success toast
 * @param title - The success title
 * @param message - The success message
 */
export const showSuccessToast = (title: string, message: string) => {
  showToast('success', title, message);
};

/**
 * Show an info toast
 * @param title - The info title
 * @param message - The info message
 */
export const showInfoToast = (title: string, message: string) => {
  showToast('info', title, message);
};

/**
 * Format API error message for display
 * @param error - Error object from API call
 * @returns Formatted error message string
 */
export const formatApiErrorMessage = (error: any): string => {
  // Handle API client structured errors
  if (error?.error?.message) {
    return error.error.message;
  }
  
  // Handle Axios/API error response
  if (error?.response?.data) {
    return error.response.data.message || 
           error.response.data.error?.message || 
           error.response.data.error || 
           `Error ${error.response.status}: ${error.response.statusText || 'Unknown error'}`;
  }
  
  // Handle network errors
  if (error?.message && error.message.includes('Network')) {
    return 'Network error: Please check your connection';
  }
  
  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message;
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }
  
  // Default case
  return 'An unknown error occurred';
};

/**
 * Show an API error toast with a formatted message
 * @param title - Custom title for the error toast (defaults to 'API Error')
 * @param error - The error object from API call
 * @param duration - How long to show the toast in milliseconds (defaults to 4000)
 */
export const showApiErrorToast = (
  title: string = 'API Error',
  error: any,
  duration: number = 4000
) => {
  const message = formatApiErrorMessage(error);
  showErrorToast(title, message);
};
