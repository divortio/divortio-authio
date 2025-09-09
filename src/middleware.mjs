/**
 * @file A dedicated module for the authentication middleware gatekeeper.
 * @version 2.0.0 (authio)
 *
 * @description
 * This module exports a single `createAuthMiddleware` function. Its only job is to
 * act as a security guard for a given application handler. It implements a unified
 * authentication strategy, checking for programmatic access first, then falling
 * back to interactive user sessions.
 */

import {JWT} from './jwt.mjs';
import {CredentialStore} from './creds.mjs';

/**
 * A middleware factory that creates a protected version of a fetch handler.
 *
 * @param {function(Request, object, ExecutionContext): Promise<Response>} fetchHandler - The main application logic to protect.
 * @param {object} config - The application's auth configuration object.
 * @param {import('./logger.mjs').Logger} logger - The logger instance.
 * @returns {function} A new, wrapped fetch handler.
 */
export function createAuthMiddleware(fetchHandler, config, logger) {
    return async (request, env, ctx) => {
        let isAuthorized = false;
        let authMethod = 'none';
        const userStore = await CredentialStore.get(config.usersModulePath, logger);

        // 1. Check for programmatic access via header first.
        const programmaticAuthHeader = request.headers.get(config.agentHeaderName);
        if (programmaticAuthHeader) {
            try {
                // The header value is expected to be a Base64 encoded "username:password" string.
                const decoded = atob(programmaticAuthHeader);
                const [username, password] = decoded.split(':');
                if (username && password && userStore[username] === password) {
                    isAuthorized = true;
                    authMethod = 'header';
                    // Attach a simple user object for programmatic requests.
                    request.user = {id: username};
                }
            } catch (e) {
                logger.warn('Failed to decode programmatic auth header.', {error: e.message});
            }
        }

        // 2. If not authorized, fall back to checking for a valid interactive user session via JWT.
        if (!isAuthorized) {
            const payload = await JWT.validate({
                request,
                jwtSecret: config.jwtSecret,
                authTokenName: config.authTokenName,
                issuer: config.jwtIssuer,
                audience: config.jwtAudience,
            });
            if (payload) {
                request.user = {id: payload.sub, claims: payload};
                isAuthorized = true;
                authMethod = 'jwt';
            }
        }

        // 3. If authorized by either method, proceed to the main application logic.
        if (isAuthorized) {
            logger.info('Request authorized', {path: new URL(request.url).pathname, method: authMethod});
            return fetchHandler(request, env, ctx);
        }

        // 4. If not authorized, deny access. The parent router is responsible for handling the redirect UI.
        logger.warn('Request unauthorized', {
            path: new URL(request.url).pathname,
            ip: request.headers.get('cf-connecting-ip')
        });
        return new Response("Unauthorized", {status: 401});
    };
}