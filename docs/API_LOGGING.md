# API Logging System

This document explains the API request and response logging system implemented in the MedviseApp.

## Overview

The API logging system provides detailed logging of all API requests, responses, and errors. It includes:

1. Console logging during development
2. File-based logging for persistence
3. A visual interface for viewing logs within the app
4. Utility functions for manual logging and analysis

## Architecture

The logging system consists of several components:

- **Axios Interceptors**: Automatically logs all requests and responses
- **NetworkLoggerSafe**: Handles file-based logging
- **Logger**: Provides console logging functionality
- **ApiLogger**: Offers utility functions for manual logging
- **ViewNetworkLogs**: Provides functions to analyze logs programmatically
- **ApiDebugScreen**: A visual interface for viewing logs in the app
- **Environment Configuration**: API URLs are loaded from environment variables

### API URL Configuration

The application uses environment variables for all API URLs to allow for easy switching between development, staging, and production environments. 
See [Environment Configuration Guide](./ENVIRONMENT_CONFIGURATION.md) for details.

## Automatic Logging

All API requests and responses are automatically logged through Axios interceptors in `src/axios/interceptors.ts` and `src/axios/instance.ts`. 
This happens transparently without any changes needed to your API calls.

## Viewing Logs

### In the Console

During development, all API requests and responses are logged to the console with detailed information including:

- Request ID
- HTTP method and full URL
- Complete request headers 
- Request body/payload
- Query parameters
- Configuration details (timeout, credentials, etc.)
- Response status code and text
- Complete response headers
- Response body/payload
- Response timing information (ms)
- Detailed error information when requests fail

### In the App

Add the `ApiDebugScreen` to your navigation to view logs visually within the app:

```javascript
import ApiDebugScreen from './src/components/debug/ApiDebugScreen';

// Add to your navigation:
<Stack.Screen name="ApiDebug" component={ApiDebugScreen} />
```

Then navigate to this screen to view, filter, and analyze API logs.

### Programmatically

Use the `viewNetworkLogs` utility to analyze logs in code:

```javascript
import { viewNetworkLogs, viewErrorLogs } from './src/utils/viewNetworkLogs';

// View recent logs
await viewNetworkLogs({ limit: 10 });

// View only errors
await viewErrorLogs();

// View logs for a specific endpoint
await viewNetworkLogs({ 
  filterUrl: '/appointments',
  filterMethod: 'GET'
});
```

## Manual Logging

In some cases, you may want to manually log API requests and responses:

```javascript
import apiLogger from './src/utils/apiLogger';

// Log a complete API call
await apiLogger.logApiCall('/api/resource', 'POST', {
  requestData: { name: 'Test' },
  responseData: { id: 123, name: 'Test' },
  statusCode: 201,
  duration: 350  // milliseconds
});

// Log individual parts
const requestId = await apiLogger.logRequest('/api/resource', 'GET');
await apiLogger.logResponse(requestId, 200, { result: 'success' });

// Log errors
await apiLogger.logError(requestId, new Error('Connection timeout'));
```

See `src/services/exampleLoggedService.ts` for a complete example of manual logging.

## Security

The logging system automatically filters sensitive information:

- Authorization headers
- Passwords
- Tokens and access tokens
- Other sensitive data

## Configuration

The NetworkLogger has these configurable options:

- `maxLogFiles`: Maximum number of log files to keep (default: 50)
- `maxLogSize`: Maximum combined size of all logs in bytes (default: 5MB)

These prevent excessive storage usage.

## Production Use

The logging system is designed for development and debugging. In production builds:

1. Console logging is disabled
2. The APIDebugScreen should be removed from navigation
3. File logging is still available for export during customer support

## Best Practices

1. Don't log sensitive information or PII
2. Use request IDs to correlate requests and responses
3. Add manual logging for complex API flows
4. Use the ApiDebugScreen during development
5. Use viewNetworkLogs for programmatic analysis

## Example Usage

See the following files for examples:

- `src/services/exampleLoggedService.ts`: Service with manual logging
- `src/axios/interceptors.ts`: Automatic logging setup
- `src/components/debug/ApiDebugScreen.tsx`: Visual log viewer
