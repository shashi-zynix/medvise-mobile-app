import { Middleware } from '@reduxjs/toolkit';
import { showApiErrorToast } from '../../utils/toastUtils';
import logger from '../../utils/logger';

export const toastMiddleware: Middleware = () => next => action => {
  if (
    typeof action === 'object' &&
    action !== null &&
    'type' in action &&
    typeof (action as any).type === 'string' &&
    (action as any).type.endsWith('/rejected')
  ) {
    const baseType = (action as any).type.replace('/rejected', '');

    logger.debug('Toast middleware processing rejected action', { 
      type: action.type,
      baseType,
      payload: (action as any).payload,
      error: (action as any).error
    });

    let title = 'API Error';
    
    if (baseType.includes('transcribe')) {
      title = 'Transcription Error';
    } else if (baseType.includes('upload')) {
      title = 'Upload Error';
    } else if (baseType.includes('auth')) {
      title = 'Authentication Error';
    } else if (baseType.includes('record')) {
      title = 'Record Processing Error';
    } else if (baseType.includes('appointment')) {
      title = 'Appointment Error';
    }

    const errorMessage = (action as any).payload || 
                         ((action as any).error?.message ? (action as any).error.message : 'An unknown error occurred');
    
    showApiErrorToast(title, errorMessage);
  }
  
  return next(action);
};

export default toastMiddleware;
