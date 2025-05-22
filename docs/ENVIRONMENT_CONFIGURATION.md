# Environment Configuration Guide

This document explains how environment configuration is set up and used throughout the MedviseApp.

## Environment Variables

Environment variables are stored in the `.env` file at the root of the project. They are loaded using the `react-native-config` package for the React Native app and the `dotenv` package for the mock server.

### Key Environment Variables

- `API_BASE_URL_DEVELOPMENT`: The base URL for API calls in development environment
- `API_BASE_URL_STAGING`: The base URL for API calls in staging environment
- `API_BASE_URL_PRODUCTION`: The base URL for API calls in production environment

## Accessing Environment Variables

### In React Native Components

```typescript
import env from '../environment';

// Access the API base URL
const apiUrl = env.API_BASE_URL;
```

The environment module (`/src/environment/index.ts`) provides a consistent way to access environment variables and determines which environment-specific variables to use based on the current environment setting.

### In the Mock Server

```javascript
// The mock server uses dotenv to load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Access environment variables directly
const apiUrl = process.env.API_BASE_URL_DEVELOPMENT;
```

## Important Changes (May 2025)

We recently updated the application to use environment variables consistently across all parts of the application:

1. Removed hardcoded API URLs from:
   - `src/screens/LoginScreen.tsx`
   - `src/utils/authStorage.ts`
   - `src/axios/interceptors.ts`
   - `src/mock/index.js`

2. Updated cookie domain handling to use the domain from environment variables

## Best Practices

- Never hardcode API URLs or domains in the application code
- Always use the environment variables through the environment module
- When working with cookies, extract the domain from the API URL rather than hardcoding it
