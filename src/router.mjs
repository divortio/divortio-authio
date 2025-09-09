/**
 * @file The public router and handler factory for the pluggable authentication module.
 * @version 7.0.0 (authio)
 */

import {createAuthConfig} from './config.mjs';
import {Logger} from './utils/logger.mjs';
import {authenticate} from './utils/auth.mjs';
import {ApiHandler} from './handlers/api.mjs';
import {UiHandler} from './handlers/ui.mjs';

/**
 * Creates a new fetch handler that acts as a gatekeeper, denying access if a request is not authenticated.
 * @private
 */
function createGatekeeper(fetchHandler, logger) {
    return (request, env, ctx) => {
        if (!request.isAuthed) {
            logger.warn('Request unauthorized', {
                path: new URL(request.url).pathname,
                ip: request.headers.get('cf-connecting-ip')
            });
            // For programmatic requests, send 401. Browser requests are handled by the UI handler's redirect.
            return new Response("Unauthorized", {status: 401});
        }
        logger.info('Request authorized', {path: new URL(request.url).pathname, method: request.authio.method});
        return fetchHandler(request, env, ctx);
    };
}

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

        // --- 1. Authenticate the Request ---
        // Every request is processed by the authenticate utility first.
        const authedRequest = await authenticate(request, env, ctx, {config: authConfig});

        // --- 2. Handle Auth API Routes (Login/Logout) ---
        const apiResponse = await ApiHandler.handleRequest(authedRequest, env, ctx, authConfig);
        if (apiResponse) {
            return apiResponse;
        }

        // --- 3. Handle Login Page UI and Redirects ---
        const uiResponse = await UiHandler.handleRequest(authedRequest, env, authConfig, logger);
        if (uiResponse) {
            return uiResponse;
        }

        // --- 4. Protect the Application Handler ---
        // If no API or UI response was sent, protect the main application.
        const protectedApp = createGatekeeper(appFetchHandler, logger);
        return protectedApp(authedRequest, env, ctx);
    };
}