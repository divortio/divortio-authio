/**
 * @file The public router and handler factory for the pluggable authentication module.
 * @version 6.0.0 (authio)
 *
 * @description
 * This module exports a single `createAuthHandler` function that constructs a complete,
 * authentication-aware fetch handler. It has been refactored to act as a clean, high-level
 * orchestrator. It imports and delegates logic to specialized handlers for API and UI routes,
 * making the code more modular, readable, and maintainable.
 */

import {createAuthConfig} from './config.mjs';
import {createAuthMiddleware} from './middleware.mjs';
import {Logger} from './logger.mjs';
import {ApiHandler} from './handlers/api.mjs';
import {UiHandler} from './handlers/ui.mjs';

/**
 * Creates a complete fetch handler that wraps an application with the authentication system.
 * This is the single public interface for the Authio module.
 *
 * @param {function(Request, object, ExecutionContext): Promise<Response>} appFetchHandler - The main application logic to protect.
 * @returns {function(Request, object, ExecutionContext): Promise<Response>} A new, complete fetch handler.
 */
export function createAuthHandler(appFetchHandler) {
    return async (request, env, ctx) => {
        const authConfig = createAuthConfig(env);
        const logger = new Logger({
            enabled: authConfig.logEnabled,
            logLevel: authConfig.logLevel
        }).withContext({requestId: request.headers.get('cf-ray')});

        // --- 1. Handle Auth API Routes ---
        // Delegate to the dedicated API handler first.
        const apiResponse = await ApiHandler.handleRequest(request, authConfig, logger);
        if (apiResponse) {
            return apiResponse;
        }

        // --- 2. Handle Login Page UI and Redirects ---
        // Delegate to the dedicated UI handler.
        const uiResponse = await UiHandler.handleRequest(request, env, authConfig, logger);
        if (uiResponse) {
            return uiResponse;
        }

        // --- 3. Delegate to the Protected Application Handler ---
        // If neither the API nor the UI handler returned a response, it's a request
        // for the main application, which needs to be protected by the middleware.
        const protectedApp = createAuthMiddleware(appFetchHandler, authConfig, logger);
        return protectedApp(request, env, ctx);
    };
}