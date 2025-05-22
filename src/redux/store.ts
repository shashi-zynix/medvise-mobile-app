import { configureStore, Middleware } from '@reduxjs/toolkit';
import { createLogger } from 'redux-logger';
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import authReducer from './slices/authSlice';
import appointmentsReducer from './slices/appointmentsSlice';
import logger from '../utils/logger';
import toastMiddleware from './middleware/toastMiddleware';

// Custom middleware to log actions and state
const actionLogger: Middleware = store => next => (action: unknown) => {
  // Type guard to check if action is an object with a type property
  const actionType = typeof action === 'object' && action !== null && 'type' in action 
    ? (action as { type: string }).type 
    : 'unknown';
  
  logger.group(`ACTION: ${actionType}`, true, () => {
    logger.debug('Old State', store.getState());
    logger.debug('Action', action);
    const result = next(action);
    logger.debug('New State', store.getState());
    return result;
  });
  
  // Need to call next(action) outside the group function to ensure proper flow
  return next(action);
};

// Logger middleware for development
const reduxLogger = createLogger({
  collapsed: true,
});

// Create store with middleware
const middleware = [actionLogger, toastMiddleware];

// Only add redux-logger in development
if (__DEV__) {
  middleware.push(reduxLogger);
}

// Configure store
export const store = configureStore({
  reducer: {
    auth: authReducer,
    appointments: appointmentsReducer,
    // Add more reducers here as your app grows
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(middleware),
});

// Export store types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// For use with useDispatch and useSelector hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;