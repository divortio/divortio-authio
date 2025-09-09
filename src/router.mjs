/**
 * @file The public router and handler factory for the pluggable authentication module.
 * @version 7.2.0 (authio)
 */

import {createAuthConfig} from './config.mjs';
import {Logger} from './utils/logger.mjs';
import {authenticate} from './auth.mjs';
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
                path: request.parsedUrl.pathname, // Use the new pre-parsed URL object
                ip: request.headers.get('cf-connecting-ip')
            });
            // For programmatic requests, send 401. Browser requests are handled by the UI handler's redirect.
            return new Response("Unauthorized", {status: 401});
        }
        logger.info('Request authorized', {path: request.parsedUrl.pathname, method: request.authio.method});
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
        const logger = new Logger({
            enabled: String(env.AUTH_LOG_ENABLED).toLowerCase() === 'true',
            logLevel: env.AUTH_LOG_LEVEL || 'warn'
        }).withContext({requestId: request.headers.get('cf-ray')});

        const authConfig = await createAuthConfig(env, logger);

        // --- 1. Authenticate the Request ---
        const authedRequest = await authenticate(request, env, ctx, {config: authConfig});

        // --- 2. SAFER: Add a new property for the parsed URL instead of overwriting the original. ---
        authedRequest.parsedUrl = new URL(authedRequest.url);

        // --- 3. Handle Auth API Routes (Login/Logout) ---
        const apiResponse = await ApiHandler.handleRequest(authedRequest, env, ctx, authConfig);
        if (apiResponse) {
            return apiResponse;
        }

        // --- 4. Handle Login Page UI and Redirects ---
        const uiResponse = await UiHandler.handleRequest(authedRequest, env, authConfig, logger);
        if (uiResponse) {
            return uiResponse;
        }

        // --- 5. Protect the Application Handler ---
        const protectedApp = createGatekeeper(appFetchHandler, logger);
        return protectedApp(authedRequest, env, ctx);
    };
}